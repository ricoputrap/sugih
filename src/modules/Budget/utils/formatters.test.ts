import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatPercentage,
  formatCompactCurrency,
} from "./formatters";

describe("Formatters", () => {
  describe("formatCurrency", () => {
    it("should format whole numbers as IDR currency", () => {
      expect(formatCurrency(1000000)).toBe("Rp\u00a01.000.000");
    });

    it("should format zero", () => {
      expect(formatCurrency(0)).toBe("Rp\u00a00");
    });

    it("should format small amounts", () => {
      expect(formatCurrency(500)).toBe("Rp\u00a0500");
    });

    it("should format large amounts", () => {
      expect(formatCurrency(1000000000)).toBe("Rp\u00a01.000.000.000");
    });

    it("should handle negative amounts", () => {
      expect(formatCurrency(-500000)).toContain("-");
      expect(formatCurrency(-500000)).toContain("500.000");
    });

    it("should not include decimal places", () => {
      expect(formatCurrency(1000.99)).toBe("Rp\u00a01.001");
    });

    it("should format example from plan", () => {
      expect(formatCurrency(2000000)).toBe("Rp\u00a02.000.000");
    });

    it("should format 1.5M", () => {
      expect(formatCurrency(1500000)).toBe("Rp\u00a01.500.000");
    });
  });

  describe("formatPercentage", () => {
    it("should format percentage with 1 decimal place by default", () => {
      expect(formatPercentage(75)).toBe("75.0%");
    });

    it("should format percentage with custom decimal places", () => {
      expect(formatPercentage(75.5, 2)).toBe("75.50%");
    });

    it("should format 0 percentage", () => {
      expect(formatPercentage(0)).toBe("0.0%");
    });

    it("should format 100 percentage", () => {
      expect(formatPercentage(100)).toBe("100.0%");
    });

    it("should format over-budget percentage (>100%)", () => {
      expect(formatPercentage(125)).toBe("125.0%");
    });

    it("should format decimal percentage values", () => {
      expect(formatPercentage(75.123, 2)).toBe("75.12%");
    });

    it("should format with 0 decimal places", () => {
      expect(formatPercentage(75.5, 0)).toBe("76%");
    });

    it("should format with 3 decimal places", () => {
      expect(formatPercentage(75.123, 3)).toBe("75.123%");
    });

    it("should handle negative percentage", () => {
      expect(formatPercentage(-10)).toBe("-10.0%");
    });
  });

  describe("formatCompactCurrency", () => {
    it("should format millions", () => {
      expect(formatCompactCurrency(1500000)).toBe("1.5M");
    });

    it("should format exactly 1 million", () => {
      expect(formatCompactCurrency(1000000)).toBe("1.0M");
    });

    it("should format thousands", () => {
      expect(formatCompactCurrency(500000)).toBe("500K");
    });

    it("should format exactly 1 thousand", () => {
      expect(formatCompactCurrency(1000)).toBe("1K");
    });

    it("should format less than 1 thousand", () => {
      expect(formatCompactCurrency(999)).toBe("999");
    });

    it("should format zero", () => {
      expect(formatCompactCurrency(0)).toBe("0");
    });

    it("should handle negative millions", () => {
      expect(formatCompactCurrency(-1500000)).toBe("-1.5M");
    });

    it("should handle negative thousands", () => {
      expect(formatCompactCurrency(-500000)).toBe("-500K");
    });

    it("should round millions appropriately", () => {
      expect(formatCompactCurrency(1234567)).toBe("1.2M");
    });

    it("should not round thousands", () => {
      expect(formatCompactCurrency(555555)).toBe("556K");
    });

    it("should format 2M", () => {
      expect(formatCompactCurrency(2000000)).toBe("2.0M");
    });
  });

  describe("Integration", () => {
    it("should handle typical budget amounts", () => {
      const budgetAmount = 2000000;
      const spentAmount = 1500000;
      const remaining = budgetAmount - spentAmount;

      expect(formatCurrency(budgetAmount)).toBe("Rp\u00a02.000.000");
      expect(formatCurrency(spentAmount)).toBe("Rp\u00a01.500.000");
      expect(formatCurrency(remaining)).toBe("Rp\u00a0500.000");
    });

    it("should handle typical percentage scenarios", () => {
      const percentUsed = 75;
      expect(formatPercentage(percentUsed)).toBe("75.0%");
    });

    it("should format budget summary data", () => {
      const summary = {
        totalBudget: 5000000,
        totalSpent: 3500000,
        remaining: 1500000,
        percentUsed: 70,
      };

      expect(formatCurrency(summary.totalBudget)).toBe("Rp\u00a05.000.000");
      expect(formatCurrency(summary.totalSpent)).toBe("Rp\u00a03.500.000");
      expect(formatCurrency(summary.remaining)).toBe("Rp\u00a01.500.000");
      expect(formatPercentage(summary.percentUsed)).toBe("70.0%");
    });
  });
});
