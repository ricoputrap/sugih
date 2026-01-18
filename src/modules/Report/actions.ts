/**
 * Report Actions
 *
 * Provides raw SQL aggregation queries for reporting and analytics.
 * Uses PostgreSQL for efficient data aggregation and trend analysis.
 *
 * Implements the four core reporting functions specified in the implementation plan:
 * - spendingTrend: Track spending over time with various granularities
 * - categoryBreakdown: Breakdown of spending by category
 * - netWorthTrend: Track wallet and savings balances over time
 * - moneyLeftToSpend: Calculate remaining budget for a month
 */

import { getDb, getPool, sql } from "@/db/drizzle-client";
import { unprocessableEntity } from "@/lib/http";
import { formatZodError } from "@/lib/zod";
import {
  type CategoryBreakdownData,
  CategoryBreakdownQuerySchema,
  type MoneyLeftToSpendData,
  MoneyLeftToSpendQuerySchema,
  type NetWorthData,
  NetWorthTrendQuerySchema,
  type SpendingTrendData,
  SpendingTrendQuerySchema,
} from "./schema";

// ============================================================================
// SPENDING TREND
// ============================================================================

/**
 * Get spending trend over time
 *
 * Aggregates expense transactions by time period (day, week, month, quarter)
 * to show spending patterns over time.
 *
 * @param query - Date range and granularity
 * @returns Array of spending trend data points
 */
export async function spendingTrend(
  query: unknown,
): Promise<SpendingTrendData[]> {
  const pool = getPool();

  const validatedQuery = SpendingTrendQuerySchema.parse(query);
  const from = validatedQuery.from;
  const to = validatedQuery.to;
  const granularity = validatedQuery.granularity ?? "month";

  const granularityFormat = granularity === "month" ? "YYYY-MM" : "YYYY-MM-DD";

  const result = await pool.query(
    `SELECT
      to_char(te.occurred_at, $1) as period,
      COALESCE(SUM(ABS(p.amount_idr)), 0)::numeric as total_amount,
      COUNT(DISTINCT te.id)::int as transaction_count
    FROM transaction_events te
    JOIN postings p ON te.id = p.event_id
    WHERE te.type = $2
      AND te.deleted_at IS NULL
      AND te.occurred_at >= $3
      AND te.occurred_at <= $4
    GROUP BY period
    ORDER BY period ASC`,
    [granularityFormat, "expense", from, to],
  );

  return result.rows.map((row) => ({
    period: row.period,
    totalAmount: Number(row.total_amount),
    transactionCount: row.transaction_count,
  }));
}

// ============================================================================
// CATEGORY BREAKDOWN
// ============================================================================

/**
 * Get spending breakdown by category
 *
 * Aggregates expense transactions by category to show where money is being spent.
 *
 * @param query - Date range filter
 * @returns Array of category breakdown data points
 */
export async function categoryBreakdown(
  query: unknown,
): Promise<CategoryBreakdownData[]> {
  const db = getDb();

  try {
    const validatedQuery = CategoryBreakdownQuerySchema.parse(query);
    const fromStr = validatedQuery.from?.toISOString();
    const toStr = validatedQuery.to?.toISOString();

    const result = await db<
      {
        category_id: string;
        category_name: string;
        total_amount: string;
        transaction_count: string;
      }[]
    >`
      SELECT
        te.category_id,
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(SUM(ABS(p.amount_idr)), 0)::numeric as total_amount,
        COUNT(DISTINCT te.id)::int as transaction_count,
        0.0 as percentage
      FROM transaction_events te
      JOIN postings p ON te.id = p.event_id
      LEFT JOIN categories c ON te.category_id = c.id
      WHERE
        te.type = 'expense' AND
        te.deleted_at IS NULL
        ${fromStr ? db`AND te.occurred_at >= '2025-12-01T17:00:00.000Z'` : db``}
        ${toStr ? db`AND te.occurred_at <= ${toStr}` : db``}
      GROUP BY te.category_id, c.name
      ORDER BY total_amount DESC
    `;

    // Calculate percentages
    const totalSpent = result.reduce(
      (sum, row) => sum + Number(row.total_amount),
      0,
    );

    console.log("===== result:", result);
    return result.map((row) => ({
      categoryId: row.category_id,
      categoryName: row.category_name,
      totalAmount: Number(row.total_amount),
      transactionCount: Number(row.transaction_count),
      percentage:
        totalSpent > 0 ? (Number(row.total_amount) / totalSpent) * 100 : 0,
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
// NET WORTH TREND
// ============================================================================

/**
 * Get net worth trend over time
 *
 * Tracks wallet and savings bucket balances over time to show net worth progression.
 * Uses posting data to reconstruct balances at different time points.
 *
 * @param query - Date range and granularity
 * @returns Array of net worth trend data points
 */
export async function netWorthTrend(query: unknown): Promise<NetWorthData[]> {
  const db = getDb();

  try {
    const validatedQuery = NetWorthTrendQuerySchema.parse(query);
    const fromStr = validatedQuery.from?.toISOString();
    const toStr = validatedQuery.to?.toISOString();
    const granularity = validatedQuery.granularity ?? "month";

    // For net worth trend, we need to track cumulative balances over time
    // This is more complex as we need running totals for wallets and savings
    const result = await db<
      {
        period: Date;
        wallet_balance: string;
        savings_balance: string;
        total_net_worth: string;
      }[]
    >`
      WITH periods AS (
        SELECT DISTINCT DATE_TRUNC(${granularity}, te.occurred_at) as period
        FROM transaction_events te
        WHERE
          te.deleted_at IS NULL
          ${fromStr ? db`AND te.occurred_at >= ${fromStr}` : db``}
          ${toStr ? db`AND te.occurred_at <= ${toStr}` : db``}
        ORDER BY period ASC
      ),
      wallet_balances AS (
        SELECT
          wb.period,
          COALESCE(SUM(p.amount_idr), 0)::numeric as wallet_balance
        FROM periods wb
        CROSS JOIN LATERAL (
          SELECT COALESCE(SUM(p.amount_idr), 0)::numeric as amount_idr
          FROM transaction_events te
          JOIN postings p ON te.id = p.event_id
          WHERE p.wallet_id IS NOT NULL
            AND te.deleted_at IS NULL
            AND period <= wb.period
        ) p
        GROUP BY wb.period
      ),
      savings_balances AS (
        SELECT
          sb.period,
          COALESCE(SUM(p.amount_idr), 0)::numeric as savings_balance
        FROM periods sb
        CROSS JOIN LATERAL (
          SELECT COALESCE(SUM(p.amount_idr), 0)::numeric as amount_idr
          FROM transaction_events te
          JOIN postings p ON te.id = p.event_id
          WHERE p.savings_bucket_id IS NOT NULL
            AND te.deleted_at IS NULL
            AND period <= sb.period
        ) p
        GROUP BY sb.period
      )
      SELECT
        wb.period,
        wb.wallet_balance,
        sb.savings_balance,
        (wb.wallet_balance + sb.savings_balance)::numeric as total_net_worth
      FROM wallet_balances wb
      JOIN savings_balances sb ON wb.period = sb.period
      ORDER BY wb.period ASC
    `;

    return result.map((row) => ({
      period: row.period.toISOString().split("T")[0],
      walletBalance: Number(row.wallet_balance),
      savingsBalance: Number(row.savings_balance),
      totalNetWorth: Number(row.total_net_worth),
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
// MONEY LEFT TO SPEND
// ============================================================================

/**
 * Calculate money left to spend for a month
 *
 * Compares total budgeted amount vs actual spending for budgeted categories
 * to show remaining budget for the month.
 *
 * @param query - Month in YYYY-MM format
 * @returns Money left to spend data
 */
export async function moneyLeftToSpend(
  query: unknown,
): Promise<MoneyLeftToSpendData> {
  const db = getDb();

  try {
    const validatedQuery = MoneyLeftToSpendQuerySchema.parse(query);

    // Parse month to get date range
    const monthStart = new Date(`${validatedQuery.month}-01T00:00:00.000Z`);
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    // Get total budgeted amount for the month
    const budgetResult = await db<{ total_budget: string }[]>`
      SELECT COALESCE(SUM(b.amount_idr), 0)::numeric as total_budget
      FROM budgets b
      WHERE b.month = ${validatedQuery.month}-01
    `;

    const totalBudget = Number(budgetResult[0]?.total_budget || 0);

    // Get actual spending for budgeted categories in the month
    const sql = `
      SELECT COALESCE(SUM(ABS(p.amount_idr)), 0)::numeric as total_spent
      FROM transaction_events te
      JOIN postings p ON te.id = p.event_id
      JOIN budgets b ON te.category_id = b.category_id
      WHERE te.type = 'expense'
        AND te.deleted_at IS NULL
        AND te.occurred_at >= $1
        AND te.occurred_at < $2
        AND b.month = $3
    `;

    // Convert Date objects to ISO strings for SQL query
    const params = [
      monthStart.toISOString(),
      nextMonth.toISOString(),
      `${validatedQuery.month}-01`,
    ];

    const spendingResult = await db.unsafe<{ total_spent: string }[]>(
      sql,
      params,
    );

    const totalSpent = Number(spendingResult[0]?.total_spent || 0);

    // Calculate remaining budget
    const remaining = totalBudget - totalSpent;
    const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    // Calculate days remaining in the month
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let daysRemaining = 0;
    if (
      now.getFullYear() === monthStart.getFullYear() &&
      now.getMonth() === monthStart.getMonth()
    ) {
      daysRemaining = currentMonthEnd.getDate() - now.getDate();
    }

    // Calculate average daily spending
    const daysInMonth = currentMonthEnd.getDate();
    const daysPassed = now.getDate();
    const averageDailySpending = daysPassed > 0 ? totalSpent / daysPassed : 0;

    // Project end-of-month spending
    const projectedMonthEndSpending = averageDailySpending * daysInMonth;

    // Calculate budget variance
    const budgetVariance = totalBudget - projectedMonthEndSpending;

    return {
      month: validatedQuery.month,
      totalBudget,
      totalSpent,
      remaining,
      percentUsed: Math.round(percentUsed * 100) / 100,
      daysRemaining,
      averageDailySpending: Math.round(averageDailySpending),
      projectedMonthEndSpending: Math.round(projectedMonthEndSpending),
      budgetVariance: Math.round(budgetVariance),
    };
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid money left to spend query",
        formatZodError(error),
      );
    }
    throw error;
  }
}
