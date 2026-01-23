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
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "last3Months"
  | "last6Months"
  | "thisYear"
  | "lastYear"
  | "allTime";

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
  "lastWeek",
  "thisMonth",
  "lastMonth",
  "last3Months",
  "last6Months",
  "thisYear",
  "lastYear",
  "allTime",
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
  lastWeek: "Last Week",
  thisMonth: "This Month",
  lastMonth: "Last Month",
  last3Months: "Last 3 Months",
  last6Months: "Last 6 Months",
  thisYear: "This Year",
  lastYear: "Last Year",
  allTime: "All Time",
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
  return typeof value === "string" && INSIGHT_TABS.includes(value as InsightTab);
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
  return typeof value === "string" && DATE_RANGE_PRESETS.includes(value as DateRangePreset);
}

/**
 * Type guard to check if a value is a valid ChartVariant
 */
export function isChartVariant(value: unknown): value is ChartVariant {
  return typeof value === "string" && CHART_VARIANTS.includes(value as ChartVariant);
}
