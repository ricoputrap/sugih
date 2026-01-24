/**
 * Dashboard Utils Index
 *
 * Centralized exports for all Dashboard utility functions.
 */

export {
  mapCategoryBreakdownToPie,
  generateChartConfigFromBreakdown,
  type PieChartDataItem,
} from "./mapCategoryBreakdownToPie";

// Series utilities for chart data transformation
export * from "./series";

// Bucketing utilities
export {
  bucketKey,
  bucketStart,
  fillMissingBuckets,
  generateBuckets,
  aggregateByPeriod,
  aggregateByPeriodAndGroup,
  parseBucketKey,
} from "./bucketing";
export type {
  TimeSeriesPoint,
  Aggregatable,
  AggregationResult,
  GroupedAggregationResult,
} from "./bucketing";

// Date range utilities
export { resolveDateRange } from "./dateRange";
export type { DateRange } from "./dateRange";

// KPI utilities
export {
  computeKpiSummary,
  formatGrowthMetric,
  computeGrowthPercentage,
} from "./kpis";

// Currency formatting (if exists, otherwise will be added)
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
