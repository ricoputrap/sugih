/**
 * Net Worth Series Utility
 *
 * Pure functions for shaping net worth data for chart visualization.
 * Handles wallet and savings bucket data transformation for multi-line/area charts.
 */

import type {
  NetWorthChartData,
  WalletBalanceSnapshot,
  SavingsBucketBalanceSnapshot,
} from "../../schema";
import type { Period } from "../../types";
import type { DateRange } from "../dateRange";
import { generateBuckets, fillMissingBuckets } from "../bucketing";

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
 * Contains bucket plus dynamic keys for each series
 */
export interface NetWorthChartDataPoint {
  bucket: string;
  [seriesKey: string]: string | number;
}

/**
 * Net worth series configuration
 */
export interface NetWorthSeriesConfig {
  /** Include individual wallet series */
  includeWallets?: boolean;
  /** Include individual savings bucket series */
  includeSavings?: boolean;
  /** Include total wallet balance series */
  includeWalletTotal?: boolean;
  /** Include total savings balance series */
  includeSavingsTotal?: boolean;
  /** Include combined net worth series */
  includeNetWorth?: boolean;
}

const DEFAULT_CONFIG: NetWorthSeriesConfig = {
  includeWallets: false,
  includeSavings: false,
  includeWalletTotal: true,
  includeSavingsTotal: true,
  includeNetWorth: true,
};

/**
 * Transforms raw NetWorthChartData into flattened chart data points
 *
 * @param data - Array of net worth chart data from API
 * @returns Flattened data points suitable for Recharts
 *
 * @example
 * ```ts
 * const data = [
 *   { period: "2024-01", walletBalance: 1000000, savingsBalance: 500000, totalNetWorth: 1500000 },
 *   { period: "2024-02", walletBalance: 1200000, savingsBalance: 600000, totalNetWorth: 1800000 },
 * ];
 * const chartData = transformNetWorthData(data);
 * // [
 * //   { bucket: "2024-01", walletBalance: 1000000, savingsBalance: 500000, totalNetWorth: 1500000 },
 * //   { bucket: "2024-02", walletBalance: 1200000, savingsBalance: 600000, totalNetWorth: 1800000 },
 * // ]
 * ```
 */
export function transformNetWorthData(
  data: NetWorthChartData[],
): NetWorthChartDataPoint[] {
  if (!data || data.length === 0) {
    return [];
  }

  return data.map((item) => ({
    bucket: item.period,
    walletBalance: item.walletBalance,
    savingsBalance: item.savingsBalance,
    totalNetWorth: item.totalNetWorth,
  }));
}

/**
 * Builds net worth series from wallet and savings snapshots
 *
 * @param wallets - Current wallet balance snapshots
 * @param savings - Current savings bucket balance snapshots
 * @param config - Series configuration
 * @returns Array of named series for chart rendering
 *
 * @example
 * ```ts
 * const wallets = [{ id: "1", name: "Main", balance: 1000000 }];
 * const savings = [{ id: "1", name: "Emergency", balance: 500000 }];
 * const series = buildNetWorthSeries(wallets, savings);
 * ```
 */
export function buildNetWorthSeries(
  wallets: WalletBalanceSnapshot[],
  savings: SavingsBucketBalanceSnapshot[],
  config: NetWorthSeriesConfig = DEFAULT_CONFIG,
): NamedSeries[] {
  const series: NamedSeries[] = [];

  // Individual wallet series
  if (config.includeWallets) {
    for (const wallet of wallets) {
      series.push({
        id: `wallet-${wallet.id}`,
        name: wallet.name,
        data: [{ bucket: "current", value: wallet.balance }],
      });
    }
  }

  // Individual savings bucket series
  if (config.includeSavings) {
    for (const bucket of savings) {
      series.push({
        id: `savings-${bucket.id}`,
        name: bucket.name,
        data: [{ bucket: "current", value: bucket.balance }],
      });
    }
  }

  // Total wallet balance
  if (config.includeWalletTotal) {
    const totalWallet = wallets.reduce((sum, w) => sum + w.balance, 0);
    series.push({
      id: "wallet-total",
      name: "Wallet Balance",
      data: [{ bucket: "current", value: totalWallet }],
    });
  }

  // Total savings balance
  if (config.includeSavingsTotal) {
    const totalSavings = savings.reduce((sum, s) => sum + s.balance, 0);
    series.push({
      id: "savings-total",
      name: "Savings Balance",
      data: [{ bucket: "current", value: totalSavings }],
    });
  }

  // Combined net worth
  if (config.includeNetWorth) {
    const totalWallet = wallets.reduce((sum, w) => sum + w.balance, 0);
    const totalSavings = savings.reduce((sum, s) => sum + s.balance, 0);
    series.push({
      id: "net-worth",
      name: "Total Net Worth",
      data: [{ bucket: "current", value: totalWallet + totalSavings }],
    });
  }

  return series;
}

/**
 * Fills missing buckets in net worth time series data
 *
 * @param data - Existing net worth chart data
 * @param range - Date range to fill
 * @param period - Period granularity
 * @returns Complete time series with all buckets filled
 */
export function fillNetWorthBuckets(
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

  // Fill missing buckets, carrying forward the previous value
  let lastWalletBalance = 0;
  let lastSavingsBalance = 0;

  return allBuckets.map((bucket) => {
    const existing = dataMap.get(bucket);
    if (existing) {
      lastWalletBalance = existing.walletBalance;
      lastSavingsBalance = existing.savingsBalance;
      return existing;
    }

    // Carry forward previous values for missing buckets
    return {
      period: bucket,
      walletBalance: lastWalletBalance,
      savingsBalance: lastSavingsBalance,
      totalNetWorth: lastWalletBalance + lastSavingsBalance,
    };
  });
}

/**
 * Calculates growth between two data points
 *
 * @param current - Current value
 * @param previous - Previous value
 * @returns Growth percentage (0-100 scale) and absolute change
 */
export function calculateNetWorthGrowth(
  current: number,
  previous: number,
): { percentage: number; absolute: number; isPositive: boolean } {
  const absolute = current - previous;

  if (previous === 0) {
    return {
      percentage: current > 0 ? 100 : 0,
      absolute,
      isPositive: absolute >= 0,
    };
  }

  const percentage = ((current - previous) / Math.abs(previous)) * 100;

  return {
    percentage: Math.round(percentage * 100) / 100,
    absolute,
    isPositive: absolute >= 0,
  };
}

/**
 * Extracts series keys from chart data for dynamic rendering
 *
 * @param data - Net worth chart data points
 * @returns Array of series keys excluding 'bucket'
 */
export function getNetWorthSeriesKeys(
  data: NetWorthChartDataPoint[],
): string[] {
  if (!data || data.length === 0) {
    return [];
  }

  const keys = Object.keys(data[0]).filter((key) => key !== "bucket");
  return keys;
}

/**
 * Generates chart configuration for net worth series
 *
 * @param keys - Series keys to generate config for
 * @returns Configuration object for ChartContainer
 */
export function generateNetWorthChartConfig(
  keys: string[],
): Record<string, { label: string; color: string }> {
  const colorMap: Record<string, string> = {
    totalNetWorth: "hsl(var(--chart-1))",
    walletBalance: "hsl(var(--chart-2))",
    savingsBalance: "hsl(var(--chart-3))",
  };

  const labelMap: Record<string, string> = {
    totalNetWorth: "Total Net Worth",
    walletBalance: "Wallet Balance",
    savingsBalance: "Savings Balance",
  };

  const config: Record<string, { label: string; color: string }> = {};

  for (const key of keys) {
    config[key] = {
      label: labelMap[key] || key,
      color: colorMap[key] || `hsl(var(--chart-${(keys.indexOf(key) % 5) + 1}))`,
    };
  }

  return config;
}

/**
 * Checks if net worth data is empty or has no meaningful values
 *
 * @param data - Net worth chart data
 * @returns True if data is empty or all values are zero
 */
export function isNetWorthDataEmpty(data: NetWorthChartData[]): boolean {
  if (!data || data.length === 0) {
    return true;
  }

  return data.every(
    (item) =>
      item.walletBalance === 0 &&
      item.savingsBalance === 0 &&
      item.totalNetWorth === 0,
  );
}
