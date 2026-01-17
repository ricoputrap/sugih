/**
 * Category Actions
 *
 * Provides CRUD operations for categories using PostgreSQL.
 * Handles category creation, retrieval, updating, archiving, and deletion.
 */

import { nanoid } from "nanoid";
import {
  CategoryCreateSchema,
  CategoryUpdateSchema,
  CategoryIdSchema,
  Category,
} from "./schema";
import { getDb, eq, and, sql, isNull, desc, asc } from "@/db/drizzle-client";
import { categories } from "./schema";
import { formatZodError } from "@/lib/zod";
import { unprocessableEntity } from "@/lib/http";

/**
 * List all categories ordered by name
 */
export async function listCategories(): Promise<Category[]> {
  const db = getDb();
  const result = await db.execute(
    sql`SELECT id, name, archived, created_at, updated_at FROM categories ORDER BY name ASC`,
  );
  return result.rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    archived: row.archived as boolean,
    created_at: row.created_at,
    updated_at: row.updated_at,
  })) as Category[];
}

/**
 * Get a category by ID
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  const db = getDb();
  const result = await db.execute(
    sql`SELECT id, name, archived, created_at, updated_at FROM categories WHERE id = ${id}`,
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id as string,
    name: row.name as string,
    archived: row.archived as boolean,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Create a new category
 */
export async function createCategory(input: unknown): Promise<Category> {
  const db = getDb();

  try {
    const validatedInput = CategoryCreateSchema.parse(input);

    // Generate ID
    const id = nanoid();

    // Check if category name already exists
    const existingCategories = await db<{ id: string }[]>`
      SELECT id FROM categories WHERE name = ${validatedInput.name}
    `;

    if (existingCategories.length > 0) {
      throw new Error("Category name already exists");
    }

    // Insert category with PostgreSQL timestamp
    const now = new Date();
    await db`
      INSERT INTO categories (id, name, archived, created_at, updated_at)
      VALUES (
        ${id},
        ${validatedInput.name},
        ${false},
        ${now},
        ${now}
      )
    `;

    // Return created category
    const createdCategory = await getCategoryById(id);
    if (!createdCategory) {
      throw new Error("Failed to retrieve created category");
    }

    return createdCategory;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid category data", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Update an existing category
 */
export async function updateCategory(
  id: string,
  input: unknown,
): Promise<Category> {
  const db = getDb();

  try {
    const validatedInput = CategoryUpdateSchema.parse(input);

    // Validate category ID format
    CategoryIdSchema.parse({ id });

    // Check if category exists
    const existingCategory = await getCategoryById(id);
    if (!existingCategory) {
      throw new Error("Category not found");
    }

    // Build dynamic update - collect fields to update
    const updates: Record<string, any> = {};

    if (validatedInput.name !== undefined) {
      // Check if new name conflicts with another category
      const nameConflicts = await db<{ id: string }[]>`
        SELECT id FROM categories WHERE name = ${validatedInput.name} AND id != ${id}
      `;

      if (nameConflicts.length > 0) {
        throw new Error("Category name already exists");
      }

      updates.name = validatedInput.name;
    }

    if (validatedInput.archived !== undefined) {
      updates.archived = validatedInput.archived;
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("No updates provided");
    }

    // Execute update with dynamic fields
    const now = new Date();

    // Build and execute update based on which fields are present
    if (updates.name !== undefined && updates.archived !== undefined) {
      await db`
        UPDATE categories
        SET name = ${updates.name}, archived = ${updates.archived}, updated_at = ${now}
        WHERE id = ${id}
      `;
    } else if (updates.name !== undefined) {
      await db`
        UPDATE categories
        SET name = ${updates.name}, updated_at = ${now}
        WHERE id = ${id}
      `;
    } else if (updates.archived !== undefined) {
      await db`
        UPDATE categories
        SET archived = ${updates.archived}, updated_at = ${now}
        WHERE id = ${id}
      `;
    }

    // Return updated category
    const updatedCategory = await getCategoryById(id);
    if (!updatedCategory) {
      throw new Error("Failed to retrieve updated category");
    }

    return updatedCategory;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid category update data",
        formatZodError(error),
      );
    }
    throw error;
  }
}

/**
 * Archive a category (soft delete)
 */
export async function archiveCategory(id: string): Promise<Category> {
  const db = getDb();

  try {
    // Validate category ID
    CategoryIdSchema.parse({ id });

    // Check if category exists and is not already archived
    const existingCategory = await getCategoryById(id);
    if (!existingCategory) {
      throw new Error("Category not found");
    }

    if (existingCategory.archived) {
      throw new Error("Category is already archived");
    }

    // Archive category
    const now = new Date();
    await db`
      UPDATE categories
      SET archived = ${true}, updated_at = ${now}
      WHERE id = ${id}
    `;

    // Return archived category
    const archivedCategory = await getCategoryById(id);
    if (!archivedCategory) {
      throw new Error("Failed to retrieve archived category");
    }

    return archivedCategory;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid category ID", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Restore an archived category
 */
export async function restoreCategory(id: string): Promise<Category> {
  const db = getDb();

  try {
    // Validate category ID
    CategoryIdSchema.parse({ id });

    // Check if category exists
    const existingCategory = await getCategoryById(id);
    if (!existingCategory) {
      throw new Error("Category not found");
    }

    if (!existingCategory.archived) {
      throw new Error("Category is not archived");
    }

    // Restore category
    const now = new Date();
    await db`
      UPDATE categories
      SET archived = ${false}, updated_at = ${now}
      WHERE id = ${id}
    `;

    // Return restored category
    const restoredCategory = await getCategoryById(id);
    if (!restoredCategory) {
      throw new Error("Failed to retrieve restored category");
    }

    return restoredCategory;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid category ID", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Permanently delete a category
 */
export async function deleteCategory(id: string): Promise<void> {
  const db = getDb();

  try {
    // Validate category ID
    CategoryIdSchema.parse({ id });

    // Check if category exists
    const existingCategory = await getCategoryById(id);
    if (!existingCategory) {
      throw new Error("Category not found");
    }

    // Delete category directly
    // Note: The transactions table check will be added in Phase 4 when transactions are implemented
    await db`DELETE FROM categories WHERE id = ${id}`;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid category ID", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Get category statistics (transaction count and total amount)
 */
export async function getCategoryStats(id: string): Promise<{
  transactionCount: number;
  totalAmount: number;
}> {
  const db = getDb();

  try {
    // Validate category ID
    CategoryIdSchema.parse({ id });

    // Check if category exists
    const existingCategory = await getCategoryById(id);
    if (!existingCategory) {
      throw new Error("Category not found");
    }

    // Get transaction count and total amount for this category
    const statsResult = await db<{ count: number; total: number }[]>`
      SELECT
        COUNT(*)::int as count,
        COALESCE(SUM(amount_idr), 0)::numeric as total
      FROM transactions
      WHERE category_id = ${id} AND deleted_at IS NULL
    `;

    const stats = statsResult[0] || { count: 0, total: 0 };

    return {
      transactionCount: stats.count || 0,
      totalAmount: Number(stats.total) || 0,
    };
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid category ID", formatZodError(error));
    }
    throw error;
  }
}
