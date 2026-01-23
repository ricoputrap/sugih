/**
 * Dashboard Module Schema
 *
 * Defines Zod validation schemas and TypeScript types for the Dashboard UI.
 * Handles data structures for financial summaries, chart data, and filters.
 */

import { z } from "zod";

// Date range preset options for chart filters
export const DateRangePresetSchema = z.enum([
  "last_week",
  "this_month",
  "last_month",
  "last_3_months",
  "last_6_months",
  "this_year",
  "last_year",
  "all",
]);

// Period granularity options for chart data
export const PeriodGranularitySchema = z.enum(["day", "week", "month"]);

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

// Category spending trend query with filters
export const CategorySpendingTrendQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  granularity: PeriodGranularitySchema.default("week"),
  dateRangePreset: DateRangePresetSchema.optional(),
});

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
export type DateRangePreset = z.infer<typeof DateRangePresetSchema>;
export type PeriodGranularity = z.infer<typeof PeriodGranularitySchema>;
export type CategorySpendingTrendQueryInput = z.infer<
  typeof CategorySpendingTrendQuerySchema
>;

// ============================================================================
// DASHBOARD REVAMP TYPES
// ============================================================================

/**
 * Growth metric with percentage and label
 */
export interface GrowthMetric {
  value: number; // Percentage change
  label: string; // Human-readable label
  isPositive: boolean;
  isNegative: boolean;
  isNeutral: boolean;
}

/**
 * KPI card data with growth information
 */
export interface KpiCardData {
  title: string;
  value: number;
  growth: GrowthMetric;
  period: string;
}

/**
 * Wallet balance snapshot
 */
export interface WalletBalanceSnapshot {
  id: string;
  name: string;
  balance: number;
}

/**
 * Savings bucket balance snapshot
 */
export interface SavingsBucketBalanceSnapshot {
  id: string;
  name: string;
  balance: number;
}

/**
 * Dashboard revamp summary payload
 * Contains all data needed for top KPI cards and charts
 */
export interface DashboardRevampSummary {
  // KPI Cards (with growth metrics)
  kpis: {
    netWorth: KpiCardData;
    moneyLeftToSpend: KpiCardData;
    totalSpending: KpiCardData;
    totalSavings: KpiCardData;
  };

  // Latest 5 transactions
  latestTransactions: RecentTransaction[];

  // Category breakdown for doughnut chart
  categoryBreakdown: {
    expenses: CategoryBreakdownData[];
    income: CategoryBreakdownData[];
  };

  // Time-series data for insights charts (selected tab)
  timeSeries: {
    netWorth: NetWorthChartData[];
    spending: CategorySpendingTrendChartData[];
    income: CategorySpendingTrendChartData[];
    savings: NetWorthChartData[]; // Reuse net worth structure but only savings
  };

  // Raw data for computations (if needed by client)
  snapshots: {
    currentWallets: WalletBalanceSnapshot[];
    currentSavings: SavingsBucketBalanceSnapshot[];
    previousWallets: WalletBalanceSnapshot[];
    previousSavings: SavingsBucketBalanceSnapshot[];
  };
}

/**
 * Query schema for dashboard revamp data
 */
export const DashboardRevampQuerySchema = z.object({
  // Date range for time-series charts
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),

  // Period granularity for time-series
  period: z.enum(["day", "week", "month"]).default("month"),

  // Date range preset (if provided, overrides from/to)
  dateRangePreset: DateRangePresetSchema.optional(),

  // Which insight tab to load (for optimization)
  insightTab: z.enum(["netWorth", "spending", "income", "savings"]).optional(),
});

export type DashboardRevampQueryInput = z.infer<
  typeof DashboardRevampQuerySchema
>;
