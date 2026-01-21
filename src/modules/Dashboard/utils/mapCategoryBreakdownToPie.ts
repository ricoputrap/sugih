/**
 * Mapper Utility: Category Breakdown to Pie Chart Data
 *
 * Converts dashboard categoryBreakdown data into recharts-compatible pie chart data.
 */

import type { CategoryBreakdownData } from "../schema";
import type { ChartConfig } from "@/components/ui/chart";

/**
 * Pie chart data item structure for recharts
 */
export interface PieChartDataItem {
  name: string;
  amount: number;
  fill: string;
  [key: string]: string | number;
}

/**
 * Chart color palette using CSS variables
 */
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

/**
 * Maps category breakdown data to pie chart format for recharts
 *
 * @param categoryBreakdown - Array of category breakdown data from dashboard API
 * @returns Array of pie chart data items with name, amount, and fill color
 *
 * @example
 * ```ts
 * const breakdown = [
 *   { categoryId: "1", categoryName: "Food", amount: 500000, percentage: 50 },
 *   { categoryId: "2", categoryName: "Transport", amount: 300000, percentage: 30 },
 * ];
 * const pieData = mapCategoryBreakdownToPie(breakdown);
 * // Returns: [
 * //   { name: "food", amount: 500000, fill: "var(--color-food)" },
 * //   { name: "transport", amount: 300000, fill: "var(--color-transport)" },
 * // ]
 * ```
 */
export function mapCategoryBreakdownToPie(
  categoryBreakdown: CategoryBreakdownData[] | undefined | null,
): PieChartDataItem[] {
  // Handle empty, undefined, or null input
  if (!categoryBreakdown || categoryBreakdown.length === 0) {
    return [];
  }

  return categoryBreakdown
    .filter((category) => category.amount > 0) // Filter out zero amounts
    .map((category) => {
      // Convert category name to a valid CSS variable key (lowercase, replace spaces with dashes)
      const nameKey = category.categoryName.toLowerCase().replace(/\s+/g, "-");

      return {
        name: nameKey,
        amount: category.amount,
        fill: `var(--color-${nameKey})`,
      };
    });
}

/**
 * Generates a chart config object from category breakdown data
 *
 * @param categoryBreakdown - Array of category breakdown data from dashboard API
 * @returns ChartConfig object for recharts with color mappings
 */
export function generateChartConfigFromBreakdown(
  categoryBreakdown: CategoryBreakdownData[] | undefined | null,
): ChartConfig {
  const config: ChartConfig = {
    amount: {
      label: "Amount",
    },
  };

  if (!categoryBreakdown || categoryBreakdown.length === 0) {
    return config;
  }

  categoryBreakdown.forEach((category, index) => {
    const nameKey = category.categoryName.toLowerCase().replace(/\s+/g, "-");
    config[nameKey] = {
      label: category.categoryName,
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
  });

  return config;
}
