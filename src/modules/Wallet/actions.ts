import { nanoid } from "nanoid";
import {
  WalletCreateSchema,
  WalletUpdateSchema,
  WalletIdSchema,
  Wallet,
} from "./schema";
import { getDb } from "@/db/client";
import {
  convertPlaceholders,
  executeQuery,
  executeQueryOne,
} from "@/db/helpers";
import { formatZodError } from "@/lib/zod";
import { unprocessableEntity } from "@/lib/http";

/**
 * List all wallets ordered by name with calculated balances
 */
export async function listWallets(): Promise<(Wallet & { balance: number })[]> {
  const db = getDb();
  const wallets = await db<Wallet[]>`
    SELECT id, name, type, currency, archived, created_at, updated_at
    FROM wallets
    ORDER BY name ASC
  `;

  // Calculate balance for each wallet from postings
  const walletsWithBalance = await Promise.all(
    wallets.map(async (wallet) => {
      const balanceResult = await db<{ total: string | null }[]>`
        SELECT COALESCE(SUM(amount_idr), 0)::numeric as total
        FROM postings p
        JOIN transaction_events te ON p.event_id = te.id
        WHERE p.wallet_id = ${wallet.id} AND te.deleted_at IS NULL
      `;

      const balance = Number(balanceResult[0]?.total) || 0;

      return {
        ...wallet,
        balance,
      };
    }),
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
  const wallets = await db<Wallet[]>`
    SELECT id, name, type, currency, archived, created_at, updated_at
    FROM wallets
    WHERE id = ${id}
  `;

  if (!wallets[0]) {
    return null;
  }

  const wallet = wallets[0];

  // Calculate balance from postings
  const balanceResult = await db<{ total: string | null }[]>`
    SELECT COALESCE(SUM(amount_idr), 0)::numeric as total
    FROM postings p
    JOIN transaction_events te ON p.event_id = te.id
    WHERE p.wallet_id = ${id} AND te.deleted_at IS NULL
  `;

  const balance = Number(balanceResult[0]?.total) || 0;

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
    const existingWallets = await db<{ id: string }[]>`
      SELECT id FROM wallets WHERE name = ${validatedInput.name}
    `;

    if (existingWallets.length > 0) {
      throw new Error("Wallet name already exists");
    }

    // Insert wallet with PostgreSQL timestamp
    const now = new Date();
    await db`
      INSERT INTO wallets (id, name, type, currency, archived, created_at, updated_at)
      VALUES (
        ${id},
        ${validatedInput.name},
        ${validatedInput.type},
        ${validatedInput.currency},
        ${false},
        ${now},
        ${now}
      )
    `;

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
      const nameConflicts = await db<{ id: string }[]>`
        SELECT id FROM wallets WHERE name = ${validatedInput.name} AND id != ${id}
      `;

      if (nameConflicts.length > 0) {
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
      await db`
        UPDATE wallets
        SET name = ${updates.name}, type = ${updates.type}, archived = ${updates.archived}, updated_at = ${now}
        WHERE id = ${id}
      `;
    } else if (updates.name !== undefined && updates.type !== undefined) {
      await db`
        UPDATE wallets
        SET name = ${updates.name}, type = ${updates.type}, updated_at = ${now}
        WHERE id = ${id}
      `;
    } else if (updates.name !== undefined && updates.archived !== undefined) {
      await db`
        UPDATE wallets
        SET name = ${updates.name}, archived = ${updates.archived}, updated_at = ${now}
        WHERE id = ${id}
      `;
    } else if (updates.type !== undefined && updates.archived !== undefined) {
      await db`
        UPDATE wallets
        SET type = ${updates.type}, archived = ${updates.archived}, updated_at = ${now}
        WHERE id = ${id}
      `;
    } else if (updates.name !== undefined) {
      await db`
        UPDATE wallets
        SET name = ${updates.name}, updated_at = ${now}
        WHERE id = ${id}
      `;
    } else if (updates.type !== undefined) {
      await db`
        UPDATE wallets
        SET type = ${updates.type}, updated_at = ${now}
        WHERE id = ${id}
      `;
    } else if (updates.archived !== undefined) {
      await db`
        UPDATE wallets
        SET archived = ${updates.archived}, updated_at = ${now}
        WHERE id = ${id}
      `;
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
    await db`
      UPDATE wallets
      SET archived = ${true}, updated_at = ${now}
      WHERE id = ${id}
    `;

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
    await db`
      UPDATE wallets
      SET archived = ${false}, updated_at = ${now}
      WHERE id = ${id}
    `;

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
    await db.begin(async (tx) => {
      // Check if wallet has any associated postings
      const postingsCount = await tx<{ count: number }[]>`
        SELECT COUNT(*)::int as count FROM postings WHERE wallet_id = ${id}
      `;

      if (postingsCount[0] && postingsCount[0].count > 0) {
        throw new Error("Cannot delete wallet with existing transactions");
      }

      // Delete wallet
      await tx`DELETE FROM wallets WHERE id = ${id}`;
    });
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

    // Get balance (sum of all non-deleted postings for this wallet)
    const balanceResult = await db<{ total: number }[]>`
      SELECT COALESCE(SUM(amount_idr), 0)::numeric as total
      FROM postings p
      JOIN transaction_events te ON p.event_id = te.id
      WHERE p.wallet_id = ${id} AND te.deleted_at IS NULL
    `;

    // Get transaction count
    const transactionCountResult = await db<{ count: number }[]>`
      SELECT COUNT(*)::int as count
      FROM postings p
      JOIN transaction_events te ON p.event_id = te.id
      WHERE p.wallet_id = ${id} AND te.deleted_at IS NULL
    `;

    return {
      balance: Number(balanceResult[0]?.total) || 0,
      transactionCount: transactionCountResult[0]?.count || 0,
    };
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid wallet ID", formatZodError(error));
    }
    throw error;
  }
}
