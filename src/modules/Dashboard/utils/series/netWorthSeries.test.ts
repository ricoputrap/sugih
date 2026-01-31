/**
 * Net Worth Series Utility Tests
 *
 * Unit tests for net worth data shaping functions.
 */

import { describe, it, expect } from "vitest";
import {
  transformNetWorthData,
  buildNetWorthSeries,
  fillNetWorthBuckets,
  calculateNetWorthGrowth,
  getNetWorthSeriesKeys,
  generateNetWorthChartConfig,
  isNetWorthDataEmpty,
} from "./netWorthSeries";
import type { NetWorthChartData } from "../../schema";

describe("netWorthSeries", () => {
  describe("transformNetWorthData", () => {
    it("should transform empty array to empty array", () => {
      expect(transformNetWorthData([])).toEqual([]);
    });

    it("should handle null/undefined input", () => {
      expect(
        transformNetWorthData(null as unknown as NetWorthChartData[]),
      ).toEqual([]);
      expect(
        transformNetWorthData(undefined as unknown as NetWorthChartData[]),
      ).toEqual([]);
    });

    it("should transform net worth data to chart data points", () => {
      const data: NetWorthChartData[] = [
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
      ];

      const result = transformNetWorthData(data);

      expect(result).toEqual([
        {
          bucket: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 500000,
          totalNetWorth: 1500000,
        },
        {
          bucket: "2024-02",
          walletBalance: 1200000,
          savingsBalance: 600000,
          totalNetWorth: 1800000,
        },
      ]);
    });

    it("should preserve all numeric values including zero", () => {
      const data: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 0,
          savingsBalance: 0,
          totalNetWorth: 0,
        },
      ];

      const result = transformNetWorthData(data);

      expect(result).toEqual([
        {
          bucket: "2024-01",
          walletBalance: 0,
          savingsBalance: 0,
          totalNetWorth: 0,
        },
      ]);
    });
  });

  describe("buildNetWorthSeries", () => {
    const wallets = [
      { id: "wallet-1", name: "Main Wallet", balance: 1000000 },
      { id: "wallet-2", name: "Secondary", balance: 500000 },
    ];

    const savings = [
      { id: "savings-1", name: "Emergency Fund", balance: 300000 },
      { id: "savings-2", name: "Vacation", balance: 200000 },
    ];

    it("should build default series (totals + net worth)", () => {
      const series = buildNetWorthSeries(wallets, savings);

      expect(series).toHaveLength(3);
      expect(series.map((s) => s.id)).toEqual([
        "wallet-total",
        "savings-total",
        "net-worth",
      ]);
    });

    it("should include individual wallet series when configured", () => {
      const series = buildNetWorthSeries(wallets, savings, {
        includeWallets: true,
        includeSavings: false,
        includeWalletTotal: false,
        includeSavingsTotal: false,
        includeNetWorth: false,
      });

      expect(series).toHaveLength(2);
      expect(series[0]).toEqual({
        id: "wallet-wallet-1",
        name: "Main Wallet",
        data: [{ bucket: "current", value: 1000000 }],
      });
      expect(series[1]).toEqual({
        id: "wallet-wallet-2",
        name: "Secondary",
        data: [{ bucket: "current", value: 500000 }],
      });
    });

    it("should include individual savings bucket series when configured", () => {
      const series = buildNetWorthSeries(wallets, savings, {
        includeWallets: false,
        includeSavings: true,
        includeWalletTotal: false,
        includeSavingsTotal: false,
        includeNetWorth: false,
      });

      expect(series).toHaveLength(2);
      expect(series[0].name).toBe("Emergency Fund");
      expect(series[1].name).toBe("Vacation");
    });

    it("should calculate correct totals", () => {
      const series = buildNetWorthSeries(wallets, savings, {
        includeWalletTotal: true,
        includeSavingsTotal: true,
        includeNetWorth: true,
      });

      const walletTotal = series.find((s) => s.id === "wallet-total");
      const savingsTotal = series.find((s) => s.id === "savings-total");
      const netWorth = series.find((s) => s.id === "net-worth");

      expect(walletTotal?.data[0].value).toBe(1500000); // 1000000 + 500000
      expect(savingsTotal?.data[0].value).toBe(500000); // 300000 + 200000
      expect(netWorth?.data[0].value).toBe(2000000); // 1500000 + 500000
    });

    it("should handle empty wallets and savings", () => {
      const series = buildNetWorthSeries([], []);

      expect(series).toHaveLength(3);
      expect(series.find((s) => s.id === "wallet-total")?.data[0].value).toBe(
        0,
      );
      expect(series.find((s) => s.id === "savings-total")?.data[0].value).toBe(
        0,
      );
      expect(series.find((s) => s.id === "net-worth")?.data[0].value).toBe(0);
    });
  });

  describe("fillNetWorthBuckets", () => {
    const range = {
      start: new Date("2024-01-01"),
      end: new Date("2024-03-31"),
    };

    it("should fill missing monthly buckets", () => {
      const data: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 500000,
          totalNetWorth: 1500000,
        },
        {
          period: "2024-03",
          walletBalance: 1200000,
          savingsBalance: 600000,
          totalNetWorth: 1800000,
        },
      ];

      const result = fillNetWorthBuckets(data, range, "monthly");

      expect(result).toHaveLength(3);
      expect(result[0].period).toBe("2024-01");
      expect(result[1].period).toBe("2024-02");
      expect(result[2].period).toBe("2024-03");
    });

    it("should carry forward previous values for missing buckets", () => {
      const data: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 500000,
          totalNetWorth: 1500000,
        },
        {
          period: "2024-03",
          walletBalance: 1200000,
          savingsBalance: 600000,
          totalNetWorth: 1800000,
        },
      ];

      const result = fillNetWorthBuckets(data, range, "monthly");

      // February should carry forward January's values
      expect(result[1].walletBalance).toBe(1000000);
      expect(result[1].savingsBalance).toBe(500000);
      expect(result[1].totalNetWorth).toBe(1500000);
    });

    it("should handle empty data with zero values", () => {
      const result = fillNetWorthBuckets([], range, "monthly");

      expect(result).toHaveLength(3);
      expect(result[0].walletBalance).toBe(0);
      expect(result[0].savingsBalance).toBe(0);
      expect(result[0].totalNetWorth).toBe(0);
    });

    it("should preserve existing data when all buckets have values", () => {
      const data: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 500000,
          totalNetWorth: 1500000,
        },
        {
          period: "2024-02",
          walletBalance: 1100000,
          savingsBalance: 550000,
          totalNetWorth: 1650000,
        },
        {
          period: "2024-03",
          walletBalance: 1200000,
          savingsBalance: 600000,
          totalNetWorth: 1800000,
        },
      ];

      const result = fillNetWorthBuckets(data, range, "monthly");

      expect(result).toEqual(data);
    });
  });

  describe("calculateNetWorthGrowth", () => {
    it("should calculate positive growth percentage", () => {
      const result = calculateNetWorthGrowth(1500000, 1000000);

      expect(result.percentage).toBe(50);
      expect(result.absolute).toBe(500000);
      expect(result.isPositive).toBe(true);
    });

    it("should calculate negative growth percentage", () => {
      const result = calculateNetWorthGrowth(800000, 1000000);

      expect(result.percentage).toBe(-20);
      expect(result.absolute).toBe(-200000);
      expect(result.isPositive).toBe(false);
    });

    it("should handle zero previous value with positive current", () => {
      const result = calculateNetWorthGrowth(1000000, 0);

      expect(result.percentage).toBe(100);
      expect(result.absolute).toBe(1000000);
      expect(result.isPositive).toBe(true);
    });

    it("should handle zero previous value with zero current", () => {
      const result = calculateNetWorthGrowth(0, 0);

      expect(result.percentage).toBe(0);
      expect(result.absolute).toBe(0);
      expect(result.isPositive).toBe(true);
    });

    it("should handle no change", () => {
      const result = calculateNetWorthGrowth(1000000, 1000000);

      expect(result.percentage).toBe(0);
      expect(result.absolute).toBe(0);
      expect(result.isPositive).toBe(true);
    });

    it("should round percentage to 2 decimal places", () => {
      const result = calculateNetWorthGrowth(1333333, 1000000);

      expect(result.percentage).toBe(33.33);
    });
  });

  describe("getNetWorthSeriesKeys", () => {
    it("should extract series keys excluding bucket", () => {
      const data = [
        {
          bucket: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 500000,
          totalNetWorth: 1500000,
        },
      ];

      const keys = getNetWorthSeriesKeys(data);

      expect(keys).toContain("walletBalance");
      expect(keys).toContain("savingsBalance");
      expect(keys).toContain("totalNetWorth");
      expect(keys).not.toContain("bucket");
    });

    it("should return empty array for empty data", () => {
      expect(getNetWorthSeriesKeys([])).toEqual([]);
    });

    it("should handle null/undefined input", () => {
      expect(getNetWorthSeriesKeys(null as unknown as [])).toEqual([]);
      expect(getNetWorthSeriesKeys(undefined as unknown as [])).toEqual([]);
    });
  });

  describe("generateNetWorthChartConfig", () => {
    it("should generate config with known keys", () => {
      const keys = ["totalNetWorth", "walletBalance", "savingsBalance"];
      const config = generateNetWorthChartConfig(keys);

      expect(config.totalNetWorth).toEqual({
        label: "Total Net Worth",
        color: "hsl(var(--chart-1))",
      });
      expect(config.walletBalance).toEqual({
        label: "Wallet Balance",
        color: "hsl(var(--chart-2))",
      });
      expect(config.savingsBalance).toEqual({
        label: "Savings Balance",
        color: "hsl(var(--chart-3))",
      });
    });

    it("should handle unknown keys with fallback colors", () => {
      const keys = ["customSeries"];
      const config = generateNetWorthChartConfig(keys);

      expect(config.customSeries.label).toBe("customSeries");
      expect(config.customSeries.color).toMatch(/hsl\(var\(--chart-\d\)\)/);
    });

    it("should return empty config for empty keys", () => {
      const config = generateNetWorthChartConfig([]);

      expect(config).toEqual({});
    });
  });

  describe("isNetWorthDataEmpty", () => {
    it("should return true for empty array", () => {
      expect(isNetWorthDataEmpty([])).toBe(true);
    });

    it("should return true for null/undefined", () => {
      expect(isNetWorthDataEmpty(null as unknown as NetWorthChartData[])).toBe(
        true,
      );
      expect(
        isNetWorthDataEmpty(undefined as unknown as NetWorthChartData[]),
      ).toBe(true);
    });

    it("should return true when all values are zero", () => {
      const data: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 0,
          savingsBalance: 0,
          totalNetWorth: 0,
        },
        {
          period: "2024-02",
          walletBalance: 0,
          savingsBalance: 0,
          totalNetWorth: 0,
        },
      ];

      expect(isNetWorthDataEmpty(data)).toBe(true);
    });

    it("should return false when any value is non-zero", () => {
      const data: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 0,
          totalNetWorth: 1000000,
        },
      ];

      expect(isNetWorthDataEmpty(data)).toBe(false);
    });

    it("should return false when only savings has value", () => {
      const data: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 0,
          savingsBalance: 500000,
          totalNetWorth: 500000,
        },
      ];

      expect(isNetWorthDataEmpty(data)).toBe(false);
    });
  });
});
