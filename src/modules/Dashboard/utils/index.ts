/**
 * Dashboard Utils Index
 *
 * Centralized exports for all Dashboard utility functions.
 */

export type {
  Aggregatable,
  AggregationResult,
  GroupedAggregationResult,
  TimeSeriesPoint,
} from "./bucketing";
// Bucketing utilities
export {
  aggregateByPeriod,
  aggregateByPeriodAndGroup,
  bucketKey,
  bucketStart,
  fillMissingBuckets,
  generateBuckets,
  parseBucketKey,
} from "./bucketing";
export type { DateRange } from "./dateRange";
// Date range utilities
export { resolveDateRange } from "./dateRange";
// KPI utilities
export {
  computeGrowthPercentage,
  computeKpiSummary,
  formatGrowthMetric,
} from "./kpis";
export {
  generateChartConfigFromBreakdown,
  mapCategoryBreakdownToPie,
  type PieChartDataItem,
} from "./mapCategoryBreakdownToPie";
// Series utilities for chart data transformation
export * from "./series";

// Currency formatting (if exists, otherwise will be added)
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
