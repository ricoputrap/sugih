/**
 * PostgreSQL Query Helpers
 *
 * Provides query builder utilities and helper functions for PostgreSQL queries.
 * Handles parameter syntax conversion, batch operations, and query construction.
 *
 * This module complements the client.ts by providing higher-level query utilities
 * that handle the differences between SQLite and PostgreSQL query syntax.
 */

import { getDb, escapeIdentifier } from "./client";

/**
 * Parameter placeholder styles
 */
export type ParameterStyle = "positional" | "named";

/**
 * Query result with metadata
 */
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
}

/**
 * Insert result with returning id
 */
export interface InsertResult {
  id: string | number;
  rowCount: number;
}

/**
 * Update/Delete result
 */
export interface ModifyResult {
  rowCount: number;
  success: boolean;
}

/**
 * Convert SQLite-style parameter placeholders (?) to PostgreSQL style ($1, $2, etc.)
 *
 * @param sql - SQL string with ? placeholders
 * @returns SQL string with $n placeholders
 *
 * @example
 * convertPlaceholders("SELECT * FROM users WHERE id = ? AND name = ?")
 * // Returns: "SELECT * FROM users WHERE id = $1 AND name = $2"
 */
export function convertPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

/**
 * Convert named parameters (:name) to PostgreSQL positional parameters ($1, $2, etc.)
 *
 * @param sql - SQL string with :name placeholders
 * @param params - Object with named parameters
 * @returns Object with converted SQL and ordered parameter array
 *
 * @example
 * convertNamedParams(
 *   "SELECT * FROM users WHERE id = :id AND name = :name",
 *   { id: 1, name: "John" }
 * )
 * // Returns: { sql: "SELECT * FROM users WHERE id = $1 AND name = $2", params: [1, "John"] }
 */
export function convertNamedParams(
  sql: string,
  params: Record<string, any>,
): { sql: string; params: any[] } {
  const paramArray: any[] = [];
  const paramMap: Map<string, number> = new Map();
  let paramIndex = 0;

  const convertedSql = sql.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
    if (!(name in params)) {
      throw new Error(`Named parameter ':${name}' not found in params object`);
    }

    // Check if we've already seen this parameter
    if (paramMap.has(name)) {
      return `$${paramMap.get(name)}`;
    }

    paramIndex += 1;
    paramMap.set(name, paramIndex);
    paramArray.push(params[name]);
    return `$${paramIndex}`;
  });

  return { sql: convertedSql, params: paramArray };
}

/**
 * Build an INSERT statement with RETURNING clause
 *
 * @param table - Table name
 * @param data - Object with column-value pairs
 * @param returning - Column(s) to return (default: "id")
 * @returns Object with SQL and parameters
 *
 * @example
 * buildInsert("users", { name: "John", email: "john@example.com" })
 * // Returns: {
 * //   sql: 'INSERT INTO "users" ("name", "email") VALUES ($1, $2) RETURNING "id"',
 * //   params: ["John", "john@example.com"]
 * // }
 */
export function buildInsert(
  table: string,
  data: Record<string, any>,
  returning: string | string[] = "id",
): { sql: string; params: any[] } {
  const columns = Object.keys(data);
  const values = Object.values(data);

  if (columns.length === 0) {
    throw new Error("Insert data cannot be empty");
  }

  const columnList = columns.map((col) => escapeIdentifier(col)).join(", ");
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");

  const returningColumns = Array.isArray(returning)
    ? returning.map((col) => escapeIdentifier(col)).join(", ")
    : escapeIdentifier(returning);

  const sql = `INSERT INTO ${escapeIdentifier(table)} (${columnList}) VALUES (${placeholders}) RETURNING ${returningColumns}`;

  return { sql, params: values };
}

/**
 * Build an UPDATE statement
 *
 * @param table - Table name
 * @param data - Object with column-value pairs to update
 * @param where - WHERE clause conditions
 * @param whereParams - Parameters for WHERE clause
 * @returns Object with SQL and parameters
 *
 * @example
 * buildUpdate("users", { name: "Jane" }, "id = $1", [1])
 * // Returns: {
 * //   sql: 'UPDATE "users" SET "name" = $2 WHERE id = $1',
 * //   params: [1, "Jane"]
 * // }
 */
export function buildUpdate(
  table: string,
  data: Record<string, any>,
  where: string,
  whereParams: any[] = [],
): { sql: string; params: any[] } {
  const columns = Object.keys(data);
  const values = Object.values(data);

  if (columns.length === 0) {
    throw new Error("Update data cannot be empty");
  }

  // Adjust parameter indices based on whereParams count
  const setClause = columns
    .map(
      (col, i) => `${escapeIdentifier(col)} = $${whereParams.length + i + 1}`,
    )
    .join(", ");

  const sql = `UPDATE ${escapeIdentifier(table)} SET ${setClause} WHERE ${where}`;

  return { sql, params: [...whereParams, ...values] };
}

/**
 * Build a DELETE statement
 *
 * @param table - Table name
 * @param where - WHERE clause conditions
 * @param whereParams - Parameters for WHERE clause
 * @returns Object with SQL and parameters
 *
 * @example
 * buildDelete("users", "id = $1", [1])
 * // Returns: {
 * //   sql: 'DELETE FROM "users" WHERE id = $1',
 * //   params: [1]
 * // }
 */
export function buildDelete(
  table: string,
  where: string,
  whereParams: any[] = [],
): { sql: string; params: any[] } {
  const sql = `DELETE FROM ${escapeIdentifier(table)} WHERE ${where}`;
  return { sql, params: whereParams };
}

/**
 * Build a SELECT statement
 *
 * @param table - Table name
 * @param columns - Columns to select (default: "*")
 * @param where - Optional WHERE clause
 * @param whereParams - Parameters for WHERE clause
 * @param options - Additional options (orderBy, limit, offset)
 * @returns Object with SQL and parameters
 *
 * @example
 * buildSelect("users", ["id", "name"], "active = $1", [true], { orderBy: "name", limit: 10 })
 */
export function buildSelect(
  table: string,
  columns: string[] | "*" = "*",
  where?: string,
  whereParams: any[] = [],
  options: {
    orderBy?: string | string[];
    limit?: number;
    offset?: number;
  } = {},
): { sql: string; params: any[] } {
  const columnList =
    columns === "*"
      ? "*"
      : columns.map((col) => escapeIdentifier(col)).join(", ");

  let sql = `SELECT ${columnList} FROM ${escapeIdentifier(table)}`;
  const params = [...whereParams];

  if (where) {
    sql += ` WHERE ${where}`;
  }

  if (options.orderBy) {
    const orderColumns = Array.isArray(options.orderBy)
      ? options.orderBy.join(", ")
      : options.orderBy;
    sql += ` ORDER BY ${orderColumns}`;
  }

  if (options.limit !== undefined) {
    params.push(options.limit);
    sql += ` LIMIT $${params.length}`;
  }

  if (options.offset !== undefined) {
    params.push(options.offset);
    sql += ` OFFSET $${params.length}`;
  }

  return { sql, params };
}

/**
 * Build a batch INSERT statement for multiple rows
 *
 * @param table - Table name
 * @param columns - Column names
 * @param rows - Array of value arrays
 * @param returning - Column(s) to return
 * @returns Object with SQL and parameters
 *
 * @example
 * buildBatchInsert("users", ["name", "email"], [
 *   ["John", "john@example.com"],
 *   ["Jane", "jane@example.com"]
 * ])
 */
export function buildBatchInsert(
  table: string,
  columns: string[],
  rows: any[][],
  returning: string | string[] = "id",
): { sql: string; params: any[] } {
  if (columns.length === 0) {
    throw new Error("Columns cannot be empty");
  }

  if (rows.length === 0) {
    throw new Error("Rows cannot be empty");
  }

  const columnList = columns.map((col) => escapeIdentifier(col)).join(", ");
  const params: any[] = [];
  let paramIndex = 0;

  const valueSets = rows.map((row) => {
    if (row.length !== columns.length) {
      throw new Error(
        `Row has ${row.length} values but expected ${columns.length} columns`,
      );
    }

    const placeholders = row.map(() => {
      paramIndex += 1;
      return `$${paramIndex}`;
    });

    params.push(...row);
    return `(${placeholders.join(", ")})`;
  });

  const returningColumns = Array.isArray(returning)
    ? returning.map((col) => escapeIdentifier(col)).join(", ")
    : escapeIdentifier(returning);

  const sql = `INSERT INTO ${escapeIdentifier(table)} (${columnList}) VALUES ${valueSets.join(", ")} RETURNING ${returningColumns}`;

  return { sql, params };
}

/**
 * Build an UPSERT (INSERT ... ON CONFLICT) statement
 *
 * @param table - Table name
 * @param data - Object with column-value pairs
 * @param conflictColumns - Column(s) that define the conflict
 * @param updateColumns - Column(s) to update on conflict (default: all non-conflict columns)
 * @param returning - Column(s) to return
 * @returns Object with SQL and parameters
 *
 * @example
 * buildUpsert("users", { id: 1, name: "John", email: "john@example.com" }, ["id"])
 */
export function buildUpsert(
  table: string,
  data: Record<string, any>,
  conflictColumns: string[],
  updateColumns?: string[],
  returning: string | string[] = "id",
): { sql: string; params: any[] } {
  const columns = Object.keys(data);
  const values = Object.values(data);

  if (columns.length === 0) {
    throw new Error("Upsert data cannot be empty");
  }

  if (conflictColumns.length === 0) {
    throw new Error("Conflict columns cannot be empty");
  }

  const columnList = columns.map((col) => escapeIdentifier(col)).join(", ");
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  const conflictList = conflictColumns
    .map((col) => escapeIdentifier(col))
    .join(", ");

  // Determine which columns to update (exclude conflict columns)
  const columnsToUpdate =
    updateColumns || columns.filter((col) => !conflictColumns.includes(col));

  const updateClause = columnsToUpdate
    .map(
      (col) => `${escapeIdentifier(col)} = EXCLUDED.${escapeIdentifier(col)}`,
    )
    .join(", ");

  const returningColumns = Array.isArray(returning)
    ? returning.map((col) => escapeIdentifier(col)).join(", ")
    : escapeIdentifier(returning);

  let sql = `INSERT INTO ${escapeIdentifier(table)} (${columnList}) VALUES (${placeholders})`;
  sql += ` ON CONFLICT (${conflictList})`;

  if (columnsToUpdate.length > 0) {
    sql += ` DO UPDATE SET ${updateClause}`;
  } else {
    sql += " DO NOTHING";
  }

  sql += ` RETURNING ${returningColumns}`;

  return { sql, params: values };
}

/**
 * Build a WHERE clause from an object of conditions
 *
 * @param conditions - Object with column-value pairs
 * @param operator - Logical operator to join conditions (default: "AND")
 * @param startIndex - Starting parameter index (default: 1)
 * @returns Object with WHERE clause and parameters
 *
 * @example
 * buildWhereClause({ name: "John", active: true })
 * // Returns: { clause: '"name" = $1 AND "active" = $2', params: ["John", true] }
 */
export function buildWhereClause(
  conditions: Record<string, any>,
  operator: "AND" | "OR" = "AND",
  startIndex: number = 1,
): { clause: string; params: any[]; nextIndex: number } {
  const entries = Object.entries(conditions);
  const params: any[] = [];
  let paramIndex = startIndex;

  const clauses = entries.map(([column, value]) => {
    if (value === null) {
      return `${escapeIdentifier(column)} IS NULL`;
    }

    if (Array.isArray(value)) {
      // Handle IN clause
      const placeholders = value.map(() => {
        const placeholder = `$${paramIndex}`;
        paramIndex += 1;
        return placeholder;
      });
      params.push(...value);
      return `${escapeIdentifier(column)} IN (${placeholders.join(", ")})`;
    }

    const placeholder = `$${paramIndex}`;
    paramIndex += 1;
    params.push(value);
    return `${escapeIdentifier(column)} = ${placeholder}`;
  });

  return {
    clause: clauses.join(` ${operator} `),
    params,
    nextIndex: paramIndex,
  };
}

/**
 * Execute a raw SQL query with PostgreSQL-style parameters
 *
 * @param sqlQuery - SQL query string with $n placeholders
 * @param params - Array of parameters
 * @returns Promise resolving to array of results
 */
export async function executeQuery<T = any>(
  sqlQuery: string,
  params: any[] = [],
): Promise<T[]> {
  const db = getDb();

  try {
    // Use unsafe for raw SQL with array parameters
    const result = await db.unsafe<T[]>(sqlQuery, params);
    return Array.from(result);
  } catch (error) {
    console.error("Query execution error:", {
      sql: sqlQuery,
      params,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

/**
 * Execute a raw SQL query and return a single result
 *
 * @param sqlQuery - SQL query string with $n placeholders
 * @param params - Array of parameters
 * @returns Promise resolving to single result or undefined
 */
export async function executeQueryOne<T = any>(
  sqlQuery: string,
  params: any[] = [],
): Promise<T | undefined> {
  const results = await executeQuery<T>(sqlQuery, params);
  return results[0];
}

/**
 * Execute an INSERT query and return the inserted row
 *
 * @param table - Table name
 * @param data - Object with column-value pairs
 * @param returning - Column(s) to return
 * @returns Promise resolving to inserted row
 */
export async function insert<T = any>(
  table: string,
  data: Record<string, any>,
  returning: string | string[] = "id",
): Promise<T> {
  const { sql, params } = buildInsert(table, data, returning);
  const result = await executeQueryOne<T>(sql, params);

  if (!result) {
    throw new Error(`Insert into ${table} did not return a result`);
  }

  return result;
}

/**
 * Execute an UPDATE query and return the number of affected rows
 *
 * @param table - Table name
 * @param data - Object with column-value pairs to update
 * @param where - WHERE clause conditions
 * @param whereParams - Parameters for WHERE clause
 * @returns Promise resolving to number of affected rows
 */
export async function update(
  table: string,
  data: Record<string, any>,
  where: string,
  whereParams: any[] = [],
): Promise<ModifyResult> {
  const { sql, params } = buildUpdate(table, data, where, whereParams);
  const db = getDb();

  try {
    const result = await db.unsafe(sql, params);
    return {
      rowCount: result.count,
      success: result.count > 0,
    };
  } catch (error) {
    console.error("Update execution error:", {
      sql,
      params,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

/**
 * Execute a DELETE query and return the number of affected rows
 *
 * @param table - Table name
 * @param where - WHERE clause conditions
 * @param whereParams - Parameters for WHERE clause
 * @returns Promise resolving to number of affected rows
 */
export async function remove(
  table: string,
  where: string,
  whereParams: any[] = [],
): Promise<ModifyResult> {
  const { sql, params } = buildDelete(table, where, whereParams);
  const db = getDb();

  try {
    const result = await db.unsafe(sql, params);
    return {
      rowCount: result.count,
      success: result.count > 0,
    };
  } catch (error) {
    console.error("Delete execution error:", {
      sql,
      params,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

/**
 * Execute an UPSERT query and return the resulting row
 *
 * @param table - Table name
 * @param data - Object with column-value pairs
 * @param conflictColumns - Column(s) that define the conflict
 * @param updateColumns - Column(s) to update on conflict
 * @param returning - Column(s) to return
 * @returns Promise resolving to the upserted row
 */
export async function upsert<T = any>(
  table: string,
  data: Record<string, any>,
  conflictColumns: string[],
  updateColumns?: string[],
  returning: string | string[] = "id",
): Promise<T> {
  const { sql, params } = buildUpsert(
    table,
    data,
    conflictColumns,
    updateColumns,
    returning,
  );
  const result = await executeQueryOne<T>(sql, params);

  if (!result) {
    throw new Error(`Upsert into ${table} did not return a result`);
  }

  return result;
}

/**
 * Execute a batch INSERT query and return all inserted rows
 *
 * @param table - Table name
 * @param columns - Column names
 * @param rows - Array of value arrays
 * @param returning - Column(s) to return
 * @returns Promise resolving to array of inserted rows
 */
export async function batchInsert<T = any>(
  table: string,
  columns: string[],
  rows: any[][],
  returning: string | string[] = "id",
): Promise<T[]> {
  const { sql, params } = buildBatchInsert(table, columns, rows, returning);
  return executeQuery<T>(sql, params);
}

/**
 * Check if a record exists
 *
 * @param table - Table name
 * @param where - WHERE clause conditions
 * @param whereParams - Parameters for WHERE clause
 * @returns Promise resolving to boolean
 */
export async function exists(
  table: string,
  where: string,
  whereParams: any[] = [],
): Promise<boolean> {
  const sql = `SELECT EXISTS(SELECT 1 FROM ${escapeIdentifier(table)} WHERE ${where}) as "exists"`;
  const result = await executeQueryOne<{ exists: boolean }>(sql, whereParams);
  return result?.exists ?? false;
}

/**
 * Count records in a table
 *
 * @param table - Table name
 * @param where - Optional WHERE clause
 * @param whereParams - Parameters for WHERE clause
 * @returns Promise resolving to count
 */
export async function count(
  table: string,
  where?: string,
  whereParams: any[] = [],
): Promise<number> {
  let sql = `SELECT COUNT(*)::int as "count" FROM ${escapeIdentifier(table)}`;

  if (where) {
    sql += ` WHERE ${where}`;
  }

  const result = await executeQueryOne<{ count: number }>(sql, whereParams);
  return result?.count ?? 0;
}

/**
 * Find records by conditions object
 *
 * @param table - Table name
 * @param conditions - Object with column-value pairs for WHERE clause
 * @param options - Additional options (orderBy, limit, offset)
 * @returns Promise resolving to array of results
 */
export async function findBy<T = any>(
  table: string,
  conditions: Record<string, any>,
  options: {
    columns?: string[];
    orderBy?: string | string[];
    limit?: number;
    offset?: number;
  } = {},
): Promise<T[]> {
  const { clause, params, nextIndex } = buildWhereClause(conditions);
  const { sql, params: allParams } = buildSelect(
    table,
    options.columns || "*",
    clause,
    params,
    {
      orderBy: options.orderBy,
      limit: options.limit,
      offset: options.offset,
    },
  );

  return executeQuery<T>(sql, allParams);
}

/**
 * Find a single record by conditions object
 *
 * @param table - Table name
 * @param conditions - Object with column-value pairs for WHERE clause
 * @param options - Additional options (columns)
 * @returns Promise resolving to single result or undefined
 */
export async function findOneBy<T = any>(
  table: string,
  conditions: Record<string, any>,
  options: { columns?: string[] } = {},
): Promise<T | undefined> {
  const results = await findBy<T>(table, conditions, {
    ...options,
    limit: 1,
  });
  return results[0];
}

/**
 * Find a record by ID
 *
 * @param table - Table name
 * @param id - Record ID
 * @param idColumn - ID column name (default: "id")
 * @returns Promise resolving to single result or undefined
 */
export async function findById<T = any>(
  table: string,
  id: string | number,
  idColumn: string = "id",
): Promise<T | undefined> {
  return findOneBy<T>(table, { [idColumn]: id });
}

/**
 * Paginate query results
 *
 * @param table - Table name
 * @param page - Page number (1-based)
 * @param pageSize - Number of items per page
 * @param options - Additional options (where, whereParams, orderBy)
 * @returns Promise resolving to paginated results
 */
export async function paginate<T = any>(
  table: string,
  page: number = 1,
  pageSize: number = 20,
  options: {
    where?: string;
    whereParams?: any[];
    orderBy?: string | string[];
    columns?: string[];
  } = {},
): Promise<{
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const offset = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    (async () => {
      const { sql, params } = buildSelect(
        table,
        options.columns || "*",
        options.where,
        options.whereParams || [],
        {
          orderBy: options.orderBy,
          limit: pageSize,
          offset,
        },
      );
      return executeQuery<T>(sql, params);
    })(),
    count(table, options.where, options.whereParams),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
