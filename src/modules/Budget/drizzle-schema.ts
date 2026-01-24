/**
 * Budget Drizzle ORM Schema
 *
 * Server-only file that defines the PostgreSQL table structure using Drizzle ORM.
 * This file should only be imported in server-side code (actions, routes, etc.)
 * and NOT in client components.
 */

import {
  pgTable,
  text,
  varchar,
  bigint,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Drizzle schema for the budgets table
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

// Type inference from Drizzle schema
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
