import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { z } from "zod";

// Drizzle schema for transaction events
export const transactionEvents = sqliteTable("transaction_events", {
  id: text("id").primaryKey(), // UUID as text
  occurred_at: integer("occurred_at", { mode: "timestamp" }).notNull(),
  type: text("type", {
    enum: [
      "expense",
      "income",
      "transfer",
      "savings_contribution",
      "savings_withdrawal",
    ],
  }).notNull(),
  note: text("note"),
  payee: text("payee"),
  category_id: text("category_id"), // Foreign key to categories (nullable)
  deleted_at: integer("deleted_at", { mode: "timestamp" }),
  created_at: integer("created_at", { mode: "timestamp" }).$default(
    () => new Date(),
  ),
  updated_at: integer("updated_at", { mode: "timestamp" }).$default(
    () => new Date(),
  ),
  idempotency_key: text("idempotency_key").unique(),
});

// Drizzle schema for postings (ledger entries)
export const postings = sqliteTable("postings", {
  id: text("id").primaryKey(), // UUID as text
  event_id: text("event_id").notNull(),
  wallet_id: text("wallet_id"), // Foreign key to wallets (nullable)
  savings_bucket_id: text("savings_bucket_id"), // Foreign key to savings_buckets (nullable)
  amount_idr: integer("amount_idr").notNull(), // Signed integer in Rupiah
  created_at: integer("created_at", { mode: "timestamp" }).$default(
    () => new Date(),
  ),
});

// Zod schemas for validation
export const ExpenseCreateSchema = z.object({
  occurredAt: z.coerce.date(),
  walletId: z.uuid("Invalid wallet ID"),
  categoryId: z.uuid("Invalid category ID"),
  amountIdr: z.number().int().positive("Amount must be positive"),
  note: z.string().optional(),
  idempotencyKey: z.uuid().optional(),
});

export const IncomeCreateSchema = z.object({
  occurredAt: z.coerce.date(),
  walletId: z.uuid("Invalid wallet ID"),
  amountIdr: z.number().int().positive("Amount must be positive"),
  note: z.string().optional(),
  payee: z.string().optional(),
  idempotencyKey: z.uuid().optional(),
});

export const TransferCreateSchema = z
  .object({
    occurredAt: z.coerce.date(),
    fromWalletId: z.uuid("Invalid from wallet ID"),
    toWalletId: z.uuid("Invalid to wallet ID"),
    amountIdr: z.number().int().positive("Amount must be positive"),
    note: z.string().optional(),
    idempotencyKey: z.uuid().optional(),
  })
  .refine((data) => data.fromWalletId !== data.toWalletId, {
    message: "From and to wallets must be different",
    path: ["toWalletId"],
  });

export const SavingsContributeSchema = z.object({
  occurredAt: z.coerce.date(),
  walletId: z.uuid("Invalid wallet ID"),
  bucketId: z.uuid("Invalid savings bucket ID"),
  amountIdr: z.number().int().positive("Amount must be positive"),
  note: z.string().optional(),
  idempotencyKey: z.uuid().optional(),
});

export const SavingsWithdrawSchema = z.object({
  occurredAt: z.coerce.date(),
  walletId: z.uuid("Invalid wallet ID"),
  bucketId: z.uuid("Invalid savings bucket ID"),
  amountIdr: z.number().int().positive("Amount must be positive"),
  note: z.string().optional(),
  idempotencyKey: z.uuid().optional(),
});

export const TransactionListQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  type: z
    .enum([
      "expense",
      "income",
      "transfer",
      "savings_contribution",
      "savings_withdrawal",
    ])
    .optional(),
  walletId: z.uuid().optional(),
  categoryId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const TransactionIdSchema = z.object({
  id: z.uuid("Invalid transaction ID"),
});

// Type exports for TypeScript
export type TransactionEvent = typeof transactionEvents.$inferSelect;
export type NewTransactionEvent = typeof transactionEvents.$inferInsert;
export type Posting = typeof postings.$inferSelect;
export type NewPosting = typeof postings.$inferInsert;

export type ExpenseCreateInput = z.infer<typeof ExpenseCreateSchema>;
export type IncomeCreateInput = z.infer<typeof IncomeCreateSchema>;
export type TransferCreateInput = z.infer<typeof TransferCreateSchema>;
export type SavingsContributeInput = z.infer<typeof SavingsContributeSchema>;
export type SavingsWithdrawInput = z.infer<typeof SavingsWithdrawSchema>;
export type TransactionListQueryInput = z.infer<
  typeof TransactionListQuerySchema
>;
export type TransactionIdInput = z.infer<typeof TransactionIdSchema>;
