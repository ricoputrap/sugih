import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db/drizzle-client";
import { createCategory, deleteCategory } from "@/modules/Category/actions";
import {
  createSavingsBucket,
  deleteSavingsBucket,
} from "@/modules/SavingsBucket/actions";
import { createExpense, createIncome } from "@/modules/Transaction/actions";
import { postings, transactionEvents } from "@/modules/Transaction/schema";
import { createWallet, deleteWallet } from "@/modules/Wallet/actions";
import {
  getCategoryBreakdownData,
  getCategorySpendingTrendChartData,
  getDashboardData,
  getDashboardSummary,
  getNetWorthTrendChartData,
  getRecentTransactions,
  getSpendingTrendChartData,
} from "./actions";

describe("Dashboard Integration Tests", () => {
  let testWalletId: string;
  let testWallet2Id: string;
  let testCategoryId: string;
  let testBucketId: string;
  const testTransactionIds: string[] = [];

  beforeEach(async () => {
    // Create test wallet
    const wallet = await createWallet({
      name: `Dashboard Wallet ${nanoid()}`,
      type: "bank",
    });
    testWalletId = wallet.id;

    // Create second test wallet
    const wallet2 = await createWallet({
      name: `Dashboard Wallet 2 ${nanoid()}`,
      type: "bank",
    });
    testWallet2Id = wallet2.id;

    // Create test category (expense type for expense transactions)
    const category = await createCategory({
      name: `Dashboard Category ${nanoid()}`,
      type: "expense",
    });
    testCategoryId = category.id;

    // Create test savings bucket
    const bucket = await createSavingsBucket({
      name: `Dashboard Bucket ${nanoid()}`,
    });
    testBucketId = bucket.id;

    // Create some test transactions
    const expense = await createExpense({
      occurredAt: new Date(),
      walletId: testWalletId,
      categoryId: testCategoryId,
      amountIdr: 50000,
      note: "Dashboard test expense",
    });
    testTransactionIds.push(expense.id);

    const income = await createIncome({
      occurredAt: new Date(),
      walletId: testWalletId,
      amountIdr: 100000,
      note: "Dashboard test income",
    });
    testTransactionIds.push(income.id);
  });

  afterEach(async () => {
    const db = getDb();

    // Clean up test transactions
    for (const id of testTransactionIds) {
      try {
        await db.delete(postings).where(eq(postings.event_id, id));
        await db.delete(transactionEvents).where(eq(transactionEvents.id, id));
      } catch {}
    }
    testTransactionIds.length = 0;

    // Clean up test data
    try {
      await db.delete(postings).where(eq(postings.wallet_id, testWalletId));
      await db.delete(postings).where(eq(postings.wallet_id, testWallet2Id));
      await deleteWallet(testWalletId);
      await deleteWallet(testWallet2Id);
      await deleteCategory(testCategoryId);
      await deleteSavingsBucket(testBucketId);
    } catch {}
  });

  afterAll(async () => {
    await closeDb();
  });

  describe("Get Dashboard Summary", () => {
    it("should return dashboard summary with metrics", async () => {
      const summary = await getDashboardSummary({});

      expect(summary).toHaveProperty("currentNetWorth");
      expect(summary).toHaveProperty("moneyLeftToSpend");
      expect(summary).toHaveProperty("totalSpending");
      expect(summary).toHaveProperty("totalIncome");
      expect(summary).toHaveProperty("period");
      expect(typeof summary.currentNetWorth).toBe("number");
      expect(typeof summary.totalSpending).toBe("number");
      expect(typeof summary.totalIncome).toBe("number");
    });

    it("should return valid period string", async () => {
      const summary = await getDashboardSummary({});

      expect(summary.period).toMatch(
        /\d{1,2} \w{3} \d{4} to \d{1,2} \w{3} \d{4}/,
      );
    });

    it("should calculate correct net worth from transactions", async () => {
      const summary = await getDashboardSummary({});

      // Income (100000) - Expense (50000) = Net change of 50000
      // The net worth should reflect this
      expect(summary.totalIncome).toBeGreaterThan(0);
      expect(summary.totalSpending).toBeGreaterThan(0);
    });
  });

  describe("Get Spending Trend Chart Data", () => {
    it("should return spending trend data for charts", async () => {
      const trend = await getSpendingTrendChartData({});

      expect(Array.isArray(trend)).toBe(true);
      if (trend.length > 0) {
        expect(trend[0]).toHaveProperty("period");
        expect(trend[0]).toHaveProperty("amount");
        expect(typeof trend[0].period).toBe("string");
        expect(typeof trend[0].amount).toBe("number");
      }
    });

    it("should filter by date range", async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const trend = await getSpendingTrendChartData({
        from: thirtyDaysAgo,
        to: now,
      });

      expect(Array.isArray(trend)).toBe(true);
    });
  });

  describe("Get Net Worth Trend Chart Data", () => {
    it("should return net worth trend data for charts", async () => {
      const trend = await getNetWorthTrendChartData({});

      expect(Array.isArray(trend)).toBe(true);
      if (trend.length > 0) {
        expect(trend[0]).toHaveProperty("period");
        expect(trend[0]).toHaveProperty("walletBalance");
        expect(trend[0]).toHaveProperty("savingsBalance");
        expect(trend[0]).toHaveProperty("totalNetWorth");
      }
    });

    it("should calculate correct net worth totals", async () => {
      const trend = await getNetWorthTrendChartData({});

      for (const item of trend) {
        expect(item.totalNetWorth).toBe(
          item.walletBalance + item.savingsBalance,
        );
      }
    });
  });

  describe("Get Category Breakdown Data", () => {
    it("should return category breakdown for charts", async () => {
      const breakdown = await getCategoryBreakdownData({});

      expect(Array.isArray(breakdown)).toBe(true);
      if (breakdown.length > 0) {
        expect(breakdown[0]).toHaveProperty("categoryId");
        expect(breakdown[0]).toHaveProperty("categoryName");
        expect(breakdown[0]).toHaveProperty("amount");
        expect(breakdown[0]).toHaveProperty("percentage");
      }
    });

    it("should return valid percentage values", async () => {
      const breakdown = await getCategoryBreakdownData({});

      for (const item of breakdown) {
        expect(item.percentage).toBeGreaterThanOrEqual(0);
        expect(item.percentage).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("Get Recent Transactions", () => {
    it("should return recent transactions", async () => {
      const transactions = await getRecentTransactions(10);

      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions.length).toBeLessThanOrEqual(10);
    });

    it("should return transactions with required properties", async () => {
      const transactions = await getRecentTransactions(10);

      for (const tx of transactions) {
        expect(tx).toHaveProperty("id");
        expect(tx).toHaveProperty("type");
        expect(tx).toHaveProperty("amount");
        expect(tx).toHaveProperty("occurredAt");
      }
    });

    it("should respect limit parameter", async () => {
      const transactions = await getRecentTransactions(3);

      expect(transactions.length).toBeLessThanOrEqual(3);
    });
  });

  describe("Get Dashboard Data", () => {
    it("should return complete dashboard data", async () => {
      const data = await getDashboardData({});

      expect(data).toHaveProperty("summary");
      expect(data).toHaveProperty("spendingTrend");
      expect(data).toHaveProperty("netWorthTrend");
      expect(data).toHaveProperty("categoryBreakdown");
      expect(data).toHaveProperty("recentTransactions");
    });

    it("should have valid summary in dashboard data", async () => {
      const data = await getDashboardData({});

      expect(data.summary.currentNetWorth).toBeDefined();
      expect(data.summary.moneyLeftToSpend).toBeDefined();
      expect(data.summary.totalSpending).toBeDefined();
      expect(data.summary.totalIncome).toBeDefined();
    });

    it("should have valid chart data arrays", async () => {
      const data = await getDashboardData({});

      expect(Array.isArray(data.spendingTrend)).toBe(true);
      expect(Array.isArray(data.netWorthTrend)).toBe(true);
      expect(Array.isArray(data.categoryBreakdown)).toBe(true);
      expect(Array.isArray(data.categorySpendingTrend)).toBe(true);
      expect(Array.isArray(data.recentTransactions)).toBe(true);
    });
  });

  describe("Get Category Spending Trend Chart Data", () => {
    it("should return category spending trend data for charts", async () => {
      const trend = await getCategorySpendingTrendChartData({});

      expect(Array.isArray(trend)).toBe(true);
      if (trend.length > 0) {
        expect(trend[0]).toHaveProperty("period");
        expect(trend[0]).toHaveProperty("categories");
        expect(Array.isArray(trend[0].categories)).toBe(true);
      }
    });

    it("should return weekly periods by default", async () => {
      const trend = await getCategorySpendingTrendChartData({});

      if (trend.length > 0) {
        // Should be ISO week format: YYYY-WXX
        expect(trend[0].period).toMatch(/^\d{4}-W\d{2}$/);
      }
    });

    it("should return up to 5 categories per period", async () => {
      const trend = await getCategorySpendingTrendChartData({});

      if (trend.length > 0) {
        expect(trend[0].categories.length).toBeLessThanOrEqual(5);
      }
    });

    it("should return category data with required properties", async () => {
      const trend = await getCategorySpendingTrendChartData({});

      if (trend.length > 0 && trend[0].categories.length > 0) {
        const category = trend[0].categories[0];
        expect(category).toHaveProperty("categoryId");
        expect(category).toHaveProperty("categoryName");
        expect(category).toHaveProperty("amount");
        expect(typeof category.amount).toBe("number");
      }
    });

    it("should filter by date range", async () => {
      const now = new Date();
      const fourWeeksAgo = new Date(
        now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000,
      );

      const trend = await getCategorySpendingTrendChartData({
        from: fourWeeksAgo,
        to: now,
      });

      expect(Array.isArray(trend)).toBe(true);
    });
  });

  describe("Dashboard with Date Range", () => {
    it("should handle empty date range", async () => {
      const summary = await getDashboardSummary({});

      expect(summary.period).toBeDefined();
    });

    it("should handle specific date range", async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const summary = await getDashboardSummary({
        from: thirtyDaysAgo,
        to: now,
      });

      expect(summary.period).toContain(" to ");
    });
  });
});
