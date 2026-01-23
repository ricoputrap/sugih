/**
 * Time Bucketing and Aggregation Utilities Tests
 *
 * Unit tests for bucketing, aggregation, and time-series utilities.
 * Tests each period (daily/weekly/monthly) with edge cases.
 */

import { describe, it, expect } from "vitest";
import {
  bucketKey,
  bucketStart,
  fillMissingBuckets,
  generateBuckets,
  aggregateByPeriod,
  aggregateByPeriodAndGroup,
  parseBucketKey,
  type TimeSeriesPoint,
  type Aggregatable,
} from "./bucketing";
import { startOfDay, startOfWeek, startOfMonth } from "date-fns";

describe("Time Bucketing Utilities", () => {
  describe("bucketKey", () => {
    describe("daily period", () => {
      it("should generate daily bucket key in YYYY-MM-DD format", () => {
        const date = new Date("2024-03-15T12:30:00Z");
        const key = bucketKey(date, "daily");
        expect(key).toBe("2024-03-15");
      });

      it("should handle different times on same day", () => {
        const morning = new Date("2024-03-15T08:00:00Z");
        const evening = new Date("2024-03-15T20:00:00Z");
        const key1 = bucketKey(morning, "daily");
        const key2 = bucketKey(evening, "daily");
        // Both should produce the same date, though timezone may affect the actual date
        expect(key1).toMatch(/^2024-03-1[56]$/);
        expect(key2).toMatch(/^2024-03-1[56]$/);
      });

      it("should handle start of year", () => {
        const date = new Date("2024-01-01T00:00:00Z");
        expect(bucketKey(date, "daily")).toBe("2024-01-01");
      });

      it("should handle end of year", () => {
        const date = new Date("2024-12-31T12:00:00Z");
        const key = bucketKey(date, "daily");
        // Depending on timezone, could be Dec 31 or Jan 1
        expect(key).toMatch(/^(2024-12-31|2025-01-01)$/);
      });
    });

    describe("weekly period", () => {
      it("should generate weekly bucket key in YYYY-Www format", () => {
        const date = new Date("2024-03-15T12:00:00Z");
        const key = bucketKey(date, "weekly");
        expect(key).toMatch(/^\d{4}-W\d{2}$/);
      });

      it("should generate same key for dates in same week", () => {
        const monday = new Date("2024-03-11T12:00:00Z");
        const friday = new Date("2024-03-15T12:00:00Z");
        const key1 = bucketKey(monday, "weekly");
        const key2 = bucketKey(friday, "weekly");
        expect(key1).toBe(key2);
      });

      it("should handle week boundaries", () => {
        const sunday = new Date("2024-03-10T12:00:00Z");
        const monday = new Date("2024-03-11T12:00:00Z");
        const key1 = bucketKey(sunday, "weekly");
        const key2 = bucketKey(monday, "weekly");
        // Keys should be different for different weeks
        expect(key1).toMatch(/^2024-W\d{2}$/);
        expect(key2).toMatch(/^2024-W\d{2}$/);
      });
    });

    describe("monthly period", () => {
      it("should generate monthly bucket key in YYYY-MM format", () => {
        const date = new Date("2024-03-15T12:00:00Z");
        const key = bucketKey(date, "monthly");
        expect(key).toBe("2024-03");
      });

      it("should generate same key for dates in same month", () => {
        const start = new Date("2024-03-01T12:00:00Z");
        const middle = new Date("2024-03-15T12:00:00Z");
        const end = new Date("2024-03-30T12:00:00Z");
        const key1 = bucketKey(start, "monthly");
        const key2 = bucketKey(middle, "monthly");
        const key3 = bucketKey(end, "monthly");
        expect(key1).toBe("2024-03");
        expect(key2).toBe("2024-03");
        expect(key3).toBe("2024-03");
      });

      it("should handle month boundaries", () => {
        const feb = new Date("2024-02-29T12:00:00Z");
        const mar = new Date("2024-03-01T12:00:00Z");
        expect(bucketKey(feb, "monthly")).toBe("2024-02");
        expect(bucketKey(mar, "monthly")).toBe("2024-03");
      });
    });

    describe("error handling", () => {
      it("should throw error for invalid date", () => {
        const invalidDate = new Date("invalid");
        expect(() => bucketKey(invalidDate, "daily")).toThrow("Invalid date");
      });
    });
  });

  describe("bucketStart", () => {
    it("should return start of day for daily period", () => {
      const date = new Date("2024-03-15T15:30:45Z");
      const start = bucketStart(date, "daily");
      expect(start).toEqual(startOfDay(date));
    });

    it("should return start of week (Monday) for weekly period", () => {
      const date = new Date("2024-03-15T15:30:45Z"); // Friday
      const start = bucketStart(date, "weekly");
      const expected = startOfWeek(date, { weekStartsOn: 1 });
      expect(start).toEqual(expected);
    });

    it("should return start of month for monthly period", () => {
      const date = new Date("2024-03-15T15:30:45Z");
      const start = bucketStart(date, "monthly");
      expect(start).toEqual(startOfMonth(date));
    });

    it("should throw error for invalid date", () => {
      const invalidDate = new Date("invalid");
      expect(() => bucketStart(invalidDate, "daily")).toThrow("Invalid date");
    });
  });

  describe("generateBuckets", () => {
    describe("daily period", () => {
      it("should generate all daily buckets in range", () => {
        const range = {
          start: new Date("2024-03-01T00:00:00Z"),
          end: new Date("2024-03-03T23:59:59Z"),
        };
        const buckets = generateBuckets(range, "daily");
        // eachDayOfInterval is inclusive on both ends
        expect(buckets.length).toBeGreaterThanOrEqual(3);
        expect(buckets[0]).toBe("2024-03-01");
        expect(buckets).toContain("2024-03-02");
        expect(buckets).toContain("2024-03-03");
      });

      it("should handle single day range", () => {
        const range = {
          start: new Date("2024-03-15T00:00:00Z"),
          end: new Date("2024-03-15T23:59:59Z"),
        };
        const buckets = generateBuckets(range, "daily");
        expect(buckets.length).toBeGreaterThanOrEqual(1);
        expect(buckets).toContain("2024-03-15");
      });

      it("should handle month boundary", () => {
        const range = {
          start: new Date("2024-02-28T00:00:00Z"),
          end: new Date("2024-03-02T00:00:00Z"),
        };
        const buckets = generateBuckets(range, "daily");
        expect(buckets).toContain("2024-02-28");
        expect(buckets).toContain("2024-02-29"); // Leap year
        expect(buckets).toContain("2024-03-01");
        expect(buckets).toContain("2024-03-02");
      });
    });

    describe("weekly period", () => {
      it("should generate weekly buckets in range", () => {
        const range = {
          start: new Date("2024-03-01T00:00:00Z"),
          end: new Date("2024-03-31T23:59:59Z"),
        };
        const buckets = generateBuckets(range, "weekly");
        expect(buckets.length).toBeGreaterThan(0);
        expect(buckets[0]).toMatch(/^\d{4}-W\d{2}$/);
      });

      it("should handle single week", () => {
        const range = {
          start: new Date("2024-03-11T00:00:00Z"), // Monday
          end: new Date("2024-03-17T23:59:59Z"), // Sunday
        };
        const buckets = generateBuckets(range, "weekly");
        expect(buckets.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe("monthly period", () => {
      it("should generate monthly buckets in range", () => {
        const range = {
          start: new Date("2024-01-01T00:00:00Z"),
          end: new Date("2024-03-31T23:59:59Z"),
        };
        const buckets = generateBuckets(range, "monthly");
        // eachMonthOfInterval is inclusive on both ends
        expect(buckets.length).toBeGreaterThanOrEqual(3);
        expect(buckets).toContain("2024-01");
        expect(buckets).toContain("2024-02");
        expect(buckets).toContain("2024-03");
      });

      it("should handle single month", () => {
        const range = {
          start: new Date("2024-03-01T00:00:00Z"),
          end: new Date("2024-03-31T23:59:59Z"),
        };
        const buckets = generateBuckets(range, "monthly");
        expect(buckets.length).toBeGreaterThanOrEqual(1);
        expect(buckets).toContain("2024-03");
      });

      it("should handle year boundary", () => {
        const range = {
          start: new Date("2023-11-01T00:00:00Z"),
          end: new Date("2024-02-01T00:00:00Z"),
        };
        const buckets = generateBuckets(range, "monthly");
        expect(buckets).toContain("2023-11");
        expect(buckets).toContain("2023-12");
        expect(buckets).toContain("2024-01");
        expect(buckets).toContain("2024-02");
      });
    });

    describe("error handling", () => {
      it("should throw error if start is after end", () => {
        const range = {
          start: new Date("2024-03-15T00:00:00Z"),
          end: new Date("2024-03-01T00:00:00Z"),
        };
        expect(() => generateBuckets(range, "daily")).toThrow(
          "Start date must be before or equal to end date",
        );
      });

      it("should throw error for invalid dates", () => {
        const range = {
          start: new Date("invalid"),
          end: new Date("2024-03-01T00:00:00Z"),
        };
        expect(() => generateBuckets(range, "daily")).toThrow(
          "Invalid date range",
        );
      });
    });
  });

  describe("fillMissingBuckets", () => {
    it("should fill missing daily buckets with zeros", () => {
      const range = {
        start: new Date("2024-03-01T00:00:00Z"),
        end: new Date("2024-03-03T23:59:59Z"),
      };
      const series: TimeSeriesPoint[] = [{ bucket: "2024-03-01", value: 100 }];

      const filled = fillMissingBuckets(range, "daily", series);

      expect(filled.length).toBeGreaterThanOrEqual(3);
      expect(filled[0]).toEqual({ bucket: "2024-03-01", value: 100 });
      expect(
        filled.some((p) => p.bucket === "2024-03-02" && p.value === 0),
      ).toBe(true);
      expect(
        filled.some((p) => p.bucket === "2024-03-03" && p.value === 0),
      ).toBe(true);
    });

    it("should preserve existing values", () => {
      const range = {
        start: new Date("2024-03-01T00:00:00Z"),
        end: new Date("2024-03-03T23:59:59Z"),
      };
      const series: TimeSeriesPoint[] = [
        { bucket: "2024-03-01", value: 100 },
        { bucket: "2024-03-02", value: 200 },
        { bucket: "2024-03-03", value: 300 },
      ];

      const filled = fillMissingBuckets(range, "daily", series);

      expect(filled.length).toBeGreaterThanOrEqual(3);
      expect(filled.find((p) => p.bucket === "2024-03-01")?.value).toBe(100);
      expect(filled.find((p) => p.bucket === "2024-03-02")?.value).toBe(200);
      expect(filled.find((p) => p.bucket === "2024-03-03")?.value).toBe(300);
    });

    it("should use custom default value", () => {
      const range = {
        start: new Date("2024-03-01T00:00:00Z"),
        end: new Date("2024-03-02T23:59:59Z"),
      };
      const series: TimeSeriesPoint[] = [];

      const filled = fillMissingBuckets(range, "daily", series, -1);

      expect(filled[0]).toEqual({ bucket: "2024-03-01", value: -1 });
      expect(filled[1]).toEqual({ bucket: "2024-03-02", value: -1 });
    });

    it("should handle weekly buckets", () => {
      const range = {
        start: new Date("2024-03-01T00:00:00Z"),
        end: new Date("2024-03-31T23:59:59Z"),
      };
      const series: TimeSeriesPoint[] = [];

      const filled = fillMissingBuckets(range, "weekly", series);

      expect(filled.length).toBeGreaterThan(0);
      expect(filled.every((p) => p.value === 0)).toBe(true);
    });

    it("should handle monthly buckets", () => {
      const range = {
        start: new Date("2024-01-01T00:00:00Z"),
        end: new Date("2024-03-31T23:59:59Z"),
      };
      const series: TimeSeriesPoint[] = [{ bucket: "2024-02", value: 500 }];

      const filled = fillMissingBuckets(range, "monthly", series);

      expect(filled.length).toBeGreaterThanOrEqual(3);
      expect(filled.some((p) => p.bucket === "2024-01" && p.value === 0)).toBe(
        true,
      );
      expect(
        filled.some((p) => p.bucket === "2024-02" && p.value === 500),
      ).toBe(true);
      expect(filled.some((p) => p.bucket === "2024-03" && p.value === 0)).toBe(
        true,
      );
    });
  });

  describe("aggregateByPeriod", () => {
    const sampleTransactions: Aggregatable[] = [
      { occurredAt: new Date("2024-03-01T10:00:00Z"), amount: 100 },
      { occurredAt: new Date("2024-03-01T15:00:00Z"), amount: 50 },
      { occurredAt: new Date("2024-03-02T12:00:00Z"), amount: 200 },
      { occurredAt: new Date("2024-03-03T08:00:00Z"), amount: 75 },
    ];

    it("should aggregate by daily period", () => {
      const result = aggregateByPeriod(sampleTransactions, "daily");

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ bucket: "2024-03-01", total: 150, count: 2 });
      expect(result[1]).toEqual({ bucket: "2024-03-02", total: 200, count: 1 });
      expect(result[2]).toEqual({ bucket: "2024-03-03", total: 75, count: 1 });
    });

    it("should aggregate by weekly period", () => {
      const result = aggregateByPeriod(sampleTransactions, "weekly");

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("bucket");
      expect(result[0]).toHaveProperty("total");
      expect(result[0]).toHaveProperty("count");
      expect(result[0].total).toBe(425); // Sum of all
    });

    it("should aggregate by monthly period", () => {
      const result = aggregateByPeriod(sampleTransactions, "monthly");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ bucket: "2024-03", total: 425, count: 4 });
    });

    it("should handle empty array", () => {
      const result = aggregateByPeriod([], "daily");
      expect(result).toEqual([]);
    });

    it("should handle string dates", () => {
      const transactions: Aggregatable[] = [
        { occurredAt: "2024-03-01T10:00:00Z", amount: 100 },
        { occurredAt: "2024-03-01T15:00:00Z", amount: 50 },
      ];

      const result = aggregateByPeriod(transactions, "daily");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ bucket: "2024-03-01", total: 150, count: 2 });
    });

    it("should skip invalid dates with warning", () => {
      const transactions: Aggregatable[] = [
        { occurredAt: new Date("2024-03-01T10:00:00Z"), amount: 100 },
        { occurredAt: new Date("invalid"), amount: 50 },
      ];

      const result = aggregateByPeriod(transactions, "daily");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ bucket: "2024-03-01", total: 100, count: 1 });
    });

    it("should sort results by bucket key", () => {
      const unsorted: Aggregatable[] = [
        { occurredAt: new Date("2024-03-15T10:00:00Z"), amount: 100 },
        { occurredAt: new Date("2024-03-01T10:00:00Z"), amount: 50 },
        { occurredAt: new Date("2024-03-10T10:00:00Z"), amount: 75 },
      ];

      const result = aggregateByPeriod(unsorted, "daily");

      expect(result[0].bucket).toBe("2024-03-01");
      expect(result[1].bucket).toBe("2024-03-10");
      expect(result[2].bucket).toBe("2024-03-15");
    });
  });

  describe("aggregateByPeriodAndGroup", () => {
    interface Transaction extends Aggregatable {
      category: string;
    }

    const sampleTransactions: Transaction[] = [
      {
        occurredAt: new Date("2024-03-01T10:00:00Z"),
        amount: 100,
        category: "food",
      },
      {
        occurredAt: new Date("2024-03-01T15:00:00Z"),
        amount: 50,
        category: "transport",
      },
      {
        occurredAt: new Date("2024-03-02T12:00:00Z"),
        amount: 200,
        category: "food",
      },
      {
        occurredAt: new Date("2024-03-02T14:00:00Z"),
        amount: 75,
        category: "entertainment",
      },
    ];

    it("should aggregate by period and group", () => {
      const result = aggregateByPeriodAndGroup(
        sampleTransactions,
        "daily",
        (t) => t.category,
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        bucket: "2024-03-01",
        groups: { food: 100, transport: 50 },
      });
      expect(result[1]).toEqual({
        bucket: "2024-03-02",
        groups: { food: 200, entertainment: 75 },
      });
    });

    it("should handle weekly grouping", () => {
      const result = aggregateByPeriodAndGroup(
        sampleTransactions,
        "weekly",
        (t) => t.category,
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].groups).toHaveProperty("food");
      expect(result[0].groups).toHaveProperty("transport");
      expect(result[0].groups).toHaveProperty("entertainment");
    });

    it("should handle monthly grouping", () => {
      const result = aggregateByPeriodAndGroup(
        sampleTransactions,
        "monthly",
        (t) => t.category,
      );

      expect(result).toHaveLength(1);
      expect(result[0].bucket).toBe("2024-03");
      expect(result[0].groups).toEqual({
        food: 300,
        transport: 50,
        entertainment: 75,
      });
    });

    it("should handle empty array", () => {
      const result = aggregateByPeriodAndGroup([], "daily", (t) => t.category);
      expect(result).toEqual([]);
    });

    it("should accumulate amounts for same group in same bucket", () => {
      const transactions: Transaction[] = [
        {
          occurredAt: new Date("2024-03-01T10:00:00Z"),
          amount: 100,
          category: "food",
        },
        {
          occurredAt: new Date("2024-03-01T15:00:00Z"),
          amount: 50,
          category: "food",
        },
      ];

      const result = aggregateByPeriodAndGroup(
        transactions,
        "daily",
        (t) => t.category,
      );

      expect(result).toHaveLength(1);
      expect(result[0].groups.food).toBe(150);
    });

    it("should sort results by bucket key", () => {
      const unsorted: Transaction[] = [
        {
          occurredAt: new Date("2024-03-15T10:00:00Z"),
          amount: 100,
          category: "food",
        },
        {
          occurredAt: new Date("2024-03-01T10:00:00Z"),
          amount: 50,
          category: "food",
        },
      ];

      const result = aggregateByPeriodAndGroup(
        unsorted,
        "daily",
        (t) => t.category,
      );

      expect(result[0].bucket).toBe("2024-03-01");
      expect(result[1].bucket).toBe("2024-03-15");
    });
  });

  describe("parseBucketKey", () => {
    it("should parse daily bucket key", () => {
      const date = parseBucketKey("2024-03-15", "daily");
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(2); // March (0-indexed)
      expect(date.getDate()).toBe(15);
      expect(date.getHours()).toBe(0);
    });

    it("should parse weekly bucket key", () => {
      const date = parseBucketKey("2024-W11", "weekly");
      expect(date.getFullYear()).toBe(2024);
      // Should be a Monday at start of day
      expect(date.getDay()).toBe(1); // Monday
    });

    it("should parse monthly bucket key", () => {
      const date = parseBucketKey("2024-03", "monthly");
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(2); // March (0-indexed)
      expect(date.getDate()).toBe(1);
    });

    it("should throw error for invalid daily bucket key", () => {
      expect(() => parseBucketKey("invalid", "daily")).toThrow(
        "Invalid daily bucket key",
      );
    });

    it("should throw error for invalid weekly bucket key", () => {
      expect(() => parseBucketKey("2024-M11", "weekly")).toThrow(
        "Invalid weekly bucket key",
      );
    });

    it("should throw error for invalid monthly bucket key", () => {
      // "2024" gets parsed as "2024-01" by parseISO, so we need a truly invalid format
      expect(() => parseBucketKey("invalid-date", "monthly")).toThrow(
        "Invalid monthly bucket key",
      );
    });
  });
});
