"use server";

/**
 * Budget Actions
 *
 * Provides CRUD operations for budgets using PostgreSQL.
 * Handles budget creation, retrieval, updating, and deletion.
 * Budgets are organized by month (YYYY-MM-01 format) and category.
 */

import { nanoid } from "nanoid";
import {
  BudgetQuerySchema,
  BudgetIdSchema,
  BudgetMonthSchema,
  BudgetWithCategory,
} from "./schema";
import { getDb, getPool, sql } from "@/db/drizzle-client";
import { formatZodError } from "@/lib/zod";
import { unprocessableEntity } from "@/lib/http";

// Budget summary for a month
export interface BudgetSummary {
  month: string;
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  items: {
    categoryId: string;
    categoryName: string;
    budgetAmount: number;
    spentAmount: number;
    remaining: number;
    percentUsed: number;
  }[];
}

/**
 * List all budgets with optional month filter
 */
export async function listBudgets(
  query: unknown = {},
): Promise<BudgetWithCategory[]> {
  const db = getDb();

  try {
    const validatedQuery = BudgetQuerySchema.parse(query);

    let result;

    if (validatedQuery.month) {
      result = await db.execute(
        sql`SELECT b.id, b.month, b.category_id, b.amount_idr, b.note, b.created_at, b.updated_at, c.name as category_name FROM budgets b LEFT JOIN categories c ON b.category_id = c.id WHERE b.month = ${validatedQuery.month} ORDER BY c.name ASC`,
      );
    } else {
      result = await db.execute(
        sql`SELECT b.id, b.month, b.category_id, b.amount_idr, b.note, b.created_at, b.updated_at, c.name as category_name FROM budgets b LEFT JOIN categories c ON b.category_id = c.id ORDER BY b.month DESC, c.name ASC`,
      );
    }

    return result.rows.map((row) => ({
      id: row.id as string,
      month: row.month as string,
      category_id: row.category_id as string,
      amount_idr: row.amount_idr as number,
      note: row.note as string | null,
      created_at: row.created_at as Date | null,
      updated_at: row.updated_at as Date | null,
      category_name: row.category_name as string,
    }));
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid budget query", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Get a budget by ID
 */
export async function getBudgetById(
  id: string,
): Promise<BudgetWithCategory | null> {
  const db = getDb();

  try {
    BudgetIdSchema.parse({ id });

    const result = await db.execute(
      sql`SELECT b.id, b.month, b.category_id, b.amount_idr, b.note, b.created_at, b.updated_at, c.name as category_name FROM budgets b LEFT JOIN categories c ON b.category_id = c.id WHERE b.id = ${id}`,
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.id as string,
      month: row.month as string,
      category_id: row.category_id as string,
      amount_idr: row.amount_idr as number,
      note: row.note as string | null,
      created_at: row.created_at as Date | null,
      updated_at: row.updated_at as Date | null,
      category_name: row.category_name as string,
    };
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid budget ID", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Get all budgets for a specific month
 */
export async function getBudgetsByMonth(
  month: string,
): Promise<BudgetWithCategory[]> {
  const db = getDb();

  try {
    BudgetMonthSchema.parse(month);

    const result = await db.execute(
      sql`SELECT b.id, b.month, b.category_id, b.amount_idr, b.note, b.created_at, b.updated_at, c.name as category_name FROM budgets b LEFT JOIN categories c ON b.category_id = c.id WHERE b.month = ${month} ORDER BY c.name ASC`,
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      month: row.month as string,
      category_id: row.category_id as string,
      amount_idr: row.amount_idr as number,
      note: row.note as string | null,
      created_at: row.created_at as Date | null,
      updated_at: row.updated_at as Date | null,
      category_name: row.category_name as string,
    }));
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid month format", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Create a single budget item
 */
export async function createBudget(input: {
  month: string;
  categoryId: string;
  amountIdr: number;
  note?: string | null;
}): Promise<BudgetWithCategory> {
  const db = getDb();

  try {
    BudgetMonthSchema.parse(input.month);

    // Verify category exists, is not archived, and is an expense category
    const categoryResult = await db.execute(
      sql`SELECT id, name, type FROM categories WHERE id = ${input.categoryId} AND archived = false`,
    );

    if (categoryResult.rows.length === 0) {
      throw new Error("Category not found or archived");
    }

    const category = categoryResult.rows[0];
    if (category.type !== "expense") {
      throw new Error(
        "Budget category must be an expense category. Income categories cannot be budgeted.",
      );
    }

    // Check if budget already exists for this month/category
    const existingResult = await db.execute(
      sql`SELECT id FROM budgets WHERE month = ${input.month} AND category_id = ${input.categoryId}`,
    );

    if (existingResult.rows.length > 0) {
      throw new Error("Budget already exists for this month and category");
    }

    const id = nanoid();
    const now = new Date();

    const noteValue = input.note ?? null;

    await db.execute(
      sql`INSERT INTO budgets (id, month, category_id, amount_idr, note, created_at, updated_at) VALUES (${id}, ${input.month}, ${input.categoryId}, ${input.amountIdr}, ${noteValue}, ${now}, ${now})`,
    );

    return {
      id,
      month: input.month,
      category_id: input.categoryId,
      amount_idr: input.amountIdr,
      note: noteValue,
      created_at: now,
      updated_at: now,
      category_name: categoryResult.rows[0].name as string,
    };
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid budget data", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Update a budget by ID
 */
export async function updateBudget(
  id: string,
  amountIdr: number,
  note?: string | null,
): Promise<BudgetWithCategory> {
  const db = getDb();

  try {
    BudgetIdSchema.parse({ id });

    if (!Number.isInteger(amountIdr) || amountIdr <= 0) {
      throw new Error("Budget amount must be a positive integer");
    }

    const existing = await getBudgetById(id);
    if (!existing) {
      throw new Error("Budget not found");
    }

    const now = new Date();
    const noteValue = note !== undefined ? note : existing.note;
    await db.execute(
      sql`UPDATE budgets SET amount_idr = ${amountIdr}, note = ${noteValue}, updated_at = ${now} WHERE id = ${id}`,
    );

    return {
      ...existing,
      amount_idr: amountIdr,
      note: noteValue,
      updated_at: now,
    };
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid budget ID", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Delete a budget by ID
 */
export async function deleteBudget(id: string): Promise<void> {
  const db = getDb();

  try {
    BudgetIdSchema.parse({ id });

    const existing = await getBudgetById(id);
    if (!existing) {
      throw new Error("Budget not found");
    }

    await db.execute(sql`DELETE FROM budgets WHERE id = ${id}`);
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid budget ID", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Delete all budgets for a specific month
 */
export async function deleteBudgetsByMonth(month: string): Promise<number> {
  const pool = getPool();

  try {
    BudgetMonthSchema.parse(month);

    const result = await pool.query(
      `WITH deleted AS (
        DELETE FROM budgets WHERE month = $1
        RETURNING id
      )
      SELECT COUNT(*)::int as count FROM deleted`,
      [month],
    );

    return result.rows[0]?.count || 0;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid month format", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Get budget summary for a month (budget vs actual spending)
 */
export async function getBudgetSummary(month: string): Promise<BudgetSummary> {
  const pool = getPool();

  try {
    BudgetMonthSchema.parse(month);

    // Parse month to get date range
    const startDate = new Date(month);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Convert to ISO strings for SQL query
    const startDateISO = startDate.toISOString();
    const endDateISO = endDate.toISOString();

    // Get budgets for the month with category names
    const budgetResult = await pool.query(
      `SELECT
        b.category_id,
        c.name as category_name,
        b.amount_idr as budget_amount
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.month = $1`,
      [month],
    );

    // Get actual spending by category for the month
    const spendingResult = await pool.query(
      `SELECT
        te.category_id,
        COALESCE(SUM(ABS(p.amount_idr)), 0)::numeric as spent_amount
      FROM transaction_events te
      JOIN postings p ON te.id = p.event_id
      WHERE te.type = 'expense'
        AND te.deleted_at IS NULL
        AND te.occurred_at >= $1
        AND te.occurred_at < $2
        AND te.category_id IS NOT NULL
      GROUP BY te.category_id`,
      [startDateISO, endDateISO],
    );

    // Create spending map
    const spendingByCategory = new Map(
      spendingResult.rows.map((s) => [
        s.category_id as string,
        Number(s.spent_amount),
      ]),
    );

    // Calculate summary
    let totalBudget = 0;
    let totalSpent = 0;

    const items = budgetResult.rows.map((budget) => {
      const budgetAmount = Number(budget.budget_amount);
      const spentAmount =
        spendingByCategory.get(budget.category_id as string) || 0;
      const remaining = budgetAmount - spentAmount;
      const percentUsed =
        budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

      totalBudget += budgetAmount;
      totalSpent += spentAmount;

      return {
        categoryId: budget.category_id as string,
        categoryName: (budget.category_name as string) || "Unknown",
        budgetAmount,
        spentAmount,
        remaining,
        percentUsed: Math.round(percentUsed * 100) / 100,
      };
    });

    return {
      month,
      totalBudget,
      totalSpent,
      remaining: totalBudget - totalSpent,
      items,
    };
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid month format", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Get all distinct months that have budgets, sorted in descending order
 * Returns array of months with budget count
 */
export async function getMonthsWithBudgets(): Promise<
  Array<{ value: string; label: string; budgetCount: number }>
> {
  const pool = getPool();

  try {
    const result = await pool.query(
      `SELECT DISTINCT b.month, COUNT(*) as budget_count
       FROM budgets b
       GROUP BY b.month
       ORDER BY b.month DESC`,
    );

    return result.rows.map((row) => {
      const date = new Date(row.month);
      const label = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      return {
        value: row.month as string,
        label,
        budgetCount: row.budget_count as number,
      };
    });
  } catch (error: any) {
    console.error("Error fetching months with budgets:", error);
    throw error;
  }
}

/**
 * Copy budgets from one month to another
 */
export async function copyBudgets(
  fromMonth: string,
  toMonth: string,
): Promise<{
  created: Array<BudgetWithCategory & { category_name: string }>;
  skipped: Array<{ categoryId: string; categoryName: string }>;
}> {
  const pool = getPool();

  try {
    BudgetMonthSchema.parse(fromMonth);
    BudgetMonthSchema.parse(toMonth);

    if (fromMonth === toMonth) {
      throw new Error("Source and destination months must be different");
    }

    // Get source budgets
    const sourceBudgets = await getBudgetsByMonth(fromMonth);

    if (sourceBudgets.length === 0) {
      throw new Error("No budgets found for source month");
    }

    // Get existing budgets in destination month
    const existingBudgets = await getBudgetsByMonth(toMonth);
    const existingCategoryIds = new Set(
      existingBudgets.map((b) => b.category_id),
    );

    // Filter source budgets to only include categories NOT in destination
    const budgetsToCopy = sourceBudgets.filter(
      (b) => !existingCategoryIds.has(b.category_id),
    );

    // Track skipped budgets
    const skippedBudgets = sourceBudgets
      .filter((b) => existingCategoryIds.has(b.category_id))
      .map((b) => ({
        categoryId: b.category_id,
        categoryName: b.category_name ?? "",
      }));

    // If all budgets already exist, return early
    if (budgetsToCopy.length === 0) {
      return {
        created: [],
        skipped: skippedBudgets,
      };
    }

    const client = await pool.connect();
    const now = new Date();
    const createdBudgets: Array<
      BudgetWithCategory & { category_name: string }
    > = [];

    try {
      await client.query("BEGIN");

      // Insert only the budgets that don't exist in destination
      for (const budget of budgetsToCopy) {
        const newId = nanoid();
        await client.query(
          `INSERT INTO budgets (id, month, category_id, amount_idr, note, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            newId,
            toMonth,
            budget.category_id,
            budget.amount_idr,
            budget.note ?? null,
            now,
            now,
          ],
        );

        createdBudgets.push({
          id: newId,
          month: toMonth,
          category_id: budget.category_id,
          amount_idr: budget.amount_idr,
          note: budget.note ?? null,
          created_at: now,
          updated_at: now,
          category_name: budget.category_name ?? "",
        });
      }

      await client.query("COMMIT");
      return {
        created: createdBudgets,
        skipped: skippedBudgets,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid month format", formatZodError(error));
    }
    throw error;
  }
}
