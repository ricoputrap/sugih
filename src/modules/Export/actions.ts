/**
 * Export Module Actions
 *
 * Server-side logic for exporting data from the Sugih application.
 * Uses raw SQL queries for all database operations.
 *
 * Exports:
 * - Transactions as CSV
 * - Full database backup as JSON
 * - Individual table exports
 */

import { all } from "@/db/drizzle-client";
import {
  TransactionExportSchema,
  DatabaseBackupSchema,
  WalletExportSchema,
  CategoryExportSchema,
  SavingsBucketExportSchema,
  BudgetExportSchema,
  type TransactionExportInput,
  type DatabaseBackupInput,
  type WalletExportInput,
  type CategoryExportInput,
  type SavingsBucketExportInput,
  type BudgetExportInput,
} from "./schema";

/**
 * Transaction row structure from the database
 */
interface TransactionExportRow {
  id: string;
  occurred_at: Date;
  type: string;
  note: string | null;
  payee: string | null;
  category_name: string | null;
  deleted_at: Date | null;
  wallet_name: string | null;
  savings_bucket_name: string | null;
  amount_idr: number;
  from_wallet_name: string | null;
  to_wallet_name: string | null;
}

/**
 * Export transactions as CSV data
 *
 * @param input - Export options (date range, include deleted)
 * @returns CSV string with transaction data
 */
export async function exportTransactionsAsCsv(
  input: Partial<TransactionExportInput>,
): Promise<string> {
  const validatedInput = TransactionExportSchema.parse(input);

  let whereConditions: string[] = [];
  const params: string[] = [];
  let paramIndex = 0;

  // Add date range filters
  if (validatedInput.from) {
    paramIndex += 1;
    whereConditions.push(`te.occurred_at >= $${paramIndex}`);
    params.push(validatedInput.from.toISOString());
  }

  if (validatedInput.to) {
    paramIndex += 1;
    whereConditions.push(`te.occurred_at <= $${paramIndex}`);
    params.push(validatedInput.to.toISOString());
  }

  // Exclude deleted unless specifically requested
  if (!validatedInput.includeDeleted) {
    whereConditions.push("te.deleted_at IS NULL");
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  // Query transactions with all related data
  const sql = `
    SELECT
      te.id,
      te.occurred_at,
      te.type,
      te.note,
      te.payee,
      c.name as category_name,
      te.deleted_at,
      -- Get wallet info for single-wallet transactions
      CASE
        WHEN te.type IN ('expense', 'income') THEN w.name
        WHEN te.type IN ('savings_contribution', 'savings_withdrawal') THEN w.name
        ELSE NULL
      END as wallet_name,
      -- Get savings bucket info
      CASE
        WHEN te.type IN ('savings_contribution', 'savings_withdrawal') THEN sb.name
        ELSE NULL
      END as savings_bucket_name,
      -- Get amount (absolute value for display)
      CASE
        WHEN te.type = 'expense' THEN ABS(p.amount_idr)
        WHEN te.type = 'income' THEN p.amount_idr
        WHEN te.type = 'transfer' THEN ABS(p_from.amount_idr)
        WHEN te.type = 'savings_contribution' THEN ABS(p_wallet.amount_idr)
        WHEN te.type = 'savings_withdrawal' THEN ABS(p_bucket.amount_idr)
        ELSE 0
      END as amount_idr,
      -- Get from/to wallet for transfers
      w_from.name as from_wallet_name,
      w_to.name as to_wallet_name
    FROM transaction_events te
    LEFT JOIN categories c ON te.category_id = c.id
    -- Single wallet posting (expense/income)
    LEFT JOIN postings p ON p.event_id = te.id
      AND te.type IN ('expense', 'income')
      AND p.wallet_id IS NOT NULL
    LEFT JOIN wallets w ON w.id = p.wallet_id
    -- Transfer postings
    LEFT JOIN postings p_from ON p_from.event_id = te.id
      AND te.type = 'transfer'
      AND p_from.amount_idr < 0
    LEFT JOIN wallets w_from ON w_from.id = p_from.wallet_id
    LEFT JOIN postings p_to ON p_to.event_id = te.id
      AND te.type = 'transfer'
      AND p_to.amount_idr > 0
    LEFT JOIN wallets w_to ON w_to.id = p_to.wallet_id
    -- Savings postings (wallet)
    LEFT JOIN postings p_wallet ON p_wallet.event_id = te.id
      AND te.type IN ('savings_contribution', 'savings_withdrawal')
      AND p_wallet.wallet_id IS NOT NULL
    -- Savings postings (bucket)
    LEFT JOIN postings p_bucket ON p_bucket.event_id = te.id
      AND te.type IN ('savings_contribution', 'savings_withdrawal')
      AND p_bucket.savings_bucket_id IS NOT NULL
    LEFT JOIN savings_buckets sb ON sb.id = p_bucket.savings_bucket_id
    ${whereClause}
    ORDER BY te.occurred_at DESC, te.created_at DESC
  `;

  const rows = await all<TransactionExportRow>(sql, ...params);

  // Build CSV
  const headers = [
    "ID",
    "Date",
    "Type",
    "Amount (IDR)",
    "Category",
    "Wallet",
    "From Wallet",
    "To Wallet",
    "Savings Bucket",
    "Payee",
    "Note",
    "Deleted",
  ];

  const csvRows = rows.map((row) => [
    escapeCSV(row.id),
    escapeCSV(formatDate(row.occurred_at)),
    escapeCSV(row.type),
    row.amount_idr.toString(),
    escapeCSV(row.category_name || ""),
    escapeCSV(row.wallet_name || ""),
    escapeCSV(row.from_wallet_name || ""),
    escapeCSV(row.to_wallet_name || ""),
    escapeCSV(row.savings_bucket_name || ""),
    escapeCSV(row.payee || ""),
    escapeCSV(row.note || ""),
    row.deleted_at ? "Yes" : "No",
  ]);

  return [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");
}

/**
 * Export wallets as CSV
 */
export async function exportWalletsAsCsv(
  input: Partial<WalletExportInput>,
): Promise<string> {
  const validatedInput = WalletExportSchema.parse(input);

  const whereClause = validatedInput.includeArchived
    ? ""
    : "WHERE archived = false";

  const sql = `
    SELECT
      id,
      name,
      type,
      currency,
      archived,
      created_at,
      updated_at,
      (
        SELECT COALESCE(SUM(p.amount_idr), 0)
        FROM postings p
        JOIN transaction_events te ON te.id = p.event_id
        WHERE p.wallet_id = w.id
        AND te.deleted_at IS NULL
      ) as balance
    FROM wallets w
    ${whereClause}
    ORDER BY name
  `;

  const rows = await all<{
    id: string;
    name: string;
    type: string;
    currency: string;
    archived: boolean;
    created_at: Date;
    updated_at: Date;
    balance: number;
  }>(sql);

  const headers = [
    "ID",
    "Name",
    "Type",
    "Currency",
    "Balance",
    "Archived",
    "Created At",
    "Updated At",
  ];

  const csvRows = rows.map((row) => [
    escapeCSV(row.id),
    escapeCSV(row.name),
    escapeCSV(row.type),
    escapeCSV(row.currency),
    row.balance.toString(),
    row.archived ? "Yes" : "No",
    escapeCSV(formatDate(row.created_at)),
    escapeCSV(formatDate(row.updated_at)),
  ]);

  return [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");
}

/**
 * Export categories as CSV
 */
export async function exportCategoriesAsCsv(
  input: Partial<CategoryExportInput>,
): Promise<string> {
  const validatedInput = CategoryExportSchema.parse(input);

  const whereClause = validatedInput.includeArchived
    ? ""
    : "WHERE archived = false";

  const sql = `
    SELECT
      id,
      name,
      archived,
      created_at,
      updated_at
    FROM categories
    ${whereClause}
    ORDER BY name
  `;

  const rows = await all<{
    id: string;
    name: string;
    archived: boolean;
    created_at: Date;
    updated_at: Date;
  }>(sql);

  const headers = ["ID", "Name", "Archived", "Created At", "Updated At"];

  const csvRows = rows.map((row) => [
    escapeCSV(row.id),
    escapeCSV(row.name),
    row.archived ? "Yes" : "No",
    escapeCSV(formatDate(row.created_at)),
    escapeCSV(formatDate(row.updated_at)),
  ]);

  return [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");
}

/**
 * Export savings buckets as CSV
 */
export async function exportSavingsBucketsAsCsv(
  input: Partial<SavingsBucketExportInput>,
): Promise<string> {
  const validatedInput = SavingsBucketExportSchema.parse(input);

  const whereClause = validatedInput.includeArchived
    ? ""
    : "WHERE archived = false";

  const sql = `
    SELECT
      sb.id,
      sb.name,
      sb.description,
      sb.archived,
      sb.created_at,
      sb.updated_at,
      (
        SELECT COALESCE(SUM(p.amount_idr), 0)
        FROM postings p
        JOIN transaction_events te ON te.id = p.event_id
        WHERE p.savings_bucket_id = sb.id
        AND te.deleted_at IS NULL
      ) as balance
    FROM savings_buckets sb
    ${whereClause}
    ORDER BY sb.name
  `;

  const rows = await all<{
    id: string;
    name: string;
    description: string | null;
    archived: boolean;
    created_at: Date;
    updated_at: Date;
    balance: number;
  }>(sql);

  const headers = [
    "ID",
    "Name",
    "Description",
    "Balance",
    "Archived",
    "Created At",
    "Updated At",
  ];

  const csvRows = rows.map((row) => [
    escapeCSV(row.id),
    escapeCSV(row.name),
    escapeCSV(row.description || ""),
    row.balance.toString(),
    row.archived ? "Yes" : "No",
    escapeCSV(formatDate(row.created_at)),
    escapeCSV(formatDate(row.updated_at)),
  ]);

  return [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");
}

/**
 * Export budgets as CSV
 */
export async function exportBudgetsAsCsv(
  input: Partial<BudgetExportInput>,
): Promise<string> {
  const validatedInput = BudgetExportSchema.parse(input);

  let whereConditions: string[] = [];
  const params: string[] = [];
  let paramIndex = 0;

  if (validatedInput.from) {
    paramIndex += 1;
    whereConditions.push(`b.month >= $${paramIndex}`);
    params.push(`${validatedInput.from}-01`);
  }

  if (validatedInput.to) {
    paramIndex += 1;
    whereConditions.push(`b.month <= $${paramIndex}`);
    params.push(`${validatedInput.to}-01`);
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  const sql = `
    SELECT
      b.id,
      b.month,
      c.name as category_name,
      b.amount_idr,
      b.created_at,
      b.updated_at
    FROM budgets b
    JOIN categories c ON c.id = b.category_id
    ${whereClause}
    ORDER BY b.month DESC, c.name
  `;

  const rows = await all<{
    id: string;
    month: string;
    category_name: string;
    amount_idr: number;
    created_at: Date;
    updated_at: Date;
  }>(sql, ...params);

  const headers = [
    "ID",
    "Month",
    "Category",
    "Budget Amount (IDR)",
    "Created At",
    "Updated At",
  ];

  const csvRows = rows.map((row) => [
    escapeCSV(row.id),
    escapeCSV(row.month),
    escapeCSV(row.category_name),
    row.amount_idr.toString(),
    escapeCSV(formatDate(row.created_at)),
    escapeCSV(formatDate(row.updated_at)),
  ]);

  return [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");
}

/**
 * Export full database as JSON backup
 *
 * @param input - Backup options (format, tables)
 * @returns JSON object with all data
 */
export async function exportDatabaseAsJson(
  input: Partial<DatabaseBackupInput>,
): Promise<object> {
  const validatedInput = DatabaseBackupSchema.parse(input);

  const allTables = [
    "wallets",
    "categories",
    "savings_buckets",
    "transaction_events",
    "postings",
    "budgets",
  ] as const;

  const tablesToExport = validatedInput.tables || allTables;

  const backup: Record<string, any[]> = {
    _metadata: [
      {
        exportedAt: new Date().toISOString(),
        format: validatedInput.format,
        tables: tablesToExport,
        version: "1.0.0",
      },
    ],
  };

  for (const table of tablesToExport) {
    const sql = `SELECT * FROM ${table} ORDER BY created_at`;
    const rows = await all(sql);
    backup[table] = rows;
  }

  return backup;
}

/**
 * Export full database as SQL statements
 *
 * @param input - Backup options
 * @returns SQL string with INSERT statements
 */
export async function exportDatabaseAsSql(
  input: Partial<DatabaseBackupInput>,
): Promise<string> {
  const validatedInput = DatabaseBackupSchema.parse(input);

  const allTables = [
    "wallets",
    "categories",
    "savings_buckets",
    "transaction_events",
    "postings",
    "budgets",
  ] as const;

  const tablesToExport = validatedInput.tables || allTables;

  const sqlStatements: string[] = [
    "-- Sugih Database Backup",
    `-- Exported at: ${new Date().toISOString()}`,
    `-- Tables: ${tablesToExport.join(", ")}`,
    "",
    "-- Disable foreign key checks during import",
    "SET session_replication_role = 'replica';",
    "",
  ];

  for (const table of tablesToExport) {
    sqlStatements.push(`-- Table: ${table}`);

    const sql = `SELECT * FROM ${table} ORDER BY created_at`;
    const rows = await all(sql);

    if (rows.length === 0) {
      sqlStatements.push(`-- No data in ${table}`);
      sqlStatements.push("");
      continue;
    }

    // Get column names from first row
    const columns = Object.keys(rows[0]);

    for (const row of rows) {
      const values = columns.map((col) => {
        const value = (row as Record<string, any>)[col];
        if (value === null) return "NULL";
        if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
        if (typeof value === "number") return value.toString();
        if (value instanceof Date) return `'${value.toISOString()}'`;
        // Escape single quotes for strings
        return `'${String(value).replace(/'/g, "''")}'`;
      });

      sqlStatements.push(
        `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${values.join(", ")});`,
      );
    }

    sqlStatements.push("");
  }

  sqlStatements.push("-- Re-enable foreign key checks");
  sqlStatements.push("SET session_replication_role = 'origin';");

  return sqlStatements.join("\n");
}

/**
 * Get export statistics
 *
 * @returns Object with counts for each table
 */
export async function getExportStats(): Promise<{
  wallets: number;
  categories: number;
  savingsBuckets: number;
  transactions: number;
  postings: number;
  budgets: number;
}> {
  const counts = await all<{ table_name: string; count: number }>(`
    SELECT 'wallets' as table_name, COUNT(*)::int as count FROM wallets
    UNION ALL
    SELECT 'categories', COUNT(*)::int FROM categories
    UNION ALL
    SELECT 'savings_buckets', COUNT(*)::int FROM savings_buckets
    UNION ALL
    SELECT 'transaction_events', COUNT(*)::int FROM transaction_events WHERE deleted_at IS NULL
    UNION ALL
    SELECT 'postings', COUNT(*)::int FROM postings
    UNION ALL
    SELECT 'budgets', COUNT(*)::int FROM budgets
  `);

  const stats: Record<string, number> = {};
  for (const row of counts) {
    stats[row.table_name] = row.count;
  }

  return {
    wallets: stats["wallets"] || 0,
    categories: stats["categories"] || 0,
    savingsBuckets: stats["savings_buckets"] || 0,
    transactions: stats["transaction_events"] || 0,
    postings: stats["postings"] || 0,
    budgets: stats["budgets"] || 0,
  };
}

// Helper functions

/**
 * Escape a value for CSV output
 *
 * @param value - Value to escape
 * @returns Escaped string safe for CSV
 */
function escapeCSV(value: string): string {
  if (!value) return "";

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/**
 * Format a date for CSV output
 *
 * @param date - Date to format
 * @returns ISO string date
 */
function formatDate(date: Date | string | null): string {
  if (!date) return "";

  if (typeof date === "string") {
    return new Date(date).toISOString();
  }

  return date.toISOString();
}
