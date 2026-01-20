/**
 * Dashboard Module Schema
 *
 * Defines Zod validation schemas and TypeScript types for the Dashboard UI.
 * Handles data structures for financial summaries, chart data, and filters.
 */

import { z } from "zod";

// Date range schema for dashboard filters
export const DashboardDateRangeSchema = z
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

// Dashboard summary metrics
export interface DashboardSummary {
  currentNetWorth: number;
  moneyLeftToSpend: number;
  totalSpending: number;
  totalIncome: number;
  period: string;
}

// Spending trend data for charts
export interface SpendingTrendChartData {
  period: string;
  amount: number;
}

// Net worth trend data for charts
export interface NetWorthChartData {
  period: string;
  walletBalance: number;
  savingsBalance: number;
  totalNetWorth: number;
}

// Category breakdown data for charts/tables
export interface CategoryBreakdownData {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
}

// Category spending trend data for charts
export interface CategorySpendingTrendChartData {
  period: string; // YYYY-WXX for week, YYYY-MM for month, etc.
  categories: {
    categoryId: string;
    categoryName: string;
    amount: number;
  }[];
}

// Recent transaction preview
export interface RecentTransaction {
  id: string;
  type:
    | "expense"
    | "income"
    | "transfer"
    | "savings_contribution"
    | "savings_withdrawal";
  amount: number;
  occurredAt: Date;
  categoryName?: string;
  note?: string;
}

// Complete dashboard data
export interface DashboardData {
  summary: DashboardSummary;
  spendingTrend: SpendingTrendChartData[];
  netWorthTrend: NetWorthChartData[];
  categoryBreakdown: CategoryBreakdownData[];
  categorySpendingTrend: CategorySpendingTrendChartData[];
  recentTransactions: RecentTransaction[];
}

// Type exports for TypeScript
export type DashboardDateRangeInput = z.infer<typeof DashboardDateRangeSchema>;
