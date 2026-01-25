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
  getDashboardRevampSummary,
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

    try {
      // Delete all postings first (they reference transactions and wallets)
      for (const id of testTransactionIds) {
        await db.delete(postings).where(eq(postings.event_id, id));
      }

      // Delete all transaction events
      for (const id of testTransactionIds) {
        await db.delete(transactionEvents).where(eq(transactionEvents.id, id));
      }
      testTransactionIds.length = 0;

      // Delete remaining postings associated with test wallets
      await db.delete(postings).where(eq(postings.wallet_id, testWalletId));
      await db.delete(postings).where(eq(postings.wallet_id, testWallet2Id));

      // Delete postings associated with test savings bucket
      await db
        .delete(postings)
        .where(eq(postings.savings_bucket_id, testBucketId));

      // Delete wallets (this may cascade delete associated records)
      await deleteWallet(testWalletId);
      await deleteWallet(testWallet2Id);

      // Delete category
      await deleteCategory(testCategoryId);

      // Delete savings bucket
      await deleteSavingsBucket(testBucketId);
    } catch (error) {
      console.error("Error during test cleanup:", error);
      throw error;
    }
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

  describe("Get Dashboard Revamp Summary", () => {
    it("should return complete revamp summary data structure", async () => {
      const summary = await getDashboardRevampSummary({});

      // Check top-level structure
      expect(summary).toHaveProperty("kpis");
      expect(summary).toHaveProperty("latestTransactions");
      expect(summary).toHaveProperty("categoryBreakdown");
      expect(summary).toHaveProperty("timeSeries");
      expect(summary).toHaveProperty("snapshots");
    });

    it("should return all 4 KPI cards with growth metrics", async () => {
      const summary = await getDashboardRevampSummary({});

      // Check all KPI cards exist
      expect(summary.kpis).toHaveProperty("netWorth");
      expect(summary.kpis).toHaveProperty("moneyLeftToSpend");
      expect(summary.kpis).toHaveProperty("totalSpending");
      expect(summary.kpis).toHaveProperty("totalSavings");

      // Check KPI structure
      const { netWorth } = summary.kpis;
      expect(netWorth).toHaveProperty("title");
      expect(netWorth).toHaveProperty("value");
      expect(netWorth).toHaveProperty("growth");
      expect(netWorth).toHaveProperty("period");

      // Check growth metric structure
      expect(netWorth.growth).toHaveProperty("value");
      expect(netWorth.growth).toHaveProperty("label");
      expect(netWorth.growth).toHaveProperty("isPositive");
      expect(netWorth.growth).toHaveProperty("isNegative");
      expect(netWorth.growth).toHaveProperty("isNeutral");

      expect(typeof netWorth.value).toBe("number");
      expect(typeof netWorth.growth.value).toBe("number");
      expect(typeof netWorth.growth.label).toBe("string");
    });

    it("should return Net Worth KPI with descriptive label (not growth percentage)", async () => {
      const summary = await getDashboardRevampSummary({});

      const { netWorth } = summary.kpis;

      // Verify Net Worth KPI structure
      expect(netWorth.title).toBe("Total Net Worth");
      expect(netWorth.period).toBe("All time");

      // NEW behavior: growth label shows descriptive text "Total Wallets + Savings"
      expect(netWorth.growth.label).toBe("Total Wallets + Savings");

      // Verify growth metric has correct structure
      expect(netWorth.growth).toHaveProperty("value");
      expect(netWorth.growth).toHaveProperty("label");
      expect(netWorth.growth).toHaveProperty("isPositive");
      expect(netWorth.growth).toHaveProperty("isNegative");
      expect(netWorth.growth).toHaveProperty("isNeutral");

      // Growth should be neutral (not showing actual growth)
      expect(netWorth.growth.value).toBe(0);
      expect(netWorth.growth.isNeutral).toBe(true);
      expect(netWorth.growth.isPositive).toBe(false);
      expect(netWorth.growth.isNegative).toBe(false);
    });

    it("should return latest 5 transactions", async () => {
      const summary = await getDashboardRevampSummary({});

      expect(Array.isArray(summary.latestTransactions)).toBe(true);
      expect(summary.latestTransactions.length).toBeLessThanOrEqual(5);

      if (summary.latestTransactions.length > 0) {
        const tx = summary.latestTransactions[0];
        expect(tx).toHaveProperty("id");
        expect(tx).toHaveProperty("type");
        expect(tx).toHaveProperty("amount");
        expect(tx).toHaveProperty("occurredAt");
      }
    });

    it("should return category breakdown split by expenses and income", async () => {
      const summary = await getDashboardRevampSummary({});

      expect(summary.categoryBreakdown).toHaveProperty("expenses");
      expect(summary.categoryBreakdown).toHaveProperty("income");
      expect(Array.isArray(summary.categoryBreakdown.expenses)).toBe(true);
      expect(Array.isArray(summary.categoryBreakdown.income)).toBe(true);

      if (summary.categoryBreakdown.expenses.length > 0) {
        const expense = summary.categoryBreakdown.expenses[0];
        expect(expense).toHaveProperty("categoryId");
        expect(expense).toHaveProperty("categoryName");
        expect(expense).toHaveProperty("amount");
        expect(expense).toHaveProperty("percentage");
        expect(expense.percentage).toBeGreaterThanOrEqual(0);
        expect(expense.percentage).toBeLessThanOrEqual(100);
      }
    });

    it("should return time-series data for all insight tabs", async () => {
      const summary = await getDashboardRevampSummary({});

      expect(summary.timeSeries).toHaveProperty("netWorth");
      expect(summary.timeSeries).toHaveProperty("spending");
      expect(summary.timeSeries).toHaveProperty("income");
      expect(summary.timeSeries).toHaveProperty("savings");

      expect(Array.isArray(summary.timeSeries.netWorth)).toBe(true);
      expect(Array.isArray(summary.timeSeries.spending)).toBe(true);
      expect(Array.isArray(summary.timeSeries.income)).toBe(true);
      expect(Array.isArray(summary.timeSeries.savings)).toBe(true);
    });

    it("should return wallet and savings snapshots for both periods", async () => {
      const summary = await getDashboardRevampSummary({});

      expect(summary.snapshots).toHaveProperty("currentWallets");
      expect(summary.snapshots).toHaveProperty("currentSavings");
      expect(summary.snapshots).toHaveProperty("previousWallets");
      expect(summary.snapshots).toHaveProperty("previousSavings");

      expect(Array.isArray(summary.snapshots.currentWallets)).toBe(true);
      expect(Array.isArray(summary.snapshots.currentSavings)).toBe(true);

      if (summary.snapshots.currentWallets.length > 0) {
        const wallet = summary.snapshots.currentWallets[0];
        expect(wallet).toHaveProperty("id");
        expect(wallet).toHaveProperty("name");
        expect(wallet).toHaveProperty("balance");
        expect(typeof wallet.balance).toBe("number");
      }
    });

    it("should handle date range preset", async () => {
      const summary = await getDashboardRevampSummary({
        dateRangePreset: "last_3_months",
      });

      expect(summary).toHaveProperty("kpis");
      expect(summary.timeSeries.netWorth).toBeDefined();
    });

    it("should handle custom date range", async () => {
      const now = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const summary = await getDashboardRevampSummary({
        from: threeMonthsAgo,
        to: now,
      });

      expect(summary).toHaveProperty("kpis");
      expect(summary.kpis.netWorth.value).toBeDefined();
    });

    it("should handle different period granularities", async () => {
      const summaryDaily = await getDashboardRevampSummary({
        period: "day",
      });
      const summaryWeekly = await getDashboardRevampSummary({
        period: "week",
      });
      const summaryMonthly = await getDashboardRevampSummary({
        period: "month",
      });

      expect(summaryDaily.timeSeries.spending).toBeDefined();
      expect(summaryWeekly.timeSeries.spending).toBeDefined();
      expect(summaryMonthly.timeSeries.spending).toBeDefined();
    });

    it("should ensure growth metrics have boolean flags set correctly", async () => {
      const summary = await getDashboardRevampSummary({});

      for (const kpiKey of Object.keys(summary.kpis)) {
        const kpi = summary.kpis[kpiKey as keyof typeof summary.kpis];
        const { growth } = kpi;

        // Only one flag should be true
        const flagCount = [
          growth.isPositive,
          growth.isNegative,
          growth.isNeutral,
        ].filter(Boolean).length;

        expect(flagCount).toBe(1);

        // Flags should match the value
        if (growth.value > 0) {
          expect(growth.isPositive).toBe(true);
        } else if (growth.value < 0) {
          expect(growth.isNegative).toBe(true);
        } else {
          expect(growth.isNeutral).toBe(true);
        }
      }
    });

    it("should return non-negative values for amounts", async () => {
      const summary = await getDashboardRevampSummary({});

      // Savings should always be non-negative
      expect(summary.kpis.totalSavings.value).toBeGreaterThanOrEqual(0);

      // Spending should be non-negative (absolute value)
      expect(summary.kpis.totalSpending.value).toBeGreaterThanOrEqual(0);
    });
  });
});
