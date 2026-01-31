/**
 * Savings Series Utility
 *
 * Pure functions for shaping savings data for chart visualization.
 * Handles savings bucket balance data transformation for multi-line/area charts.
 */

import type {
  NetWorthChartData,
  SavingsBucketBalanceSnapshot,
} from "../../schema";
import type { Period } from "../../types";
import type { DateRange } from "../dateRange";
import { generateBuckets } from "../bucketing";

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
 * Contains bucket plus dynamic keys for each savings bucket
 */
export interface SavingsChartDataPoint {
  bucket: string;
  totalSavings: number;
  [bucketKey: string]: string | number;
}

/**
 * Savings bucket info
 */
export interface SavingsBucketInfo {
  id: string;
  name: string;
  total: number;
}

/**
 * Transforms raw NetWorthChartData into savings-focused chart data points
 * Extracts only the savings balance from net worth data
 *
 * @param data - Array of net worth chart data from API
 * @returns Flattened data points with savings balances
 *
 * @example
 * ```ts
 * const data = [
 *   { period: "2024-01", walletBalance: 1000000, savingsBalance: 500000, totalNetWorth: 1500000 },
 * ];
 * const chartData = transformSavingsData(data);
 * // [{ bucket: "2024-01", totalSavings: 500000 }]
 * ```
 */
export function transformSavingsData(
  data: NetWorthChartData[],
): SavingsChartDataPoint[] {
  if (!data || data.length === 0) {
    return [];
  }

  return data.map((item) => ({
    bucket: item.period,
    totalSavings: item.savingsBalance,
  }));
}

/**
 * Transforms savings bucket snapshots into series data
 *
 * @param buckets - Array of savings bucket snapshots
 * @returns Array of named series for each bucket
 */
export function buildSavingsBucketSeries(
  buckets: SavingsBucketBalanceSnapshot[],
): NamedSeries[] {
  if (!buckets || buckets.length === 0) {
    return [];
  }

  return buckets.map((bucket, index) => ({
    id: `savings-${bucket.id}`,
    name: bucket.name,
    data: [{ bucket: "current", value: bucket.balance }],
    color: `hsl(var(--chart-${(index % 5) + 1}))`,
  }));
}

/**
 * Extracts savings bucket info sorted by balance
 *
 * @param buckets - Savings bucket snapshots
 * @returns Array of bucket info sorted by balance descending
 */
export function extractSavingsBuckets(
  buckets: SavingsBucketBalanceSnapshot[],
): SavingsBucketInfo[] {
  if (!buckets || buckets.length === 0) {
    return [];
  }

  return buckets
    .map((bucket) => ({
      id: bucket.id,
      name: bucket.name,
      total: bucket.balance,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Gets savings bucket names sorted by balance
 *
 * @param buckets - Savings bucket snapshots
 * @returns Array of bucket names sorted by balance
 */
export function getSavingsBucketNames(
  buckets: SavingsBucketBalanceSnapshot[],
): string[] {
  const bucketInfos = extractSavingsBuckets(buckets);
  return bucketInfos.map((b) => b.name);
}

/**
 * Fills missing buckets in savings time series data
 *
 * @param data - Existing savings chart data
 * @param range - Date range to fill
 * @param period - Period granularity
 * @returns Complete time series with all buckets filled
 */
export function fillSavingsBuckets(
  data: NetWorthChartData[],
  range: DateRange,
  period: Period,
): NetWorthChartData[] {
  const allBuckets = generateBuckets(range, period);

  // Create map for existing data
  const dataMap = new Map<string, NetWorthChartData>();
  for (const item of data) {
    dataMap.set(item.period, item);
  }

  // Fill missing buckets, carrying forward the previous savings value
  let lastSavingsBalance = 0;

  return allBuckets.map((bucket) => {
    const existing = dataMap.get(bucket);
    if (existing) {
      lastSavingsBalance = existing.savingsBalance;
      return existing;
    }

    // Carry forward previous savings balance for missing buckets
    return {
      period: bucket,
      walletBalance: 0, // Not relevant for savings chart
      savingsBalance: lastSavingsBalance,
      totalNetWorth: lastSavingsBalance,
    };
  });
}

/**
 * Generates chart configuration for savings series
 *
 * @param bucketNames - Savings bucket names to generate config for
 * @returns Configuration object for ChartContainer
 */
export function generateSavingsChartConfig(
  bucketNames: string[],
): Record<string, { label: string; color: string }> {
  const config: Record<string, { label: string; color: string }> = {};

  // Add total savings series
  config.totalSavings = {
    label: "Total Savings",
    color: "hsl(var(--chart-1))",
  };

  // Add individual bucket configs
  for (let i = 0; i < bucketNames.length; i++) {
    const name = bucketNames[i];
    config[name] = {
      label: name,
      color: `hsl(var(--chart-${((i + 1) % 5) + 1}))`,
    };
  }

  return config;
}

/**
 * Checks if savings data is empty or has no meaningful values
 *
 * @param data - Savings chart data (NetWorthChartData)
 * @returns True if data is empty or all savings values are zero
 */
export function isSavingsDataEmpty(data: NetWorthChartData[]): boolean {
  if (!data || data.length === 0) {
    return true;
  }

  return data.every((item) => item.savingsBalance === 0);
}

/**
 * Calculates total savings (latest balance)
 *
 * @param data - Savings chart data
 * @returns Latest savings balance
 */
export function getLatestSavingsBalance(data: NetWorthChartData[]): number {
  if (!data || data.length === 0) {
    return 0;
  }

  return data[data.length - 1].savingsBalance;
}

/**
 * Calculates savings growth between first and last data points
 *
 * @param data - Savings chart data
 * @returns Growth metrics
 */
export function calculateSavingsGrowth(data: NetWorthChartData[]): {
  absolute: number;
  percentage: number;
  isPositive: boolean;
} {
  if (!data || data.length < 2) {
    return { absolute: 0, percentage: 0, isPositive: true };
  }

  const first = data[0].savingsBalance;
  const last = data[data.length - 1].savingsBalance;
  const absolute = last - first;

  if (first === 0) {
    return {
      absolute,
      percentage: last > 0 ? 100 : 0,
      isPositive: absolute >= 0,
    };
  }

  const percentage = ((last - first) / Math.abs(first)) * 100;

  return {
    absolute,
    percentage: Math.round(percentage * 100) / 100,
    isPositive: absolute >= 0,
  };
}

/**
 * Extracts series keys from savings chart data for dynamic rendering
 *
 * @param data - Savings chart data points
 * @returns Array of series keys excluding 'bucket'
 */
export function getSavingsSeriesKeys(data: SavingsChartDataPoint[]): string[] {
  if (!data || data.length === 0) {
    return [];
  }

  const keys = Object.keys(data[0]).filter((key) => key !== "bucket");
  return keys;
}

/**
 * Calculates total savings across all buckets
 *
 * @param buckets - Savings bucket snapshots
 * @returns Total savings amount
 */
export function calculateTotalSavings(
  buckets: SavingsBucketBalanceSnapshot[],
): number {
  if (!buckets || buckets.length === 0) {
    return 0;
  }

  return buckets.reduce((sum, bucket) => sum + bucket.balance, 0);
}
