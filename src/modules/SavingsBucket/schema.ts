import {
  pgTable,
  text,
  timestamp,
  boolean,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod";

// Drizzle schema
export const savingsBuckets = pgTable("savings_buckets", {
  id: text("id").primaryKey(), // UUID as text
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  archived: boolean("archived").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).$default(
    () => new Date(),
  ),
  updated_at: timestamp("updated_at", { withTimezone: true }).$default(
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
  id: z.string().min(1, "ID is required").max(50, "ID too long"),
});

// Type exports for TypeScript
export type SavingsBucket = typeof savingsBuckets.$inferSelect & {
  created_at: Date | string | null;
  updated_at: Date | string | null;
};
export type NewSavingsBucket = typeof savingsBuckets.$inferInsert;
export type SavingsBucketCreateInput = z.infer<
  typeof SavingsBucketCreateSchema
>;
export type SavingsBucketUpdateInput = z.infer<
  typeof SavingsBucketUpdateSchema
>;
export type SavingsBucketIdInput = z.infer<typeof SavingsBucketIdSchema>;
