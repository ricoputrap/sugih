import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { z } from "zod";

// Category type enum
export const categoryTypeEnum = pgEnum("category_type", ["income", "expense"]);

// Drizzle schema
export const categories = pgTable("categories", {
  id: text("id").primaryKey(), // UUID as text
  name: varchar("name", { length: 255 }).notNull().unique(),
  type: categoryTypeEnum("type").notNull(),
  archived: boolean("archived").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).$default(
    () => new Date(),
  ),
  updated_at: timestamp("updated_at", { withTimezone: true }).$default(
    () => new Date(),
  ),
});

// Zod schemas for validation
export const CategoryCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  type: z.enum(["income", "expense"], {
    required_error: "Category type is required",
    invalid_type_error: "Category type must be either 'income' or 'expense'",
  }),
});

export const CategoryUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name too long")
    .optional(),
  type: z
    .enum(["income", "expense"], {
      invalid_type_error: "Category type must be either 'income' or 'expense'",
    })
    .optional(),
  archived: z.boolean().optional(),
});

export const CategoryIdSchema = z.object({
  id: z
    .string()
    .min(1, "Category ID is required")
    .max(50, "Invalid category ID"),
});

// Type exports for TypeScript
export type CategoryType = "income" | "expense";

export type Category = typeof categories.$inferSelect & {
  created_at: Date | string | null;
  updated_at: Date | string | null;
};
export type NewCategory = typeof categories.$inferInsert;
export type CategoryCreateInput = z.infer<typeof CategoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof CategoryUpdateSchema>;
export type CategoryIdInput = z.infer<typeof CategoryIdSchema>;
