/**
 * SavingsBucket Actions
 *
 * Provides CRUD operations for savings buckets using PostgreSQL.
 * Handles savings bucket creation, retrieval, updating, archiving, and deletion.
 */

import { nanoid } from "nanoid";
import {
  SavingsBucketCreateSchema,
  SavingsBucketUpdateSchema,
  SavingsBucketIdSchema,
  SavingsBucket,
} from "./schema";
import { getDb, getPool, sql } from "@/db/drizzle-client";
import { formatZodError } from "@/lib/zod";
import { unprocessableEntity } from "@/lib/http";

/**
 * List all savings buckets ordered by name
 */
export async function listSavingsBuckets(): Promise<SavingsBucket[]> {
  const db = getDb();
  const result = await db.execute(
    sql`SELECT id, name, description, archived, created_at, updated_at FROM savings_buckets ORDER BY name ASC`,
  );

  return result.rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    archived: row.archived as boolean,
    created_at: row.created_at as Date | null,
    updated_at: row.updated_at as Date | null,
  })) as SavingsBucket[];
}

/**
 * Get a savings bucket by ID
 */
export async function getSavingsBucketById(
  id: string,
): Promise<SavingsBucket | null> {
  const db = getDb();
  const result = await db.execute(
    sql`SELECT id, name, description, archived, created_at, updated_at FROM savings_buckets WHERE id = ${id}`,
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    archived: row.archived as boolean,
    created_at: row.created_at as Date | null,
    updated_at: row.updated_at as Date | null,
  };
}

/**
 * Create a new savings bucket
 */
export async function createSavingsBucket(
  input: unknown,
): Promise<SavingsBucket> {
  const db = getDb();

  try {
    const validatedInput = SavingsBucketCreateSchema.parse(input);

    // Generate ID
    const id = nanoid();

    // Check if savings bucket name already exists
    const existingResult = await db.execute(
      sql`SELECT id FROM savings_buckets WHERE name = ${validatedInput.name}`,
    );

    if (existingResult.rows.length > 0) {
      throw new Error("Savings bucket name already exists");
    }

    // Insert savings bucket with PostgreSQL timestamp
    const now = new Date();
    await db.execute(
      sql`INSERT INTO savings_buckets (id, name, description, archived, created_at, updated_at) VALUES (${id}, ${validatedInput.name}, ${validatedInput.description || null}, ${false}, ${now}, ${now})`,
    );

    // Return created savings bucket
    const createdBucket = await getSavingsBucketById(id);
    if (!createdBucket) {
      throw new Error("Failed to retrieve created savings bucket");
    }

    return createdBucket;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid savings bucket data",
        formatZodError(error),
      );
    }
    throw error;
  }
}

/**
 * Update an existing savings bucket
 */
export async function updateSavingsBucket(
  id: string,
  input: unknown,
): Promise<SavingsBucket> {
  const db = getDb();

  try {
    const validatedInput = SavingsBucketUpdateSchema.parse(input);

    // Validate savings bucket ID format
    SavingsBucketIdSchema.parse({ id });

    // Check if savings bucket exists
    const existingBucket = await getSavingsBucketById(id);
    if (!existingBucket) {
      throw new Error("Savings bucket not found");
    }

    // Build dynamic update - collect fields to update
    const updates: Record<string, any> = {};

    if (validatedInput.name !== undefined) {
      // Check if new name conflicts with another savings bucket
      const nameConflictResult = await db.execute(
        sql`SELECT id FROM savings_buckets WHERE name = ${validatedInput.name} AND id != ${id}`,
      );

      if (nameConflictResult.rows.length > 0) {
        throw new Error("Savings bucket name already exists");
      }

      updates.name = validatedInput.name;
    }

    if (validatedInput.description !== undefined) {
      updates.description = validatedInput.description;
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
    if (
      updates.name !== undefined &&
      updates.description !== undefined &&
      updates.archived !== undefined
    ) {
      await db.execute(
        sql`UPDATE savings_buckets SET name = ${updates.name}, description = ${updates.description}, archived = ${updates.archived}, updated_at = ${now} WHERE id = ${id}`,
      );
    } else if (
      updates.name !== undefined &&
      updates.description !== undefined
    ) {
      await db.execute(
        sql`UPDATE savings_buckets SET name = ${updates.name}, description = ${updates.description}, updated_at = ${now} WHERE id = ${id}`,
      );
    } else if (updates.name !== undefined && updates.archived !== undefined) {
      await db.execute(
        sql`UPDATE savings_buckets SET name = ${updates.name}, archived = ${updates.archived}, updated_at = ${now} WHERE id = ${id}`,
      );
    } else if (
      updates.description !== undefined &&
      updates.archived !== undefined
    ) {
      await db.execute(
        sql`UPDATE savings_buckets SET description = ${updates.description}, archived = ${updates.archived}, updated_at = ${now} WHERE id = ${id}`,
      );
    } else if (updates.name !== undefined) {
      await db.execute(
        sql`UPDATE savings_buckets SET name = ${updates.name}, updated_at = ${now} WHERE id = ${id}`,
      );
    } else if (validatedInput.description !== undefined) {
      await db.execute(
        sql`UPDATE savings_buckets SET description = ${validatedInput.description}, updated_at = ${now} WHERE id = ${id}`,
      );
    } else if (validatedInput.archived !== undefined) {
      await db.execute(
        sql`UPDATE savings_buckets SET archived = ${validatedInput.archived}, updated_at = ${now} WHERE id = ${id}`,
      );
    }

    // Return updated savings bucket
    const updatedBucket = await getSavingsBucketById(id);
    if (!updatedBucket) {
      throw new Error("Failed to retrieve updated savings bucket");
    }

    return updatedBucket;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid savings bucket update data",
        formatZodError(error),
      );
    }
    throw error;
  }
}

/**
 * Archive a savings bucket (soft delete)
 */
export async function archiveSavingsBucket(id: string): Promise<SavingsBucket> {
  const db = getDb();

  try {
    // Validate savings bucket ID
    SavingsBucketIdSchema.parse({ id });

    // Check if savings bucket exists and is not already archived
    const existingBucket = await getSavingsBucketById(id);
    if (!existingBucket) {
      throw new Error("Savings bucket not found");
    }

    if (existingBucket.archived) {
      throw new Error("Savings bucket is already archived");
    }

    // Archive savings bucket
    const now = new Date();
    await db.execute(
      sql`UPDATE savings_buckets SET archived = ${true}, updated_at = ${now} WHERE id = ${id}`,
    );

    // Return archived savings bucket
    const archivedBucket = await getSavingsBucketById(id);
    if (!archivedBucket) {
      throw new Error("Failed to retrieve archived savings bucket");
    }

    return archivedBucket;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid savings bucket ID",
        formatZodError(error),
      );
    }
    throw error;
  }
}

/**
 * Restore an archived savings bucket
 */
export async function restoreSavingsBucket(id: string): Promise<SavingsBucket> {
  const db = getDb();

  try {
    // Validate savings bucket ID
    SavingsBucketIdSchema.parse({ id });

    // Check if savings bucket exists
    const existingBucket = await getSavingsBucketById(id);
    if (!existingBucket) {
      throw new Error("Savings bucket not found");
    }

    if (!existingBucket.archived) {
      throw new Error("Savings bucket is not archived");
    }

    // Restore savings bucket
    const now = new Date();
    await db.execute(
      sql`UPDATE savings_buckets SET archived = ${false}, updated_at = ${now} WHERE id = ${id}`,
    );

    // Return restored savings bucket
    const restoredBucket = await getSavingsBucketById(id);
    if (!restoredBucket) {
      throw new Error("Failed to retrieve restored savings bucket");
    }

    return restoredBucket;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid savings bucket ID",
        formatZodError(error),
      );
    }
    throw error;
  }
}

/**
 * Permanently delete a savings bucket
 */
export async function deleteSavingsBucket(id: string): Promise<void> {
  const db = getDb();

  try {
    // Validate savings bucket ID
    SavingsBucketIdSchema.parse({ id });

    // Check if savings bucket exists
    const existingBucket = await getSavingsBucketById(id);
    if (!existingBucket) {
      throw new Error("Savings bucket not found");
    }

    // Use transaction to ensure atomicity
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");

      // Check if savings bucket has any associated transactions
      const transactionsCountResult = await client.query(
        `SELECT COUNT(*)::int as count FROM transactions WHERE savings_bucket_id = $1`,
        [id],
      );

      const count = Number(transactionsCountResult.rows[0]?.count) || 0;
      if (count > 0) {
        throw new Error(
          "Cannot delete savings bucket with existing transactions",
        );
      }

      // Delete savings bucket
      await client.query(`DELETE FROM savings_buckets WHERE id = $1`, [id]);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid savings bucket ID",
        formatZodError(error),
      );
    }
    throw error;
  }
}

/**
 * Get savings bucket statistics (transaction count and total amount)
 */
export async function getSavingsBucketStats(id: string): Promise<{
  transactionCount: number;
  totalAmount: number;
  currentBalance: number;
}> {
  const db = getDb();

  try {
    // Validate savings bucket ID
    SavingsBucketIdSchema.parse({ id });

    // Check if savings bucket exists
    const existingBucket = await getSavingsBucketById(id);
    if (!existingBucket) {
      throw new Error("Savings bucket not found");
    }

    // Get transaction count and total amount for this savings bucket
    const statsResult = await getPool().query(
      `SELECT
        COUNT(*)::int as count,
        COALESCE(SUM(amount_idr), 0)::numeric as total
      FROM transactions
      WHERE savings_bucket_id = $1 AND deleted_at IS NULL`,
      [id],
    );

    const stats = statsResult.rows[0] || { count: 0, total: 0 };

    return {
      transactionCount: stats.count || 0,
      totalAmount: Number(stats.total) || 0,
      currentBalance: Number(stats.total) || 0,
    };
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid savings bucket ID",
        formatZodError(error),
      );
    }
    throw error;
  }
}
