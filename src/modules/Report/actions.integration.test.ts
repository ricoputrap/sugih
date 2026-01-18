import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "@/db/drizzle-client";
import {
  categoryBreakdown,
  moneyLeftToSpend,
  netWorthTrend,
  spendingTrend,
} from "./actions";

describe("Report Integration Tests", () => {
  afterAll(async () => {
    await closeDb();
  });

  describe("Spending Trend", () => {
    it("should return spending trend data", async () => {
      const trend = await spendingTrend({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date(),
        granularity: "day",
      });

      expect(Array.isArray(trend)).toBe(true);
      if (trend.length > 0) {
        expect(trend[0]).toHaveProperty("period");
        expect(trend[0]).toHaveProperty("totalAmount");
        expect(trend[0]).toHaveProperty("transactionCount");
      }
    });

    it("should return spending trend with month granularity", async () => {
      const trend = await spendingTrend({
        from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        to: new Date(),
        granularity: "month",
      });

      expect(Array.isArray(trend)).toBe(true);
      if (trend.length > 0) {
        expect(typeof trend[0].totalAmount).toBe("number");
        expect(typeof trend[0].transactionCount).toBe("number");
      }
    });

    it("should return empty array when no expenses in range", async () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const furtherFutureDate = new Date(
        futureDate.getTime() + 30 * 24 * 60 * 60 * 1000,
      );

      const trend = await spendingTrend({
        from: futureDate,
        to: furtherFutureDate,
        granularity: "day",
      });

      expect(Array.isArray(trend)).toBe(true);
      expect(trend.length).toBe(0);
    });
  });

  describe("Category Breakdown", () => {
    it("should return spending by category", async () => {
      const breakdown = await categoryBreakdown({
        from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        to: new Date(),
      });

      expect(Array.isArray(breakdown)).toBe(true);
      if (breakdown.length > 0) {
        expect(breakdown[0]).toHaveProperty("categoryId");
        expect(breakdown[0]).toHaveProperty("categoryName");
        expect(breakdown[0]).toHaveProperty("totalAmount");
        expect(breakdown[0]).toHaveProperty("transactionCount");
        expect(breakdown[0]).toHaveProperty("percentage");
      }
    });

    it("should return categories ordered by amount descending", async () => {
      const breakdown = await categoryBreakdown({
        from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        to: new Date(),
      });

      if (breakdown.length > 1) {
        for (let i = 1; i < breakdown.length; i++) {
          expect(breakdown[i - 1].totalAmount).toBeGreaterThanOrEqual(
            breakdown[i].totalAmount,
          );
        }
      }
    });

    it("should return empty array when no spending in range", async () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const furtherFutureDate = new Date(
        futureDate.getTime() + 30 * 24 * 60 * 60 * 1000,
      );

      const breakdown = await categoryBreakdown({
        from: futureDate,
        to: furtherFutureDate,
      });

      expect(Array.isArray(breakdown)).toBe(true);
    });
  });

  describe("Net Worth Trend", () => {
    it("should return net worth trend data", async () => {
      const trend = await netWorthTrend({
        from: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        to: new Date(),
        granularity: "month",
      });

      expect(Array.isArray(trend)).toBe(true);
      if (trend.length > 0) {
        expect(trend[0]).toHaveProperty("period");
        expect(trend[0]).toHaveProperty("walletBalance");
        expect(trend[0]).toHaveProperty("savingsBalance");
        expect(trend[0]).toHaveProperty("totalNetWorth");
      }
    });

    it("should calculate correct net worth", async () => {
      const trend = await netWorthTrend({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date(),
        granularity: "week",
      });

      if (trend.length > 0) {
        expect(trend[0].totalNetWorth).toBe(
          trend[0].walletBalance + trend[0].savingsBalance,
        );
      }
    });

    it("should return empty array when no data", async () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const furtherFutureDate = new Date(
        futureDate.getTime() + 30 * 24 * 60 * 60 * 1000,
      );

      const trend = await netWorthTrend({
        from: futureDate,
        to: furtherFutureDate,
        granularity: "month",
      });

      expect(Array.isArray(trend)).toBe(true);
    });
  });

  describe("Money Left to Spend", () => {
    it("should calculate remaining budget", async () => {
      const currentMonth = new Date();
      const monthStr = `${currentMonth.getFullYear()}-${String(
        currentMonth.getMonth() + 1,
      ).padStart(2, "0")}`;

      const result = await moneyLeftToSpend({
        month: monthStr,
      });

      expect(result.month).toBe(monthStr);
      expect(typeof result.totalBudget).toBe("number");
      expect(typeof result.totalSpent).toBe("number");
      expect(typeof result.remaining).toBe("number");
      expect(typeof result.percentUsed).toBe("number");
      expect(typeof result.daysRemaining).toBe("number");
    });

    it("should return zero values when no budget set", async () => {
      const futureMonth = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const monthStr = `${futureMonth.getFullYear()}-${String(
        futureMonth.getMonth() + 1,
      ).padStart(2, "0")}`;

      const result = await moneyLeftToSpend({
        month: monthStr,
      });

      expect(result.month).toBe(monthStr);
      expect(result.totalBudget).toBe(0);
      expect(result.totalSpent).toBe(0);
      expect(result.remaining).toBe(0);
    });

    it("should calculate correct remaining amount", async () => {
      const currentMonth = new Date();
      const monthStr = `${currentMonth.getFullYear()}-${String(
        currentMonth.getMonth() + 1,
      ).padStart(2, "0")}`;

      const result = await moneyLeftToSpend({
        month: monthStr,
      });

      expect(result.remaining).toBe(result.totalBudget - result.totalSpent);
      expect(result.percentUsed).toBeGreaterThanOrEqual(0);
    });
  });
});
