import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { z } from "zod";

// Drizzle schema
export const categories = pgTable("categories", {
  id: text("id").primaryKey(), // UUID as text
  name: varchar("name", { length: 255 }).notNull().unique(),
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
});

export const CategoryUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name too long")
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
export type Category = typeof categories.$inferSelect & {
  created_at: Date | string | null;
  updated_at: Date | string | null;
};
export type NewCategory = typeof categories.$inferInsert;
export type CategoryCreateInput = z.infer<typeof CategoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof CategoryUpdateSchema>;
export type CategoryIdInput = z.infer<typeof CategoryIdSchema>;
