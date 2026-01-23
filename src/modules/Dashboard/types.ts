/**
 * Dashboard Revamp Types
 *
 * Strongly-typed enums and unions for dashboard revamp features:
 * - Insight tabs (Net Worth, Spending, Income, Savings)
 * - Period granularity (Daily, Weekly, Monthly)
 * - Date range presets
 * - Chart variants (Line, Area)
 */

/**
 * Insight tab options for the Financial Insights section
 */
export type InsightTab = "netWorth" | "spending" | "income" | "savings";

/**
 * Period granularity for time-series data bucketing
 */
export type Period = "daily" | "weekly" | "monthly";

/**
 * Date range preset options for quick date selection
 */
export type DateRangePreset =
  | "last_week"
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "this_year"
  | "last_year"
  | "all";

/**
 * Chart visualization variant
 */
export type ChartVariant = "line" | "area";

/**
 * All valid insight tabs
 */
export const INSIGHT_TABS: readonly InsightTab[] = [
  "netWorth",
  "spending",
  "income",
  "savings",
] as const;

/**
 * All valid periods
 */
export const PERIODS: readonly Period[] = [
  "daily",
  "weekly",
  "monthly",
] as const;

/**
 * All valid date range presets
 */
export const DATE_RANGE_PRESETS: readonly DateRangePreset[] = [
  "last_week",
  "this_month",
  "last_month",
  "last_3_months",
  "last_6_months",
  "this_year",
  "last_year",
  "all",
] as const;

/**
 * All valid chart variants
 */
export const CHART_VARIANTS: readonly ChartVariant[] = [
  "line",
  "area",
] as const;

/**
 * Human-readable labels for insight tabs
 */
export const INSIGHT_TAB_LABELS: Record<InsightTab, string> = {
  netWorth: "Net Worth Growth",
  spending: "Spending Trends",
  income: "Income Trends",
  savings: "Savings Trends",
} as const;

/**
 * Human-readable labels for periods
 */
export const PERIOD_LABELS: Record<Period, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
} as const;

/**
 * Human-readable labels for date range presets
 */
export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  last_week: "Last Week",
  this_month: "This Month",
  last_month: "Last Month",
  last_3_months: "Last 3 Months",
  last_6_months: "Last 6 Months",
  this_year: "This Year",
  last_year: "Last Year",
  all: "All Time",
} as const;

/**
 * Human-readable labels for chart variants
 */
export const CHART_VARIANT_LABELS: Record<ChartVariant, string> = {
  line: "Line",
  area: "Area",
} as const;

/**
 * Type guard to check if a value is a valid InsightTab
 */
export function isInsightTab(value: unknown): value is InsightTab {
  return (
    typeof value === "string" && INSIGHT_TABS.includes(value as InsightTab)
  );
}

/**
 * Type guard to check if a value is a valid Period
 */
export function isPeriod(value: unknown): value is Period {
  return typeof value === "string" && PERIODS.includes(value as Period);
}

/**
 * Type guard to check if a value is a valid DateRangePreset
 */
export function isDateRangePreset(value: unknown): value is DateRangePreset {
  return (
    typeof value === "string" &&
    DATE_RANGE_PRESETS.includes(value as DateRangePreset)
  );
}

/**
 * Type guard to check if a value is a valid ChartVariant
 */
export function isChartVariant(value: unknown): value is ChartVariant {
  return (
    typeof value === "string" && CHART_VARIANTS.includes(value as ChartVariant)
  );
}
