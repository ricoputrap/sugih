import { z } from "zod";

// Re-export Drizzle table schema for drizzle-kit
export * from "./drizzle-schema";

// Type exports for TypeScript
export type BudgetCreateInput = z.infer<typeof BudgetUpsertSchema>;
export type BudgetQueryInput = z.infer<typeof BudgetQuerySchema>;
export type BudgetIdInput = z.infer<typeof BudgetIdSchema>;
export type BudgetItem = z.infer<typeof BudgetItemSchema>;

// Base budget type
export interface Budget {
  id: string;
  month: string;
  category_id: string | null;
  savings_bucket_id: string | null;
  amount_idr: number;
  note?: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

// Extended budget type with category name (for joins with expense categories)
export interface BudgetWithCategory extends Budget {
  category_name?: string | null;
  savings_bucket_name?: string | null;
  target_type: "category" | "savings_bucket";
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
 * Note: Budgets can target either expense categories OR savings buckets.
 * - When targeting an expense category, only categoryId should be provided
 * - When targeting a savings bucket, only savingsBucketId should be provided
 * Server-side validation is performed separately in actions.ts.
 */
export const BudgetItemSchema = z
  .object({
    categoryId: z
      .string()
      .min(1, "Category ID is required")
      .max(50, "Category ID too long")
      .optional()
      .nullable(),
    savingsBucketId: z
      .string()
      .min(1, "Savings Bucket ID is required")
      .max(50, "Savings Bucket ID too long")
      .optional()
      .nullable(),
    amountIdr: z.number().int().positive("Budget amount must be positive"),
    note: z
      .string()
      .max(500, "Note must be 500 characters or less")
      .transform((val) => (val === "" ? null : val))
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      const hasCategoryId = data.categoryId != null && data.categoryId !== "";
      const hasSavingsBucketId =
        data.savingsBucketId != null && data.savingsBucketId !== "";
      // Exactly one of categoryId or savingsBucketId must be provided
      return (
        (hasCategoryId && !hasSavingsBucketId) ||
        (!hasCategoryId && hasSavingsBucketId)
      );
    },
    {
      message: "Exactly one of categoryId or savingsBucketId must be provided",
      path: ["categoryId"],
    },
  );

/**
 * Budget Upsert Schema
 *
 * Validates budget creation/update requests.
 * Ensures all budget items target either expense categories or savings buckets.
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
 * Supports either categoryId OR savingsBucketId.
 */
export const BudgetCreateSchema = z
  .object({
    month: BudgetMonthSchema,
    categoryId: z
      .string()
      .min(1, "Category ID is required")
      .max(50, "Category ID too long")
      .optional()
      .nullable(),
    savingsBucketId: z
      .string()
      .min(1, "Savings Bucket ID is required")
      .max(50, "Savings Bucket ID too long")
      .optional()
      .nullable(),
    amountIdr: z.number().int().positive("Budget amount must be positive"),
    note: z
      .string()
      .max(500, "Note must be 500 characters or less")
      .transform((val) => (val === "" ? null : val))
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      const hasCategoryId = data.categoryId != null && data.categoryId !== "";
      const hasSavingsBucketId =
        data.savingsBucketId != null && data.savingsBucketId !== "";
      // Exactly one of categoryId or savingsBucketId must be provided
      return (
        (hasCategoryId && !hasSavingsBucketId) ||
        (!hasCategoryId && hasSavingsBucketId)
      );
    },
    {
      message: "Exactly one of categoryId or savingsBucketId must be provided",
      path: ["categoryId"],
    },
  );

export const BudgetQuerySchema = z.object({
  month: BudgetMonthSchema.optional(),
});

export const BudgetIdSchema = z.object({
  id: z.string().min(1, "Budget ID is required").max(50, "Budget ID too long"),
});

/**
 * Legacy Budget Item Schema (backward compatible)
 *
 * This schema is provided for backward compatibility with existing code
 * that only uses categoryId. For new code, use BudgetItemSchema.
 */
export const LegacyBudgetItemSchema = z.object({
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
