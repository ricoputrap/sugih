import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { z } from "zod";

// Drizzle schema
export const budgets = sqliteTable(
  "budgets",
  {
    id: text("id").primaryKey(), // UUID as text
    month: text("month").notNull(), // ISO format YYYY-MM-01
    category_id: text("category_id").notNull(),
    amount_idr: integer("amount_idr").notNull(), // Signed integer in Rupiah
    created_at: integer("created_at", { mode: "timestamp" }).$default(
      () => new Date(),
    ),
    updated_at: integer("updated_at", { mode: "timestamp" }).$default(
      () => new Date(),
    ),
  },
  (table) => ({
    monthCategoryUnique: uniqueIndex("budget_month_category_idx").on(
      table.month,
      table.category_id,
    ),
  }),
);

// Zod schemas for validation
export const BudgetMonthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-01$/, "Month must be in YYYY-MM-01 format");

export const BudgetItemSchema = z.object({
  categoryId: z.uuid("Invalid category ID"),
  amountIdr: z.number().int().positive("Budget amount must be positive"),
});

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
  id: z.uuid("Invalid budget ID"),
});

// Type exports for TypeScript
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type BudgetCreateInput = z.infer<typeof BudgetUpsertSchema>;
export type BudgetQueryInput = z.infer<typeof BudgetQuerySchema>;
export type BudgetIdInput = z.infer<typeof BudgetIdSchema>;
export type BudgetItem = z.infer<typeof BudgetItemSchema>;
