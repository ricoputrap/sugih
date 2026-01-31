/**
 * Spending Series Utility Tests
 *
 * Unit tests for spending data shaping functions.
 */

import { describe, it, expect } from "vitest";
import {
  transformSpendingData,
  extractCategories,
  getCategoryNames,
  fillSpendingBuckets,
  generateSpendingChartConfig,
  isSpendingDataEmpty,
  calculateTotalSpending,
  getCategoryTotal,
  limitCategories,
} from "./spendingSeries";
import type { CategorySpendingTrendChartData } from "../../schema";

describe("spendingSeries", () => {
  const mockData: CategorySpendingTrendChartData[] = [
    {
      period: "2024-01",
      categories: [
        { categoryId: "1", categoryName: "Food", amount: 500000 },
        { categoryId: "2", categoryName: "Transport", amount: 300000 },
        { categoryId: "3", categoryName: "Entertainment", amount: 200000 },
      ],
    },
    {
      period: "2024-02",
      categories: [
        { categoryId: "1", categoryName: "Food", amount: 600000 },
        { categoryId: "2", categoryName: "Transport", amount: 250000 },
        { categoryId: "3", categoryName: "Entertainment", amount: 150000 },
      ],
    },
    {
      period: "2024-03",
      categories: [
        { categoryId: "1", categoryName: "Food", amount: 550000 },
        { categoryId: "2", categoryName: "Transport", amount: 280000 },
        { categoryId: "3", categoryName: "Entertainment", amount: 180000 },
      ],
    },
  ];

  describe("transformSpendingData", () => {
    it("should transform empty array to empty array", () => {
      expect(transformSpendingData([])).toEqual([]);
    });

    it("should handle null/undefined input", () => {
      expect(
        transformSpendingData(
          null as unknown as CategorySpendingTrendChartData[],
        ),
      ).toEqual([]);
      expect(
        transformSpendingData(
          undefined as unknown as CategorySpendingTrendChartData[],
        ),
      ).toEqual([]);
    });

    it("should transform spending data to chart data points", () => {
      const result = transformSpendingData(mockData);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        bucket: "2024-01",
        Food: 500000,
        Transport: 300000,
        Entertainment: 200000,
      });
      expect(result[1]).toEqual({
        bucket: "2024-02",
        Food: 600000,
        Transport: 250000,
        Entertainment: 150000,
      });
    });

    it("should handle periods with no categories", () => {
      const data: CategorySpendingTrendChartData[] = [
        { period: "2024-01", categories: [] },
      ];

      const result = transformSpendingData(data);

      expect(result).toEqual([{ bucket: "2024-01" }]);
    });
  });

  describe("extractCategories", () => {
    it("should return empty array for empty data", () => {
      expect(extractCategories([])).toEqual([]);
    });

    it("should handle null/undefined input", () => {
      expect(
        extractCategories(null as unknown as CategorySpendingTrendChartData[]),
      ).toEqual([]);
      expect(
        extractCategories(
          undefined as unknown as CategorySpendingTrendChartData[],
        ),
      ).toEqual([]);
    });

    it("should extract unique categories with totals", () => {
      const result = extractCategories(mockData);

      expect(result).toHaveLength(3);
      expect(result.map((c) => c.name)).toEqual([
        "Food",
        "Transport",
        "Entertainment",
      ]);
    });

    it("should sort categories by total descending", () => {
      const result = extractCategories(mockData);

      // Food: 500000 + 600000 + 550000 = 1650000
      // Transport: 300000 + 250000 + 280000 = 830000
      // Entertainment: 200000 + 150000 + 180000 = 530000
      expect(result[0].name).toBe("Food");
      expect(result[0].total).toBe(1650000);
      expect(result[1].name).toBe("Transport");
      expect(result[1].total).toBe(830000);
      expect(result[2].name).toBe("Entertainment");
      expect(result[2].total).toBe(530000);
    });

    it("should calculate correct totals", () => {
      const result = extractCategories(mockData);

      const food = result.find((c) => c.name === "Food");
      expect(food?.total).toBe(1650000);
    });
  });

  describe("getCategoryNames", () => {
    it("should return category names sorted by total", () => {
      const result = getCategoryNames(mockData);

      expect(result).toEqual(["Food", "Transport", "Entertainment"]);
    });

    it("should return empty array for empty data", () => {
      expect(getCategoryNames([])).toEqual([]);
    });
  });

  describe("fillSpendingBuckets", () => {
    const range = {
      start: new Date("2024-01-01"),
      end: new Date("2024-03-31"),
    };

    it("should fill missing monthly buckets", () => {
      const dataWithGap: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 500000 },
          ],
        },
        {
          period: "2024-03",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 600000 },
          ],
        },
      ];

      const result = fillSpendingBuckets(dataWithGap, range, "monthly");

      expect(result).toHaveLength(3);
      expect(result[0].period).toBe("2024-01");
      expect(result[1].period).toBe("2024-02");
      expect(result[2].period).toBe("2024-03");
    });

    it("should fill missing buckets with zero amounts", () => {
      const dataWithGap: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 500000 },
          ],
        },
        {
          period: "2024-03",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 600000 },
          ],
        },
      ];

      const result = fillSpendingBuckets(dataWithGap, range, "monthly");

      // February should have Food with 0 amount
      expect(result[1].categories).toHaveLength(1);
      expect(result[1].categories[0].categoryName).toBe("Food");
      expect(result[1].categories[0].amount).toBe(0);
    });

    it("should preserve existing data", () => {
      const result = fillSpendingBuckets(mockData, range, "monthly");

      expect(result[0].categories[0].amount).toBe(500000);
      expect(result[1].categories[0].amount).toBe(600000);
      expect(result[2].categories[0].amount).toBe(550000);
    });
  });

  describe("generateSpendingChartConfig", () => {
    it("should generate config with correct labels", () => {
      const categoryNames = ["Food", "Transport", "Entertainment"];
      const config = generateSpendingChartConfig(categoryNames);

      expect(config.Food.label).toBe("Food");
      expect(config.Transport.label).toBe("Transport");
      expect(config.Entertainment.label).toBe("Entertainment");
    });

    it("should assign colors from chart palette", () => {
      const categoryNames = ["Food", "Transport"];
      const config = generateSpendingChartConfig(categoryNames);

      expect(config.Food.color).toMatch(/hsl\(var\(--chart-\d\)\)/);
      expect(config.Transport.color).toMatch(/hsl\(var\(--chart-\d\)\)/);
    });

    it("should cycle colors for more than 5 categories", () => {
      const categoryNames = [
        "Cat1",
        "Cat2",
        "Cat3",
        "Cat4",
        "Cat5",
        "Cat6",
        "Cat7",
      ];
      const config = generateSpendingChartConfig(categoryNames);

      expect(config.Cat1.color).toBe("hsl(var(--chart-1))");
      expect(config.Cat6.color).toBe("hsl(var(--chart-1))"); // Cycles back
    });

    it("should return empty config for empty names", () => {
      const config = generateSpendingChartConfig([]);

      expect(config).toEqual({});
    });
  });

  describe("isSpendingDataEmpty", () => {
    it("should return true for empty array", () => {
      expect(isSpendingDataEmpty([])).toBe(true);
    });

    it("should return true for null/undefined", () => {
      expect(
        isSpendingDataEmpty(
          null as unknown as CategorySpendingTrendChartData[],
        ),
      ).toBe(true);
      expect(
        isSpendingDataEmpty(
          undefined as unknown as CategorySpendingTrendChartData[],
        ),
      ).toBe(true);
    });

    it("should return true when all categories have zero amounts", () => {
      const data: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 0 },
            { categoryId: "2", categoryName: "Transport", amount: 0 },
          ],
        },
      ];

      expect(isSpendingDataEmpty(data)).toBe(true);
    });

    it("should return true when categories array is empty", () => {
      const data: CategorySpendingTrendChartData[] = [
        { period: "2024-01", categories: [] },
      ];

      expect(isSpendingDataEmpty(data)).toBe(true);
    });

    it("should return false when any category has non-zero amount", () => {
      expect(isSpendingDataEmpty(mockData)).toBe(false);
    });
  });

  describe("calculateTotalSpending", () => {
    it("should calculate total across all periods and categories", () => {
      const result = calculateTotalSpending(mockData);

      // 1650000 + 830000 + 530000 = 3010000
      expect(result).toBe(3010000);
    });

    it("should return 0 for empty data", () => {
      expect(calculateTotalSpending([])).toBe(0);
    });

    it("should handle null/undefined", () => {
      expect(
        calculateTotalSpending(
          null as unknown as CategorySpendingTrendChartData[],
        ),
      ).toBe(0);
    });
  });

  describe("getCategoryTotal", () => {
    it("should return total for specific category", () => {
      expect(getCategoryTotal(mockData, "Food")).toBe(1650000);
      expect(getCategoryTotal(mockData, "Transport")).toBe(830000);
      expect(getCategoryTotal(mockData, "Entertainment")).toBe(530000);
    });

    it("should return 0 for non-existent category", () => {
      expect(getCategoryTotal(mockData, "Utilities")).toBe(0);
    });

    it("should return 0 for empty data", () => {
      expect(getCategoryTotal([], "Food")).toBe(0);
    });
  });

  describe("limitCategories", () => {
    it("should limit to top N categories", () => {
      const result = limitCategories(mockData, 2);

      // Should keep Food and Transport, group Entertainment as Other
      for (const item of result) {
        const names = item.categories.map((c) => c.categoryName);
        expect(names).toContain("Food");
        expect(names).toContain("Transport");
        expect(names).not.toContain("Entertainment");
      }
    });

    it("should add Other category for remaining", () => {
      const result = limitCategories(mockData, 2);

      // Each period should have an "Other" category
      for (const item of result) {
        const other = item.categories.find((c) => c.categoryName === "Other");
        expect(other).toBeDefined();
      }
    });

    it("should correctly sum Other amounts", () => {
      const result = limitCategories(mockData, 2);

      // First period: Entertainment was 200000
      const firstPeriod = result.find((r) => r.period === "2024-01");
      const other = firstPeriod?.categories.find(
        (c) => c.categoryName === "Other",
      );
      expect(other?.amount).toBe(200000);
    });

    it("should return original data if limit >= category count", () => {
      const result = limitCategories(mockData, 5);

      expect(result).toEqual(mockData);
    });

    it("should return original data for empty input", () => {
      const result = limitCategories([], 2);

      expect(result).toEqual([]);
    });

    it("should return original data for zero limit", () => {
      const result = limitCategories(mockData, 0);

      expect(result).toEqual(mockData);
    });
  });
});
