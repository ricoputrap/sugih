/**
 * Income Series Utility Tests
 *
 * Unit tests for income data shaping functions.
 */

import { describe, it, expect } from "vitest";
import {
  transformIncomeData,
  extractIncomeCategories,
  getIncomeCategoryNames,
  fillIncomeBuckets,
  generateIncomeChartConfig,
  isIncomeDataEmpty,
  calculateTotalIncome,
  getIncomeCategoryTotal,
  limitIncomeCategories,
} from "./incomeSeries";
import type { CategorySpendingTrendChartData } from "../../schema";

describe("incomeSeries", () => {
  const mockData: CategorySpendingTrendChartData[] = [
    {
      period: "2024-01",
      categories: [
        { categoryId: "1", categoryName: "Salary", amount: 5000000 },
        { categoryId: "2", categoryName: "Freelance", amount: 2000000 },
        { categoryId: "3", categoryName: "Investments", amount: 500000 },
      ],
    },
    {
      period: "2024-02",
      categories: [
        { categoryId: "1", categoryName: "Salary", amount: 5000000 },
        { categoryId: "2", categoryName: "Freelance", amount: 1500000 },
        { categoryId: "3", categoryName: "Investments", amount: 750000 },
      ],
    },
    {
      period: "2024-03",
      categories: [
        { categoryId: "1", categoryName: "Salary", amount: 5500000 },
        { categoryId: "2", categoryName: "Freelance", amount: 1800000 },
        { categoryId: "3", categoryName: "Investments", amount: 600000 },
      ],
    },
  ];

  describe("transformIncomeData", () => {
    it("should transform empty array to empty array", () => {
      expect(transformIncomeData([])).toEqual([]);
    });

    it("should handle null/undefined input", () => {
      expect(
        transformIncomeData(null as unknown as CategorySpendingTrendChartData[])
      ).toEqual([]);
      expect(
        transformIncomeData(undefined as unknown as CategorySpendingTrendChartData[])
      ).toEqual([]);
    });

    it("should transform income data to chart data points", () => {
      const result = transformIncomeData(mockData);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        bucket: "2024-01",
        Salary: 5000000,
        Freelance: 2000000,
        Investments: 500000,
      });
      expect(result[1]).toEqual({
        bucket: "2024-02",
        Salary: 5000000,
        Freelance: 1500000,
        Investments: 750000,
      });
    });

    it("should handle periods with no categories", () => {
      const data: CategorySpendingTrendChartData[] = [
        { period: "2024-01", categories: [] },
      ];

      const result = transformIncomeData(data);

      expect(result).toEqual([{ bucket: "2024-01" }]);
    });
  });

  describe("extractIncomeCategories", () => {
    it("should return empty array for empty data", () => {
      expect(extractIncomeCategories([])).toEqual([]);
    });

    it("should handle null/undefined input", () => {
      expect(
        extractIncomeCategories(null as unknown as CategorySpendingTrendChartData[])
      ).toEqual([]);
      expect(
        extractIncomeCategories(undefined as unknown as CategorySpendingTrendChartData[])
      ).toEqual([]);
    });

    it("should extract unique categories with totals", () => {
      const result = extractIncomeCategories(mockData);

      expect(result).toHaveLength(3);
      expect(result.map((c) => c.name)).toEqual([
        "Salary",
        "Freelance",
        "Investments",
      ]);
    });

    it("should sort categories by total descending", () => {
      const result = extractIncomeCategories(mockData);

      // Salary: 5000000 + 5000000 + 5500000 = 15500000
      // Freelance: 2000000 + 1500000 + 1800000 = 5300000
      // Investments: 500000 + 750000 + 600000 = 1850000
      expect(result[0].name).toBe("Salary");
      expect(result[0].total).toBe(15500000);
      expect(result[1].name).toBe("Freelance");
      expect(result[1].total).toBe(5300000);
      expect(result[2].name).toBe("Investments");
      expect(result[2].total).toBe(1850000);
    });

    it("should calculate correct totals", () => {
      const result = extractIncomeCategories(mockData);

      const salary = result.find((c) => c.name === "Salary");
      expect(salary?.total).toBe(15500000);
    });
  });

  describe("getIncomeCategoryNames", () => {
    it("should return category names sorted by total", () => {
      const result = getIncomeCategoryNames(mockData);

      expect(result).toEqual(["Salary", "Freelance", "Investments"]);
    });

    it("should return empty array for empty data", () => {
      expect(getIncomeCategoryNames([])).toEqual([]);
    });
  });

  describe("fillIncomeBuckets", () => {
    const range = {
      start: new Date("2024-01-01"),
      end: new Date("2024-03-31"),
    };

    it("should fill missing monthly buckets", () => {
      const dataWithGap: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01",
          categories: [{ categoryId: "1", categoryName: "Salary", amount: 5000000 }],
        },
        {
          period: "2024-03",
          categories: [{ categoryId: "1", categoryName: "Salary", amount: 5500000 }],
        },
      ];

      const result = fillIncomeBuckets(dataWithGap, range, "monthly");

      expect(result).toHaveLength(3);
      expect(result[0].period).toBe("2024-01");
      expect(result[1].period).toBe("2024-02");
      expect(result[2].period).toBe("2024-03");
    });

    it("should fill missing buckets with zero amounts", () => {
      const dataWithGap: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01",
          categories: [{ categoryId: "1", categoryName: "Salary", amount: 5000000 }],
        },
        {
          period: "2024-03",
          categories: [{ categoryId: "1", categoryName: "Salary", amount: 5500000 }],
        },
      ];

      const result = fillIncomeBuckets(dataWithGap, range, "monthly");

      // February should have Salary with 0 amount
      expect(result[1].categories).toHaveLength(1);
      expect(result[1].categories[0].categoryName).toBe("Salary");
      expect(result[1].categories[0].amount).toBe(0);
    });

    it("should preserve existing data", () => {
      const result = fillIncomeBuckets(mockData, range, "monthly");

      expect(result[0].categories[0].amount).toBe(5000000);
      expect(result[1].categories[0].amount).toBe(5000000);
      expect(result[2].categories[0].amount).toBe(5500000);
    });
  });

  describe("generateIncomeChartConfig", () => {
    it("should generate config with correct labels", () => {
      const categoryNames = ["Salary", "Freelance", "Investments"];
      const config = generateIncomeChartConfig(categoryNames);

      expect(config.Salary.label).toBe("Salary");
      expect(config.Freelance.label).toBe("Freelance");
      expect(config.Investments.label).toBe("Investments");
    });

    it("should assign colors from chart palette", () => {
      const categoryNames = ["Salary", "Freelance"];
      const config = generateIncomeChartConfig(categoryNames);

      expect(config.Salary.color).toMatch(/hsl\(var\(--chart-\d\)\)/);
      expect(config.Freelance.color).toMatch(/hsl\(var\(--chart-\d\)\)/);
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
      const config = generateIncomeChartConfig(categoryNames);

      expect(config.Cat1.color).toBe("hsl(var(--chart-1))");
      expect(config.Cat6.color).toBe("hsl(var(--chart-1))"); // Cycles back
    });

    it("should return empty config for empty names", () => {
      const config = generateIncomeChartConfig([]);

      expect(config).toEqual({});
    });
  });

  describe("isIncomeDataEmpty", () => {
    it("should return true for empty array", () => {
      expect(isIncomeDataEmpty([])).toBe(true);
    });

    it("should return true for null/undefined", () => {
      expect(
        isIncomeDataEmpty(null as unknown as CategorySpendingTrendChartData[])
      ).toBe(true);
      expect(
        isIncomeDataEmpty(undefined as unknown as CategorySpendingTrendChartData[])
      ).toBe(true);
    });

    it("should return true when all categories have zero amounts", () => {
      const data: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01",
          categories: [
            { categoryId: "1", categoryName: "Salary", amount: 0 },
            { categoryId: "2", categoryName: "Freelance", amount: 0 },
          ],
        },
      ];

      expect(isIncomeDataEmpty(data)).toBe(true);
    });

    it("should return true when categories array is empty", () => {
      const data: CategorySpendingTrendChartData[] = [
        { period: "2024-01", categories: [] },
      ];

      expect(isIncomeDataEmpty(data)).toBe(true);
    });

    it("should return false when any category has non-zero amount", () => {
      expect(isIncomeDataEmpty(mockData)).toBe(false);
    });
  });

  describe("calculateTotalIncome", () => {
    it("should calculate total across all periods and categories", () => {
      const result = calculateTotalIncome(mockData);

      // 15500000 + 5300000 + 1850000 = 22650000
      expect(result).toBe(22650000);
    });

    it("should return 0 for empty data", () => {
      expect(calculateTotalIncome([])).toBe(0);
    });

    it("should handle null/undefined", () => {
      expect(
        calculateTotalIncome(null as unknown as CategorySpendingTrendChartData[])
      ).toBe(0);
    });
  });

  describe("getIncomeCategoryTotal", () => {
    it("should return total for specific category", () => {
      expect(getIncomeCategoryTotal(mockData, "Salary")).toBe(15500000);
      expect(getIncomeCategoryTotal(mockData, "Freelance")).toBe(5300000);
      expect(getIncomeCategoryTotal(mockData, "Investments")).toBe(1850000);
    });

    it("should return 0 for non-existent category", () => {
      expect(getIncomeCategoryTotal(mockData, "Bonus")).toBe(0);
    });

    it("should return 0 for empty data", () => {
      expect(getIncomeCategoryTotal([], "Salary")).toBe(0);
    });
  });

  describe("limitIncomeCategories", () => {
    it("should limit to top N categories", () => {
      const result = limitIncomeCategories(mockData, 2);

      // Should keep Salary and Freelance, group Investments as Other
      for (const item of result) {
        const names = item.categories.map((c) => c.categoryName);
        expect(names).toContain("Salary");
        expect(names).toContain("Freelance");
        expect(names).not.toContain("Investments");
      }
    });

    it("should add Other category for remaining", () => {
      const result = limitIncomeCategories(mockData, 2);

      // Each period should have an "Other" category
      for (const item of result) {
        const other = item.categories.find((c) => c.categoryName === "Other");
        expect(other).toBeDefined();
      }
    });

    it("should correctly sum Other amounts", () => {
      const result = limitIncomeCategories(mockData, 2);

      // First period: Investments was 500000
      const firstPeriod = result.find((r) => r.period === "2024-01");
      const other = firstPeriod?.categories.find((c) => c.categoryName === "Other");
      expect(other?.amount).toBe(500000);
    });

    it("should return original data if limit >= category count", () => {
      const result = limitIncomeCategories(mockData, 5);

      expect(result).toEqual(mockData);
    });

    it("should return original data for empty input", () => {
      const result = limitIncomeCategories([], 2);

      expect(result).toEqual([]);
    });

    it("should return original data for zero limit", () => {
      const result = limitIncomeCategories(mockData, 0);

      expect(result).toEqual(mockData);
    });
  });
});
