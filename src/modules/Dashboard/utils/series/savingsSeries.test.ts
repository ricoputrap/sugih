/**
 * Savings Series Utility Tests
 *
 * Unit tests for savings data shaping functions.
 */

import { describe, expect, it } from "vitest";
import type {
  NetWorthChartData,
  SavingsBucketBalanceSnapshot,
} from "../../schema";
import {
  buildSavingsBucketSeries,
  calculateSavingsGrowth,
  calculateTotalSavings,
  extractSavingsBuckets,
  fillSavingsBuckets,
  generateSavingsChartConfig,
  getLatestSavingsBalance,
  getSavingsBucketNames,
  getSavingsSeriesKeys,
  isSavingsDataEmpty,
  transformSavingsData,
} from "./savingsSeries";

describe("savingsSeries", () => {
  const mockNetWorthData: NetWorthChartData[] = [
    {
      period: "2024-01",
      walletBalance: 1000000,
      savingsBalance: 500000,
      totalNetWorth: 1500000,
    },
    {
      period: "2024-02",
      walletBalance: 1200000,
      savingsBalance: 600000,
      totalNetWorth: 1800000,
    },
    {
      period: "2024-03",
      walletBalance: 1400000,
      savingsBalance: 750000,
      totalNetWorth: 2150000,
    },
  ];

  const mockSavingsBuckets: SavingsBucketBalanceSnapshot[] = [
    { id: "1", name: "Emergency Fund", balance: 300000 },
    { id: "2", name: "Vacation", balance: 200000 },
    { id: "3", name: "New Car", balance: 250000 },
  ];

  describe("transformSavingsData", () => {
    it("should transform empty array to empty array", () => {
      expect(transformSavingsData([])).toEqual([]);
    });

    it("should handle null/undefined input", () => {
      expect(
        transformSavingsData(null as unknown as NetWorthChartData[]),
      ).toEqual([]);
      expect(
        transformSavingsData(undefined as unknown as NetWorthChartData[]),
      ).toEqual([]);
    });

    it("should transform net worth data to savings chart data points", () => {
      const result = transformSavingsData(mockNetWorthData);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        bucket: "2024-01",
        totalSavings: 500000,
      });
      expect(result[1]).toEqual({
        bucket: "2024-02",
        totalSavings: 600000,
      });
      expect(result[2]).toEqual({
        bucket: "2024-03",
        totalSavings: 750000,
      });
    });

    it("should handle data with zero savings", () => {
      const data: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 0,
          totalNetWorth: 1000000,
        },
      ];

      const result = transformSavingsData(data);

      expect(result).toEqual([{ bucket: "2024-01", totalSavings: 0 }]);
    });
  });

  describe("buildSavingsBucketSeries", () => {
    it("should return empty array for empty buckets", () => {
      expect(buildSavingsBucketSeries([])).toEqual([]);
    });

    it("should handle null/undefined input", () => {
      expect(
        buildSavingsBucketSeries(
          null as unknown as SavingsBucketBalanceSnapshot[],
        ),
      ).toEqual([]);
      expect(
        buildSavingsBucketSeries(
          undefined as unknown as SavingsBucketBalanceSnapshot[],
        ),
      ).toEqual([]);
    });

    it("should build named series for each bucket", () => {
      const result = buildSavingsBucketSeries(mockSavingsBuckets);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        id: "savings-1",
        name: "Emergency Fund",
        data: [{ bucket: "current", value: 300000 }],
        color: "hsl(var(--chart-1))",
      });
      expect(result[1]).toEqual({
        id: "savings-2",
        name: "Vacation",
        data: [{ bucket: "current", value: 200000 }],
        color: "hsl(var(--chart-2))",
      });
    });

    it("should cycle colors for more than 5 buckets", () => {
      const manyBuckets: SavingsBucketBalanceSnapshot[] = [
        { id: "1", name: "Bucket 1", balance: 100 },
        { id: "2", name: "Bucket 2", balance: 100 },
        { id: "3", name: "Bucket 3", balance: 100 },
        { id: "4", name: "Bucket 4", balance: 100 },
        { id: "5", name: "Bucket 5", balance: 100 },
        { id: "6", name: "Bucket 6", balance: 100 },
      ];

      const result = buildSavingsBucketSeries(manyBuckets);

      expect(result[0].color).toBe("hsl(var(--chart-1))");
      expect(result[5].color).toBe("hsl(var(--chart-1))"); // Cycles back
    });
  });

  describe("extractSavingsBuckets", () => {
    it("should return empty array for empty buckets", () => {
      expect(extractSavingsBuckets([])).toEqual([]);
    });

    it("should handle null/undefined input", () => {
      expect(
        extractSavingsBuckets(
          null as unknown as SavingsBucketBalanceSnapshot[],
        ),
      ).toEqual([]);
      expect(
        extractSavingsBuckets(
          undefined as unknown as SavingsBucketBalanceSnapshot[],
        ),
      ).toEqual([]);
    });

    it("should extract bucket info sorted by balance descending", () => {
      const result = extractSavingsBuckets(mockSavingsBuckets);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe("Emergency Fund");
      expect(result[0].total).toBe(300000);
      expect(result[1].name).toBe("New Car");
      expect(result[1].total).toBe(250000);
      expect(result[2].name).toBe("Vacation");
      expect(result[2].total).toBe(200000);
    });
  });

  describe("getSavingsBucketNames", () => {
    it("should return bucket names sorted by balance", () => {
      const result = getSavingsBucketNames(mockSavingsBuckets);

      expect(result).toEqual(["Emergency Fund", "New Car", "Vacation"]);
    });

    it("should return empty array for empty buckets", () => {
      expect(getSavingsBucketNames([])).toEqual([]);
    });
  });

  describe("fillSavingsBuckets", () => {
    const range = {
      start: new Date("2024-01-01"),
      end: new Date("2024-03-31"),
    };

    it("should fill missing monthly buckets", () => {
      const dataWithGap: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 500000,
          totalNetWorth: 1500000,
        },
        {
          period: "2024-03",
          walletBalance: 1400000,
          savingsBalance: 750000,
          totalNetWorth: 2150000,
        },
      ];

      const result = fillSavingsBuckets(dataWithGap, range, "monthly");

      expect(result).toHaveLength(3);
      expect(result[0].period).toBe("2024-01");
      expect(result[1].period).toBe("2024-02");
      expect(result[2].period).toBe("2024-03");
    });

    it("should carry forward previous savings balance for missing buckets", () => {
      const dataWithGap: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 500000,
          totalNetWorth: 1500000,
        },
        {
          period: "2024-03",
          walletBalance: 1400000,
          savingsBalance: 750000,
          totalNetWorth: 2150000,
        },
      ];

      const result = fillSavingsBuckets(dataWithGap, range, "monthly");

      // February should carry forward January's savings balance
      expect(result[1].savingsBalance).toBe(500000);
      expect(result[1].totalNetWorth).toBe(500000);
    });

    it("should handle empty data with zero values", () => {
      const result = fillSavingsBuckets([], range, "monthly");

      expect(result).toHaveLength(3);
      expect(result[0].savingsBalance).toBe(0);
      expect(result[1].savingsBalance).toBe(0);
      expect(result[2].savingsBalance).toBe(0);
    });

    it("should preserve existing data", () => {
      const result = fillSavingsBuckets(mockNetWorthData, range, "monthly");

      expect(result[0].savingsBalance).toBe(500000);
      expect(result[1].savingsBalance).toBe(600000);
      expect(result[2].savingsBalance).toBe(750000);
    });
  });

  describe("generateSavingsChartConfig", () => {
    it("should generate config with totalSavings", () => {
      const config = generateSavingsChartConfig([]);

      expect(config.totalSavings).toEqual({
        label: "Total Savings",
        color: "hsl(var(--chart-1))",
      });
    });

    it("should generate config for bucket names", () => {
      const bucketNames = ["Emergency Fund", "Vacation"];
      const config = generateSavingsChartConfig(bucketNames);

      expect(config["Emergency Fund"].label).toBe("Emergency Fund");
      expect(config.Vacation.label).toBe("Vacation");
    });

    it("should assign colors from chart palette", () => {
      const bucketNames = ["Fund 1", "Fund 2"];
      const config = generateSavingsChartConfig(bucketNames);

      expect(config["Fund 1"].color).toMatch(/hsl\(var\(--chart-\d\)\)/);
      expect(config["Fund 2"].color).toMatch(/hsl\(var\(--chart-\d\)\)/);
    });
  });

  describe("isSavingsDataEmpty", () => {
    it("should return true for empty array", () => {
      expect(isSavingsDataEmpty([])).toBe(true);
    });

    it("should return true for null/undefined", () => {
      expect(isSavingsDataEmpty(null as unknown as NetWorthChartData[])).toBe(
        true,
      );
      expect(
        isSavingsDataEmpty(undefined as unknown as NetWorthChartData[]),
      ).toBe(true);
    });

    it("should return true when all savings values are zero", () => {
      const data: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 0,
          totalNetWorth: 1000000,
        },
        {
          period: "2024-02",
          walletBalance: 1200000,
          savingsBalance: 0,
          totalNetWorth: 1200000,
        },
      ];

      expect(isSavingsDataEmpty(data)).toBe(true);
    });

    it("should return false when any savings value is non-zero", () => {
      expect(isSavingsDataEmpty(mockNetWorthData)).toBe(false);
    });
  });

  describe("getLatestSavingsBalance", () => {
    it("should return the last savings balance", () => {
      expect(getLatestSavingsBalance(mockNetWorthData)).toBe(750000);
    });

    it("should return 0 for empty data", () => {
      expect(getLatestSavingsBalance([])).toBe(0);
    });

    it("should handle null/undefined", () => {
      expect(
        getLatestSavingsBalance(null as unknown as NetWorthChartData[]),
      ).toBe(0);
    });
  });

  describe("calculateSavingsGrowth", () => {
    it("should calculate positive growth", () => {
      const result = calculateSavingsGrowth(mockNetWorthData);

      expect(result.absolute).toBe(250000); // 750000 - 500000
      expect(result.percentage).toBe(50); // 50% growth
      expect(result.isPositive).toBe(true);
    });

    it("should calculate negative growth", () => {
      const data: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 750000,
          totalNetWorth: 1750000,
        },
        {
          period: "2024-02",
          walletBalance: 1200000,
          savingsBalance: 500000,
          totalNetWorth: 1700000,
        },
      ];

      const result = calculateSavingsGrowth(data);

      expect(result.absolute).toBe(-250000);
      expect(result.percentage).toBe(-33.33);
      expect(result.isPositive).toBe(false);
    });

    it("should handle zero starting balance with positive current", () => {
      const data: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 0,
          totalNetWorth: 1000000,
        },
        {
          period: "2024-02",
          walletBalance: 1200000,
          savingsBalance: 500000,
          totalNetWorth: 1700000,
        },
      ];

      const result = calculateSavingsGrowth(data);

      expect(result.percentage).toBe(100);
      expect(result.absolute).toBe(500000);
      expect(result.isPositive).toBe(true);
    });

    it("should handle zero to zero (no change)", () => {
      const data: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 0,
          totalNetWorth: 1000000,
        },
        {
          period: "2024-02",
          walletBalance: 1200000,
          savingsBalance: 0,
          totalNetWorth: 1200000,
        },
      ];

      const result = calculateSavingsGrowth(data);

      expect(result.percentage).toBe(0);
      expect(result.absolute).toBe(0);
      expect(result.isPositive).toBe(true);
    });

    it("should return default values for insufficient data", () => {
      const singlePoint: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 500000,
          totalNetWorth: 1500000,
        },
      ];

      const result = calculateSavingsGrowth(singlePoint);

      expect(result.absolute).toBe(0);
      expect(result.percentage).toBe(0);
      expect(result.isPositive).toBe(true);
    });

    it("should return default values for empty data", () => {
      const result = calculateSavingsGrowth([]);

      expect(result.absolute).toBe(0);
      expect(result.percentage).toBe(0);
      expect(result.isPositive).toBe(true);
    });
  });

  describe("getSavingsSeriesKeys", () => {
    it("should extract series keys excluding bucket", () => {
      const data = [{ bucket: "2024-01", totalSavings: 500000 }];

      const keys = getSavingsSeriesKeys(data);

      expect(keys).toContain("totalSavings");
      expect(keys).not.toContain("bucket");
    });

    it("should return empty array for empty data", () => {
      expect(getSavingsSeriesKeys([])).toEqual([]);
    });

    it("should handle null/undefined input", () => {
      expect(getSavingsSeriesKeys(null as unknown as [])).toEqual([]);
      expect(getSavingsSeriesKeys(undefined as unknown as [])).toEqual([]);
    });
  });

  describe("calculateTotalSavings", () => {
    it("should sum all bucket balances", () => {
      expect(calculateTotalSavings(mockSavingsBuckets)).toBe(750000);
    });

    it("should return 0 for empty buckets", () => {
      expect(calculateTotalSavings([])).toBe(0);
    });

    it("should handle null/undefined", () => {
      expect(
        calculateTotalSavings(
          null as unknown as SavingsBucketBalanceSnapshot[],
        ),
      ).toBe(0);
    });
  });
});
