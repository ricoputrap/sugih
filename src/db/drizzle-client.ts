/**
 * Drizzle ORM PostgreSQL Database Client
 *
 * Provides database connection pooling and query execution helpers
 * for the Sugih personal finance application using Drizzle ORM
 * with node-postgres driver.
 *
 * This module replaces the raw postgres client with Drizzle ORM support,
 * implementing connection pooling, type-safe queries, and transactions.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { getDatabaseConfig } from "./config";
import * as schema from "./schema";

// Re-export Drizzle ORM utilities
export { sql } from "drizzle-orm";
export {
  eq,
  and,
  or,
  desc,
  asc,
  isNull,
  isNotNull,
  gte,
  lte,
  gt,
  lt,
  inArray,
  notInArray,
  like,
  notLike,
  between,
  exists,
  notExists,
} from "drizzle-orm";

// Re-export schema for external access
export { schema };

// Singleton pattern for database connection with pooling
let pool: Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Get the Drizzle database instance
 *
 * Uses DATABASE_URL from environment (already parsed in config.ts).
 * No need for individual PGHOST/PGPORT/PGUSER etc.
 *
 * @returns {ReturnType<typeof drizzle<typeof schema>>} Drizzle database instance
 */
export function getDb() {
  if (!db || !pool) {
    const config = getDatabaseConfig();

    pool = new Pool({
      connectionString: config.url,
      max: config.maxConnections,
      idleTimeoutMillis: config.idleTimeout,
      connectionTimeoutMillis: config.connectionTimeout,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
    });

    db = drizzle(pool, { schema });
  }

  return db!;
}

/**
 * Get the raw pg Pool for advanced operations
 *
 * @returns {Pool} Raw PostgreSQL connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    getDb(); // Initialize pool
  }
  return pool!;
}

/**
 * Close the database connection pool
 *
 * Call this during application shutdown or test teardown.
 */
export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

/**
 * Check database connectivity
 *
 * @returns {Promise<boolean>} True if connection is healthy
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const database = getDb();
    await database.execute(sql`SELECT 1`);
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
    const pool = getPool();
    const result = await pool.query(`
      SELECT
        count(*)::int as total,
        count(*) FILTER (WHERE state = 'idle')::int as idle,
        count(*) FILTER (WHERE state = 'active' AND waiting = true)::int as waiting
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);

    const stats = result.rows[0] || { total: 0, idle: 0, waiting: 0 };

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
    const pool = getPool();
    const result = await pool.query<T>(sqlQuery, params);
    return result.rows;
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
