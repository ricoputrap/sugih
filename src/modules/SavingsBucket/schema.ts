import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { z } from "zod";

// Drizzle schema
export const savingsBuckets = sqliteTable("savings_buckets", {
  id: text("id").primaryKey(), // UUID as text
  name: text("name").notNull().unique(),
  description: text("description"),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  created_at: integer("created_at", { mode: "timestamp" }).$default(
    () => new Date(),
  ),
  updated_at: integer("updated_at", { mode: "timestamp" }).$default(
    () => new Date(),
  ),
});

// Zod schemas for validation
export const SavingsBucketCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  description: z.string().optional(),
});

export const SavingsBucketUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name too long")
    .optional(),
  description: z.string().optional(),
  archived: z.boolean().optional(),
});

export const SavingsBucketIdSchema = z.object({
  id: z.uuid("Invalid savings bucket ID"),
});

// Type exports for TypeScript
export type SavingsBucket = typeof savingsBuckets.$inferSelect;
export type NewSavingsBucket = typeof savingsBuckets.$inferInsert;
export type SavingsBucketCreateInput = z.infer<
  typeof SavingsBucketCreateSchema
>;
export type SavingsBucketUpdateInput = z.infer<
  typeof SavingsBucketUpdateSchema
>;
export type SavingsBucketIdInput = z.infer<typeof SavingsBucketIdSchema>;
