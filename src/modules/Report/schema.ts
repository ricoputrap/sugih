/**
 * Report Module Schema
 *
 * Defines Zod validation schemas for report queries and type exports
 * for the Sugih personal finance application's reporting functionality.
 */

import { z } from "zod";

// Date range schema for report queries
export const DateRangeSchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      // If both dates are provided, from should be before to
      if (data.from && data.to) {
        return data.from < data.to;
      }
      return true;
    },
    {
      message: "From date must be before to date",
      path: ["from"],
    },
  );

// Granularity options for trend reports
export const GranularitySchema = z.enum(["day", "week", "month", "quarter"]);

// Month schema for budget-related reports
export const MonthSchema = z
  .string()
  .regex(
    /^\d{4}-(0[1-9]|1[0-2])$/,
    "Month must be in YYYY-MM format with valid month (01-12)",
  );

// Spending trend query schema
export const SpendingTrendQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  granularity: GranularitySchema.default("month"),
});

// Category breakdown query schema
export const CategoryBreakdownQuerySchema = DateRangeSchema;

// Net worth trend query schema
export const NetWorthTrendQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  granularity: GranularitySchema.default("month"),
});

// Money left to spend query schema
export const MoneyLeftToSpendQuerySchema = z.object({
  month: MonthSchema,
});

// Spending trend data point
export interface SpendingTrendData {
  period: string; // YYYY-MM-DD, YYYY-MM, etc.
  totalAmount: number;
  transactionCount: number;
}

// Category breakdown data point
export interface CategoryBreakdownData {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

// Net worth data point
export interface NetWorthData {
  period: string; // YYYY-MM-DD, YYYY-MM, etc.
  walletBalance: number;
  savingsBalance: number;
  totalNetWorth: number;
}

// Money left to spend data
export interface MoneyLeftToSpendData {
  month: string;
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  percentUsed: number;
  daysRemaining: number;
  averageDailySpending: number;
  projectedMonthEndSpending: number;
  budgetVariance: number;
}

// Type exports for TypeScript
export type DateRangeInput = z.infer<typeof DateRangeSchema>;
export type Granularity = z.infer<typeof GranularitySchema>;
export type MonthInput = z.infer<typeof MonthSchema>;
export type SpendingTrendQueryInput = z.infer<typeof SpendingTrendQuerySchema>;
export type CategoryBreakdownQueryInput = z.infer<
  typeof CategoryBreakdownQuerySchema
>;
export type NetWorthTrendQueryInput = z.infer<typeof NetWorthTrendQuerySchema>;
export type MoneyLeftToSpendQueryInput = z.infer<
  typeof MoneyLeftToSpendQuerySchema
>;
