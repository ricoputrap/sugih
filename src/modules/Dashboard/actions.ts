/**
 * Dashboard Actions
 *
 * Fetches and combines data from various modules to provide dashboard metrics.
 * Aggregates data from Report and Transaction modules for the dashboard UI.
 */

import { getDb } from "@/db/client";
import { formatZodError } from "@/lib/zod";
import {
  spendingTrend,
  categoryBreakdown,
  netWorthTrend,
  moneyLeftToSpend,
} from "@/modules/Report/actions";
import { listTransactions } from "@/modules/Transaction/actions";
import {
  DashboardDateRangeSchema,
  DashboardSummary,
  SpendingTrendChartData,
  NetWorthChartData,
  CategoryBreakdownData,
  RecentTransaction,
  DashboardData,
} from "./schema";
import { unprocessableEntity } from "@/lib/http";

// ============================================================================
// DASHBOARD SUMMARY
// ============================================================================

/**
 * Get dashboard summary metrics
 * Combines multiple data sources into key performance indicators
 */
export async function getDashboardSummary(
  query: unknown = {},
): Promise<DashboardSummary> {
  try {
    const validatedQuery = DashboardDateRangeSchema.parse(query);

    // Default to current month if no date range specified
    let { from, to } = validatedQuery;

    if (!from && !to) {
      to = new Date();
      from = new Date();
      from.setMonth(from.getMonth() - 1);
    }

    if (from && !to) {
      to = new Date();
    }

    if (!from && to) {
      from = new Date(to);
      from.setMonth(from.getMonth() - 1);
    }

    // Ensure we have valid dates
    if (!from || !to) {
      throw new Error("Invalid date range");
    }

    // Get current month for money left to spend
    const currentMonth = `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, "0")}`;

    // Fetch data in parallel
    const [currentNetWorth, moneyLeft, spendingData, incomeData] =
      await Promise.all([
        // Get latest net worth
        getCurrentNetWorth(),

        // Get money left to spend for current month
        moneyLeftToSpend({ month: currentMonth }).catch(() => ({
          month: currentMonth,
          totalBudget: 0,
          totalSpent: 0,
          remaining: 0,
          percentUsed: 0,
          daysRemaining: 0,
          averageDailySpending: 0,
          projectedMonthEndSpending: 0,
          budgetVariance: 0,
        })),

        // Get total spending for the period
        getTotalSpending(from, to),

        // Get total income for the period
        getTotalIncome(from, to),
      ]);

    return {
      currentNetWorth,
      moneyLeftToSpend: moneyLeft.remaining,
      totalSpending: spendingData.total,
      totalIncome: incomeData.total,
      period: `${from.toISOString().split("T")[0]} to ${to.toISOString().split("T")[0]}`,
    };
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid dashboard summary query",
        formatZodError(error),
      );
    }
    throw error;
  }
}

// ============================================================================
// SPENDING TREND DATA
// ============================================================================

/**
 * Get spending trend data for charts
 * Formats data specifically for chart visualization
 */
export async function getSpendingTrendChartData(
  query: unknown = {},
): Promise<SpendingTrendChartData[]> {
  try {
    const validatedQuery = DashboardDateRangeSchema.parse(query);

    // Default to last 12 months
    let { from, to } = validatedQuery;

    if (!from && !to) {
      to = new Date();
      from = new Date();
      from.setMonth(from.getMonth() - 12);
    }

    const trendData = await spendingTrend({
      from,
      to,
      granularity: "month",
    });

    // Format for chart consumption
    return trendData.map((item) => ({
      period: item.period,
      amount: item.totalAmount,
    }));
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid spending trend query",
        formatZodError(error),
      );
    }
    throw error;
  }
}

// ============================================================================
// NET WORTH TREND DATA
// ============================================================================

/**
 * Get net worth trend data for charts
 * Formats data specifically for chart visualization
 */
export async function getNetWorthTrendChartData(
  query: unknown = {},
): Promise<NetWorthChartData[]> {
  try {
    const validatedQuery = DashboardDateRangeSchema.parse(query);

    // Default to last 12 months
    let { from, to } = validatedQuery;

    if (!from && !to) {
      to = new Date();
      from = new Date();
      from.setMonth(from.getMonth() - 12);
    }

    const trendData = await netWorthTrend({
      from,
      to,
      granularity: "month",
    });

    // Format for chart consumption
    return trendData.map((item) => ({
      period: item.period,
      walletBalance: item.walletBalance,
      savingsBalance: item.savingsBalance,
      totalNetWorth: item.totalNetWorth,
    }));
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid net worth trend query",
        formatZodError(error),
      );
    }
    throw error;
  }
}

// ============================================================================
// CATEGORY BREAKDOWN DATA
// ============================================================================

/**
 * Get category breakdown data for charts
 * Formats data specifically for chart/table visualization
 */
export async function getCategoryBreakdownData(
  query: unknown = {},
): Promise<CategoryBreakdownData[]> {
  try {
    const validatedQuery = DashboardDateRangeSchema.parse(query);

    // Default to current month
    let { from, to } = validatedQuery;

    if (!from && !to) {
      // Default to last 30 days for most data, current month for some
      const now = new Date();
      now.setDate(now.getDate() - 30);
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    const breakdownData = await categoryBreakdown({
      from,
      to,
    });

    // Format for chart consumption
    return breakdownData.map((item) => ({
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      amount: item.totalAmount,
      percentage: item.percentage,
    }));
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid category breakdown query",
        formatZodError(error),
      );
    }
    throw error;
  }
}

// ============================================================================
// RECENT TRANSACTIONS
// ============================================================================

/**
 * Get recent transactions for dashboard preview
 */
export async function getRecentTransactions(
  limit: number = 10,
): Promise<RecentTransaction[]> {
  try {
    const transactions = await listTransactions({
      limit,
      offset: 0,
    });

    // Format for dashboard consumption
    return transactions.slice(0, limit).map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.display_amount_idr,
      occurredAt: tx.occurred_at,
      categoryName: tx.category_name || undefined,
      note: tx.note || undefined,
    }));
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid recent transactions query",
        formatZodError(error),
      );
    }
    throw error;
  }
}

// ============================================================================
// COMPLETE DASHBOARD DATA
// ============================================================================

/**
 * Get all dashboard data in one call
 * Aggregates all dashboard metrics and data
 */
export async function getDashboardData(
  query: unknown = {},
): Promise<DashboardData> {
  try {
    const validatedQuery = DashboardDateRangeSchema.parse(query);

    // Default to last 30 days for most data, current month for some
    const now = new Date();
    now.setDate(now.getDate() - 30);

    // Fetch all dashboard data in parallel
    const [
      summary,
      spendingTrend,
      netWorthTrend,
      categoryBreakdown,
      recentTransactions,
    ] = await Promise.all([
      getDashboardSummary(validatedQuery),
      getSpendingTrendChartData(validatedQuery),
      getNetWorthTrendChartData(validatedQuery),
      getCategoryBreakdownData({
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      }),
      getRecentTransactions(5),
    ]);

    return {
      summary,
      spendingTrend,
      netWorthTrend,
      categoryBreakdown,
      recentTransactions,
    };
  } catch (error: any) {
    if (error.name === "ZodError") {
      console.error("===== ERROR:", error);
      throw unprocessableEntity(
        "Invalid dashboard data query",
        formatZodError(error),
      );
    }
    throw error;
  }
}

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current net worth (wallet balance + savings balance)
 */
async function getCurrentNetWorth(): Promise<number> {
  const db = getDb();

  try {
    const result = await db<{ net_worth: string }[]>`
      SELECT
        (
          COALESCE(SUM(CASE WHEN p.wallet_id IS NOT NULL THEN p.amount_idr ELSE 0 END), 0) +
          COALESCE(SUM(CASE WHEN p.savings_bucket_id IS NOT NULL THEN p.amount_idr ELSE 0 END), 0)
        )::numeric as net_worth
      FROM postings p
      LEFT JOIN transaction_events te ON p.event_id = te.id
      WHERE te.deleted_at IS NULL
    `;

    return Number(result[0]?.net_worth || 0);
  } catch (error) {
    console.error("Error calculating current net worth:", error);
    return 0;
  }
}

/**
 * Get total spending for a date range
 */
async function getTotalSpending(
  from: Date,
  to: Date,
): Promise<{ total: number; count: number }> {
  const db = getDb();

  try {
    const sql = `
      SELECT
        COALESCE(SUM(ABS(p.amount_idr)), 0)::numeric as total,
        COUNT(DISTINCT te.id)::int as count
      FROM transaction_events te
      JOIN postings p ON te.id = p.event_id
      WHERE te.type = 'expense'
        AND te.deleted_at IS NULL
        AND te.occurred_at >= $1
        AND te.occurred_at <= $2
    `;
    // Convert Date objects to ISO strings for SQL query
    const params = [from.toISOString(), to.toISOString()];

    const result = await db.unsafe<{ total: string; count: string }[]>(
      sql,
      params,
    );

    return {
      total: Number(result[0]?.total || 0),
      count: Number(result[0]?.count || 0),
    };
  } catch (error) {
    console.error("Error calculating total spending:", error);
    return { total: 0, count: 0 };
  }
}

/**
 * Get total income for a date range
 */
async function getTotalIncome(
  from: Date,
  to: Date,
): Promise<{ total: number; count: number }> {
  const db = getDb();

  try {
    const sql = `
      SELECT
        COALESCE(SUM(p.amount_idr), 0)::numeric as total,
        COUNT(DISTINCT te.id)::int as count
      FROM transaction_events te
      JOIN postings p ON te.id = p.event_id
      WHERE te.type = 'income'
        AND te.deleted_at IS NULL
        AND te.occurred_at >= $1
        AND te.occurred_at <= $2
    `;
    // Convert Date objects to ISO strings for SQL query
    const params = [from.toISOString(), to.toISOString()];

    const result = await db.unsafe<{ total: string; count: string }[]>(
      sql,
      params,
    );

    return {
      total: Number(result[0]?.total || 0),
      count: Number(result[0]?.count || 0),
    };
  } catch (error) {
    console.error("Error calculating total income:", error);
    return { total: 0, count: 0 };
  }
}
