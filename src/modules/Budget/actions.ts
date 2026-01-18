/**
 * Budget Actions
 *
 * Provides CRUD operations for budgets using PostgreSQL.
 * Handles budget creation, retrieval, updating, and deletion.
 * Budgets are organized by month (YYYY-MM-01 format) and category.
 */

import { nanoid } from "nanoid";
import {
  BudgetUpsertSchema,
  BudgetQuerySchema,
  BudgetIdSchema,
  BudgetMonthSchema,
  BudgetItem,
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
        sql`SELECT b.id, b.month, b.category_id, b.amount_idr, b.created_at, b.updated_at, c.name as category_name FROM budgets b LEFT JOIN categories c ON b.category_id = c.id WHERE b.month = ${validatedQuery.month} ORDER BY c.name ASC`,
      );
    } else {
      result = await db.execute(
        sql`SELECT b.id, b.month, b.category_id, b.amount_idr, b.created_at, b.updated_at, c.name as category_name FROM budgets b LEFT JOIN categories c ON b.category_id = c.id ORDER BY b.month DESC, c.name ASC`,
      );
    }

    return result.rows.map((row) => ({
      id: row.id as string,
      month: row.month as string,
      category_id: row.category_id as string,
      amount_idr: row.amount_idr as number,
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
      sql`SELECT b.id, b.month, b.category_id, b.amount_idr, b.created_at, b.updated_at, c.name as category_name FROM budgets b LEFT JOIN categories c ON b.category_id = c.id WHERE b.id = ${id}`,
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.id as string,
      month: row.month as string,
      category_id: row.category_id as string,
      amount_idr: row.amount_idr as number,
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
      sql`SELECT b.id, b.month, b.category_id, b.amount_idr, b.created_at, b.updated_at, c.name as category_name FROM budgets b LEFT JOIN categories c ON b.category_id = c.id WHERE b.month = ${month} ORDER BY c.name ASC`,
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      month: row.month as string,
      category_id: row.category_id as string,
      amount_idr: row.amount_idr as number,
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
 * Upsert budgets for a month
 * This will create or update budget items for the specified month.
 * Items not included will be deleted.
 */
export async function upsertBudgets(
  input: unknown,
): Promise<BudgetWithCategory[]> {
  const pool = getPool();

  try {
    const validatedInput = BudgetUpsertSchema.parse(input);

    // Verify all categories exist and are not archived
    const categoryIds = validatedInput.items.map((item) => item.categoryId);
    const categoryCheck = await pool.query(
      `SELECT id, name FROM categories WHERE id = ANY($1::text[]) AND archived = false`,
      [categoryIds],
    );

    const foundCategoryIds = new Set(
      categoryCheck.rows.map((c) => c.id as string),
    );
    const missingCategories = categoryIds.filter(
      (id) => !foundCategoryIds.has(id),
    );

    if (missingCategories.length > 0) {
      throw new Error(
        `Categories not found or archived: ${missingCategories.join(", ")}`,
      );
    }

    // Check for duplicate category IDs in input
    const uniqueCategoryIds = new Set(categoryIds);
    if (uniqueCategoryIds.size !== categoryIds.length) {
      throw new Error("Duplicate category IDs in budget items");
    }

    const client = await pool.connect();
    const results: Array<BudgetWithCategory & { category_name: string }> = [];
    const now = new Date();

    try {
      await client.query("BEGIN");

      // Get existing budgets for this month
      const existingResult = await client.query(
        `SELECT id, category_id FROM budgets WHERE month = $1`,
        [validatedInput.month],
      );

      const existingByCategoryId = new Map(
        existingResult.rows.map((b) => [
          b.category_id as string,
          b.id as string,
        ]),
      );

      // Process each budget item
      for (const item of validatedInput.items) {
        const existingId = existingByCategoryId.get(item.categoryId);

        if (existingId) {
          // Update existing budget
          await client.query(
            `UPDATE budgets SET amount_idr = $1, updated_at = $2 WHERE id = $3`,
            [item.amountIdr, now, existingId],
          );

          const category = categoryCheck.rows.find(
            (c) => c.id === item.categoryId,
          );
          results.push({
            id: existingId,
            month: validatedInput.month,
            category_id: item.categoryId,
            amount_idr: item.amountIdr,
            created_at: now,
            updated_at: now,
            category_name: category?.name as string,
          });
        } else {
          // Create new budget
          const newId = nanoid();
          await client.query(
            `INSERT INTO budgets (id, month, category_id, amount_idr, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              newId,
              validatedInput.month,
              item.categoryId,
              item.amountIdr,
              now,
              now,
            ],
          );

          const category = categoryCheck.rows.find(
            (c) => c.id === item.categoryId,
          );
          results.push({
            id: newId,
            month: validatedInput.month,
            category_id: item.categoryId,
            amount_idr: item.amountIdr,
            created_at: now,
            updated_at: now,
            category_name: category?.name as string,
          });
        }

        // Remove from map to track what's been processed
        existingByCategoryId.delete(item.categoryId);
      }

      // Delete budgets for categories not in the input
      const idsToDelete = Array.from(existingByCategoryId.values());
      if (idsToDelete.length > 0) {
        await client.query(`DELETE FROM budgets WHERE id = ANY($1::text[])`, [
          idsToDelete,
        ]);
      }

      await client.query("COMMIT");
      return results;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid budget data", formatZodError(error));
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
}): Promise<BudgetWithCategory> {
  const db = getDb();

  try {
    BudgetMonthSchema.parse(input.month);

    // Verify category exists and is not archived
    const categoryResult = await db.execute(
      sql`SELECT id, name FROM categories WHERE id = ${input.categoryId} AND archived = false`,
    );

    if (categoryResult.rows.length === 0) {
      throw new Error("Category not found or archived");
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

    await db.execute(
      sql`INSERT INTO budgets (id, month, category_id, amount_idr, created_at, updated_at) VALUES (${id}, ${input.month}, ${input.categoryId}, ${input.amountIdr}, ${now}, ${now})`,
    );

    return {
      id,
      month: input.month,
      category_id: input.categoryId,
      amount_idr: input.amountIdr,
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
    await db.execute(
      sql`UPDATE budgets SET amount_idr = ${amountIdr}, updated_at = ${now} WHERE id = ${id}`,
    );

    return {
      ...existing,
      amount_idr: amountIdr,
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
 * Copy budgets from one month to another
 */
export async function copyBudgets(
  fromMonth: string,
  toMonth: string,
): Promise<BudgetWithCategory[]> {
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

    // Check if destination month already has budgets
    const existingBudgets = await getBudgetsByMonth(toMonth);
    if (existingBudgets.length > 0) {
      throw new Error("Destination month already has budgets");
    }

    const client = await pool.connect();
    const now = new Date();
    const newBudgets: Array<BudgetWithCategory & { category_name: string }> =
      [];

    try {
      await client.query("BEGIN");

      for (const budget of sourceBudgets) {
        const newId = nanoid();
        await client.query(
          `INSERT INTO budgets (id, month, category_id, amount_idr, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [newId, toMonth, budget.category_id, budget.amount_idr, now, now],
        );

        newBudgets.push({
          id: newId,
          month: toMonth,
          category_id: budget.category_id,
          amount_idr: budget.amount_idr,
          created_at: now,
          updated_at: now,
          category_name: budget.category_name ?? "",
        });
      }

      await client.query("COMMIT");
      return newBudgets;
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
