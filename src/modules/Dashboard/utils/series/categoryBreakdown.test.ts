/**
 * Category Breakdown Series Utility Tests
 *
 * Tests for category breakdown data transformation functions
 */

import { describe, it, expect } from "vitest";
import {
  sortCategoryBreakdown,
  groupSmallCategories,
  filterValidCategories,
  prepareCategoryBreakdownForChart,
  calculateTotalAmount,
  assignCategoryColors,
} from "./categoryBreakdown";
import type { CategoryBreakdownData } from "../../schema";

describe("categoryBreakdown", () => {
  describe("sortCategoryBreakdown", () => {
    it("should sort categories by amount in descending order", () => {
      const data: CategoryBreakdownData[] = [
        { categoryId: "1", categoryName: "Food", amount: 100, percentage: 20 },
        {
          categoryId: "2",
          categoryName: "Transport",
          amount: 300,
          percentage: 60,
        },
        {
          categoryId: "3",
          categoryName: "Entertainment",
          amount: 200,
          percentage: 20,
        },
      ];

      const result = sortCategoryBreakdown(data);

      expect(result).toHaveLength(3);
      expect(result[0].categoryName).toBe("Transport");
      expect(result[0].amount).toBe(300);
      expect(result[1].categoryName).toBe("Entertainment");
      expect(result[1].amount).toBe(200);
      expect(result[2].categoryName).toBe("Food");
      expect(result[2].amount).toBe(100);
    });

    it("should not mutate the original array", () => {
      const data: CategoryBreakdownData[] = [
        { categoryId: "1", categoryName: "Food", amount: 100, percentage: 20 },
        {
          categoryId: "2",
          categoryName: "Transport",
          amount: 300,
          percentage: 60,
        },
      ];

      const original = [...data];
      sortCategoryBreakdown(data);

      expect(data).toEqual(original);
    });

    it("should handle empty array", () => {
      const result = sortCategoryBreakdown([]);
      expect(result).toEqual([]);
    });

    it("should handle single item", () => {
      const data: CategoryBreakdownData[] = [
        { categoryId: "1", categoryName: "Food", amount: 100, percentage: 100 },
      ];

      const result = sortCategoryBreakdown(data);
      expect(result).toEqual(data);
    });
  });

  describe("groupSmallCategories", () => {
    it("should not group when categories are below max", () => {
      const data: CategoryBreakdownData[] = [
        { categoryId: "1", categoryName: "Food", amount: 300, percentage: 60 },
        {
          categoryId: "2",
          categoryName: "Transport",
          amount: 200,
          percentage: 40,
        },
      ];

      const result = groupSmallCategories(data, 5);
      expect(result).toHaveLength(2);
      expect(result).toEqual(data);
    });

    it("should group categories beyond max into Other bucket", () => {
      const data: CategoryBreakdownData[] = [
        {
          categoryId: "1",
          categoryName: "Food",
          amount: 500,
          percentage: 50,
        },
        {
          categoryId: "2",
          categoryName: "Transport",
          amount: 200,
          percentage: 20,
        },
        {
          categoryId: "3",
          categoryName: "Entertainment",
          amount: 150,
          percentage: 15,
        },
        {
          categoryId: "4",
          categoryName: "Shopping",
          amount: 100,
          percentage: 10,
        },
        {
          categoryId: "5",
          categoryName: "Bills",
          amount: 50,
          percentage: 5,
        },
      ];

      const result = groupSmallCategories(data, 3);

      expect(result).toHaveLength(4);
      expect(result[0].categoryName).toBe("Food");
      expect(result[1].categoryName).toBe("Transport");
      expect(result[2].categoryName).toBe("Entertainment");
      expect(result[3].categoryName).toBe("Other");
      expect(result[3].categoryId).toBe("other");
      expect(result[3].amount).toBe(150); // 100 + 50
      expect(result[3].percentage).toBeCloseTo(15, 1); // (150/1000) * 100
    });

    it("should calculate correct percentage for Other bucket", () => {
      const data: CategoryBreakdownData[] = [
        {
          categoryId: "1",
          categoryName: "A",
          amount: 1000,
          percentage: 50,
        },
        { categoryId: "2", categoryName: "B", amount: 600, percentage: 30 },
        { categoryId: "3", categoryName: "C", amount: 400, percentage: 20 },
      ];

      const result = groupSmallCategories(data, 2);

      expect(result).toHaveLength(3);
      expect(result[2].categoryName).toBe("Other");
      expect(result[2].amount).toBe(400);
      expect(result[2].percentage).toBeCloseTo(20, 1);
    });

    it("should handle edge case with exactly maxCategories", () => {
      const data: CategoryBreakdownData[] = [
        { categoryId: "1", categoryName: "A", amount: 100, percentage: 50 },
        { categoryId: "2", categoryName: "B", amount: 100, percentage: 50 },
      ];

      const result = groupSmallCategories(data, 2);
      expect(result).toHaveLength(2);
      expect(result.find((c) => c.categoryName === "Other")).toBeUndefined();
    });

    it("should handle zero total gracefully", () => {
      const data: CategoryBreakdownData[] = [
        { categoryId: "1", categoryName: "A", amount: 0, percentage: 0 },
        { categoryId: "2", categoryName: "B", amount: 0, percentage: 0 },
        { categoryId: "3", categoryName: "C", amount: 0, percentage: 0 },
      ];

      const result = groupSmallCategories(data, 1);
      expect(result).toHaveLength(2);
      expect(result[1].categoryName).toBe("Other");
      expect(result[1].percentage).toBe(0);
    });
  });

  describe("filterValidCategories", () => {
    it("should filter out zero amounts", () => {
      const data: CategoryBreakdownData[] = [
        { categoryId: "1", categoryName: "Food", amount: 100, percentage: 50 },
        {
          categoryId: "2",
          categoryName: "Transport",
          amount: 0,
          percentage: 0,
        },
        {
          categoryId: "3",
          categoryName: "Entertainment",
          amount: 100,
          percentage: 50,
        },
      ];

      const result = filterValidCategories(data);

      expect(result).toHaveLength(2);
      expect(result[0].categoryName).toBe("Food");
      expect(result[1].categoryName).toBe("Entertainment");
    });

    it("should filter out negative amounts", () => {
      const data: CategoryBreakdownData[] = [
        { categoryId: "1", categoryName: "Food", amount: 100, percentage: 50 },
        {
          categoryId: "2",
          categoryName: "Transport",
          amount: -50,
          percentage: -25,
        },
        {
          categoryId: "3",
          categoryName: "Entertainment",
          amount: 100,
          percentage: 50,
        },
      ];

      const result = filterValidCategories(data);

      expect(result).toHaveLength(2);
      expect(result[0].categoryName).toBe("Food");
      expect(result[1].categoryName).toBe("Entertainment");
    });

    it("should handle empty array", () => {
      const result = filterValidCategories([]);
      expect(result).toEqual([]);
    });

    it("should handle all valid amounts", () => {
      const data: CategoryBreakdownData[] = [
        { categoryId: "1", categoryName: "Food", amount: 100, percentage: 50 },
        {
          categoryId: "2",
          categoryName: "Transport",
          amount: 100,
          percentage: 50,
        },
      ];

      const result = filterValidCategories(data);
      expect(result).toEqual(data);
    });
  });

  describe("prepareCategoryBreakdownForChart", () => {
    it("should apply all transformations in sequence", () => {
      const data: CategoryBreakdownData[] = [
        { categoryId: "1", categoryName: "A", amount: 100, percentage: 10 },
        { categoryId: "2", categoryName: "B", amount: 200, percentage: 20 },
        { categoryId: "3", categoryName: "C", amount: 0, percentage: 0 },
        { categoryId: "4", categoryName: "D", amount: 300, percentage: 30 },
        { categoryId: "5", categoryName: "E", amount: 150, percentage: 15 },
        { categoryId: "6", categoryName: "F", amount: 50, percentage: 5 },
        { categoryId: "7", categoryName: "G", amount: 75, percentage: 7.5 },
        { categoryId: "8", categoryName: "H", amount: 25, percentage: 2.5 },
      ];

      const result = prepareCategoryBreakdownForChart(data, 3);

      // Should filter out zero amounts, sort by amount desc, and group
      expect(result).toHaveLength(4); // Top 3 + Other
      expect(result[0].categoryName).toBe("D"); // 300
      expect(result[1].categoryName).toBe("B"); // 200
      expect(result[2].categoryName).toBe("E"); // 150
      expect(result[3].categoryName).toBe("Other"); // 100 + 75 + 50 + 25 = 250
      expect(result[3].amount).toBe(250);
    });

    it("should handle undefined data", () => {
      const result = prepareCategoryBreakdownForChart(undefined);
      expect(result).toEqual([]);
    });

    it("should handle null data", () => {
      const result = prepareCategoryBreakdownForChart(null);
      expect(result).toEqual([]);
    });

    it("should handle empty array", () => {
      const result = prepareCategoryBreakdownForChart([]);
      expect(result).toEqual([]);
    });

    it("should use default max categories when not specified", () => {
      const data: CategoryBreakdownData[] = Array.from(
        { length: 10 },
        (_, i) => ({
          categoryId: String(i),
          categoryName: `Category ${i}`,
          amount: (10 - i) * 100,
          percentage: 10,
        }),
      );

      const result = prepareCategoryBreakdownForChart(data);

      // Default max is 8, so should have 8 + 1 (Other) = 9
      expect(result).toHaveLength(9);
      expect(result[8].categoryName).toBe("Other");
    });
  });

  describe("calculateTotalAmount", () => {
    it("should sum all category amounts", () => {
      const data: CategoryBreakdownData[] = [
        { categoryId: "1", categoryName: "Food", amount: 100, percentage: 20 },
        {
          categoryId: "2",
          categoryName: "Transport",
          amount: 200,
          percentage: 40,
        },
        {
          categoryId: "3",
          categoryName: "Entertainment",
          amount: 200,
          percentage: 40,
        },
      ];

      const result = calculateTotalAmount(data);
      expect(result).toBe(500);
    });

    it("should handle empty array", () => {
      const result = calculateTotalAmount([]);
      expect(result).toBe(0);
    });

    it("should handle undefined", () => {
      const result = calculateTotalAmount(undefined);
      expect(result).toBe(0);
    });

    it("should handle null", () => {
      const result = calculateTotalAmount(null);
      expect(result).toBe(0);
    });

    it("should handle decimal amounts", () => {
      const data: CategoryBreakdownData[] = [
        {
          categoryId: "1",
          categoryName: "Food",
          amount: 99.99,
          percentage: 50,
        },
        {
          categoryId: "2",
          categoryName: "Transport",
          amount: 100.01,
          percentage: 50,
        },
      ];

      const result = calculateTotalAmount(data);
      expect(result).toBeCloseTo(200, 2);
    });
  });

  describe("assignCategoryColors", () => {
    const colors = ["#ff0000", "#00ff00", "#0000ff"] as const;

    it("should assign colors to categories", () => {
      const data: CategoryBreakdownData[] = [
        { categoryId: "1", categoryName: "Food", amount: 100, percentage: 50 },
        {
          categoryId: "2",
          categoryName: "Transport",
          amount: 100,
          percentage: 50,
        },
      ];

      const result = assignCategoryColors(data, colors);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("color", "#ff0000");
      expect(result[1]).toHaveProperty("color", "#00ff00");
    });

    it("should cycle through colors when more categories than colors", () => {
      const data: CategoryBreakdownData[] = [
        { categoryId: "1", categoryName: "A", amount: 100, percentage: 25 },
        { categoryId: "2", categoryName: "B", amount: 100, percentage: 25 },
        { categoryId: "3", categoryName: "C", amount: 100, percentage: 25 },
        { categoryId: "4", categoryName: "D", amount: 100, percentage: 25 },
      ];

      const result = assignCategoryColors(data, colors);

      expect(result).toHaveLength(4);
      expect(result[0].color).toBe("#ff0000"); // Index 0
      expect(result[1].color).toBe("#00ff00"); // Index 1
      expect(result[2].color).toBe("#0000ff"); // Index 2
      expect(result[3].color).toBe("#ff0000"); // Index 3 % 3 = 0
    });

    it("should preserve original category data", () => {
      const data: CategoryBreakdownData[] = [
        { categoryId: "1", categoryName: "Food", amount: 100, percentage: 50 },
      ];

      const result = assignCategoryColors(data, colors);

      expect(result[0].categoryId).toBe("1");
      expect(result[0].categoryName).toBe("Food");
      expect(result[0].amount).toBe(100);
      expect(result[0].percentage).toBe(50);
    });

    it("should handle empty array", () => {
      const result = assignCategoryColors([], colors);
      expect(result).toEqual([]);
    });
  });
});
