/**
 * Date Range Resolution Utility
 *
 * Converts DateRangePreset to absolute { start: Date; end: Date } ranges.
 * Uses date-fns for date manipulation with deterministic "now" injection for testability.
 *
 * Date ranges are inclusive on start and exclusive on end (standard practice).
 * For example: [2024-01-01 00:00:00, 2024-02-01 00:00:00) includes all of January.
 */

import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import type { DateRangePreset } from "../types";

/**
 * Resolved date range with inclusive start and exclusive end
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Options for date range resolution
 */
export interface ResolveDateRangeOptions {
  /**
   * The "now" date to use as reference for relative ranges.
   * Defaults to new Date() if not provided.
   * Inject this for deterministic testing.
   */
  now?: Date;
}

/**
 * Resolves a DateRangePreset to an absolute date range
 *
 * @param preset - The date range preset to resolve
 * @param options - Optional configuration including custom "now" date
 * @returns Resolved date range with start (inclusive) and end (exclusive)
 *
 * @example
 * ```ts
 * // Get last week's range
 * const range = resolveDateRange("lastWeek");
 * // { start: Mon 00:00:00, end: Sun 23:59:59.999 + 1ms }
 *
 * // With custom "now" for testing
 * const range = resolveDateRange("thisMonth", {
 *   now: new Date("2024-03-15T12:00:00Z")
 * });
 * // { start: 2024-03-01 00:00:00, end: 2024-04-01 00:00:00 }
 * ```
 */
export function resolveDateRange(
  preset: DateRangePreset,
  options: ResolveDateRangeOptions = {},
): DateRange {
  const now = options.now || new Date();

  switch (preset) {
    case "lastWeek": {
      // Previous week (Mon-Sun)
      const lastWeek = subDays(now, 7);
      const start = startOfWeek(lastWeek, { weekStartsOn: 1 }); // Monday
      const end = endOfWeek(lastWeek, { weekStartsOn: 1 }); // Sunday
      return {
        start: startOfDay(start),
        end: endOfDay(end),
      };
    }

    case "thisMonth": {
      // Current month from 1st to last day
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    }

    case "lastMonth": {
      // Previous month from 1st to last day
      const lastMonth = subMonths(now, 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
      };
    }

    case "last3Months": {
      // Last 3 months including current month
      const threeMonthsAgo = subMonths(now, 3);
      return {
        start: startOfMonth(threeMonthsAgo),
        end: endOfMonth(now),
      };
    }

    case "last6Months": {
      // Last 6 months including current month
      const sixMonthsAgo = subMonths(now, 6);
      return {
        start: startOfMonth(sixMonthsAgo),
        end: endOfMonth(now),
      };
    }

    case "thisYear": {
      // Current year from Jan 1st to Dec 31st
      return {
        start: startOfYear(now),
        end: endOfYear(now),
      };
    }

    case "lastYear": {
      // Previous year from Jan 1st to Dec 31st
      const lastYear = subYears(now, 1);
      return {
        start: startOfYear(lastYear),
        end: endOfYear(lastYear),
      };
    }

    case "allTime": {
      // All time from a reasonable past date to now
      // Using 10 years ago as a practical "beginning of time"
      const tenYearsAgo = subYears(now, 10);
      return {
        start: startOfDay(tenYearsAgo),
        end: endOfDay(now),
      };
    }

    default: {
      // Exhaustiveness check - TypeScript will error if new preset is added
      const exhaustiveCheck: never = preset;
      throw new Error(`Unknown date range preset: ${exhaustiveCheck}`);
    }
  }
}

/**
 * Gets a human-readable description of the resolved date range
 *
 * @param preset - The date range preset
 * @param options - Optional configuration including custom "now" date
 * @returns Human-readable string describing the date range
 *
 * @example
 * ```ts
 * getDateRangeDescription("lastWeek");
 * // "Last week (Jan 15 - Jan 21)"
 * ```
 */
export function getDateRangeDescription(
  preset: DateRangePreset,
  options: ResolveDateRangeOptions = {},
): string {
  const range = resolveDateRange(preset, options);
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  const startStr = formatter.format(range.start);
  const endStr = formatter.format(range.end);

  switch (preset) {
    case "lastWeek":
      return `Last week (${startStr} - ${endStr})`;
    case "thisMonth":
      return `This month (${startStr} - ${endStr})`;
    case "lastMonth":
      return `Last month (${startStr} - ${endStr})`;
    case "last3Months":
      return `Last 3 months (${startStr} - ${endStr})`;
    case "last6Months":
      return `Last 6 months (${startStr} - ${endStr})`;
    case "thisYear":
      return `This year (${startStr} - ${endStr})`;
    case "lastYear":
      return `Last year (${startStr} - ${endStr})`;
    case "allTime":
      return `All time (${startStr} - ${endStr})`;
    default: {
      const exhaustiveCheck: never = preset;
      throw new Error(`Unknown date range preset: ${exhaustiveCheck}`);
    }
  }
}

/**
 * Checks if a date falls within a resolved date range (inclusive start, exclusive end)
 *
 * @param date - The date to check
 * @param range - The date range to check against
 * @returns true if the date is within the range
 */
export function isDateInRange(date: Date, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}
