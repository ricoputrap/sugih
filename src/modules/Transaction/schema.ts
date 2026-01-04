import { pgTable, text, timestamp, bigint, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";

// Drizzle schema for transaction events
export const transactionEvents = pgTable("transaction_events", {
  id: text("id").primaryKey(), // UUID as text
  occurred_at: timestamp("occurred_at", { withTimezone: true }).notNull(),
  type: varchar("type", {
    length: 32,
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
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).$default(
    () => new Date(),
  ),
  updated_at: timestamp("updated_at", { withTimezone: true }).$default(
    () => new Date(),
  ),
  idempotency_key: varchar("idempotency_key", { length: 36 }).unique(),
});

// Drizzle schema for postings (ledger entries)
export const postings = pgTable("postings", {
  id: text("id").primaryKey(), // UUID as text
  event_id: text("event_id").notNull(),
  wallet_id: text("wallet_id"), // Foreign key to wallets (nullable)
  savings_bucket_id: text("savings_bucket_id"), // Foreign key to savings_buckets (nullable)
  amount_idr: bigint("amount_idr", { mode: "number" }).notNull(), // Signed bigint for Rupiah amounts
  created_at: timestamp("created_at", { withTimezone: true }).$default(
    () => new Date(),
  ),
});

// Zod schemas for validation
export const ExpenseCreateSchema = z.object({
  occurredAt: z.coerce.date(),
  walletId: z
    .string()
    .min(1, "Wallet ID is required")
    .max(50, "Wallet ID too long"),
  categoryId: z
    .string()
    .min(1, "Category ID is required")
    .max(50, "Category ID too long"),
  amountIdr: z.number().int().positive("Amount must be positive"),
  note: z.string().optional(),
  idempotencyKey: z.string().max(36).optional(),
});

export const IncomeCreateSchema = z.object({
  occurredAt: z.coerce.date(),
  walletId: z
    .string()
    .min(1, "Wallet ID is required")
    .max(50, "Wallet ID too long"),
  amountIdr: z.number().int().positive("Amount must be positive"),
  note: z.string().optional(),
  payee: z.string().optional(),
  idempotencyKey: z.string().max(36).optional(),
});

export const TransferCreateSchema = z
  .object({
    occurredAt: z.coerce.date(),
    fromWalletId: z
      .string()
      .min(1, "From wallet ID is required")
      .max(50, "From wallet ID too long"),
    toWalletId: z
      .string()
      .min(1, "To wallet ID is required")
      .max(50, "To wallet ID too long"),
    amountIdr: z.number().int().positive("Amount must be positive"),
    note: z.string().optional(),
    idempotencyKey: z.string().max(36).optional(),
  })
  .refine((data) => data.fromWalletId !== data.toWalletId, {
    message: "From and to wallets must be different",
    path: ["toWalletId"],
  });

export const SavingsContributeSchema = z.object({
  occurredAt: z.coerce.date(),
  walletId: z
    .string()
    .min(1, "Wallet ID is required")
    .max(50, "Wallet ID too long"),
  bucketId: z
    .string()
    .min(1, "Bucket ID is required")
    .max(50, "Bucket ID too long"),
  amountIdr: z.number().int().positive("Amount must be positive"),
  note: z.string().optional(),
  idempotencyKey: z.string().max(36).optional(),
});

export const SavingsWithdrawSchema = z.object({
  occurredAt: z.coerce.date(),
  walletId: z
    .string()
    .min(1, "Wallet ID is required")
    .max(50, "Wallet ID too long"),
  bucketId: z
    .string()
    .min(1, "Bucket ID is required")
    .max(50, "Bucket ID too long"),
  amountIdr: z.number().int().positive("Amount must be positive"),
  note: z.string().optional(),
  idempotencyKey: z.string().max(36).optional(),
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
  walletId: z.string().min(1).max(50).optional(),
  categoryId: z.string().min(1).max(50).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const TransactionIdSchema = z.object({
  id: z
    .string()
    .min(1, "Transaction ID is required")
    .max(50, "Transaction ID too long"),
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
