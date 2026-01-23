import {
  pgTable,
  text,
  varchar,
  bigint,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { getCategoryById } from "@/modules/Category/actions";

// Type exports for TypeScript
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type BudgetCreateInput = z.infer<typeof BudgetUpsertSchema>;
export type BudgetQueryInput = z.infer<typeof BudgetQuerySchema>;
export type BudgetIdInput = z.infer<typeof BudgetIdSchema>;
export type BudgetItem = z.infer<typeof BudgetItemSchema>;

// Extended budget type with category name (for joins)
export interface BudgetWithCategory extends Budget {
  category_name?: string;
}

// Drizzle schema
export const budgets = pgTable(
  "budgets",
  {
    id: text("id").primaryKey(), // UUID as text
    month: varchar("month", { length: 10 }).notNull(), // ISO format YYYY-MM-01
    category_id: text("category_id").notNull(),
    amount_idr: bigint("amount_idr", { mode: "number" }).notNull(), // Signed bigint in Rupiah
    created_at: timestamp("created_at", { withTimezone: true }).$default(
      () => new Date(),
    ),
    updated_at: timestamp("updated_at", { withTimezone: true }).$default(
      () => new Date(),
    ),
  },
  (table) => [
    uniqueIndex("budget_month_category_idx").on(table.month, table.category_id),
  ],
);

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
 */
export const BudgetItemSchema = z
  .object({
    categoryId: z
      .string()
      .min(1, "Category ID is required")
      .max(50, "Category ID too long"),
    amountIdr: z.number().int().positive("Budget amount must be positive"),
  })
  .refine(
    async (data) => {
      const category = await getCategoryById(data.categoryId);
      if (!category) {
        return false;
      }
      return category.type === "expense";
    },
    {
      message:
        "Budget category must be an expense category. Income categories cannot be budgeted.",
      path: ["categoryId"],
    },
  );

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

export const BudgetQuerySchema = z.object({
  month: BudgetMonthSchema.optional(),
});

export const BudgetIdSchema = z.object({
  id: z.string().min(1, "Budget ID is required").max(50, "Budget ID too long"),
});
