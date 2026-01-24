/**
 * Dashboard Stores Index
 *
 * Centralized exports for all Dashboard state stores.
 */

export { useChartTypeStore, type ChartType } from "./useChartTypeStore";

// Re-export ChartType as ChartVariantStore for semantic clarity
// The useChartTypeStore manages the chart variant (line/area) preference
export type { ChartType as ChartVariantType } from "./useChartTypeStore";
