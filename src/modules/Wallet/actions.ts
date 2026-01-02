import { nanoid } from "nanoid";
import {
  WalletCreateSchema,
  WalletUpdateSchema,
  WalletIdSchema,
  Wallet,
} from "./schema";
import { get, all, run, transaction } from "@/db/client";
import { formatZodError } from "@/lib/zod";
import { unprocessableEntity } from "@/lib/http";

export async function listWallets(): Promise<Wallet[]> {
  const wallets = all<Wallet>(
    `SELECT id, name, type, currency, archived, created_at, updated_at
     FROM wallets
     ORDER BY name ASC`,
  );
  return wallets;
}

export async function getWalletById(id: string): Promise<Wallet | null> {
  const wallet = get<Wallet>(
    `SELECT id, name, type, currency, archived, created_at, updated_at
     FROM wallets
     WHERE id = ?`,
    [id],
  );
  return wallet || null;
}

export async function createWallet(input: unknown): Promise<Wallet> {
  try {
    const validatedInput = WalletCreateSchema.parse(input);

    // Generate ID
    const id = nanoid();

    // Check if wallet name already exists
    const existingWallet = get(`SELECT id FROM wallets WHERE name = ?`, [
      validatedInput.name,
    ]);

    if (existingWallet) {
      throw new Error("Wallet name already exists");
    }

    // Insert wallet
    run(
      `INSERT INTO wallets (id, name, type, currency, archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, false, ?, ?)`,
      [
        id,
        validatedInput.name,
        validatedInput.type,
        validatedInput.currency,
        Date.now(),
        Date.now(),
      ],
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

export async function updateWallet(
  id: string,
  input: unknown,
): Promise<Wallet> {
  try {
    const validatedInput = WalletUpdateSchema.parse(input);

    // Validate wallet ID
    WalletIdSchema.parse({ id });

    // Check if wallet exists
    const existingWallet = await getWalletById(id);
    if (!existingWallet) {
      throw new Error("Wallet not found");
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    if (validatedInput.name !== undefined) {
      // Check if new name conflicts with another wallet
      const nameConflict = get(
        `SELECT id FROM wallets WHERE name = ? AND id != ?`,
        [validatedInput.name, id],
      );

      if (nameConflict) {
        throw new Error("Wallet name already exists");
      }

      updates.push("name = ?");
      values.push(validatedInput.name);
    }

    if (validatedInput.type !== undefined) {
      updates.push("type = ?");
      values.push(validatedInput.type);
    }

    if (validatedInput.archived !== undefined) {
      updates.push("archived = ?");
      values.push(validatedInput.archived ? 1 : 0);
    }

    if (updates.length === 0) {
      throw new Error("No updates provided");
    }

    updates.push("updated_at = ?");
    values.push(Date.now());
    values.push(id);

    // Execute update
    run(`UPDATE wallets SET ${updates.join(", ")} WHERE id = ?`, values);

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

export async function archiveWallet(id: string): Promise<Wallet> {
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
    run(
      `UPDATE wallets
       SET archived = true, updated_at = ?
       WHERE id = ?`,
      [Date.now(), id],
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

export async function restoreWallet(id: string): Promise<Wallet> {
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
    run(
      `UPDATE wallets
       SET archived = false, updated_at = ?
       WHERE id = ?`,
      [Date.now(), id],
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

export async function deleteWallet(id: string): Promise<void> {
  try {
    // Validate wallet ID
    WalletIdSchema.parse({ id });

    // Check if wallet exists
    const existingWallet = await getWalletById(id);
    if (!existingWallet) {
      throw new Error("Wallet not found");
    }

    // Use transaction to ensure atomicity
    transaction(() => {
      // Check if wallet has any associated postings
      const postingsCount = get<{ count: number }>(
        `SELECT COUNT(*) as count FROM postings WHERE wallet_id = ?`,
        [id],
      );

      if (postingsCount && postingsCount.count > 0) {
        throw new Error("Cannot delete wallet with existing transactions");
      }

      // Delete wallet
      run(`DELETE FROM wallets WHERE id = ?`, [id]);
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid wallet ID", formatZodError(error));
    }
    throw error;
  }
}

export async function getWalletStats(id: string): Promise<{
  balance: number;
  transactionCount: number;
}> {
  try {
    // Validate wallet ID
    WalletIdSchema.parse({ id });

    // Check if wallet exists
    const existingWallet = await getWalletById(id);
    if (!existingWallet) {
      throw new Error("Wallet not found");
    }

    // Get balance (sum of all non-deleted postings for this wallet)
    const balanceResult = get<{ total: number }>(
      `SELECT COALESCE(SUM(amount_idr), 0) as total
       FROM postings p
       JOIN transaction_events te ON p.event_id = te.id
       WHERE p.wallet_id = ? AND te.deleted_at IS NULL`,
      [id],
    );

    // Get transaction count
    const transactionCountResult = get<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM postings p
       JOIN transaction_events te ON p.event_id = te.id
       WHERE p.wallet_id = ? AND te.deleted_at IS NULL`,
      [id],
    );

    return {
      balance: balanceResult?.total || 0,
      transactionCount: transactionCountResult?.count || 0,
    };
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid wallet ID", formatZodError(error));
    }
    throw error;
  }
}
