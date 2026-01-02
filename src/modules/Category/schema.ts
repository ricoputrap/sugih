import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { z } from "zod";

// Drizzle schema
export const categories = pgTable("categories", {
  id: text("id").primaryKey(), // UUID as text
  name: text("name").notNull().unique(),
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
  id: z.uuid("Invalid category ID"),
});

// Type exports for TypeScript
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type CategoryCreateInput = z.infer<typeof CategoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof CategoryUpdateSchema>;
export type CategoryIdInput = z.infer<typeof CategoryIdSchema>;
