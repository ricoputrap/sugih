import { nanoid } from "nanoid";
import {
  WalletCreateSchema,
  WalletUpdateSchema,
  WalletIdSchema,
  Wallet,
} from "./schema";
import { getDb, getPool, sql } from "@/db/drizzle-client";
import { formatZodError } from "@/lib/zod";
import { unprocessableEntity } from "@/lib/http";

/**
 * Get wallet balance from postings
 */
async function getWalletBalance(walletId: string): Promise<number> {
  const pool = getPool();

  const result = await pool.query(
    `SELECT COALESCE(SUM(p.amount_idr), 0)::numeric as total
     FROM postings p
     INNER JOIN transaction_events te ON p.event_id = te.id
     WHERE p.wallet_id = $1 AND te.deleted_at IS NULL`,
    [walletId],
  );

  return Number(result.rows[0]?.total) || 0;
}

/**
 * List all wallets ordered by name with calculated balances
 */
export async function listWallets(): Promise<(Wallet & { balance: number })[]> {
  const db = getDb();

  const result = await db.execute(
    sql`SELECT id, name, type, currency, archived, created_at, updated_at FROM wallets ORDER BY name ASC`,
  );

  const walletList: Wallet[] = result.rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    type: row.type as "cash" | "bank" | "ewallet" | "other",
    currency: row.currency as string,
    archived: row.archived as boolean,
    created_at: row.created_at as Date | null,
    updated_at: row.updated_at as Date | null,
  }));

  const walletsWithBalance = await Promise.all(
    walletList.map(async (wallet) => ({
      ...wallet,
      balance: await getWalletBalance(wallet.id),
    })),
  );

  return walletsWithBalance;
}

/**
 * Get a wallet by ID with calculated balance
 */
export async function getWalletById(
  id: string,
): Promise<(Wallet & { balance: number }) | null> {
  const db = getDb();

  const result = await db.execute(
    sql`SELECT id, name, type, currency, archived, created_at, updated_at FROM wallets WHERE id = ${id}`,
  );

  const row = result.rows[0];
  if (!row) return null;

  const wallet: Wallet = {
    id: row.id as string,
    name: row.name as string,
    type: row.type as "cash" | "bank" | "ewallet" | "other",
    currency: row.currency as string,
    archived: row.archived as boolean,
    created_at: row.created_at as Date | null,
    updated_at: row.updated_at as Date | null,
  };

  const balance = await getWalletBalance(id);

  return {
    ...wallet,
    balance,
  };
}

/**
 * Create a new wallet
 */
export async function createWallet(input: unknown): Promise<Wallet> {
  const db = getDb();

  try {
    const validatedInput = WalletCreateSchema.parse(input);

    // Generate ID
    const id = nanoid();

    // Check if wallet name already exists
    const existingResult = await db.execute(
      sql`SELECT id FROM wallets WHERE name = ${validatedInput.name}`,
    );

    if (existingResult.rows.length > 0) {
      throw new Error("Wallet name already exists");
    }

    // Insert wallet with PostgreSQL timestamp
    const now = new Date();
    await db.execute(
      sql`INSERT INTO wallets (id, name, type, currency, archived, created_at, updated_at) VALUES (${id}, ${validatedInput.name}, ${validatedInput.type}, ${validatedInput.currency}, ${false}, ${now}, ${now})`,
    );

    // Return created wallet
    const createdWallet = await getWalletById(id);
    if (!createdWallet) {
      throw new Error("Failed to retrieve created wallet");
    }

    return createdWallet;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid wallet data", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Update an existing wallet
 */
export async function updateWallet(
  id: string,
  input: unknown,
): Promise<Wallet> {
  const db = getDb();

  try {
    const validatedInput = WalletUpdateSchema.parse(input);

    // Validate wallet ID format
    WalletIdSchema.parse({ id });

    // Check if wallet exists
    const existingWallet = await getWalletById(id);
    if (!existingWallet) {
      throw new Error("Wallet not found");
    }

    // Build dynamic update - collect fields to update
    const updates: Record<string, any> = {};

    if (validatedInput.name !== undefined) {
      // Check if new name conflicts with another wallet
      const nameConflictResult = await db.execute(
        sql`SELECT id FROM wallets WHERE name = ${validatedInput.name} AND id != ${id}`,
      );

      if (nameConflictResult.rows.length > 0) {
        throw new Error("Wallet name already exists");
      }

      updates.name = validatedInput.name;
    }

    if (validatedInput.type !== undefined) {
      updates.type = validatedInput.type;
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
      updates.type !== undefined &&
      updates.archived !== undefined
    ) {
      await db.execute(
        sql`UPDATE wallets SET name = ${updates.name}, type = ${updates.type}, archived = ${updates.archived}, updated_at = ${now} WHERE id = ${id}`,
      );
    } else if (updates.name !== undefined && updates.type !== undefined) {
      await db.execute(
        sql`UPDATE wallets SET name = ${updates.name}, type = ${updates.type}, updated_at = ${now} WHERE id = ${id}`,
      );
    } else if (updates.name !== undefined && updates.archived !== undefined) {
      await db.execute(
        sql`UPDATE wallets SET name = ${updates.name}, archived = ${updates.archived}, updated_at = ${now} WHERE id = ${id}`,
      );
    } else if (updates.type !== undefined && updates.archived !== undefined) {
      await db.execute(
        sql`UPDATE wallets SET type = ${updates.type}, archived = ${updates.archived}, updated_at = ${now} WHERE id = ${id}`,
      );
    } else if (updates.name !== undefined) {
      await db.execute(
        sql`UPDATE wallets SET name = ${updates.name}, updated_at = ${now} WHERE id = ${id}`,
      );
    } else if (updates.type !== undefined) {
      await db.execute(
        sql`UPDATE wallets SET type = ${updates.type}, updated_at = ${now} WHERE id = ${id}`,
      );
    } else if (updates.archived !== undefined) {
      await db.execute(
        sql`UPDATE wallets SET archived = ${updates.archived}, updated_at = ${now} WHERE id = ${id}`,
      );
    }

    // Return updated wallet
    const updatedWallet = await getWalletById(id);
    if (!updatedWallet) {
      throw new Error("Failed to retrieve updated wallet");
    }

    return updatedWallet;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity(
        "Invalid wallet update data",
        formatZodError(error),
      );
    }
    throw error;
  }
}

/**
 * Archive a wallet (soft delete)
 */
export async function archiveWallet(id: string): Promise<Wallet> {
  const db = getDb();

  try {
    // Validate wallet ID
    WalletIdSchema.parse({ id });

    // Check if wallet exists and is not already archived
    const existingWallet = await getWalletById(id);
    if (!existingWallet) {
      throw new Error("Wallet not found");
    }

    if (existingWallet.archived) {
      throw new Error("Wallet is already archived");
    }

    // Archive wallet
    const now = new Date();
    await db.execute(
      sql`UPDATE wallets SET archived = ${true}, updated_at = ${now} WHERE id = ${id}`,
    );

    // Return archived wallet
    const archivedWallet = await getWalletById(id);
    if (!archivedWallet) {
      throw new Error("Failed to retrieve archived wallet");
    }

    return archivedWallet;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid wallet ID", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Restore an archived wallet
 */
export async function restoreWallet(id: string): Promise<Wallet> {
  const db = getDb();

  try {
    // Validate wallet ID
    WalletIdSchema.parse({ id });

    // Check if wallet exists
    const existingWallet = await getWalletById(id);
    if (!existingWallet) {
      throw new Error("Wallet not found");
    }

    if (!existingWallet.archived) {
      throw new Error("Wallet is not archived");
    }

    // Restore wallet
    const now = new Date();
    await db.execute(
      sql`UPDATE wallets SET archived = ${false}, updated_at = ${now} WHERE id = ${id}`,
    );

    // Return restored wallet
    const restoredWallet = await getWalletById(id);
    if (!restoredWallet) {
      throw new Error("Failed to retrieve restored wallet");
    }

    return restoredWallet;
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid wallet ID", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Permanently delete a wallet
 */
export async function deleteWallet(id: string): Promise<void> {
  const db = getDb();

  try {
    // Validate wallet ID
    WalletIdSchema.parse({ id });

    // Check if wallet exists
    const existingWallet = await getWalletById(id);
    if (!existingWallet) {
      throw new Error("Wallet not found");
    }

    // Use transaction to ensure atomicity
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");

      // Check if wallet has any associated postings
      const postingsCountResult = await client.query(
        `SELECT COUNT(*)::int as count FROM postings WHERE wallet_id = $1`,
        [id],
      );

      const count = Number(postingsCountResult.rows[0]?.count) || 0;
      if (count > 0) {
        throw new Error("Cannot delete wallet with existing transactions");
      }

      // Delete wallet
      await client.query(`DELETE FROM wallets WHERE id = $1`, [id]);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid wallet ID", formatZodError(error));
    }
    throw error;
  }
}

/**
 * Get wallet statistics (balance and transaction count)
 */
export async function getWalletStats(id: string): Promise<{
  balance: number;
  transactionCount: number;
}> {
  const db = getDb();

  try {
    // Validate wallet ID
    WalletIdSchema.parse({ id });

    // Check if wallet exists
    const existingWallet = await getWalletById(id);
    if (!existingWallet) {
      throw new Error("Wallet not found");
    }

    // Get balance and transaction count using pool for complex query
    const statsResult = await getPool().query(
      `SELECT
        COALESCE(SUM(p.amount_idr), 0)::numeric as balance,
        COUNT(DISTINCT te.id)::int as count
      FROM postings p
      INNER JOIN transaction_events te ON p.event_id = te.id
      WHERE p.wallet_id = $1 AND te.deleted_at IS NULL`,
      [id],
    );

    const stats = statsResult.rows[0] || { balance: 0, count: 0 };

    return {
      balance: Number(stats.balance) || 0,
      transactionCount: stats.count || 0,
    };
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid wallet ID", formatZodError(error));
    }
    throw error;
  }
}
