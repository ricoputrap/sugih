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
  Budget,
  BudgetItem,
} from "./schema";
import { getDb } from "@/db/client";
import { formatZodError } from "@/lib/zod";
import { unprocessableEntity } from "@/lib/http";

// Extended budget type with category name
export interface BudgetWithCategory extends Budget {
  category_name?: string;
}

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

    let budgets: BudgetWithCategory[];

    if (validatedQuery.month) {
      budgets = await db<BudgetWithCategory[]>`
        SELECT
          b.id, b.month, b.category_id, b.amount_idr, b.created_at, b.updated_at,
          c.name as category_name
        FROM budgets b
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE b.month = ${validatedQuery.month}
        ORDER BY c.name ASC
      `;
    } else {
      budgets = await db<BudgetWithCategory[]>`
        SELECT
          b.id, b.month, b.category_id, b.amount_idr, b.created_at, b.updated_at,
          c.name as category_name
        FROM budgets b
        LEFT JOIN categories c ON b.category_id = c.id
        ORDER BY b.month DESC, c.name ASC
      `;
    }

    return Array.from(budgets);
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

    const budgets = await db<BudgetWithCategory[]>`
      SELECT
        b.id, b.month, b.category_id, b.amount_idr, b.created_at, b.updated_at,
        c.name as category_name
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ${id}
    `;

    return budgets[0] || null;
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

    const budgets = await db<BudgetWithCategory[]>`
      SELECT
        b.id, b.month, b.category_id, b.amount_idr, b.created_at, b.updated_at,
        c.name as category_name
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.month = ${month}
      ORDER BY c.name ASC
    `;

    return Array.from(budgets);
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
  const db = getDb();

  try {
    const validatedInput = BudgetUpsertSchema.parse(input);

    // Verify all categories exist and are not archived
    const categoryIds = validatedInput.items.map((item) => item.categoryId);
    const categories = await db<{ id: string; name: string }[]>`
      SELECT id, name FROM categories
      WHERE id = ANY(${categoryIds}) AND archived = false
    `;

    const foundCategoryIds = new Set(categories.map((c) => c.id));
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

    const now = new Date();
    const results: BudgetWithCategory[] = [];

    await db.begin(async (tx) => {
      // Get existing budgets for this month
      const existingBudgets = await tx<Budget[]>`
        SELECT id, category_id FROM budgets WHERE month = ${validatedInput.month}
      `;

      const existingByCategoryId = new Map(
        existingBudgets.map((b) => [b.category_id, b.id]),
      );

      // Process each budget item
      for (const item of validatedInput.items) {
        const existingId = existingByCategoryId.get(item.categoryId);

        if (existingId) {
          // Update existing budget
          await tx`
            UPDATE budgets
            SET amount_idr = ${item.amountIdr}, updated_at = ${now}
            WHERE id = ${existingId}
          `;

          const category = categories.find((c) => c.id === item.categoryId);
          results.push({
            id: existingId,
            month: validatedInput.month,
            category_id: item.categoryId,
            amount_idr: item.amountIdr,
            created_at: now,
            updated_at: now,
            category_name: category?.name,
          });
        } else {
          // Create new budget
          const newId = nanoid();
          await tx`
            INSERT INTO budgets (id, month, category_id, amount_idr, created_at, updated_at)
            VALUES (${newId}, ${validatedInput.month}, ${item.categoryId}, ${item.amountIdr}, ${now}, ${now})
          `;

          const category = categories.find((c) => c.id === item.categoryId);
          results.push({
            id: newId,
            month: validatedInput.month,
            category_id: item.categoryId,
            amount_idr: item.amountIdr,
            created_at: now,
            updated_at: now,
            category_name: category?.name,
          });
        }

        // Remove from map to track what's been processed
        existingByCategoryId.delete(item.categoryId);
      }

      // Delete budgets for categories not in the input
      const idsToDelete = Array.from(existingByCategoryId.values());
      if (idsToDelete.length > 0) {
        await tx`DELETE FROM budgets WHERE id = ANY(${idsToDelete})`;
      }
    });

    return results;
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
export async function createBudget(
  month: string,
  item: BudgetItem,
): Promise<BudgetWithCategory> {
  const db = getDb();

  try {
    BudgetMonthSchema.parse(month);

    // Verify category exists and is not archived
    const categories = await db<{ id: string; name: string }[]>`
      SELECT id, name FROM categories
      WHERE id = ${item.categoryId} AND archived = false
    `;

    if (categories.length === 0) {
      throw new Error("Category not found or archived");
    }

    // Check if budget already exists for this month/category
    const existing = await db<Budget[]>`
      SELECT id FROM budgets
      WHERE month = ${month} AND category_id = ${item.categoryId}
    `;

    if (existing.length > 0) {
      throw new Error("Budget already exists for this month and category");
    }

    const id = nanoid();
    const now = new Date();

    await db`
      INSERT INTO budgets (id, month, category_id, amount_idr, created_at, updated_at)
      VALUES (${id}, ${month}, ${item.categoryId}, ${item.amountIdr}, ${now}, ${now})
    `;

    return {
      id,
      month,
      category_id: item.categoryId,
      amount_idr: item.amountIdr,
      created_at: now,
      updated_at: now,
      category_name: categories[0].name,
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
    await db`
      UPDATE budgets
      SET amount_idr = ${amountIdr}, updated_at = ${now}
      WHERE id = ${id}
    `;

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

    await db`DELETE FROM budgets WHERE id = ${id}`;
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
  const db = getDb();

  try {
    BudgetMonthSchema.parse(month);

    const result = await db<{ count: number }[]>`
      WITH deleted AS (
        DELETE FROM budgets WHERE month = ${month}
        RETURNING id
      )
      SELECT COUNT(*)::int as count FROM deleted
    `;

    return result[0]?.count || 0;
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
  const db = getDb();

  try {
    BudgetMonthSchema.parse(month);

    // Parse month to get date range
    const startDate = new Date(month);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Get budgets for the month with category names
    const budgets = await db<
      {
        category_id: string;
        category_name: string;
        budget_amount: number;
      }[]
    >`
      SELECT
        b.category_id,
        c.name as category_name,
        b.amount_idr as budget_amount
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.month = ${month}
    `;

    // Get actual spending by category for the month
    const spending = await db<
      {
        category_id: string;
        spent_amount: number;
      }[]
    >`
      SELECT
        te.category_id,
        COALESCE(SUM(ABS(p.amount_idr)), 0)::numeric as spent_amount
      FROM transaction_events te
      JOIN postings p ON te.id = p.event_id
      WHERE te.type = 'expense'
        AND te.deleted_at IS NULL
        AND te.occurred_at >= ${startDate}
        AND te.occurred_at < ${endDate}
        AND te.category_id IS NOT NULL
      GROUP BY te.category_id
    `;

    // Create spending map
    const spendingByCategory = new Map(
      spending.map((s) => [s.category_id, Number(s.spent_amount)]),
    );

    // Calculate summary
    let totalBudget = 0;
    let totalSpent = 0;

    const items = budgets.map((budget) => {
      const budgetAmount = Number(budget.budget_amount);
      const spentAmount = spendingByCategory.get(budget.category_id) || 0;
      const remaining = budgetAmount - spentAmount;
      const percentUsed =
        budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

      totalBudget += budgetAmount;
      totalSpent += spentAmount;

      return {
        categoryId: budget.category_id,
        categoryName: budget.category_name || "Unknown",
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
  const db = getDb();

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

    const now = new Date();
    const newBudgets: BudgetWithCategory[] = [];

    await db.begin(async (tx) => {
      for (const budget of sourceBudgets) {
        const newId = nanoid();
        await tx`
          INSERT INTO budgets (id, month, category_id, amount_idr, created_at, updated_at)
          VALUES (${newId}, ${toMonth}, ${budget.category_id}, ${budget.amount_idr}, ${now}, ${now})
        `;

        newBudgets.push({
          id: newId,
          month: toMonth,
          category_id: budget.category_id,
          amount_idr: budget.amount_idr,
          created_at: now,
          updated_at: now,
          category_name: budget.category_name,
        });
      }
    });

    return newBudgets;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid month format", formatZodError(error));
    }
    throw error;
  }
}
