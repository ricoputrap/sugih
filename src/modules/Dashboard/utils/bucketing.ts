/**
 * Time Bucketing and Aggregation Utilities
 *
 * Pure functions for bucketing time-series data by period (daily/weekly/monthly)
 * and aggregating transactions into bucketed series.
 */

import {
  format,
  startOfDay,
  startOfWeek,
  startOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  parseISO,
  isValid,
} from "date-fns";
import type { Period } from "../types";
import type { DateRange } from "./dateRange";

/**
 * Generates a bucket key for a given date and period
 *
 * @param date - The date to bucket
 * @param period - The period granularity (daily/weekly/monthly)
 * @returns Bucket key string in standard format
 *
 * @example
 * ```ts
 * bucketKey(new Date("2024-03-15"), "daily");   // "2024-03-15"
 * bucketKey(new Date("2024-03-15"), "weekly");  // "2024-W11"
 * bucketKey(new Date("2024-03-15"), "monthly"); // "2024-03"
 * ```
 */
export function bucketKey(date: Date, period: Period): string {
  if (!isValid(date)) {
    throw new Error("Invalid date provided to bucketKey");
  }

  switch (period) {
    case "daily": {
      // Format: YYYY-MM-DD
      return format(date, "yyyy-MM-dd");
    }
    case "weekly": {
      // Format: YYYY-Www (ISO week number)
      return format(date, "yyyy-'W'II");
    }
    case "monthly": {
      // Format: YYYY-MM
      return format(date, "yyyy-MM");
    }
    default: {
      const exhaustiveCheck: never = period;
      throw new Error(`Unknown period: ${exhaustiveCheck}`);
    }
  }
}

/**
 * Gets the start of a bucket for a given date and period
 *
 * @param date - The date to get bucket start for
 * @param period - The period granularity
 * @returns Date representing the start of the bucket
 */
export function bucketStart(date: Date, period: Period): Date {
  if (!isValid(date)) {
    throw new Error("Invalid date provided to bucketStart");
  }

  switch (period) {
    case "daily":
      return startOfDay(date);
    case "weekly":
      return startOfWeek(date, { weekStartsOn: 1 }); // Monday
    case "monthly":
      return startOfMonth(date);
    default: {
      const exhaustiveCheck: never = period;
      throw new Error(`Unknown period: ${exhaustiveCheck}`);
    }
  }
}

/**
 * Time-series data point
 */
export interface TimeSeriesPoint<T = number> {
  bucket: string;
  value: T;
}

/**
 * Fills in missing buckets in a time series with zero values
 *
 * @param range - The date range to fill
 * @param period - The period granularity
 * @param series - Existing time series data
 * @param defaultValue - Default value for missing buckets (default: 0)
 * @returns Complete time series with all buckets filled
 *
 * @example
 * ```ts
 * const range = { start: new Date("2024-03-01"), end: new Date("2024-03-03") };
 * const series = [{ bucket: "2024-03-01", value: 100 }];
 * fillMissingBuckets(range, "daily", series);
 * // [
 * //   { bucket: "2024-03-01", value: 100 },
 * //   { bucket: "2024-03-02", value: 0 },
 * //   { bucket: "2024-03-03", value: 0 }
 * // ]
 * ```
 */
export function fillMissingBuckets<T = number>(
  range: DateRange,
  period: Period,
  series: TimeSeriesPoint<T>[],
  defaultValue?: T,
): TimeSeriesPoint<T>[] {
  // Get all bucket keys for the range
  const allBuckets = generateBuckets(range, period);

  // Create a map of existing series data
  const seriesMap = new Map<string, T>();
  for (const point of series) {
    seriesMap.set(point.bucket, point.value);
  }

  // Fill in missing buckets
  const defaultVal = (defaultValue !== undefined ? defaultValue : 0) as T;
  return allBuckets.map((bucket) => ({
    bucket,
    value: seriesMap.get(bucket) ?? defaultVal,
  }));
}

/**
 * Generates all bucket keys for a date range and period
 *
 * @param range - The date range
 * @param period - The period granularity
 * @returns Array of bucket key strings
 */
export function generateBuckets(range: DateRange, period: Period): string[] {
  if (!isValid(range.start) || !isValid(range.end)) {
    throw new Error("Invalid date range provided to generateBuckets");
  }

  if (range.start > range.end) {
    throw new Error("Start date must be before or equal to end date");
  }

  switch (period) {
    case "daily": {
      const days = eachDayOfInterval({ start: range.start, end: range.end });
      return days.map((day) => bucketKey(day, "daily"));
    }
    case "weekly": {
      const weeks = eachWeekOfInterval(
        { start: range.start, end: range.end },
        { weekStartsOn: 1 }, // Monday
      );
      return weeks.map((week) => bucketKey(week, "weekly"));
    }
    case "monthly": {
      const months = eachMonthOfInterval({
        start: range.start,
        end: range.end,
      });
      return months.map((month) => bucketKey(month, "monthly"));
    }
    default: {
      const exhaustiveCheck: never = period;
      throw new Error(`Unknown period: ${exhaustiveCheck}`);
    }
  }
}

/**
 * Transaction-like object for aggregation
 */
export interface Aggregatable {
  occurredAt: Date | string;
  amount: number;
  [key: string]: unknown;
}

/**
 * Aggregation result with optional grouping
 */
export interface AggregationResult {
  bucket: string;
  total: number;
  count: number;
}

/**
 * Aggregates an array of transaction-like objects by period
 *
 * @param items - Array of items to aggregate (must have occurredAt and amount)
 * @param period - The period granularity
 * @returns Array of aggregation results by bucket
 *
 * @example
 * ```ts
 * const transactions = [
 *   { occurredAt: new Date("2024-03-01"), amount: 100 },
 *   { occurredAt: new Date("2024-03-01"), amount: 50 },
 *   { occurredAt: new Date("2024-03-02"), amount: 200 },
 * ];
 * aggregateByPeriod(transactions, "daily");
 * // [
 * //   { bucket: "2024-03-01", total: 150, count: 2 },
 * //   { bucket: "2024-03-02", total: 200, count: 1 }
 * // ]
 * ```
 */
export function aggregateByPeriod(
  items: Aggregatable[],
  period: Period,
): AggregationResult[] {
  const buckets = new Map<string, { total: number; count: number }>();

  for (const item of items) {
    const date =
      typeof item.occurredAt === "string"
        ? parseISO(item.occurredAt)
        : item.occurredAt;

    if (!isValid(date)) {
      console.warn(`Skipping item with invalid date: ${item.occurredAt}`);
      continue;
    }

    const bucket = bucketKey(date, period);
    const existing = buckets.get(bucket) || { total: 0, count: 0 };

    buckets.set(bucket, {
      total: existing.total + item.amount,
      count: existing.count + 1,
    });
  }

  // Convert to array and sort by bucket key
  return Array.from(buckets.entries())
    .map(([bucket, { total, count }]) => ({
      bucket,
      total,
      count,
    }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));
}

/**
 * Grouped aggregation result
 */
export interface GroupedAggregationResult<K extends string = string> {
  bucket: string;
  groups: Record<K, number>;
}

/**
 * Aggregates items by period and a grouping key (e.g., category)
 *
 * @param items - Array of items to aggregate
 * @param period - The period granularity
 * @param groupKeyFn - Function to extract group key from item
 * @returns Array of grouped aggregation results
 *
 * @example
 * ```ts
 * const transactions = [
 *   { occurredAt: new Date("2024-03-01"), amount: 100, category: "food" },
 *   { occurredAt: new Date("2024-03-01"), amount: 50, category: "transport" },
 *   { occurredAt: new Date("2024-03-02"), amount: 200, category: "food" },
 * ];
 * aggregateByPeriodAndGroup(transactions, "daily", (t) => t.category);
 * // [
 * //   { bucket: "2024-03-01", groups: { food: 100, transport: 50 } },
 * //   { bucket: "2024-03-02", groups: { food: 200 } }
 * // ]
 * ```
 */
export function aggregateByPeriodAndGroup<
  T extends Aggregatable,
  K extends string = string,
>(
  items: T[],
  period: Period,
  groupKeyFn: (item: T) => K,
): GroupedAggregationResult<K>[] {
  const buckets = new Map<string, Map<K, number>>();

  for (const item of items) {
    const date =
      typeof item.occurredAt === "string"
        ? parseISO(item.occurredAt)
        : item.occurredAt;

    if (!isValid(date)) {
      console.warn(`Skipping item with invalid date: ${item.occurredAt}`);
      continue;
    }

    const bucket = bucketKey(date, period);
    const groupKey = groupKeyFn(item);

    if (!buckets.has(bucket)) {
      buckets.set(bucket, new Map());
    }

    const groups = buckets.get(bucket)!;
    const currentAmount = groups.get(groupKey) || 0;
    groups.set(groupKey, currentAmount + item.amount);
  }

  // Convert to array and sort by bucket key
  return Array.from(buckets.entries())
    .map(([bucket, groups]) => ({
      bucket,
      groups: Object.fromEntries(groups.entries()) as Record<K, number>,
    }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));
}

/**
 * Parses a bucket key back to a date
 *
 * @param bucket - The bucket key string
 * @param period - The period granularity
 * @returns Date representing the start of the bucket
 *
 * @example
 * ```ts
 * parseBucketKey("2024-03-15", "daily");  // Date("2024-03-15T00:00:00")
 * parseBucketKey("2024-W11", "weekly");   // Date for start of week 11
 * parseBucketKey("2024-03", "monthly");   // Date("2024-03-01T00:00:00")
 * ```
 */
export function parseBucketKey(bucket: string, period: Period): Date {
  switch (period) {
    case "daily": {
      // Format: YYYY-MM-DD
      const date = parseISO(bucket);
      if (!isValid(date)) {
        throw new Error(`Invalid daily bucket key: ${bucket}`);
      }
      return startOfDay(date);
    }
    case "weekly": {
      // Format: YYYY-Www - parse ISO week
      const match = bucket.match(/^(\d{4})-W(\d{2})$/);
      if (!match) {
        throw new Error(`Invalid weekly bucket key: ${bucket}`);
      }
      const [, year, week] = match;
      // Approximate: Jan 1 + (week - 1) * 7 days
      const date = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
      return startOfWeek(date, { weekStartsOn: 1 });
    }
    case "monthly": {
      // Format: YYYY-MM
      const date = parseISO(`${bucket}-01`);
      if (!isValid(date)) {
        throw new Error(`Invalid monthly bucket key: ${bucket}`);
      }
      return startOfMonth(date);
    }
    default: {
      const exhaustiveCheck: never = period;
      throw new Error(`Unknown period: ${exhaustiveCheck}`);
    }
  }
}
