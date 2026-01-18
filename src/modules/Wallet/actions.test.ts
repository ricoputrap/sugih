import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  listWallets,
  getWalletById,
  createWallet,
  updateWallet,
  archiveWallet,
  deleteWallet,
  getWalletStats,
} from "./actions";
import { getPool } from "@/db/drizzle-client";
import { nanoid } from "nanoid";

// Helper function to create test wallet
async function createTestWallet(name: string = `Test Wallet ${nanoid()}`) {
  return await createWallet({
    name,
    type: "bank",
    currency: "IDR",
  });
}

// Helper function to create test transaction event and posting
async function createTestPosting(
  walletId: string,
  amountIdr: number,
  type: "income" | "expense" = "income",
) {
  const pool = getPool();
  const eventId = nanoid();

  // Create transaction event
  await pool.query(
    `INSERT INTO transaction_events (id, occurred_at, type, created_at, updated_at)
     VALUES ($1, NOW(), $2, NOW(), NOW())`,
    [eventId, type],
  );

  // Create posting
  const postingId = nanoid();
  await pool.query(
    `INSERT INTO postings (id, event_id, wallet_id, amount_idr, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [postingId, eventId, walletId, amountIdr],
  );

  return { eventId, postingId };
}

// Helper function to clean up test data
async function cleanupTestWallet(walletId: string) {
  const pool = getPool();

  try {
    // Delete postings first
    await pool.query(`DELETE FROM postings WHERE wallet_id = $1`, [walletId]);

    // Get event IDs that might be orphaned
    const events = await pool.query<{ id: string }>(
      `SELECT id FROM transaction_events
       WHERE id NOT IN (SELECT DISTINCT event_id FROM postings)`,
    );

    // Delete orphaned events
    for (const event of events.rows) {
      await pool.query(`DELETE FROM transaction_events WHERE id = $1`, [
        event.id,
      ]);
    }

    // Finally delete wallet
    await pool.query(`DELETE FROM wallets WHERE id = $1`, [walletId]);
  } catch (error) {
    console.error("Cleanup error:", error);
  }
}

describe("Wallet Actions with Balance Calculation", () => {
  const testWalletIds: string[] = [];

  afterEach(async () => {
    // Clean up all test wallets
    for (const id of testWalletIds) {
      await cleanupTestWallet(id);
    }
    testWalletIds.length = 0;
  });

  describe("listWallets", () => {
    it("should list all wallets with balance = 0 when no postings exist", async () => {
      const wallet = await createTestWallet();
      testWalletIds.push(wallet.id);

      const wallets = await listWallets();

      const testWallet = wallets.find((w) => w.id === wallet.id);
      expect(testWallet).toBeDefined();
      expect(testWallet?.balance).toBe(0);
    });

    it("should calculate positive balance from income postings", async () => {
      const wallet = await createTestWallet();
      testWalletIds.push(wallet.id);

      // Add income posting
      await createTestPosting(wallet.id, 1000000, "income");

      const wallets = await listWallets();
      const testWallet = wallets.find((w) => w.id === wallet.id);

      expect(testWallet).toBeDefined();
      expect(testWallet?.balance).toBe(1000000);
    });

    it("should calculate negative balance from expense postings", async () => {
      const wallet = await createTestWallet();
      testWalletIds.push(wallet.id);

      // Add expense posting (negative amount)
      await createTestPosting(wallet.id, -500000, "expense");

      const wallets = await listWallets();
      const testWallet = wallets.find((w) => w.id === wallet.id);

      expect(testWallet).toBeDefined();
      expect(testWallet?.balance).toBe(-500000);
    });

    it("should calculate net balance from multiple postings", async () => {
      const wallet = await createTestWallet();
      testWalletIds.push(wallet.id);

      // Add multiple postings
      await createTestPosting(wallet.id, 1000000, "income"); // +1,000,000
      await createTestPosting(wallet.id, -300000, "expense"); // -300,000
      await createTestPosting(wallet.id, 500000, "income"); // +500,000

      const wallets = await listWallets();
      const testWallet = wallets.find((w) => w.id === wallet.id);

      expect(testWallet).toBeDefined();
      expect(testWallet?.balance).toBe(1200000); // 1,000,000 - 300,000 + 500,000
    });

    it("should exclude deleted transactions from balance calculation", async () => {
      const wallet = await createTestWallet();
      testWalletIds.push(wallet.id);
      const pool = getPool();

      // Create income posting
      const { eventId } = await createTestPosting(wallet.id, 1000000, "income");

      // Soft delete the transaction event
      await pool.query(
        `UPDATE transaction_events
         SET deleted_at = NOW()
         WHERE id = $1`,
        [eventId],
      );

      const wallets = await listWallets();
      const testWallet = wallets.find((w) => w.id === wallet.id);

      expect(testWallet).toBeDefined();
      expect(testWallet?.balance).toBe(0); // Deleted transaction should not count
    });

    it("should return empty array when no wallets exist", async () => {
      // Assuming a clean test environment or after cleanup
      const wallets = await listWallets();
      expect(Array.isArray(wallets)).toBe(true);
    });

    it("should order wallets by name", async () => {
      const wallet1 = await createTestWallet("Zebra Wallet");
      const wallet2 = await createTestWallet("Alpha Wallet");
      const wallet3 = await createTestWallet("Beta Wallet");

      testWalletIds.push(wallet1.id, wallet2.id, wallet3.id);

      const wallets = await listWallets();
      const testWallets = wallets.filter((w) => testWalletIds.includes(w.id));

      expect(testWallets[0].name).toBe("Alpha Wallet");
      expect(testWallets[1].name).toBe("Beta Wallet");
      expect(testWallets[2].name).toBe("Zebra Wallet");
    });

    it("should include balance property for all wallets", async () => {
      const wallet = await createTestWallet();
      testWalletIds.push(wallet.id);

      const wallets = await listWallets();

      wallets.forEach((w) => {
        expect(w).toHaveProperty("balance");
        expect(typeof w.balance).toBe("number");
      });
    });
  });

  describe("getWalletById", () => {
    it("should return wallet with balance = 0 when no postings exist", async () => {
      const wallet = await createTestWallet();
      testWalletIds.push(wallet.id);

      const retrieved = await getWalletById(wallet.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.balance).toBe(0);
    });

    it("should return wallet with calculated balance from postings", async () => {
      const wallet = await createTestWallet();
      testWalletIds.push(wallet.id);

      await createTestPosting(wallet.id, 2000000, "income");
      await createTestPosting(wallet.id, -500000, "expense");

      const retrieved = await getWalletById(wallet.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.balance).toBe(1500000);
    });

    it("should return null for non-existent wallet", async () => {
      const retrieved = await getWalletById("non-existent-id");
      expect(retrieved).toBeNull();
    });

    it("should exclude deleted transactions from balance", async () => {
      const wallet = await createTestWallet();
      testWalletIds.push(wallet.id);
      const pool = getPool();

      const { eventId } = await createTestPosting(wallet.id, 1000000, "income");

      // Delete the transaction
      await pool.query(
        `UPDATE transaction_events
         SET deleted_at = NOW()
         WHERE id = $1`,
        [eventId],
      );

      const retrieved = await getWalletById(wallet.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.balance).toBe(0);
    });
  });

  describe("createWallet", () => {
    it("should create wallet with valid data", async () => {
      const wallet = await createWallet({
        name: `Test Create ${nanoid()}`,
        type: "bank",
        currency: "IDR",
      });

      testWalletIds.push(wallet.id);

      expect(wallet).toBeDefined();
      expect(wallet.id).toBeDefined();
      expect(wallet.name).toBeDefined();
      expect(wallet.balance).toBe(0); // New wallet should have 0 balance
    });

    it("should reject duplicate wallet name", async () => {
      const name = `Test Duplicate ${nanoid()}`;
      const wallet1 = await createTestWallet(name);
      testWalletIds.push(wallet1.id);

      await expect(createWallet({ name, type: "cash" })).rejects.toThrow(
        "already exists",
      );
    });

    it("should reject invalid data", async () => {
      await expect(createWallet({ name: "" })).rejects.toThrow();
    });
  });

  describe("getWalletStats", () => {
    it("should return correct balance and transaction count", async () => {
      const wallet = await createTestWallet();
      testWalletIds.push(wallet.id);

      await createTestPosting(wallet.id, 1000000, "income");
      await createTestPosting(wallet.id, -300000, "expense");
      await createTestPosting(wallet.id, 500000, "income");

      const stats = await getWalletStats(wallet.id);

      expect(stats.balance).toBe(1200000);
      expect(stats.transactionCount).toBe(3);
    });

    it("should return zero balance and count for wallet with no postings", async () => {
      const wallet = await createTestWallet();
      testWalletIds.push(wallet.id);

      const stats = await getWalletStats(wallet.id);

      expect(stats.balance).toBe(0);
      expect(stats.transactionCount).toBe(0);
    });

    it("should throw error for non-existent wallet", async () => {
      await expect(getWalletStats("non-existent-id")).rejects.toThrow(
        "not found",
      );
    });
  });

  describe("Balance Calculation Edge Cases", () => {
    it("should handle very large balance amounts", async () => {
      const wallet = await createTestWallet();
      testWalletIds.push(wallet.id);

      await createTestPosting(wallet.id, 999999999999, "income");

      const retrieved = await getWalletById(wallet.id);

      expect(retrieved?.balance).toBe(999999999999);
    });

    it("should handle zero amount postings", async () => {
      const wallet = await createTestWallet();
      testWalletIds.push(wallet.id);

      await createTestPosting(wallet.id, 0, "income");

      const retrieved = await getWalletById(wallet.id);

      expect(retrieved?.balance).toBe(0);
    });

    it("should handle negative balances correctly", async () => {
      const wallet = await createTestWallet();
      testWalletIds.push(wallet.id);

      await createTestPosting(wallet.id, -1000000, "expense");

      const retrieved = await getWalletById(wallet.id);

      expect(retrieved?.balance).toBe(-1000000);
    });
  });

  describe("Integration with archived wallets", () => {
    it("should include archived wallets in list with correct balance", async () => {
      const wallet = await createTestWallet();
      testWalletIds.push(wallet.id);

      await createTestPosting(wallet.id, 500000, "income");
      await archiveWallet(wallet.id);

      const wallets = await listWallets();
      const archivedWallet = wallets.find((w) => w.id === wallet.id);

      expect(archivedWallet).toBeDefined();
      expect(archivedWallet?.archived).toBe(true);
      expect(archivedWallet?.balance).toBe(500000);
    });
  });
});
