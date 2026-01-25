import { describe, it, expect } from "vitest";
import type { BudgetViewMode, BudgetSummaryItem, BudgetSummary } from "./types";

describe("Budget Types", () => {
  describe("BudgetViewMode", () => {
    it("should accept 'list' as valid view mode", () => {
      const mode: BudgetViewMode = "list";
      expect(mode).toBe("list");
    });

    it("should accept 'grid' as valid view mode", () => {
      const mode: BudgetViewMode = "grid";
      expect(mode).toBe("grid");
    });
  });

  describe("BudgetSummaryItem", () => {
    it("should have all required properties", () => {
      const item: BudgetSummaryItem = {
        categoryId: "cat1",
        categoryName: "Food",
        budgetAmount: 1000000,
        spentAmount: 750000,
        remaining: 250000,
        percentUsed: 75,
      };

      expect(item.categoryId).toBe("cat1");
      expect(item.categoryName).toBe("Food");
      expect(item.budgetAmount).toBe(1000000);
      expect(item.spentAmount).toBe(750000);
      expect(item.remaining).toBe(250000);
      expect(item.percentUsed).toBe(75);
    });

    it("should be assignable to typed variable", () => {
      const summaryItems: BudgetSummaryItem[] = [
        {
          categoryId: "cat1",
          categoryName: "Food",
          budgetAmount: 1000000,
          spentAmount: 750000,
          remaining: 250000,
          percentUsed: 75,
        },
        {
          categoryId: "cat2",
          categoryName: "Transport",
          budgetAmount: 500000,
          spentAmount: 400000,
          remaining: 100000,
          percentUsed: 80,
        },
      ];

      expect(summaryItems).toHaveLength(2);
      expect(summaryItems[0].categoryName).toBe("Food");
      expect(summaryItems[1].categoryName).toBe("Transport");
    });
  });

  describe("BudgetSummary", () => {
    it("should have all required properties", () => {
      const summary: BudgetSummary = {
        totalBudget: 2000000,
        totalSpent: 1500000,
        remaining: 500000,
        items: [
          {
            categoryId: "cat1",
            categoryName: "Food",
            budgetAmount: 1000000,
            spentAmount: 750000,
            remaining: 250000,
            percentUsed: 75,
          },
        ],
      };

      expect(summary.totalBudget).toBe(2000000);
      expect(summary.totalSpent).toBe(1500000);
      expect(summary.remaining).toBe(500000);
      expect(summary.items).toHaveLength(1);
    });

    it("should support empty items array", () => {
      const summary: BudgetSummary = {
        totalBudget: 0,
        totalSpent: 0,
        remaining: 0,
        items: [],
      };

      expect(summary.items).toHaveLength(0);
    });
  });
});
