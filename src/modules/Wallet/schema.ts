import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { z } from "zod";

// Drizzle schema
export const wallets = pgTable("wallets", {
  id: text("id").primaryKey(), // UUID as text
  name: text("name").notNull().unique(),
  type: text("type", { enum: ["cash", "bank", "ewallet", "other"] })
    .notNull()
    .default("bank"),
  currency: text("currency").notNull().default("IDR"),
  archived: boolean("archived").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).$default(
    () => new Date(),
  ),
  updated_at: timestamp("updated_at", { withTimezone: true }).$default(
    () => new Date(),
  ),
});

// Zod schemas for validation
export const WalletCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  type: z.enum(["cash", "bank", "ewallet", "other"]).default("bank"),
  currency: z.string().default("IDR"),
});

export const WalletUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name too long")
    .optional(),
  type: z.enum(["cash", "bank", "ewallet", "other"]).optional(),
  archived: z.boolean().optional(),
});

export const WalletIdSchema = z.object({
  id: z.uuid("Invalid wallet ID"),
});

// Type exports for TypeScript
export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
export type WalletCreateInput = z.infer<typeof WalletCreateSchema>;
export type WalletUpdateInput = z.infer<typeof WalletUpdateSchema>;
export type WalletIdInput = z.infer<typeof WalletIdSchema>;
