/**
 * Category Breakdown Series Utility
 *
 * Pure functions for transforming and sorting category breakdown data
 * for the doughnut chart visualization.
 */

import type { CategoryBreakdownData } from "../../schema";

/**
 * Maximum number of categories to display before grouping into "Other"
 */
const MAX_CATEGORIES = 8;

/**
 * Sorts category breakdown data by amount in descending order
 *
 * @param data - Array of category breakdown data
 * @returns Sorted array (descending by amount)
 */
export function sortCategoryBreakdown(
  data: CategoryBreakdownData[],
): CategoryBreakdownData[] {
  return [...data].sort((a, b) => b.amount - a.amount);
}

/**
 * Groups smaller categories into an "Other" bucket if there are too many
 *
 * @param data - Array of category breakdown data (should be pre-sorted)
 * @param maxCategories - Maximum number of categories to show individually
 * @returns Array with "Other" bucket if needed
 */
export function groupSmallCategories(
  data: CategoryBreakdownData[],
  maxCategories: number = MAX_CATEGORIES,
): CategoryBreakdownData[] {
  if (data.length <= maxCategories) {
    return data;
  }

  const topCategories = data.slice(0, maxCategories);
  const otherCategories = data.slice(maxCategories);

  // Calculate total for "Other" bucket
  const otherTotal = otherCategories.reduce(
    (sum, category) => sum + category.amount,
    0,
  );

  // Calculate percentage for "Other" bucket
  const grandTotal = data.reduce((sum, category) => sum + category.amount, 0);
  const otherPercentage = grandTotal > 0 ? (otherTotal / grandTotal) * 100 : 0;

  // Add "Other" bucket
  const otherBucket: CategoryBreakdownData = {
    categoryId: "other",
    categoryName: "Other",
    amount: otherTotal,
    percentage: otherPercentage,
  };

  return [...topCategories, otherBucket];
}

/**
 * Filters out zero or negative amounts from category breakdown
 *
 * @param data - Array of category breakdown data
 * @returns Filtered array with only positive amounts
 */
export function filterValidCategories(
  data: CategoryBreakdownData[],
): CategoryBreakdownData[] {
  return data.filter((category) => category.amount > 0);
}

/**
 * Prepares category breakdown data for chart display
 * - Filters invalid data
 * - Sorts by amount
 * - Groups small categories into "Other" if needed
 *
 * @param data - Raw category breakdown data
 * @param maxCategories - Maximum number of categories to show individually
 * @returns Prepared data ready for chart rendering
 */
export function prepareCategoryBreakdownForChart(
  data: CategoryBreakdownData[] | undefined | null,
  maxCategories: number = MAX_CATEGORIES,
): CategoryBreakdownData[] {
  if (!data || data.length === 0) {
    return [];
  }

  const valid = filterValidCategories(data);
  const sorted = sortCategoryBreakdown(valid);
  const grouped = groupSmallCategories(sorted, maxCategories);

  return grouped;
}

/**
 * Calculates the total amount from category breakdown data
 *
 * @param data - Array of category breakdown data
 * @returns Total amount across all categories
 */
export function calculateTotalAmount(
  data: CategoryBreakdownData[] | undefined | null,
): number {
  if (!data || data.length === 0) {
    return 0;
  }

  return data.reduce((sum, category) => sum + category.amount, 0);
}

/**
 * Formats category breakdown data with explicit color assignments
 *
 * @param data - Array of category breakdown data
 * @param colors - Array of color strings to use
 * @returns Array with color assignments
 */
export function assignCategoryColors(
  data: CategoryBreakdownData[],
  colors: readonly string[],
): Array<CategoryBreakdownData & { color: string }> {
  return data.map((category, index) => ({
    ...category,
    color: colors[index % colors.length],
  }));
}
