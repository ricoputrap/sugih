/**
 * KPI Computation Utilities Tests
 *
 * Unit tests for dashboard KPI calculations including:
 * - Net worth computation
 * - Money left to spend calculation
 * - Growth percentage calculations
 * - Growth metric formatting
 * - Edge cases (zero baselines, negative values)
 */

import { describe, expect, it } from "vitest";
import {
  type BudgetData,
  computeGrowthPercentage,
  computeKpiSummary,
  computeMoneyLeftToSpend,
  computeNetWorth,
  computeTotalSavings,
  computeTotalSpending,
  formatGrowthMetric,
  type KpiSummaryInput,
  type SavingsBucketBalance,
  type SpendingData,
  type WalletBalance,
} from "./kpis";

describe("KPI Computation Utilities", () => {
  describe("computeNetWorth", () => {
    it("should compute total net worth from wallets and savings", () => {
      const wallets: WalletBalance[] = [
        { id: "1", name: "Cash", balance: 1000 },
        { id: "2", name: "Bank", balance: 5000 },
      ];
      const savings: SavingsBucketBalance[] = [
        { id: "1", name: "Emergency", balance: 10000 },
        { id: "2", name: "Vacation", balance: 3000 },
      ];

      const netWorth = computeNetWorth(wallets, savings);
      expect(netWorth).toBe(19000);
    });

    it("should handle empty wallets array", () => {
      const wallets: WalletBalance[] = [];
      const savings: SavingsBucketBalance[] = [
        { id: "1", name: "Emergency", balance: 5000 },
      ];

      const netWorth = computeNetWorth(wallets, savings);
      expect(netWorth).toBe(5000);
    });

    it("should handle empty savings array", () => {
      const wallets: WalletBalance[] = [
        { id: "1", name: "Cash", balance: 2000 },
      ];
      const savings: SavingsBucketBalance[] = [];

      const netWorth = computeNetWorth(wallets, savings);
      expect(netWorth).toBe(2000);
    });

    it("should handle both empty arrays", () => {
      const wallets: WalletBalance[] = [];
      const savings: SavingsBucketBalance[] = [];

      const netWorth = computeNetWorth(wallets, savings);
      expect(netWorth).toBe(0);
    });

    it("should handle negative wallet balances", () => {
      const wallets: WalletBalance[] = [
        { id: "1", name: "Credit Card", balance: -500 },
        { id: "2", name: "Cash", balance: 1000 },
      ];
      const savings: SavingsBucketBalance[] = [
        { id: "1", name: "Emergency", balance: 5000 },
      ];

      const netWorth = computeNetWorth(wallets, savings);
      expect(netWorth).toBe(5500);
    });

    it("should handle large numbers accurately", () => {
      const wallets: WalletBalance[] = [
        { id: "1", name: "Investment", balance: 1000000 },
      ];
      const savings: SavingsBucketBalance[] = [
        { id: "1", name: "Retirement", balance: 5000000 },
      ];

      const netWorth = computeNetWorth(wallets, savings);
      expect(netWorth).toBe(6000000);
    });
  });

  describe("computeMoneyLeftToSpend", () => {
    it("should compute money left from budget and spending", () => {
      const budget: BudgetData = { amount: 5000, period: "monthly" };
      const spending: SpendingData = { total: 3000, period: "this month" };

      const moneyLeft = computeMoneyLeftToSpend(budget, spending);
      expect(moneyLeft).toBe(2000);
    });

    it("should return negative when spending exceeds budget", () => {
      const budget: BudgetData = { amount: 3000, period: "monthly" };
      const spending: SpendingData = { total: 4000, period: "this month" };

      const moneyLeft = computeMoneyLeftToSpend(budget, spending);
      expect(moneyLeft).toBe(-1000);
    });

    it("should handle null budget", () => {
      const budget = null;
      const spending: SpendingData = { total: 3000, period: "this month" };

      const moneyLeft = computeMoneyLeftToSpend(budget, spending);
      expect(moneyLeft).toBe(-3000);
    });

    it("should handle zero budget", () => {
      const budget: BudgetData = { amount: 0, period: "monthly" };
      const spending: SpendingData = { total: 3000, period: "this month" };

      const moneyLeft = computeMoneyLeftToSpend(budget, spending);
      expect(moneyLeft).toBe(-3000);
    });

    it("should handle zero spending", () => {
      const budget: BudgetData = { amount: 5000, period: "monthly" };
      const spending: SpendingData = { total: 0, period: "this month" };

      const moneyLeft = computeMoneyLeftToSpend(budget, spending);
      expect(moneyLeft).toBe(5000);
    });

    it("should handle exact budget match", () => {
      const budget: BudgetData = { amount: 5000, period: "monthly" };
      const spending: SpendingData = { total: 5000, period: "this month" };

      const moneyLeft = computeMoneyLeftToSpend(budget, spending);
      expect(moneyLeft).toBe(0);
    });
  });

  describe("computeTotalSpending", () => {
    it("should return total spending amount", () => {
      const spending: SpendingData = { total: 3500, period: "this month" };
      expect(computeTotalSpending(spending)).toBe(3500);
    });

    it("should handle zero spending", () => {
      const spending: SpendingData = { total: 0, period: "this month" };
      expect(computeTotalSpending(spending)).toBe(0);
    });

    it("should handle large amounts", () => {
      const spending: SpendingData = { total: 123456.78, period: "this month" };
      expect(computeTotalSpending(spending)).toBe(123456.78);
    });
  });

  describe("computeTotalSavings", () => {
    it("should compute total from all savings buckets", () => {
      const savings: SavingsBucketBalance[] = [
        { id: "1", name: "Emergency", balance: 10000 },
        { id: "2", name: "Vacation", balance: 3000 },
        { id: "3", name: "Car", balance: 7000 },
      ];

      expect(computeTotalSavings(savings)).toBe(20000);
    });

    it("should handle empty savings array", () => {
      const savings: SavingsBucketBalance[] = [];
      expect(computeTotalSavings(savings)).toBe(0);
    });

    it("should handle single bucket", () => {
      const savings: SavingsBucketBalance[] = [
        { id: "1", name: "Emergency", balance: 5000 },
      ];
      expect(computeTotalSavings(savings)).toBe(5000);
    });

    it("should handle decimal values", () => {
      const savings: SavingsBucketBalance[] = [
        { id: "1", name: "Emergency", balance: 1234.56 },
        { id: "2", name: "Vacation", balance: 789.12 },
      ];
      expect(computeTotalSavings(savings)).toBeCloseTo(2023.68, 2);
    });
  });

  describe("computeGrowthPercentage", () => {
    it("should calculate positive growth percentage", () => {
      expect(computeGrowthPercentage(120, 100)).toBe(20);
    });

    it("should calculate negative growth percentage", () => {
      expect(computeGrowthPercentage(80, 100)).toBe(-20);
    });

    it("should return 0 for no change", () => {
      expect(computeGrowthPercentage(100, 100)).toBe(0);
    });

    it("should handle zero previous value with positive current", () => {
      expect(computeGrowthPercentage(100, 0)).toBe(100);
    });

    it("should handle zero previous value with negative current", () => {
      expect(computeGrowthPercentage(-100, 0)).toBe(-100);
    });

    it("should handle both values being zero", () => {
      expect(computeGrowthPercentage(0, 0)).toBe(0);
    });

    it("should round to 1 decimal place", () => {
      expect(computeGrowthPercentage(115, 100)).toBe(15);
      expect(computeGrowthPercentage(116.66, 100)).toBe(16.7);
    });

    it("should handle large percentage changes", () => {
      expect(computeGrowthPercentage(1000, 100)).toBe(900);
    });

    it("should handle small percentage changes", () => {
      expect(computeGrowthPercentage(101, 100)).toBe(1);
    });

    it("should handle negative to positive transition", () => {
      expect(computeGrowthPercentage(50, -50)).toBe(200);
    });

    it("should handle positive to negative transition", () => {
      expect(computeGrowthPercentage(-50, 50)).toBe(-200);
    });

    it("should handle negative values with negative growth", () => {
      expect(computeGrowthPercentage(-120, -100)).toBe(-20);
    });

    it("should handle decimal values", () => {
      expect(computeGrowthPercentage(105.5, 100.5)).toBeCloseTo(5, 0);
    });
  });

  describe("formatGrowthMetric", () => {
    it("should format positive growth", () => {
      const metric = formatGrowthMetric(120, 100);
      expect(metric.value).toBe(20);
      expect(metric.label).toBe("+20% from last month");
      expect(metric.isPositive).toBe(true);
      expect(metric.isNegative).toBe(false);
      expect(metric.isNeutral).toBe(false);
    });

    it("should format negative growth", () => {
      const metric = formatGrowthMetric(80, 100);
      expect(metric.value).toBe(-20);
      expect(metric.label).toBe("-20% from last month");
      expect(metric.isPositive).toBe(false);
      expect(metric.isNegative).toBe(true);
      expect(metric.isNeutral).toBe(false);
    });

    it("should format neutral growth", () => {
      const metric = formatGrowthMetric(100, 100);
      expect(metric.value).toBe(0);
      expect(metric.label).toBe("No change from last month");
      expect(metric.isPositive).toBe(false);
      expect(metric.isNegative).toBe(false);
      expect(metric.isNeutral).toBe(true);
    });

    it("should use custom positive label", () => {
      const metric = formatGrowthMetric(120, 100, {
        positive: "Increased by 20%",
      });
      expect(metric.label).toBe("Increased by 20%");
    });

    it("should use custom negative label", () => {
      const metric = formatGrowthMetric(80, 100, {
        negative: "Decreased by 20%",
      });
      expect(metric.label).toBe("Decreased by 20%");
    });

    it("should use custom neutral label", () => {
      const metric = formatGrowthMetric(100, 100, {
        neutral: "Unchanged",
      });
      expect(metric.label).toBe("Unchanged");
    });

    it("should handle zero baseline with positive current", () => {
      const metric = formatGrowthMetric(100, 0);
      expect(metric.value).toBe(100);
      expect(metric.isPositive).toBe(true);
    });

    it("should handle zero baseline with negative current", () => {
      const metric = formatGrowthMetric(-100, 0);
      expect(metric.value).toBe(-100);
      expect(metric.isNegative).toBe(true);
    });

    it("should handle large growth percentages", () => {
      const metric = formatGrowthMetric(1000, 100);
      expect(metric.value).toBe(900);
      expect(metric.label).toBe("+900% from last month");
    });

    it("should handle small decimal growth", () => {
      const metric = formatGrowthMetric(101.5, 100);
      expect(metric.value).toBe(1.5);
      expect(metric.label).toBe("+1.5% from last month");
    });
  });

  describe("computeKpiSummary", () => {
    const baseInput: KpiSummaryInput = {
      currentWallets: [
        { id: "1", name: "Cash", balance: 1000 },
        { id: "2", name: "Bank", balance: 5000 },
      ],
      currentSavings: [
        { id: "1", name: "Emergency", balance: 10000 },
        { id: "2", name: "Vacation", balance: 3000 },
      ],
      previousWallets: [
        { id: "1", name: "Cash", balance: 900 },
        { id: "2", name: "Bank", balance: 4500 },
      ],
      previousSavings: [
        { id: "1", name: "Emergency", balance: 9000 },
        { id: "2", name: "Vacation", balance: 2500 },
      ],
      currentBudget: { amount: 5000, period: "monthly" },
      previousBudget: { amount: 5000, period: "monthly" },
      currentSpending: { total: 3000, period: "this month" },
      previousSpending: { total: 2800, period: "last month" },
    };

    it("should compute complete KPI summary", () => {
      const summary = computeKpiSummary(baseInput);

      expect(summary.netWorth.title).toBe("Total Net Worth");
      expect(summary.netWorth.value).toBe(19000);
      expect(summary.netWorth.period).toBe("All time");

      expect(summary.moneyLeftToSpend.title).toBe("Money Left to Spend");
      expect(summary.moneyLeftToSpend.value).toBe(2000);

      expect(summary.totalSpending.title).toBe("Total Spending");
      expect(summary.totalSpending.value).toBe(3000);

      expect(summary.totalSavings.title).toBe("Total Savings");
      expect(summary.totalSavings.value).toBe(13000);
    });

    it("should use descriptive label for net worth (not growth percentage)", () => {
      const summary = computeKpiSummary(baseInput);
      // Net Worth should show "Total Wallets + Savings" instead of percentage growth
      expect(summary.netWorth.growth.label).toBe("Total Wallets + Savings");
      expect(summary.netWorth.growth.value).toBe(0);
      expect(summary.netWorth.growth.isNeutral).toBe(true);
      expect(summary.netWorth.growth.isPositive).toBe(false);
      expect(summary.netWorth.growth.isNegative).toBe(false);
    });

    it("should compute money left to spend growth correctly", () => {
      const summary = computeKpiSummary(baseInput);
      // Current: 2000, Previous: 2200, Growth: ~-9.1%
      expect(summary.moneyLeftToSpend.growth.value).toBeCloseTo(-9.1, 0);
      expect(summary.moneyLeftToSpend.growth.isNegative).toBe(true);
    });

    it("should compute spending growth correctly", () => {
      const summary = computeKpiSummary(baseInput);
      // Current: 3000, Previous: 2800, Growth: ~7.1%
      expect(summary.totalSpending.growth.value).toBeCloseTo(7.1, 0);
      expect(summary.totalSpending.growth.isPositive).toBe(true);
    });

    it("should compute savings growth correctly", () => {
      const summary = computeKpiSummary(baseInput);
      // Current: 13000, Previous: 11500, Growth: ~13%
      expect(summary.totalSavings.growth.value).toBeCloseTo(13, 0);
      expect(summary.totalSavings.growth.isPositive).toBe(true);
    });

    it("should handle null current budget", () => {
      const input: KpiSummaryInput = {
        ...baseInput,
        currentBudget: null,
      };

      const summary = computeKpiSummary(input);
      expect(summary.moneyLeftToSpend.value).toBe(-3000);
    });

    it("should handle null previous budget", () => {
      const input: KpiSummaryInput = {
        ...baseInput,
        previousBudget: null,
      };

      const summary = computeKpiSummary(input);
      expect(summary.moneyLeftToSpend.growth).toBeDefined();
    });

    it("should handle empty wallets and savings", () => {
      const input: KpiSummaryInput = {
        ...baseInput,
        currentWallets: [],
        currentSavings: [],
        previousWallets: [],
        previousSavings: [],
      };

      const summary = computeKpiSummary(input);
      expect(summary.netWorth.value).toBe(0);
      expect(summary.totalSavings.value).toBe(0);
    });

    it("should handle zero spending", () => {
      const input: KpiSummaryInput = {
        ...baseInput,
        currentSpending: { total: 0, period: "this month" },
        previousSpending: { total: 0, period: "last month" },
      };

      const summary = computeKpiSummary(input);
      expect(summary.totalSpending.value).toBe(0);
      expect(summary.totalSpending.growth.value).toBe(0);
      expect(summary.totalSpending.growth.isNeutral).toBe(true);
    });

    it("should use spending period in money left and spending cards", () => {
      const input: KpiSummaryInput = {
        ...baseInput,
        currentSpending: { total: 3000, period: "March 2024" },
      };

      const summary = computeKpiSummary(input);
      expect(summary.moneyLeftToSpend.period).toBe("March 2024");
      expect(summary.totalSpending.period).toBe("March 2024");
    });

    it("should default to 'This month' if no spending period provided", () => {
      const input: KpiSummaryInput = {
        ...baseInput,
        currentSpending: { total: 3000, period: "" },
      };

      const summary = computeKpiSummary(input);
      expect(summary.moneyLeftToSpend.period).toBe("This month");
      expect(summary.totalSpending.period).toBe("This month");
    });

    it("should handle negative net worth", () => {
      const input: KpiSummaryInput = {
        ...baseInput,
        currentWallets: [{ id: "1", name: "Debt", balance: -5000 }],
        currentSavings: [],
      };

      const summary = computeKpiSummary(input);
      expect(summary.netWorth.value).toBe(-5000);
      // Label should still be "Total Wallets + Savings" regardless of value
      expect(summary.netWorth.growth.label).toBe("Total Wallets + Savings");
    });

    it("should maintain precision for decimal values", () => {
      const input: KpiSummaryInput = {
        ...baseInput,
        currentWallets: [{ id: "1", name: "Cash", balance: 1234.56 }],
        currentSavings: [{ id: "1", name: "Emergency", balance: 9876.54 }],
      };

      const summary = computeKpiSummary(input);
      expect(summary.netWorth.value).toBeCloseTo(11111.1, 1);
    });
  });
});
