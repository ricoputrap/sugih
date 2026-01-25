import { z } from "zod";

// Re-export Drizzle table schema for drizzle-kit
export * from "./drizzle-schema";

// Type exports for TypeScript
export type BudgetCreateInput = z.infer<typeof BudgetUpsertSchema>;
export type BudgetQueryInput = z.infer<typeof BudgetQuerySchema>;
export type BudgetIdInput = z.infer<typeof BudgetIdSchema>;
export type BudgetItem = z.infer<typeof BudgetItemSchema>;

// Extended budget type with category name (for joins)
export interface Budget {
  id: string;
  month: string;
  category_id: string;
  amount_idr: number;
  note?: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface BudgetWithCategory extends Budget {
  category_name?: string;
}

// Zod schemas for validation
export const BudgetMonthSchema = z
  .string()
  .regex(
    /^\d{4}-(0[1-9]|1[0-2])-01$/,
    "Month must be in YYYY-MM-01 format with valid month (01-12)",
  );

/**
 * Budget Item Schema
 *
 * Note: Budgets only work with expense categories.
 * Income categories cannot be budgeted as budgets are meant for spending limits.
 * Server-side validation is performed separately in actions.ts.
 */
export const BudgetItemSchema = z.object({
  categoryId: z
    .string()
    .min(1, "Category ID is required")
    .max(50, "Category ID too long"),
  amountIdr: z.number().int().positive("Budget amount must be positive"),
  note: z
    .string()
    .max(500, "Note must be 500 characters or less")
    .transform((val) => (val === "" ? null : val))
    .nullable()
    .optional(),
});

/**
 * Budget Upsert Schema
 *
 * Validates budget creation/update requests.
 * Ensures all budget items use expense categories only.
 */
export const BudgetUpsertSchema = z.object({
  month: BudgetMonthSchema,
  items: z
    .array(BudgetItemSchema)
    .min(1, "At least one budget item is required"),
});

/**
 * Budget Create Schema
 *
 * Validates single budget creation requests.
 */
export const BudgetCreateSchema = z.object({
  month: BudgetMonthSchema,
  categoryId: z.string().min(1, "Category ID is required"),
  amountIdr: z.number().int().positive("Budget amount must be positive"),
  note: z
    .string()
    .max(500, "Note must be 500 characters or less")
    .transform((val) => (val === "" ? null : val))
    .nullable()
    .optional(),
});

export const BudgetQuerySchema = z.object({
  month: BudgetMonthSchema.optional(),
});

export const BudgetIdSchema = z.object({
  id: z.string().min(1, "Budget ID is required").max(50, "Budget ID too long"),
});
