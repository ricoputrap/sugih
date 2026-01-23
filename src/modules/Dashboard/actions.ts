/**
 * Dashboard Actions
 *
 * Fetches and combines data from various modules to provide dashboard metrics.
 * Aggregates data from Report and Transaction modules for the dashboard UI.
 */

import { getDb, getPool } from "@/db/drizzle-client";
import { unprocessableEntity } from "@/lib/http";
import { formatZodError } from "@/lib/zod";
import {
  categoryBreakdown,
  categorySpendingTrend,
  moneyLeftToSpend,
  netWorthTrend,
  spendingTrend,
} from "@/modules/Report/actions";
import { listTransactions } from "@/modules/Transaction/actions";
import {
  type CategoryBreakdownData,
  type CategorySpendingTrendChartData,
  CategorySpendingTrendQuerySchema,
  type DashboardData,
  DashboardDateRangeSchema,
  type DashboardRevampQueryInput,
  DashboardRevampQuerySchema,
  type DashboardRevampSummary,
  type DashboardSummary,
  type NetWorthChartData,
  type RecentTransaction,
  type SavingsBucketBalanceSnapshot,
  type SpendingTrendChartData,
  type WalletBalanceSnapshot,
} from "./schema";
import { computeKpiSummary } from "./utils/kpis";
import { resolveDateRange } from "./utils/dateRange";

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

    // Format dates in a more readable format (e.g., "21 Dec 2025 to 20 Jan 2026")
    const formatDate = (date: Date) => {
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    return {
      currentNetWorth,
      moneyLeftToSpend: moneyLeft.remaining,
      totalSpending: spendingData.total,
      totalIncome: incomeData.total,
      period: `${formatDate(from)} to ${formatDate(to)}`,
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

    // Default to last month
    let { from, to } = validatedQuery;

    if (!from && !to) {
      // Default to last 30 days for most data, current month for some
      const now = new Date();
      now.setDate(now.getDate() - 30);
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
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

    // Default to last month
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
// CATEGORY SPENDING TREND DATA
// ============================================================================

/**
 * Get category spending trend data for charts
 * Formats data specifically for chart visualization with configurable granularity
 */
export async function getCategorySpendingTrendChartData(
  query: CategorySpendingTrendQueryInput = {},
): Promise<CategorySpendingTrendChartData[]> {
  try {
    const validatedQuery = CategorySpendingTrendQuerySchema.parse(query);

    let { from, to, granularity } = validatedQuery;

    // Calculate date range from preset if provided
    if (validatedQuery.dateRangePreset && !from && !to) {
      const now = new Date();
      to = now;

      switch (validatedQuery.dateRangePreset) {
        case "last_week":
          from = new Date(now);
          from.setDate(from.getDate() - 7);
          break;
        case "this_month":
          from = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "last_month":
          from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          to = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        case "last_3_months":
          from = new Date(now);
          from.setMonth(from.getMonth() - 3);
          break;
        case "last_6_months":
          from = new Date(now);
          from.setMonth(from.getMonth() - 6);
          break;
        case "this_year":
          from = new Date(now.getFullYear(), 0, 1);
          break;
        case "last_year":
          from = new Date(now.getFullYear() - 1, 0, 1);
          to = new Date(now.getFullYear(), 0, 0);
          break;
        case "all":
        default:
          from = new Date(2020, 0, 1);
          break;
      }
    }

    // Default to last 8 weeks if no date range provided
    if (!from && !to) {
      to = new Date();
      from = new Date();
      from.setDate(from.getDate() - 8 * 7);
    }

    const trendData = await categorySpendingTrend({
      from,
      to,
      granularity: granularity ?? "week",
      topCategories: 5,
    });

    // Format for chart consumption
    return trendData.map((item) => ({
      period: item.period,
      categories: item.categories.map((cat) => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        amount: cat.amount,
      })),
    }));
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid category spending trend query",
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
      categorySpendingTrend,
      recentTransactions,
    ] = await Promise.all([
      getDashboardSummary(validatedQuery),
      getSpendingTrendChartData(validatedQuery),
      getNetWorthTrendChartData(validatedQuery),
      getCategoryBreakdownData({
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      }),
      getCategorySpendingTrendChartData(validatedQuery),
      getRecentTransactions(5),
    ]);

    return {
      summary,
      spendingTrend,
      netWorthTrend,
      categoryBreakdown,
      categorySpendingTrend,
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
  const pool = getPool();

  try {
    const result = await pool.query(
      `SELECT
        COALESCE(
          COALESCE(SUM(CASE WHEN p.wallet_id IS NOT NULL THEN p.amount_idr ELSE 0 END), 0) +
          COALESCE(SUM(CASE WHEN p.savings_bucket_id IS NOT NULL THEN p.amount_idr ELSE 0 END), 0)
        , 0)::numeric as net_worth
      FROM postings p
      LEFT JOIN transaction_events te ON p.event_id = te.id
      WHERE te.deleted_at IS NULL OR te.id IS NULL`,
    );

    return Number(result.rows[0]?.net_worth || 0);
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
  const pool = getPool();

  try {
    const result = await pool.query(
      `SELECT
        COALESCE(SUM(ABS(p.amount_idr)), 0)::numeric as total,
        COUNT(DISTINCT te.id)::int as count
      FROM transaction_events te
      JOIN postings p ON te.id = p.event_id
      WHERE te.type = 'expense'
        AND te.deleted_at IS NULL
        AND te.occurred_at >= $1
        AND te.occurred_at <= $2`,
      [from, to],
    );

    return {
      total: Number(result.rows[0]?.total || 0),
      count: Number(result.rows[0]?.count || 0),
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
  const pool = getPool();

  try {
    const result = await pool.query(
      `SELECT
        COALESCE(SUM(p.amount_idr), 0)::numeric as total,
        COUNT(DISTINCT te.id)::int as count
      FROM transaction_events te
      JOIN postings p ON te.id = p.event_id
      WHERE te.type = 'income'
        AND te.deleted_at IS NULL
        AND te.occurred_at >= $1
        AND te.occurred_at <= $2`,
      [from, to],
    );

    return {
      total: Number(result.rows[0]?.total || 0),
      count: Number(result.rows[0]?.count || 0),
    };
  } catch (error) {
    console.error("Error calculating total income:", error);
    return { total: 0, count: 0 };
  }
}

// ============================================================================
// DASHBOARD REVAMP SUMMARY
// ============================================================================

/**
 * Get wallet balances snapshot at a specific point in time
 */
async function getWalletBalancesAtTime(
  asOfDate: Date,
): Promise<WalletBalanceSnapshot[]> {
  const pool = getPool();

  try {
    const result = await pool.query(
      `SELECT
        w.id,
        w.name,
        COALESCE(SUM(p.amount_idr), 0)::numeric as balance
      FROM wallets w
      LEFT JOIN postings p ON w.id = p.wallet_id
      LEFT JOIN transaction_events te ON p.event_id = te.id
      WHERE w.archived = false
        AND (te.deleted_at IS NULL OR te.id IS NULL)
        AND (te.occurred_at IS NULL OR te.occurred_at <= $1)
      GROUP BY w.id, w.name
      ORDER BY w.name`,
      [asOfDate],
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      balance: Number(row.balance),
    }));
  } catch (error) {
    console.error("Error getting wallet balances:", error);
    return [];
  }
}

/**
 * Get savings bucket balances snapshot at a specific point in time
 */
async function getSavingsBucketBalancesAtTime(
  asOfDate: Date,
): Promise<SavingsBucketBalanceSnapshot[]> {
  const pool = getPool();

  try {
    const result = await pool.query(
      `SELECT
        sb.id,
        sb.name,
        COALESCE(SUM(p.amount_idr), 0)::numeric as balance
      FROM savings_buckets sb
      LEFT JOIN postings p ON sb.id = p.savings_bucket_id
      LEFT JOIN transaction_events te ON p.event_id = te.id
      WHERE sb.archived = false
        AND (te.deleted_at IS NULL OR te.id IS NULL)
        AND (te.occurred_at IS NULL OR te.occurred_at <= $1)
      GROUP BY sb.id, sb.name
      ORDER BY sb.name`,
      [asOfDate],
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      balance: Number(row.balance),
    }));
  } catch (error) {
    console.error("Error getting savings bucket balances:", error);
    return [];
  }
}

/**
 * Get category breakdown split by type (expenses vs income)
 */
async function getCategoryBreakdownByType(
  from: Date,
  to: Date,
): Promise<{
  expenses: CategoryBreakdownData[];
  income: CategoryBreakdownData[];
}> {
  const pool = getPool();

  try {
    const result = await pool.query(
      `SELECT
        c.id as category_id,
        c.name as category_name,
        c.type as category_type,
        SUM(ABS(p.amount_idr))::numeric as total_amount
      FROM transaction_events te
      JOIN postings p ON te.id = p.event_id
      LEFT JOIN categories c ON te.category_id = c.id
      WHERE te.deleted_at IS NULL
        AND te.occurred_at >= $1
        AND te.occurred_at <= $2
        AND te.type IN ('expense', 'income')
      GROUP BY c.id, c.name, c.type
      ORDER BY total_amount DESC`,
      [from, to],
    );

    const expenses: CategoryBreakdownData[] = [];
    const income: CategoryBreakdownData[] = [];

    let expenseTotal = 0;
    let incomeTotal = 0;

    // First pass: calculate totals
    for (const row of result.rows) {
      const amount = Number(row.total_amount);
      if (row.category_type === "expense") {
        expenseTotal += amount;
      } else if (row.category_type === "income") {
        incomeTotal += amount;
      }
    }

    // Second pass: create breakdown with percentages
    for (const row of result.rows) {
      const amount = Number(row.total_amount);
      const data: CategoryBreakdownData = {
        categoryId: row.category_id || "uncategorized",
        categoryName: row.category_name || "Uncategorized",
        amount,
        percentage: 0,
      };

      if (row.category_type === "expense" && expenseTotal > 0) {
        data.percentage = (amount / expenseTotal) * 100;
        expenses.push(data);
      } else if (row.category_type === "income" && incomeTotal > 0) {
        data.percentage = (amount / incomeTotal) * 100;
        income.push(data);
      }
    }

    return { expenses, income };
  } catch (error) {
    console.error("Error getting category breakdown by type:", error);
    return { expenses: [], income: [] };
  }
}

/**
 * Get income trend data for charts
 * Uses raw SQL query to get income by category over time
 */
async function getIncomeTrendChartData(
  from: Date,
  to: Date,
  granularity: "day" | "week" | "month" = "month",
): Promise<CategorySpendingTrendChartData[]> {
  const pool = getPool();

  try {
    // Determine date format based on granularity
    let dateFormat: string;
    switch (granularity) {
      case "day":
        dateFormat = "YYYY-MM-DD";
        break;
      case "week":
        dateFormat = "IYYY-IW";
        break;
      case "month":
        dateFormat = "YYYY-MM";
        break;
    }

    const result = await pool.query(
      `SELECT
        TO_CHAR(te.occurred_at, $3) as period,
        c.id as category_id,
        c.name as category_name,
        SUM(p.amount_idr)::numeric as amount
      FROM transaction_events te
      JOIN postings p ON te.id = p.event_id
      LEFT JOIN categories c ON te.category_id = c.id
      WHERE te.type = 'income'
        AND te.deleted_at IS NULL
        AND te.occurred_at >= $1
        AND te.occurred_at <= $2
      GROUP BY TO_CHAR(te.occurred_at, $3), c.id, c.name
      ORDER BY period, amount DESC`,
      [from, to, dateFormat],
    );

    // Group by period
    const periodMap = new Map<
      string,
      Array<{ categoryId: string; categoryName: string; amount: number }>
    >();

    for (const row of result.rows) {
      const period = row.period;
      if (!periodMap.has(period)) {
        periodMap.set(period, []);
      }
      periodMap.get(period)!.push({
        categoryId: row.category_id || "uncategorized",
        categoryName: row.category_name || "Uncategorized",
        amount: Number(row.amount),
      });
    }

    // Convert to array format
    return Array.from(periodMap.entries())
      .map(([period, categories]) => ({
        period,
        categories: categories.slice(0, 5), // Top 5 categories
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  } catch (error) {
    console.error("Error getting income trend:", error);
    return [];
  }
}

/**
 * Get dashboard revamp summary data
 * Returns all data needed for the revamped dashboard with KPIs, growth metrics, and charts
 */
export async function getDashboardRevampSummary(
  query: DashboardRevampQueryInput = {},
): Promise<DashboardRevampSummary> {
  try {
    const validatedQuery = DashboardRevampQuerySchema.parse(query);

    // Resolve date range
    let from = validatedQuery.from;
    let to = validatedQuery.to;

    if (validatedQuery.dateRangePreset) {
      const resolved = resolveDateRange(validatedQuery.dateRangePreset, {
        now: new Date(),
      });
      from = resolved.start;
      to = resolved.end;
    }

    // Default to last 3 months if no date range provided
    if (!from || !to) {
      to = new Date();
      from = new Date();
      from.setMonth(from.getMonth() - 3);
    }

    // Calculate previous period for growth comparison
    const periodLength = to.getTime() - from.getTime();
    const previousTo = new Date(from.getTime() - 1); // Day before current period starts
    const previousFrom = new Date(previousTo.getTime() - periodLength);

    // Fetch all data in parallel
    const [
      currentWallets,
      currentSavings,
      previousWallets,
      previousSavings,
      currentBudgetData,
      previousBudgetData,
      currentSpending,
      previousSpending,
      latestTransactions,
      categoryBreakdown,
      netWorthData,
      spendingData,
      incomeData,
    ] = await Promise.all([
      // Current period snapshots
      getWalletBalancesAtTime(to),
      getSavingsBucketBalancesAtTime(to),

      // Previous period snapshots
      getWalletBalancesAtTime(previousTo),
      getSavingsBucketBalancesAtTime(previousTo),

      // Budget data
      (async () => {
        try {
          const currentMonth = `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, "0")}`;
          return await moneyLeftToSpend({ month: currentMonth });
        } catch {
          return null;
        }
      })(),
      (async () => {
        try {
          const previousMonth = `${previousTo.getFullYear()}-${String(previousTo.getMonth() + 1).padStart(2, "0")}`;
          return await moneyLeftToSpend({ month: previousMonth });
        } catch {
          return null;
        }
      })(),

      // Spending data
      getTotalSpending(from, to),
      getTotalSpending(previousFrom, previousTo),

      // Latest transactions
      getRecentTransactions(5),

      // Category breakdown
      getCategoryBreakdownByType(from, to),

      // Time-series data
      getNetWorthTrendChartData({ from, to }),
      getCategorySpendingTrendChartData({
        from,
        to,
        granularity: validatedQuery.period,
      }),
      getIncomeTrendChartData(from, to, validatedQuery.period),
    ]);

    // Compute KPIs with growth metrics
    const kpis = computeKpiSummary({
      currentWallets,
      currentSavings,
      previousWallets,
      previousSavings,
      currentBudget: currentBudgetData
        ? { amount: currentBudgetData.totalBudget, period: "monthly" }
        : null,
      previousBudget: previousBudgetData
        ? { amount: previousBudgetData.totalBudget, period: "monthly" }
        : null,
      currentSpending: {
        total: currentSpending.total,
        period: "this period",
      },
      previousSpending: {
        total: previousSpending.total,
        period: "last period",
      },
    });

    return {
      kpis,
      latestTransactions,
      categoryBreakdown,
      timeSeries: {
        netWorth: netWorthData,
        spending: spendingData,
        income: incomeData,
        savings: netWorthData, // Reuse net worth data, client can filter for savings only
      },
      snapshots: {
        currentWallets,
        currentSavings,
        previousWallets,
        previousSavings,
      },
    };
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid dashboard revamp query",
        formatZodError(error),
      );
    }
    throw error;
  }
}
