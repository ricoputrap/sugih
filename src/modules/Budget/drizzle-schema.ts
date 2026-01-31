/**
 * Budget Drizzle ORM Schema
 *
 * Server-only file that defines the PostgreSQL table structure using Drizzle ORM.
 * This file should only be imported in server-side code (actions, routes, etc.)
 * and NOT in client components.
 *
 * Budgets can target either:
 * - An expense category (via category_id)
 * - A savings bucket (via savings_bucket_id)
 *
 * Exactly one of these must be set (enforced by check constraint in database).
 */

import {
  pgTable,
  text,
  varchar,
  bigint,
  timestamp,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { categories } from "@/modules/Category/schema";
import { savingsBuckets } from "@/modules/SavingsBucket/schema";

// Drizzle schema for the budgets table
export const budgets = pgTable(
  "budgets",
  {
    id: text("id").primaryKey(), // UUID as text
    month: varchar("month", { length: 10 }).notNull(), // ISO format YYYY-MM-01
    category_id: text("category_id")
      .references(() => categories.id, { onDelete: "restrict" }), // Now nullable - references expense categories
    savings_bucket_id: text("savings_bucket_id")
      .references(() => savingsBuckets.id, { onDelete: "restrict" }), // New column - references savings buckets
    amount_idr: bigint("amount_idr", { mode: "number" }).notNull(), // Signed bigint in Rupiah
    note: text("note"), // Optional description field
    created_at: timestamp("created_at", { withTimezone: true }).$default(
      () => new Date(),
    ),
    updated_at: timestamp("updated_at", { withTimezone: true }).$default(
      () => new Date(),
    ),
  },
  (table) => [
    // Unique constraint per month + category (when category_id is set)
    uniqueIndex("budget_month_category_idx")
      .on(table.month, table.category_id)
      .where(sql`category_id IS NOT NULL`),
    // Unique constraint per month + savings bucket (when savings_bucket_id is set)
    uniqueIndex("budget_month_savings_bucket_idx")
      .on(table.month, table.savings_bucket_id)
      .where(sql`savings_bucket_id IS NOT NULL`),
    // Check constraint: exactly one target must be set
    check(
      "budget_target_check",
      sql`(category_id IS NOT NULL AND savings_bucket_id IS NULL) OR (category_id IS NULL AND savings_bucket_id IS NOT NULL)`,
    ),
  ],
);

// Type inference from Drizzle schema
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
