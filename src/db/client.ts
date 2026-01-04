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

import postgres, { Sql } from "postgres";
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
      connect_timeout: config.connectionTimeout,
      idle_timeout: config.idleTimeout,
      max: config.maxConnections,

      // Keep column names as-is (snake_case from database)
      // TypeScript types already expect snake_case from the schema
    });
  }

  return sql;
}

/**
 * Execute a query and return all results
 *
 * @param sqlQuery - SQL query string
 * @param params - Parameters to bind to the query (optional)
 * @returns {Promise<Array<T>>} Array of result rows
 * @throws {Error} If query execution fails
 */
export async function all<T = any>(
  sqlQuery: string,
  ...params: any[]
): Promise<T[]> {
  try {
    const db = getDb();
    // Use unsafe() for dynamic SQL strings - safe for simple queries without user input
    const result = await db.unsafe<T[]>(sqlQuery, params);
    return Array.from(result);
  } catch (error) {
    console.error("Database query error (all):", {
      sql: sqlQuery,
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
 * @param sqlQuery - SQL query string
 * @param params - Parameters to bind to the query
 * @returns {Promise<T | undefined>} Single result row or undefined
 * @throws {Error} If query execution fails
 */
export async function get<T = any>(
  sqlQuery: string,
  ...params: any[]
): Promise<T | undefined> {
  try {
    const db = getDb();
    // Use unsafe() for dynamic SQL strings
    const result = await db.unsafe<T[]>(sqlQuery, params);
    return result[0];
  } catch (error) {
    console.error("Database query error (get):", {
      sql: sqlQuery,
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
 * @param sqlQuery - SQL query string
 * @param params - Parameters to bind to the query
 * @returns {Promise<{rowsAffected: number}>} Result metadata
 * @throws {Error} If query execution fails
 */
export async function run(
  sqlQuery: string,
  ...params: any[]
): Promise<{ rowsAffected: number }> {
  try {
    const db = getDb();
    // Use unsafe() for dynamic SQL strings
    const result = await db.unsafe(sqlQuery, params);

    // postgres returns affected rows in the result.count
    return {
      rowsAffected: result.count || 0,
    };
  } catch (error) {
    console.error("Database query error (run):", {
      sql: sqlQuery,
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
export async function transaction<T>(fn: (tx: Sql) => Promise<T>): Promise<T> {
  try {
    const db = getDb();
    return (await db.begin(fn)) as T;
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
export async function transactionSync<T>(fn: (tx: Sql) => T): Promise<T> {
  try {
    const db = getDb();
    return (await db.begin(async (tx) => {
      // Execute synchronous function in async context
      return fn(tx);
    })) as T;
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
    const result = await db`
      SELECT
        count(*)::int as total,
        count(*) FILTER (WHERE state = 'idle')::int as idle,
        count(*) FILTER (WHERE state = 'active' AND waiting = true)::int as waiting
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;

    const stats = (result[0] as {
      total: number;
      idle: number;
      waiting: number;
    }) || { total: 0, idle: 0, waiting: 0 };

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
