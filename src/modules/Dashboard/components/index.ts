/**
 * Dashboard Components Index
 *
 * Centralized exports for all Dashboard UI components.
 */

export { NetWorthTrendChart } from "./NetWorthTrendChart";
export { SpendingTrendChart } from "./SpendingTrendChart";
export { CategorySpendingAreaChart } from "./CategorySpendingAreaChart";
export { CategoryBreakdownChart } from "./CategoryBreakdownChart";
export { ChartTypeSelector } from "./ChartTypeSelector";
export { ChartVariantToggle } from "./ChartVariantToggle";
export type { ChartVariantToggleProps } from "./ChartVariantToggle";

// New Dashboard Revamp Charts
export {
  NetWorthGrowthChart,
  SpendingTrendsChart,
  IncomeTrendsChart,
  SavingsTrendsChart,
} from "./charts";
export type {
  NetWorthGrowthChartProps,
  SpendingTrendsChartProps,
  IncomeTrendsChartProps,
  SavingsTrendsChartProps,
} from "./charts";
