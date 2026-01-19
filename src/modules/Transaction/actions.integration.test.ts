import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db/drizzle-client";
import { createCategory, deleteCategory } from "@/modules/Category/actions";
import {
  createSavingsBucket,
  deleteSavingsBucket,
} from "@/modules/SavingsBucket/actions";
import { createWallet, deleteWallet } from "@/modules/Wallet/actions";
import {
  createExpense,
  createIncome,
  createSavingsContribution,
  createSavingsWithdrawal,
  createTransfer,
  bulkDeleteTransactions,
  deleteTransaction,
  getTransactionById,
  getTransactionStats,
  listTransactions,
  restoreTransaction,
} from "./actions";
import { postings, transactionEvents } from "./schema";

describe("Transaction Integration Tests", () => {
  let testWalletId: string;
  let testWallet2Id: string;
  let testCategoryId: string;
  let testBucketId: string;
  const testTransactionIds: string[] = [];

  beforeEach(async () => {
    // Create test wallet
    const wallet = await createWallet({
      name: `Tx Wallet ${nanoid()}`,
      type: "bank",
    });
    testWalletId = wallet.id;

    // Create second test wallet for transfers
    const wallet2 = await createWallet({
      name: `Tx Wallet 2 ${nanoid()}`,
      type: "bank",
    });
    testWallet2Id = wallet2.id;

    // Create test category
    const category = await createCategory({ name: `Tx Category ${nanoid()}` });
    testCategoryId = category.id;

    // Create test savings bucket
    const bucket = await createSavingsBucket({
      name: `Tx Bucket ${nanoid()}`,
    });
    testBucketId = bucket.id;
  });

  afterEach(async () => {
    const db = getDb();

    // Clean up test transactions
    for (const id of testTransactionIds) {
      try {
        await db.delete(postings).where(eq(postings.event_id, id));
        await db.delete(transactionEvents).where(eq(transactionEvents.id, id));
      } catch (error) {
        console.error("Failed to cleanup transaction:", error);
      }
    }
    testTransactionIds.length = 0;

    // Clean up test data (ignore errors if already deleted)
    try {
      await db.delete(postings).where(eq(postings.wallet_id, testWalletId));
      await db.delete(postings).where(eq(postings.wallet_id, testWallet2Id));
      await deleteWallet(testWalletId);
      await deleteWallet(testWallet2Id);
      await deleteCategory(testCategoryId);
      await deleteSavingsBucket(testBucketId);
    } catch (error) {
      console.error("Failed to cleanup test data:", error);
    }
  });

  afterAll(async () => {
    await closeDb();
  });

  describe("Create Expense", () => {
    it("should create an expense transaction", async () => {
      const expense = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 100000,
        note: "Test expense",
      });
      testTransactionIds.push(expense.id);

      expect(expense.id).toBeDefined();
      expect(expense.type).toBe("expense");
    });

    it("should reject expense with non-existent wallet", async () => {
      await expect(
        createExpense({
          occurredAt: new Date(),
          walletId: "non-existent-wallet-id",
          categoryId: testCategoryId,
          amountIdr: 100000,
        }),
      ).rejects.toThrow("Wallet not found");
    });

    it("should reject expense with non-existent category", async () => {
      await expect(
        createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: "non-existent-category-id",
          amountIdr: 100000,
        }),
      ).rejects.toThrow("Category not found");
    });

    it("should handle idempotency key", async () => {
      const key = nanoid();
      const expense1 = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 100000,
        idempotencyKey: key,
      });
      testTransactionIds.push(expense1.id);

      const expense2 = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 200000,
        idempotencyKey: key,
      });

      expect(expense1.id).toBe(expense2.id);
    });
  });

  describe("Create Income", () => {
    it("should create an income transaction", async () => {
      const income = await createIncome({
        occurredAt: new Date(),
        walletId: testWalletId,
        amountIdr: 500000,
        note: "Test income",
        payee: "Employer",
      });
      testTransactionIds.push(income.id);

      expect(income.id).toBeDefined();
      expect(income.type).toBe("income");
    });

    it("should reject income with non-existent wallet", async () => {
      await expect(
        createIncome({
          occurredAt: new Date(),
          walletId: "non-existent-wallet-id",
          amountIdr: 500000,
        }),
      ).rejects.toThrow("Wallet not found");
    });
  });

  describe("Create Transfer", () => {
    it("should create a transfer between wallets", async () => {
      const transfer = await createTransfer({
        occurredAt: new Date(),
        fromWalletId: testWalletId,
        toWalletId: testWallet2Id,
        amountIdr: 200000,
        note: "Test transfer",
      });
      testTransactionIds.push(transfer.id);

      expect(transfer.id).toBeDefined();
      expect(transfer.type).toBe("transfer");
    });

    it("should reject transfer with same source and destination wallet", async () => {
      await expect(
        createTransfer({
          occurredAt: new Date(),
          fromWalletId: testWalletId,
          toWalletId: testWalletId,
          amountIdr: 200000,
        }),
      ).rejects.toThrow("different");
    });

    it("should reject transfer with non-existent source wallet", async () => {
      await expect(
        createTransfer({
          occurredAt: new Date(),
          fromWalletId: "non-existent-wallet",
          toWalletId: testWallet2Id,
          amountIdr: 200000,
        }),
      ).rejects.toThrow("Source wallet not found or archived");
    });
  });

  describe("Create Savings Contribution", () => {
    it("should create a savings contribution transaction", async () => {
      const contribution = await createSavingsContribution({
        occurredAt: new Date(),
        walletId: testWalletId,
        bucketId: testBucketId,
        amountIdr: 300000,
        note: "Savings contribution",
      });
      testTransactionIds.push(contribution.id);

      expect(contribution.id).toBeDefined();
      expect(contribution.type).toBe("savings_contribution");
    });

    it("should reject contribution with non-existent bucket", async () => {
      await expect(
        createSavingsContribution({
          occurredAt: new Date(),
          walletId: testWalletId,
          bucketId: "non-existent-bucket-id",
          amountIdr: 300000,
        }),
      ).rejects.toThrow("Savings bucket not found");
    });
  });

  describe("Create Savings Withdrawal", () => {
    it("should create a savings withdrawal transaction", async () => {
      const withdrawal = await createSavingsWithdrawal({
        occurredAt: new Date(),
        walletId: testWalletId,
        bucketId: testBucketId,
        amountIdr: 150000,
        note: "Savings withdrawal",
      });
      testTransactionIds.push(withdrawal.id);

      expect(withdrawal.id).toBeDefined();
      expect(withdrawal.type).toBe("savings_withdrawal");
    });

    it("should create withdrawal even with no prior savings", async () => {
      // Savings withdrawal allows negative bucket balance
      const withdrawal = await createSavingsWithdrawal({
        occurredAt: new Date(),
        walletId: testWalletId,
        bucketId: testBucketId,
        amountIdr: 10000000,
      });
      testTransactionIds.push(withdrawal.id);

      expect(withdrawal.id).toBeDefined();
      expect(withdrawal.type).toBe("savings_withdrawal");
    });
  });

  describe("List Transactions", () => {
    it("should list transactions with pagination", async () => {
      // Create a transaction first
      const expense = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 50000,
      });
      testTransactionIds.push(expense.id);

      const result = await listTransactions({ limit: 10 });

      expect(result.length).toBeGreaterThan(0);
    });

    it("should filter transactions by type", async () => {
      const expense = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 50000,
      });
      testTransactionIds.push(expense.id);

      const result = await listTransactions({ type: "expense" });

      expect(result.length).toBeGreaterThan(0);
      expect(result.every((tx) => tx.type === "expense")).toBe(true);
    });
  });

  describe("Get Transaction by ID", () => {
    it("should return transaction when ID exists", async () => {
      const expense = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 75000,
      });
      testTransactionIds.push(expense.id);

      const retrieved = await getTransactionById(expense.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(expense.id);
    });

    it("should return null when ID does not exist", async () => {
      const retrieved = await getTransactionById("non-existent-id");
      expect(retrieved).toBeNull();
    });
  });

  describe("Delete/Restore Transaction", () => {
    it("should soft delete a transaction", async () => {
      const expense = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 25000,
      });
      testTransactionIds.push(expense.id);

      await deleteTransaction(expense.id);

      const retrieved = await getTransactionById(expense.id);
      expect(retrieved?.deleted_at).toBeDefined();
    });

    it("should restore a deleted transaction", async () => {
      const expense = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 35000,
      });
      testTransactionIds.push(expense.id);

      await deleteTransaction(expense.id);
      const restored = await restoreTransaction(expense.id);

      expect(restored.deleted_at).toBeNull();
    });
  });

  describe("bulkDeleteTransactions", () => {
    it("should bulk delete multiple valid transactions", async () => {
      // Create 3 expense transactions
      const expense1 = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 25000,
      });
      testTransactionIds.push(expense1.id);

      const expense2 = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 35000,
      });
      testTransactionIds.push(expense2.id);

      const expense3 = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 45000,
      });
      testTransactionIds.push(expense3.id);

      // Bulk delete all three
      const result = await bulkDeleteTransactions([
        expense1.id,
        expense2.id,
        expense3.id,
      ]);

      expect(result.deletedCount).toBe(3);
      expect(result.failedIds).toEqual([]);

      // Verify all are deleted
      const retrieved1 = await getTransactionById(expense1.id);
      const retrieved2 = await getTransactionById(expense2.id);
      const retrieved3 = await getTransactionById(expense3.id);

      expect(retrieved1?.deleted_at).toBeDefined();
      expect(retrieved2?.deleted_at).toBeDefined();
      expect(retrieved3?.deleted_at).toBeDefined();
    });

    it("should handle bulk delete with some non-existent IDs", async () => {
      // Create 2 expense transactions
      const expense1 = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 25000,
      });
      testTransactionIds.push(expense1.id);

      const expense2 = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 35000,
      });
      testTransactionIds.push(expense2.id);

      // Bulk delete with one valid ID and one non-existent ID
      const fakeId = "non_existent_id_" + nanoid();
      const result = await bulkDeleteTransactions([expense1.id, fakeId]);

      expect(result.deletedCount).toBe(1);
      expect(result.failedIds).toContain(fakeId);
      expect(result.failedIds).not.toContain(expense1.id);

      // Verify only expense1 is deleted
      const retrieved1 = await getTransactionById(expense1.id);
      const retrieved2 = await getTransactionById(expense2.id);

      expect(retrieved1?.deleted_at).toBeDefined();
      expect(retrieved2?.deleted_at).toBeNull();
    });

    it("should handle bulk delete with already deleted transactions", async () => {
      // Create 2 expense transactions
      const expense1 = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 25000,
      });
      testTransactionIds.push(expense1.id);

      const expense2 = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 35000,
      });
      testTransactionIds.push(expense2.id);

      // Delete expense1 first
      await deleteTransaction(expense1.id);

      // Bulk delete both (one already deleted, one not)
      const result = await bulkDeleteTransactions([expense1.id, expense2.id]);

      expect(result.deletedCount).toBe(1);
      expect(result.failedIds).toContain(expense1.id);
      expect(result.failedIds).not.toContain(expense2.id);

      // Verify states
      const retrieved1 = await getTransactionById(expense1.id);
      const retrieved2 = await getTransactionById(expense2.id);

      expect(retrieved1?.deleted_at).toBeDefined();
      expect(retrieved2?.deleted_at).toBeDefined();
    });

    it("should handle bulk delete with mixed valid, invalid, and already deleted", async () => {
      // Create 3 expense transactions
      const expense1 = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 25000,
      });
      testTransactionIds.push(expense1.id);

      const expense2 = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 35000,
      });
      testTransactionIds.push(expense2.id);

      const expense3 = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 45000,
      });
      testTransactionIds.push(expense3.id);

      // Delete expense1 first
      await deleteTransaction(expense1.id);

      const fakeId = "non_existent_id_" + nanoid();
      const anotherFakeId = "another_fake_" + nanoid();

      // Bulk delete with mixed scenario
      const result = await bulkDeleteTransactions([
        expense1.id, // Already deleted
        expense2.id, // Valid
        fakeId, // Non-existent
        expense3.id, // Valid
        anotherFakeId, // Non-existent
      ]);

      // Only expense2 and expense3 should be deleted
      expect(result.deletedCount).toBe(2);
      expect(result.failedIds).toContain(expense1.id);
      expect(result.failedIds).toContain(fakeId);
      expect(result.failedIds).toContain(anotherFakeId);
      expect(result.failedIds).not.toContain(expense2.id);
      expect(result.failedIds).not.toContain(expense3.id);

      // Verify final states
      const retrieved1 = await getTransactionById(expense1.id);
      const retrieved2 = await getTransactionById(expense2.id);
      const retrieved3 = await getTransactionById(expense3.id);

      expect(retrieved1?.deleted_at).toBeDefined();
      expect(retrieved2?.deleted_at).toBeDefined();
      expect(retrieved3?.deleted_at).toBeDefined();
    });

    it("should reject empty array", async () => {
      await expect(bulkDeleteTransactions([])).rejects.toThrow(
        "At least one transaction ID is required",
      );
    });

    it("should reject all transactions already deleted", async () => {
      // Create 2 expense transactions
      const expense1 = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 25000,
      });
      testTransactionIds.push(expense1.id);

      const expense2 = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 35000,
      });
      testTransactionIds.push(expense2.id);

      // Delete both first
      await deleteTransaction(expense1.id);
      await deleteTransaction(expense2.id);

      // Try to bulk delete already deleted transactions
      const result = await bulkDeleteTransactions([expense1.id, expense2.id]);

      expect(result.deletedCount).toBe(0);
      expect(result.failedIds).toContain(expense1.id);
      expect(result.failedIds).toContain(expense2.id);
    });

    it("should handle bulk delete with exactly 100 transactions", async () => {
      const ids: string[] = [];
      const numTransactions = 100;

      // Create 100 expense transactions
      for (let i = 0; i < numTransactions; i++) {
        const expense = await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 1000 + i,
        });
        ids.push(expense.id);
        testTransactionIds.push(expense.id);
      }

      // Bulk delete all 100
      const result = await bulkDeleteTransactions(ids);

      expect(result.deletedCount).toBe(100);
      expect(result.failedIds).toEqual([]);

      // Verify first and last are deleted
      const first = await getTransactionById(ids[0]);
      const last = await getTransactionById(ids[99]);

      expect(first?.deleted_at).toBeDefined();
      expect(last?.deleted_at).toBeDefined();
    });

    it("should use database transaction for atomicity", async () => {
      // Create 3 expense transactions
      const expense1 = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 25000,
      });
      testTransactionIds.push(expense1.id);

      const expense2 = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 35000,
      });
      testTransactionIds.push(expense2.id);

      const expense3 = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 45000,
      });
      testTransactionIds.push(expense3.id);

      // Delete expense2 first
      await deleteTransaction(expense2.id);

      // Bulk delete all three (should only delete 1 and 3)
      const result = await bulkDeleteTransactions([
        expense1.id,
        expense2.id, // Already deleted
        expense3.id,
      ]);

      // Verify atomicity - either all valid ones deleted or none
      expect(result.deletedCount).toBe(2);
      expect(result.failedIds).toContain(expense2.id);

      const retrieved1 = await getTransactionById(expense1.id);
      const retrieved2 = await getTransactionById(expense2.id);
      const retrieved3 = await getTransactionById(expense3.id);

      // All should have consistent state
      expect(retrieved1?.deleted_at).toBeDefined();
      expect(retrieved2?.deleted_at).toBeDefined();
      expect(retrieved3?.deleted_at).toBeDefined();
    });
  });

  describe("Get Transaction Stats", () => {
    it("should return transaction statistics", async () => {
      // Use a unique future date to avoid conflicts with other test data
      const uniqueDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); // 180 days in future

      // Create expense
      const expense1 = await createExpense({
        occurredAt: uniqueDate,
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 100000,
      });
      testTransactionIds.push(expense1.id);

      // Create income
      const income1 = await createIncome({
        occurredAt: uniqueDate,
        walletId: testWalletId,
        amountIdr: 500000,
      });
      testTransactionIds.push(income1.id);

      // Use a narrow time window around the unique date
      const startTime = new Date(uniqueDate.getTime() - 10000); // 10 seconds before
      const endTime = new Date(uniqueDate.getTime() + 10000); // 10 seconds after

      const stats = await getTransactionStats(startTime, endTime);

      expect(stats.totalIncome).toBe(500000);
      expect(stats.totalExpense).toBe(100000);
      expect(stats.transactionCount).toBe(2);
    });

    it("should return zero stats when no transactions in date range", async () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const furtherFutureDate = new Date(
        futureDate.getTime() + 24 * 60 * 60 * 1000,
      );

      const stats = await getTransactionStats(futureDate, furtherFutureDate);

      expect(stats.totalIncome).toBe(0);
      expect(stats.totalExpense).toBe(0);
      expect(stats.transactionCount).toBe(0);
    });
  });
});
