/**
 * PostgreSQL Database Client
 *
 * Provides database connection pooling and query execution helpers
 * for the Sugih personal finance application using PostgreSQL.
 *
 * This module replaces the SQLite client with PostgreSQL support,
 * implementing connection pooling, transaction management, and
 * PostgreSQL-specific parameter handling.
 */

import postgres, { Sql, Transactable } from "postgres";
import { getDatabaseConfig } from "./config";

// Singleton pattern for database connection with pooling
let sql: Sql | null = null;

/**
 * Get the PostgreSQL client with connection pooling
 *
 * Initializes connection pool on first call using environment configuration.
 * Reuses existing pool for subsequent calls.
 *
 * @returns {Sql} Configured PostgreSQL client with connection pooling
 * @throws {Error} If database configuration is invalid
 */
export function getDb(): Sql {
  if (!sql) {
    const config = getDatabaseConfig();

    sql = postgres(config.url, {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl,
      connection_timeout: config.connectionTimeout,
      idle_timeout: config.idleTimeout,
      max: config.maxConnections,

      // Transform column names from snake_case to camelCase
      transform: {
        column: {
          // Convert snake_case to camelCase for consistency with TypeScript conventions
          to: postgres.camel as any,
          from: postgres.snake as any,
        },
        value: {
          to: (value: any) => value,
          from: (value: any) => value,
        },
        row: {
          to: (row: any) => {
            // Convert all column names to camelCase
            const camelRow: any = {};
            for (const key in row) {
              const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
                letter.toUpperCase(),
              );
              camelRow[camelKey] = row[key];
            }
            return camelRow;
          },
          from: postgres.snake as any,
        },
      },
    });
  }

  return sql;
}

/**
 * Execute a query and return all results
 *
 * @param sql - SQL query string with PostgreSQL parameter placeholders ($1, $2, etc.)
 * @param params - Parameters to bind to the query (optional, can be destructured)
 * @returns {Promise<Array<T>>} Array of result rows
 * @throws {Error} If query execution fails
 */
export async function all<T = any>(
  sql: string,
  ...params: any[]
): Promise<T[]> {
  try {
    const db = getDb();
    const result = await db<T[]>(sql, ...params);
    return result;
  } catch (error) {
    console.error("Database query error (all):", {
      sql,
      params,
      error: error instanceof Error ? error.message : error,
    });
    throw new Error(
      `Failed to execute query: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Execute a query and return a single result
 *
 * @param sql - SQL query string with PostgreSQL parameter placeholders
 * @param params - Parameters to bind to the query
 * @returns {Promise<T | undefined>} Single result row or undefined
 * @throws {Error} If query execution fails
 */
export async function get<T = any>(
  sql: string,
  ...params: any[]
): Promise<T | undefined> {
  try {
    const db = getDb();
    const result = await db<T>(sql, ...params);
    return result;
  } catch (error) {
    console.error("Database query error (get):", {
      sql,
      params,
      error: error instanceof Error ? error.message : error,
    });
    throw new Error(
      `Failed to execute query: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Execute a query and return metadata (for INSERT, UPDATE, DELETE)
 *
 * @param sql - SQL query string with PostgreSQL parameter placeholders
 * @param params - Parameters to bind to the query
 * @returns {Promise<{rowsAffected: number}>} Result metadata
 * @throws {Error} If query execution fails
 */
export async function run(
  sql: string,
  ...params: any[]
): Promise<{ rowsAffected: number }> {
  try {
    const db = getDb();
    const result = await db<{ rowsAffected: number }>(sql, ...params);

    // postgres returns affected rows in the result
    return {
      rowsAffected: typeof result === "number" ? result : 0,
    };
  } catch (error) {
    console.error("Database query error (run):", {
      sql,
      params,
      error: error instanceof Error ? error.message : error,
    });
    throw new Error(
      `Failed to execute query: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Execute a function within a transaction
 *
 * @param fn - Async function to execute within the transaction
 * @returns {Promise<T>} Result of the transaction function
 * @throws {Error} If transaction fails or fn throws
 */
export async function transaction<T>(
  fn: (tx: Transactable) => Promise<T>,
): Promise<T> {
  try {
    const db = getDb();
    return await db.tx(fn);
  } catch (error) {
    console.error("Database transaction error:", {
      error: error instanceof Error ? error.message : error,
    });
    throw new Error(
      `Transaction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Execute a simple (non-callback) transaction
 *
 * @param fn - Function to execute within the transaction (synchronous)
 * @returns {Promise<T>} Result of the transaction function
 * @throws {Error} If transaction fails or fn throws
 */
export async function transactionSync<T>(
  fn: (tx: Transactable) => T,
): Promise<T> {
  try {
    const db = getDb();
    return await db.tx(async (tx) => {
      // Execute synchronous function in async context
      return fn(tx);
    });
  } catch (error) {
    console.error("Database transaction error:", {
      error: error instanceof Error ? error.message : error,
    });
    throw new Error(
      `Transaction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Close the database connection pool
 *
 * Should be called when the application is shutting down.
 *
 * @returns {Promise<void>} Promise that resolves when connections are closed
 */
export async function closeDb(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = null;
  }
}

/**
 * Check database connectivity
 *
 * @returns {Promise<boolean>} True if connection is healthy
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const db = getDb();
    await db`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

/**
 * Get database statistics
 *
 * @returns {Promise<Object>} Database connection statistics
 */
export async function getStats(): Promise<{
  totalConnections: number;
  idleConnections: number;
  waitingQueries: number;
}> {
  try {
    const db = getDb();
    const result = await db<{
      total: number;
      idle: number;
      waiting: number;
    }>`
      SELECT
        count(*)::int as total,
        count(*) FILTER (WHERE state = 'idle')::int as idle,
        count(*) FILTER (WHERE state = 'active' AND waiting = true)::int as waiting
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;

    const stats = result[0] || { total: 0, idle: 0, waiting: 0 };

    return {
      totalConnections: stats.total,
      idleConnections: stats.idle,
      waitingQueries: stats.waiting,
    };
  } catch (error) {
    console.error("Failed to get database stats:", error);
    return {
      totalConnections: 0,
      idleConnections: 0,
      waitingQueries: 0,
    };
  }
}

/**
 * Escape SQL identifier (table name, column name, etc.)
 *
 * @param identifier - Identifier to escape
 * @returns {string} Escaped identifier
 */
export function escapeIdentifier(identifier: string): string {
  if (!identifier || typeof identifier !== "string") {
    throw new Error("Identifier must be a non-empty string");
  }

  // PostgreSQL identifier escaping
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Build parameterized query from template
 *
 * @param template - SQL template with ${} placeholders
 * @param params - Parameters to substitute
 * @returns {Object} Object with sql string and params array
 */
export function buildParameterizedQuery(
  template: string,
  params: Record<string, any>,
): { sql: string; params: any[] } {
  let paramIndex = 0;
  const paramArray: any[] = [];

  const sql = template.replace(
    /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g,
    (match, key) => {
      if (!(key in params)) {
        throw new Error(`Parameter '${key}' not found in params object`);
      }

      paramIndex += 1;
      paramArray.push(params[key]);
      return `$${paramIndex}`;
    },
  );

  return { sql, params: paramArray };
}

/**
 * Format PostgreSQL error for better readability
 *
 * @param error - PostgreSQL error
 * @returns {string} Formatted error message
 */
export function formatPostgresError(error: any): string {
  if (!error) return "Unknown database error";

  const message = error.message || "Unknown error";
  const detail = error.detail;
  const hint = error.hint;
  const code = error.code;

  let formatted = message;

  if (code) {
    formatted += ` (${code})`;
  }

  if (detail) {
    formatted += `\n  Detail: ${detail}`;
  }

  if (hint) {
    formatted += `\n  Hint: ${hint}`;
  }

  return formatted;
}
