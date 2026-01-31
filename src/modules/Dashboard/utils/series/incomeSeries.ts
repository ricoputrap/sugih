/**
 * Income Series Utility
 *
 * Pure functions for shaping income data for chart visualization.
 * Handles category-based income data transformation for multi-line/area charts.
 */

import type { CategorySpendingTrendChartData } from "../../schema";
import type { Period } from "../../types";
import { generateBuckets } from "../bucketing";
import type { DateRange } from "../dateRange";

/**
 * Single series data point for chart rendering
 */
export interface SeriesDataPoint {
  bucket: string;
  value: number;
}

/**
 * Named series with data points
 */
export interface NamedSeries {
  id: string;
  name: string;
  data: SeriesDataPoint[];
  color?: string;
}

/**
 * Flattened chart data point for Recharts
 * Contains bucket plus dynamic keys for each category
 */
export interface IncomeChartDataPoint {
  bucket: string;
  [categoryKey: string]: string | number;
}

/**
 * Category info extracted from income data
 */
export interface CategoryInfo {
  id: string;
  name: string;
  total: number;
}

/**
 * Transforms raw CategorySpendingTrendChartData (used for income too) into flattened chart data points
 *
 * @param data - Array of income trend data from API
 * @returns Flattened data points suitable for Recharts
 *
 * @example
 * ```ts
 * const data = [
 *   { period: "2024-01", categories: [{ categoryId: "1", categoryName: "Salary", amount: 5000000 }] },
 * ];
 * const chartData = transformIncomeData(data);
 * // [{ bucket: "2024-01", Salary: 5000000 }]
 * ```
 */
export function transformIncomeData(
  data: CategorySpendingTrendChartData[],
): IncomeChartDataPoint[] {
  if (!data || data.length === 0) {
    return [];
  }

  return data.map((item) => {
    const point: IncomeChartDataPoint = {
      bucket: item.period,
    };

    for (const category of item.categories) {
      point[category.categoryName] = category.amount;
    }

    return point;
  });
}

/**
 * Extracts unique categories from income data sorted by total amount
 *
 * @param data - Income trend chart data
 * @returns Array of category info sorted by total descending
 */
export function extractIncomeCategories(
  data: CategorySpendingTrendChartData[],
): CategoryInfo[] {
  if (!data || data.length === 0) {
    return [];
  }

  const categoryMap = new Map<string, CategoryInfo>();

  for (const item of data) {
    for (const category of item.categories) {
      const existing = categoryMap.get(category.categoryId);
      if (existing) {
        existing.total += category.amount;
      } else {
        categoryMap.set(category.categoryId, {
          id: category.categoryId,
          name: category.categoryName,
          total: category.amount,
        });
      }
    }
  }

  // Sort by total descending
  return Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
}

/**
 * Gets unique category names from income data
 *
 * @param data - Income trend chart data
 * @returns Array of category names sorted by total income
 */
export function getIncomeCategoryNames(
  data: CategorySpendingTrendChartData[],
): string[] {
  const categories = extractIncomeCategories(data);
  return categories.map((c) => c.name);
}

/**
 * Fills missing buckets in income time series data
 *
 * @param data - Existing income chart data
 * @param range - Date range to fill
 * @param period - Period granularity
 * @returns Complete time series with all buckets filled
 */
export function fillIncomeBuckets(
  data: CategorySpendingTrendChartData[],
  range: DateRange,
  period: Period,
): CategorySpendingTrendChartData[] {
  const allBuckets = generateBuckets(range, period);

  // Create map for existing data
  const dataMap = new Map<string, CategorySpendingTrendChartData>();
  for (const item of data) {
    dataMap.set(item.period, item);
  }

  // Get all unique categories
  const categories = extractIncomeCategories(data);

  // Fill missing buckets with zero values for all categories
  return allBuckets.map((bucket) => {
    const existing = dataMap.get(bucket);
    if (existing) {
      return existing;
    }

    // Create empty bucket with all categories set to 0
    return {
      period: bucket,
      categories: categories.map((cat) => ({
        categoryId: cat.id,
        categoryName: cat.name,
        amount: 0,
      })),
    };
  });
}

/**
 * Generates chart configuration for income series
 *
 * @param categoryNames - Category names to generate config for
 * @returns Configuration object for ChartContainer
 */
export function generateIncomeChartConfig(
  categoryNames: string[],
): Record<string, { label: string; color: string }> {
  const config: Record<string, { label: string; color: string }> = {};

  for (let i = 0; i < categoryNames.length; i++) {
    const name = categoryNames[i];
    config[name] = {
      label: name,
      color: `hsl(var(--chart-${(i % 5) + 1}))`,
    };
  }

  return config;
}

/**
 * Checks if income data is empty or has no meaningful values
 *
 * @param data - Income chart data
 * @returns True if data is empty or all values are zero
 */
export function isIncomeDataEmpty(
  data: CategorySpendingTrendChartData[],
): boolean {
  if (!data || data.length === 0) {
    return true;
  }

  return data.every(
    (item) =>
      !item.categories ||
      item.categories.length === 0 ||
      item.categories.every((cat) => cat.amount === 0),
  );
}

/**
 * Calculates total income across all periods and categories
 *
 * @param data - Income chart data
 * @returns Total income amount
 */
export function calculateTotalIncome(
  data: CategorySpendingTrendChartData[],
): number {
  if (!data || data.length === 0) {
    return 0;
  }

  return data.reduce((total, item) => {
    const periodTotal = item.categories.reduce(
      (sum, cat) => sum + cat.amount,
      0,
    );
    return total + periodTotal;
  }, 0);
}

/**
 * Gets income for a specific category across all periods
 *
 * @param data - Income chart data
 * @param categoryName - Name of the category
 * @returns Total income for the category
 */
export function getIncomeCategoryTotal(
  data: CategorySpendingTrendChartData[],
  categoryName: string,
): number {
  if (!data || data.length === 0) {
    return 0;
  }

  return data.reduce((total, item) => {
    const category = item.categories.find(
      (c) => c.categoryName === categoryName,
    );
    return total + (category?.amount || 0);
  }, 0);
}

/**
 * Limits categories to top N by total income, grouping rest as "Other"
 *
 * @param data - Income chart data
 * @param limit - Maximum number of categories to show
 * @returns Data with limited categories
 */
export function limitIncomeCategories(
  data: CategorySpendingTrendChartData[],
  limit: number,
): CategorySpendingTrendChartData[] {
  if (!data || data.length === 0 || limit <= 0) {
    return data;
  }

  const categories = extractIncomeCategories(data);

  if (categories.length <= limit) {
    return data;
  }

  const topCategories = new Set(categories.slice(0, limit).map((c) => c.name));

  return data.map((item) => {
    const keptCategories: typeof item.categories = [];
    let otherAmount = 0;

    for (const cat of item.categories) {
      if (topCategories.has(cat.categoryName)) {
        keptCategories.push(cat);
      } else {
        otherAmount += cat.amount;
      }
    }

    if (otherAmount > 0) {
      keptCategories.push({
        categoryId: "other",
        categoryName: "Other",
        amount: otherAmount,
      });
    }

    return {
      period: item.period,
      categories: keptCategories,
    };
  });
}
