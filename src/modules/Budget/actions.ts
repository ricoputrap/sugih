"use server";

/**
 * Budget Actions
 *
 * Provides CRUD operations for budgets using PostgreSQL.
 * Handles budget creation, retrieval, updating, and deletion.
 * Budgets are organized by month (YYYY-MM-01 format) and can target
 * either expense categories OR savings buckets.
 */

import { nanoid } from "nanoid";
import { ZodError } from "zod";
import {
  BudgetQuerySchema,
  BudgetIdSchema,
  BudgetMonthSchema,
  BulkDeleteBudgetsSchema,
  BudgetWithCategory,
} from "./schema";
import { getDb, getPool, sql } from "@/db/drizzle-client";
import { formatZodError } from "@/lib/zod";
import { unprocessableEntity } from "@/lib/http";

// Budget summary item for a month
export interface BudgetSummaryItem {
  categoryId: string | null;
  savingsBucketId: string | null;
  targetName: string;
  targetType: "category" | "savings_bucket";
  budgetAmount: number;
  spentAmount: number;
  remaining: number;
  percentUsed: number;
}

// Budget summary for a month
export interface BudgetSummary {
  month: string;
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  items: BudgetSummaryItem[];
  // Legacy items for backward compatibility
  categoryItems?: {
    categoryId: string;
    categoryName: string;
    budgetAmount: number;
    spentAmount: number;
    remaining: number;
    percentUsed: number;
  }[];
}

/**
 * Helper function to map a budget row to BudgetWithCategory
 */
function mapRowToBudgetWithCategory(
  row: Record<string, unknown>,
): BudgetWithCategory {
  const categoryId = row.category_id as string | null;
  const savingsBucketId = row.savings_bucket_id as string | null;

  return {
    id: row.id as string,
    month: row.month as string,
    category_id: categoryId,
    savings_bucket_id: savingsBucketId,
    amount_idr: row.amount_idr as number,
    note: row.note as string | null,
    created_at: row.created_at as Date | null,
    updated_at: row.updated_at as Date | null,
    category_name: row.category_name as string | null,
    savings_bucket_name: row.savings_bucket_name as string | null,
    target_type: categoryId ? "category" : "savings_bucket",
  };
}

/**
 * List all budgets with optional month filter
 * Includes both category and savings bucket budgets
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
        sql`SELECT
          b.id,
          b.month,
          b.category_id,
          b.savings_bucket_id,
          b.amount_idr,
          b.note,
          b.created_at,
          b.updated_at,
          c.name as category_name,
          sb.name as savings_bucket_name
        FROM budgets b
        LEFT JOIN categories c ON b.category_id = c.id
        LEFT JOIN savings_buckets sb ON b.savings_bucket_id = sb.id
        WHERE b.month = ${validatedQuery.month}
        ORDER BY
          CASE WHEN b.category_id IS NOT NULL THEN 0 ELSE 1 END,
          COALESCE(c.name, sb.name) ASC`,
      );
    } else {
      result = await db.execute(
        sql`SELECT
          b.id,
          b.month,
          b.category_id,
          b.savings_bucket_id,
          b.amount_idr,
          b.note,
          b.created_at,
          b.updated_at,
          c.name as category_name,
          sb.name as savings_bucket_name
        FROM budgets b
        LEFT JOIN categories c ON b.category_id = c.id
        LEFT JOIN savings_buckets sb ON b.savings_bucket_id = sb.id
        ORDER BY
          b.month DESC,
          CASE WHEN b.category_id IS NOT NULL THEN 0 ELSE 1 END,
          COALESCE(c.name, sb.name) ASC`,
      );
    }

    return result.rows.map(mapRowToBudgetWithCategory);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      throw unprocessableEntity("Invalid budget query", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Get a budget by ID
 * Returns budget with category or savings bucket info
 */
export async function getBudgetById(
  id: string,
): Promise<BudgetWithCategory | null> {
  const db = getDb();

  try {
    BudgetIdSchema.parse({ id });

    const result = await db.execute(
      sql`SELECT
        b.id,
        b.month,
        b.category_id,
        b.savings_bucket_id,
        b.amount_idr,
        b.note,
        b.created_at,
        b.updated_at,
        c.name as category_name,
        sb.name as savings_bucket_name
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      LEFT JOIN savings_buckets sb ON b.savings_bucket_id = sb.id
      WHERE b.id = ${id}`,
    );

    const row = result.rows[0];
    if (!row) return null;

    return mapRowToBudgetWithCategory(row);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      throw unprocessableEntity("Invalid budget ID", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Get all budgets for a specific month
 * Includes both category and savings bucket budgets
 */
export async function getBudgetsByMonth(
  month: string,
): Promise<BudgetWithCategory[]> {
  const db = getDb();

  try {
    BudgetMonthSchema.parse(month);

    const result = await db.execute(
      sql`SELECT
        b.id,
        b.month,
        b.category_id,
        b.savings_bucket_id,
        b.amount_idr,
        b.note,
        b.created_at,
        b.updated_at,
        c.name as category_name,
        sb.name as savings_bucket_name
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      LEFT JOIN savings_buckets sb ON b.savings_bucket_id = sb.id
      WHERE b.month = ${month}
      ORDER BY
        CASE WHEN b.category_id IS NOT NULL THEN 0 ELSE 1 END,
        COALESCE(c.name, sb.name) ASC`,
    );

    return result.rows.map(mapRowToBudgetWithCategory);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      throw unprocessableEntity("Invalid month format", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Create a single budget item
 * Supports both category budgets and savings bucket budgets
 */
export async function createBudget(input: {
  month: string;
  categoryId?: string | null;
  savingsBucketId?: string | null;
  amountIdr: number;
  note?: string | null;
}): Promise<BudgetWithCategory> {
  const db = getDb();

  try {
    BudgetMonthSchema.parse(input.month);

    const hasCategoryId = input.categoryId != null && input.categoryId !== "";
    const hasSavingsBucketId =
      input.savingsBucketId != null && input.savingsBucketId !== "";

    // Validate that exactly one target is specified
    if (hasCategoryId && hasSavingsBucketId) {
      throw new Error("Cannot specify both categoryId and savingsBucketId");
    }
    if (!hasCategoryId && !hasSavingsBucketId) {
      throw new Error("Must specify either categoryId or savingsBucketId");
    }

    let targetName: string;
    let categoryId: string | null = null;
    let savingsBucketId: string | null = null;

    if (hasCategoryId) {
      categoryId = input.categoryId!;

      // Verify category exists, is not archived, and is an expense category
      const categoryResult = await db.execute(
        sql`SELECT id, name, type FROM categories WHERE id = ${categoryId} AND archived = false`,
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

      targetName = category.name as string;

      // Check if budget already exists for this month/category
      const existingResult = await db.execute(
        sql`SELECT id FROM budgets WHERE month = ${input.month} AND category_id = ${categoryId}`,
      );

      if (existingResult.rows.length > 0) {
        throw new Error("Budget already exists for this month and category");
      }
    } else {
      savingsBucketId = input.savingsBucketId!;

      // Verify savings bucket exists and is not archived
      const bucketResult = await db.execute(
        sql`SELECT id, name FROM savings_buckets WHERE id = ${savingsBucketId} AND archived = false AND deleted_at IS NULL`,
      );

      if (bucketResult.rows.length === 0) {
        throw new Error("Savings bucket not found or archived");
      }

      targetName = bucketResult.rows[0].name as string;

      // Check if budget already exists for this month/savings bucket
      const existingResult = await db.execute(
        sql`SELECT id FROM budgets WHERE month = ${input.month} AND savings_bucket_id = ${savingsBucketId}`,
      );

      if (existingResult.rows.length > 0) {
        throw new Error(
          "Budget already exists for this month and savings bucket",
        );
      }
    }

    const id = nanoid();
    const now = new Date();
    const noteValue = input.note ?? null;

    if (categoryId) {
      await db.execute(
        sql`INSERT INTO budgets (id, month, category_id, savings_bucket_id, amount_idr, note, created_at, updated_at)
            VALUES (${id}, ${input.month}, ${categoryId}, ${null}, ${input.amountIdr}, ${noteValue}, ${now}, ${now})`,
      );

      return {
        id,
        month: input.month,
        category_id: categoryId,
        savings_bucket_id: null,
        amount_idr: input.amountIdr,
        note: noteValue,
        created_at: now,
        updated_at: now,
        category_name: targetName,
        savings_bucket_name: null,
        target_type: "category",
      };
    } else {
      await db.execute(
        sql`INSERT INTO budgets (id, month, category_id, savings_bucket_id, amount_idr, note, created_at, updated_at)
            VALUES (${id}, ${input.month}, ${null}, ${savingsBucketId}, ${input.amountIdr}, ${noteValue}, ${now}, ${now})`,
      );

      return {
        id,
        month: input.month,
        category_id: null,
        savings_bucket_id: savingsBucketId,
        amount_idr: input.amountIdr,
        note: noteValue,
        created_at: now,
        updated_at: now,
        category_name: null,
        savings_bucket_name: targetName,
        target_type: "savings_bucket",
      };
    }
  } catch (error: unknown) {
    if (error instanceof ZodError) {
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
  } catch (error: unknown) {
    if (error instanceof ZodError) {
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
  } catch (error: unknown) {
    if (error instanceof ZodError) {
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
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      throw unprocessableEntity("Invalid month format", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Get budget summary for a month (budget vs actual spending/savings)
 * Includes both category budgets and savings bucket budgets
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

    // Get all budgets for the month (both category and savings bucket)
    const budgetResult = await pool.query(
      `SELECT
        b.category_id,
        b.savings_bucket_id,
        c.name as category_name,
        sb.name as savings_bucket_name,
        b.amount_idr as budget_amount
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      LEFT JOIN savings_buckets sb ON b.savings_bucket_id = sb.id
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

    // Get actual savings contributions by savings bucket for the month
    // Only contributions count toward budget spent — withdrawals don't affect budget progress
    const savingsResult = await pool.query(
      `SELECT
        p.savings_bucket_id,
        COALESCE(SUM(p.amount_idr), 0)::numeric as saved_amount
      FROM transaction_events te
      JOIN postings p ON te.id = p.event_id
      WHERE te.type = 'savings_contribution'
        AND te.deleted_at IS NULL
        AND te.occurred_at >= $1
        AND te.occurred_at < $2
        AND p.savings_bucket_id IS NOT NULL
      GROUP BY p.savings_bucket_id`,
      [startDateISO, endDateISO],
    );

    // Create spending/savings maps
    const spendingByCategory = new Map(
      spendingResult.rows.map((s) => [
        s.category_id as string,
        Number(s.spent_amount),
      ]),
    );

    const savingsByBucket = new Map(
      savingsResult.rows.map((s) => [
        s.savings_bucket_id as string,
        Number(s.saved_amount),
      ]),
    );

    // Calculate summary
    let totalBudget = 0;
    let totalSpent = 0;

    const items: BudgetSummaryItem[] = budgetResult.rows.map((budget) => {
      const budgetAmount = Number(budget.budget_amount);
      const categoryId = budget.category_id as string | null;
      const savingsBucketId = budget.savings_bucket_id as string | null;

      let spentAmount: number;
      let targetName: string;
      let targetType: "category" | "savings_bucket";

      if (categoryId) {
        spentAmount = spendingByCategory.get(categoryId) || 0;
        targetName = (budget.category_name as string) || "Unknown Category";
        targetType = "category";
      } else {
        spentAmount = savingsByBucket.get(savingsBucketId!) || 0;
        targetName = (budget.savings_bucket_name as string) || "Unknown Bucket";
        targetType = "savings_bucket";
      }

      const remaining = budgetAmount - spentAmount;
      const percentUsed =
        budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

      totalBudget += budgetAmount;
      totalSpent += spentAmount;

      return {
        categoryId,
        savingsBucketId,
        targetName,
        targetType,
        budgetAmount,
        spentAmount,
        remaining,
        percentUsed: Math.round(percentUsed * 100) / 100,
      };
    });

    // Legacy category items for backward compatibility
    const categoryItems = items
      .filter((item) => item.targetType === "category")
      .map((item) => ({
        categoryId: item.categoryId!,
        categoryName: item.targetName,
        budgetAmount: item.budgetAmount,
        spentAmount: item.spentAmount,
        remaining: item.remaining,
        percentUsed: item.percentUsed,
      }));

    return {
      month,
      totalBudget,
      totalSpent,
      remaining: totalBudget - totalSpent,
      items,
      categoryItems,
    };
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      throw unprocessableEntity("Invalid month format", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Bulk delete multiple budgets by ID
 */
export async function bulkDeleteBudgets(
  ids: string[],
): Promise<{ deletedCount: number; failedIds: string[] }> {
  const pool = getPool();

  // Validate input
  const validatedInput = BulkDeleteBudgetsSchema.parse({ ids });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check which budgets exist
    const checkQuery = `
      SELECT id
      FROM budgets
      WHERE id = ANY($1)
    `;
    const checkResult = await client.query(checkQuery, [validatedInput.ids]);
    const budgets = checkResult.rows;

    // Identify failed IDs
    const foundIds = new Set(budgets.map((b) => b.id));
    const notFoundIds = validatedInput.ids.filter((id) => !foundIds.has(id));

    const deletableIds = Array.from(foundIds);

    // Perform hard delete for valid budgets
    let deletedCount = 0;
    if (deletableIds.length > 0) {
      const deleteQuery = `
        DELETE FROM budgets
        WHERE id = ANY($1)
      `;
      const deleteResult = await client.query(deleteQuery, [deletableIds]);
      deletedCount = deleteResult.rowCount || 0;
    }

    await client.query("COMMIT");

    return {
      deletedCount,
      failedIds: notFoundIds,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
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
  } catch (error: unknown) {
    console.error("Error fetching months with budgets:", error);
    throw error;
  }
}

/**
 * Copy budgets from one month to another
 * Supports both category budgets and savings bucket budgets
 */
export async function copyBudgets(
  fromMonth: string,
  toMonth: string,
): Promise<{
  created: Array<BudgetWithCategory>;
  skipped: Array<{
    categoryId: string | null;
    savingsBucketId: string | null;
    targetName: string;
  }>;
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

    // Create sets for existing category and savings bucket IDs
    const existingCategoryIds = new Set(
      existingBudgets
        .filter((b) => b.category_id != null)
        .map((b) => b.category_id),
    );
    const existingSavingsBucketIds = new Set(
      existingBudgets
        .filter((b) => b.savings_bucket_id != null)
        .map((b) => b.savings_bucket_id),
    );

    // Filter source budgets to only include those NOT in destination
    const budgetsToCopy = sourceBudgets.filter((b) => {
      if (b.category_id) {
        return !existingCategoryIds.has(b.category_id);
      } else {
        return !existingSavingsBucketIds.has(b.savings_bucket_id);
      }
    });

    // Track skipped budgets
    const skippedBudgets = sourceBudgets
      .filter((b) => {
        if (b.category_id) {
          return existingCategoryIds.has(b.category_id);
        } else {
          return existingSavingsBucketIds.has(b.savings_bucket_id);
        }
      })
      .map((b) => ({
        categoryId: b.category_id,
        savingsBucketId: b.savings_bucket_id,
        targetName: b.category_name || b.savings_bucket_name || "",
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
    const createdBudgets: Array<BudgetWithCategory> = [];

    try {
      await client.query("BEGIN");

      // Insert only the budgets that don't exist in destination
      for (const budget of budgetsToCopy) {
        const newId = nanoid();

        await client.query(
          `INSERT INTO budgets (id, month, category_id, savings_bucket_id, amount_idr, note, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            newId,
            toMonth,
            budget.category_id,
            budget.savings_bucket_id,
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
          savings_bucket_id: budget.savings_bucket_id,
          amount_idr: budget.amount_idr,
          note: budget.note ?? null,
          created_at: now,
          updated_at: now,
          category_name: budget.category_name,
          savings_bucket_name: budget.savings_bucket_name,
          target_type: budget.target_type,
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
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      throw unprocessableEntity("Invalid month format", formatZodError(error));
    }
    throw error;
  }
}
