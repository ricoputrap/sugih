/**
 * Export Module Schema
 *
 * Zod validation schemas for export/backup functionality.
 * Supports exporting transactions as CSV and database backup.
 */

import { z } from "zod";

/**
 * Schema for transaction CSV export options
 *
 * Allows filtering transactions by date range before export.
 * If no dates provided, exports all transactions.
 */
export const TransactionExportSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  includeDeleted: z.coerce.boolean().default(false),
});

/**
 * Schema for database backup options
 *
 * Controls what data is included in the backup.
 */
export const DatabaseBackupSchema = z.object({
  format: z.enum(["json", "sql"]).default("json"),
  tables: z
    .array(
      z.enum([
        "wallets",
        "categories",
        "savings_buckets",
        "transaction_events",
        "postings",
        "budgets",
      ]),
    )
    .optional(),
});

/**
 * Schema for wallet export
 */
export const WalletExportSchema = z.object({
  includeArchived: z.coerce.boolean().default(true),
});

/**
 * Schema for category export
 */
export const CategoryExportSchema = z.object({
  includeArchived: z.coerce.boolean().default(true),
});

/**
 * Schema for savings bucket export
 */
export const SavingsBucketExportSchema = z.object({
  includeArchived: z.coerce.boolean().default(true),
});

/**
 * Schema for budget export
 */
export const BudgetExportSchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format")
    .optional(),
});

// Type exports
export type TransactionExportInput = z.infer<typeof TransactionExportSchema>;
export type DatabaseBackupInput = z.infer<typeof DatabaseBackupSchema>;
export type WalletExportInput = z.infer<typeof WalletExportSchema>;
export type CategoryExportInput = z.infer<typeof CategoryExportSchema>;
export type SavingsBucketExportInput = z.infer<
  typeof SavingsBucketExportSchema
>;
export type BudgetExportInput = z.infer<typeof BudgetExportSchema>;
