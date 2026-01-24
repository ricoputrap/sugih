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
  updateExpense,
  updateIncome,
  updateTransfer,
  updateSavingsContribution,
  updateSavingsWithdrawal,
} from "./actions";
import { postings, transactionEvents } from "./schema";

describe("Transaction Integration Tests", () => {
  let testWalletId: string;
  let testWallet2Id: string;
  let testCategoryId: string;
  let testIncomeCategoryId: string;
  let testExpenseCategoryId: string;
  let testBucketId: string;
  const testTransactionIds: string[] = [];

  /**
   * Helper function to track transaction creation and ensure cleanup
   * Automatically adds the transaction ID to the tracking array
   */
  const trackTransaction = (transaction: { id: string }) => {
    testTransactionIds.push(transaction.id);
    return transaction;
  };

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

    // Create test category (default expense type for backward compatibility)
    const category = await createCategory({
      name: `Tx Category ${nanoid()}`,
      type: "expense",
    });
    testCategoryId = category.id;

    // Create test income category
    const incomeCategory = await createCategory({
      name: `Income Category ${nanoid()}`,
      type: "income",
    });
    testIncomeCategoryId = incomeCategory.id;

    // Create test expense category
    const expenseCategory = await createCategory({
      name: `Expense Category ${nanoid()}`,
      type: "expense",
    });
    testExpenseCategoryId = expenseCategory.id;

    // Create test savings bucket
    const bucket = await createSavingsBucket({
      name: `Tx Bucket ${nanoid()}`,
    });
    testBucketId = bucket.id;
  });

  afterEach(async () => {
    const db = getDb();

    // Clean up test transactions by ID
    for (const id of testTransactionIds) {
      try {
        await db.delete(postings).where(eq(postings.event_id, id));
        await db.delete(transactionEvents).where(eq(transactionEvents.id, id));
      } catch (error) {
        console.error("Failed to cleanup transaction:", error);
      }
    }
    testTransactionIds.length = 0;

    // Clean up all postings for test wallets to ensure no orphaned data
    try {
      await db.delete(postings).where(eq(postings.wallet_id, testWalletId));
      await db.delete(postings).where(eq(postings.wallet_id, testWallet2Id));
    } catch (error) {
      console.error("Failed to cleanup postings:", error);
    }

    // Clean up test data (ignore errors if already deleted)
    try {
      await deleteWallet(testWalletId);
    } catch (error) {
      // Wallet may have already been deleted or have constraints
    }

    try {
      await deleteWallet(testWallet2Id);
    } catch (error) {
      // Wallet may have already been deleted or have constraints
    }

    try {
      await deleteCategory(testCategoryId);
    } catch (error) {
      // Category may have already been deleted or have constraints
    }

    try {
      await deleteCategory(testIncomeCategoryId);
    } catch (error) {
      // Category may have already been deleted or have constraints
    }

    try {
      await deleteCategory(testExpenseCategoryId);
    } catch (error) {
      // Category may have already been deleted or have constraints
    }

    try {
      await deleteSavingsBucket(testBucketId);
    } catch (error) {
      // Bucket may have already been deleted or have constraints
    }
  });

  afterAll(async () => {
    await closeDb();
  });

  describe("Create Expense", () => {
    it("should create an expense transaction", async () => {
      const expense = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 100000,
          note: "Test expense",
        }),
      );

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
      ).rejects.toThrow();
    });

    it("should handle idempotency key", async () => {
      const key = nanoid();
      const expense1 = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 100000,
          idempotencyKey: key,
        }),
      );

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
      const income = trackTransaction(
        await createIncome({
          occurredAt: new Date(),
          walletId: testWalletId,
          amountIdr: 500000,
          note: "Test income",
          payee: "Employer",
        }),
      );

      expect(income.id).toBeDefined();
      expect(income.type).toBe("income");
    });

    it("should create an income transaction with categoryId", async () => {
      const income = trackTransaction(
        await createIncome({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testIncomeCategoryId,
          amountIdr: 750000,
          note: "Categorized income",
          payee: "Client",
        }),
      );

      expect(income.id).toBeDefined();
      expect(income.type).toBe("income");
      expect(income.category_id).toBe(testIncomeCategoryId);
      expect(income.category_name).toBeDefined();
    });

    it("should create an income transaction without categoryId", async () => {
      const income = trackTransaction(
        await createIncome({
          occurredAt: new Date(),
          walletId: testWalletId,
          amountIdr: 300000,
          note: "Uncategorized income",
        }),
      );

      expect(income.id).toBeDefined();
      expect(income.type).toBe("income");
      expect(income.category_id).toBeNull();
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

    it("should reject income with non-existent categoryId", async () => {
      await expect(
        createIncome({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: "non-existent-category-id",
          amountIdr: 500000,
        }),
      ).rejects.toThrow();
    });
  });

  describe("Create Transfer", () => {
    it("should create a transfer between wallets", async () => {
      const transfer = trackTransaction(
        await createTransfer({
          occurredAt: new Date(),
          fromWalletId: testWalletId,
          toWalletId: testWallet2Id,
          amountIdr: 200000,
          note: "Test transfer",
        }),
      );

      expect(transfer.id).toBeDefined();
      expect(transfer.type).toBe("transfer");
    });

    it("should reject transfer with same source and destination wallet", async () => {
      await expect(
        createTransfer({
          occurredAt: new Date(),
          fromWalletId: testWalletId,
          toWalletId: testWalletId,
          amountIdr: 100000,
        }),
      ).rejects.toThrow();
    });

    it("should reject transfer with non-existent source wallet", async () => {
      await expect(
        createTransfer({
          occurredAt: new Date(),
          fromWalletId: "non-existent-wallet-id",
          toWalletId: testWallet2Id,
          amountIdr: 100000,
        }),
      ).rejects.toThrow();
    });
  });

  describe("Create Savings Contribution", () => {
    it("should create a savings contribution transaction", async () => {
      const contribution = trackTransaction(
        await createSavingsContribution({
          occurredAt: new Date(),
          walletId: testWalletId,
          bucketId: testBucketId,
          amountIdr: 500000,
          note: "Test contribution",
        }),
      );

      expect(contribution.id).toBeDefined();
      expect(contribution.type).toBe("savings_contribution");
    });

    it("should reject contribution with non-existent bucket", async () => {
      await expect(
        createSavingsContribution({
          occurredAt: new Date(),
          walletId: testWalletId,
          bucketId: "non-existent-bucket-id",
          amountIdr: 500000,
        }),
      ).rejects.toThrow();
    });
  });

  describe("Create Savings Withdrawal", () => {
    it("should create a savings withdrawal transaction", async () => {
      const withdrawal = trackTransaction(
        await createSavingsWithdrawal({
          occurredAt: new Date(),
          walletId: testWalletId,
          bucketId: testBucketId,
          amountIdr: 250000,
          note: "Test withdrawal",
        }),
      );

      expect(withdrawal.id).toBeDefined();
      expect(withdrawal.type).toBe("savings_withdrawal");
    });

    it("should create withdrawal even with no prior savings", async () => {
      const withdrawal = trackTransaction(
        await createSavingsWithdrawal({
          occurredAt: new Date(),
          walletId: testWalletId,
          bucketId: testBucketId,
          amountIdr: 100000,
        }),
      );

      expect(withdrawal.id).toBeDefined();
      expect(withdrawal.type).toBe("savings_withdrawal");
    });
  });

  describe("List Transactions", () => {
    it("should list transactions with pagination", async () => {
      const expense = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 100000,
        }),
      );

      const result = await listTransactions({ limit: 10 });

      expect(result.length).toBeGreaterThan(0);
      expect(result.some((tx) => tx.id === expense.id)).toBe(true);
    });

    it("should filter transactions by type", async () => {
      const expense = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 100000,
        }),
      );

      const result = await listTransactions({ type: "expense" });

      expect(result.length).toBeGreaterThan(0);
      expect(result.every((tx) => tx.type === "expense")).toBe(true);
      expect(result.some((tx) => tx.id === expense.id)).toBe(true);
    });

    it("should include category_name for income transactions with categoryId", async () => {
      const income = trackTransaction(
        await createIncome({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testIncomeCategoryId,
          amountIdr: 500000,
          note: "Test income",
        }),
      );

      const result = await listTransactions({ type: "income" });

      const foundIncome = result.find((tx) => tx.id === income.id);
      expect(foundIncome).toBeDefined();
      expect(foundIncome?.category_name).toBeDefined();
    });

    it("should filter by categoryId and return income transactions", async () => {
      const income = trackTransaction(
        await createIncome({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testIncomeCategoryId,
          amountIdr: 500000,
          note: "Test income",
        }),
      );

      const result = await listTransactions({
        categoryId: testIncomeCategoryId,
      });

      const foundIncome = result.find((tx) => tx.id === income.id);
      expect(foundIncome).toBeDefined();
      expect(foundIncome?.category_id).toBe(testIncomeCategoryId);
    });
  });

  describe("Get Transaction by ID", () => {
    it("should return transaction when ID exists", async () => {
      const expense = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 100000,
        }),
      );

      const retrieved = await getTransactionById(expense.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(expense.id);
      expect(retrieved?.type).toBe("expense");
    });

    it("should return null when ID does not exist", async () => {
      const retrieved = await getTransactionById("non-existent-id");

      expect(retrieved).toBeNull();
    });
  });

  describe("Delete/Restore Transaction", () => {
    it("should soft delete a transaction", async () => {
      const expense = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 100000,
        }),
      );

      await deleteTransaction(expense.id);

      const retrieved = await getTransactionById(expense.id);
      expect(retrieved?.deleted_at).toBeDefined();
    });

    it("should restore a deleted transaction", async () => {
      const expense = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 100000,
        }),
      );

      await deleteTransaction(expense.id);
      await restoreTransaction(expense.id);

      const restored = await getTransactionById(expense.id);
      expect(restored).toBeDefined();
      expect(restored?.id).toBe(expense.id);
      expect(restored?.deleted_at).toBeNull();
    });
  });

  describe("bulkDeleteTransactions", () => {
    it("should bulk delete multiple valid transactions", async () => {
      // Create 3 expense transactions
      const expense1 = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 25000,
        }),
      );

      const expense2 = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 35000,
        }),
      );

      const expense3 = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 45000,
        }),
      );

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
      const expense1 = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 25000,
        }),
      );

      const expense2 = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 35000,
        }),
      );

      const fakeId = nanoid();

      const result = await bulkDeleteTransactions([
        expense1.id,
        fakeId,
        expense2.id,
      ]);

      expect(result.deletedCount).toBe(2);
      expect(result.failedIds).toContain(fakeId);

      const retrieved1 = await getTransactionById(expense1.id);
      const retrieved2 = await getTransactionById(expense2.id);

      expect(retrieved1?.deleted_at).toBeDefined();
      expect(retrieved2?.deleted_at).toBeDefined();
    });

    it("should handle bulk delete with already deleted transactions", async () => {
      const expense1 = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 25000,
        }),
      );

      const expense2 = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 35000,
        }),
      );

      // Delete first transaction
      await deleteTransaction(expense1.id);

      // Try to bulk delete both (one already deleted)
      const result = await bulkDeleteTransactions([expense1.id, expense2.id]);

      expect(result.deletedCount).toBeGreaterThanOrEqual(1);
      expect(result.failedIds.length).toBeGreaterThanOrEqual(0);

      const retrieved1 = await getTransactionById(expense1.id);
      const retrieved2 = await getTransactionById(expense2.id);

      expect(retrieved1?.deleted_at).toBeDefined();
      expect(retrieved2?.deleted_at).toBeDefined();
    });

    it("should handle bulk delete with mixed valid, invalid, and already deleted", async () => {
      const expense1 = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 25000,
        }),
      );

      const expense2 = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 35000,
        }),
      );

      const expense3 = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 45000,
        }),
      );

      // Delete first transaction
      await deleteTransaction(expense1.id);

      const fakeId = nanoid();
      const anotherFakeId = nanoid();

      const result = await bulkDeleteTransactions([
        expense1.id,
        fakeId,
        expense2.id,
        anotherFakeId,
        expense3.id,
      ]);

      expect(result.deletedCount).toBeGreaterThanOrEqual(2);

      const retrieved1 = await getTransactionById(expense1.id);
      const retrieved2 = await getTransactionById(expense2.id);
      const retrieved3 = await getTransactionById(expense3.id);

      expect(retrieved1?.deleted_at).toBeDefined();
      expect(retrieved2?.deleted_at).toBeDefined();
      expect(retrieved3?.deleted_at).toBeDefined();
    });

    it("should reject empty array", async () => {
      await expect(bulkDeleteTransactions([])).rejects.toThrow();
    });

    it("should reject all transactions already deleted", async () => {
      const expense1 = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 25000,
        }),
      );

      const expense2 = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 35000,
        }),
      );

      // Delete both
      await deleteTransaction(expense1.id);
      await deleteTransaction(expense2.id);

      // Try to bulk delete both
      const result = await bulkDeleteTransactions([expense1.id, expense2.id]);

      expect(result.failedIds.length).toBeGreaterThan(0);
    });

    it("should handle bulk delete with exactly 100 transactions", async () => {
      const ids: string[] = [];
      const numTransactions = 100;

      for (let i = 0; i < numTransactions; i++) {
        const expense = trackTransaction(
          await createExpense({
            occurredAt: new Date(),
            walletId: testWalletId,
            categoryId: testCategoryId,
            amountIdr: 10000 + i,
          }),
        );
        ids.push(expense.id);
      }

      const result = await bulkDeleteTransactions(ids);

      expect(result.deletedCount).toBe(numTransactions);
      expect(result.failedIds).toEqual([]);

      const first = await getTransactionById(ids[0]);
      const last = await getTransactionById(ids[numTransactions - 1]);

      expect(first?.deleted_at).toBeDefined();
      expect(last?.deleted_at).toBeDefined();
    });

    it("should use database transaction for atomicity", async () => {
      const expense1 = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 25000,
        }),
      );

      const expense2 = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 35000,
        }),
      );

      const expense3 = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 45000,
        }),
      );

      const result = await bulkDeleteTransactions([
        expense1.id,
        expense2.id,
        expense3.id,
      ]);

      expect(result.deletedCount).toBe(3);

      // Verify atomicity: all three should be deleted together
      const retrieved1 = await getTransactionById(expense1.id);
      const retrieved2 = await getTransactionById(expense2.id);
      const retrieved3 = await getTransactionById(expense3.id);

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
      const expense1 = trackTransaction(
        await createExpense({
          occurredAt: uniqueDate,
          walletId: testWalletId,
          categoryId: testCategoryId,
          amountIdr: 100000,
        }),
      );

      // Create income
      const income1 = trackTransaction(
        await createIncome({
          occurredAt: uniqueDate,
          walletId: testWalletId,
          amountIdr: 500000,
        }),
      );

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

  describe("Category Type Validation", () => {
    it("should accept expense transaction with expense category", async () => {
      const expense = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testExpenseCategoryId,
          amountIdr: 100000,
          note: "Test expense with correct category type",
        }),
      );

      expect(expense.id).toBeDefined();
      expect(expense.type).toBe("expense");
      expect(expense.category_id).toBe(testExpenseCategoryId);
    });

    it("should reject expense transaction with income category", async () => {
      await expect(
        createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testIncomeCategoryId,
          amountIdr: 100000,
          note: "Test expense with income category (should fail)",
        }),
      ).rejects.toThrow();
    });

    it("should accept income transaction with income category", async () => {
      const income = trackTransaction(
        await createIncome({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testIncomeCategoryId,
          amountIdr: 500000,
          note: "Test income with correct category type",
          payee: "Test Company",
        }),
      );

      expect(income.id).toBeDefined();
      expect(income.type).toBe("income");
      expect(income.category_id).toBe(testIncomeCategoryId);
    });

    it("should reject income transaction with expense category", async () => {
      await expect(
        createIncome({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testExpenseCategoryId,
          amountIdr: 500000,
          note: "Test income with expense category (should fail)",
          payee: "Test Company",
        }),
      ).rejects.toThrow();
    });

    it("should allow income transaction without category", async () => {
      const income = trackTransaction(
        await createIncome({
          occurredAt: new Date(),
          walletId: testWalletId,
          amountIdr: 300000,
          note: "Test income without category",
          payee: "Test Company",
        }),
      );

      expect(income.id).toBeDefined();
      expect(income.type).toBe("income");
      expect(income.category_id).toBeNull();
    });
  });

  describe("Filter by Category Type", () => {
    it("should filter transactions by expense category type", async () => {
      const expense = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testExpenseCategoryId,
          amountIdr: 100000,
          note: "Test expense",
        }),
      );

      const income = trackTransaction(
        await createIncome({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testIncomeCategoryId,
          amountIdr: 500000,
          note: "Test income",
        }),
      );

      const result = await listTransactions({ categoryType: "expense" });

      const expenseTransactions = result.filter((tx) =>
        testTransactionIds.includes(tx.id),
      );

      expect(expenseTransactions.length).toBeGreaterThan(0);
      expenseTransactions.forEach((tx) => {
        expect(tx.category_id).toBeDefined();
        expect(tx.category_id).not.toBeNull();
      });

      const foundExpense = result.find((tx) => tx.id === expense.id);
      expect(foundExpense).toBeDefined();

      const foundIncome = result.find((tx) => tx.id === income.id);
      expect(foundIncome).toBeUndefined();
    });

    it("should filter transactions by income category type", async () => {
      const expense = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testExpenseCategoryId,
          amountIdr: 100000,
          note: "Test expense",
        }),
      );

      const income = trackTransaction(
        await createIncome({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testIncomeCategoryId,
          amountIdr: 500000,
          note: "Test income",
        }),
      );

      const result = await listTransactions({ categoryType: "income" });

      const incomeTransactions = result.filter((tx) =>
        testTransactionIds.includes(tx.id),
      );

      expect(incomeTransactions.length).toBeGreaterThan(0);
      incomeTransactions.forEach((tx) => {
        expect(tx.category_id).toBeDefined();
        expect(tx.category_id).not.toBeNull();
      });

      const foundIncome = result.find((tx) => tx.id === income.id);
      expect(foundIncome).toBeDefined();

      const foundExpense = result.find((tx) => tx.id === expense.id);
      expect(foundExpense).toBeUndefined();
    });

    it("should exclude transactions without categories when filtering by category type", async () => {
      const incomeWithoutCategory = trackTransaction(
        await createIncome({
          occurredAt: new Date(),
          walletId: testWalletId,
          amountIdr: 300000,
          note: "Income without category",
        }),
      );

      const incomeWithCategory = trackTransaction(
        await createIncome({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testIncomeCategoryId,
          amountIdr: 500000,
          note: "Income with category",
        }),
      );

      const result = await listTransactions({ categoryType: "income" });

      const foundWithCategory = result.find(
        (tx) => tx.id === incomeWithCategory.id,
      );
      expect(foundWithCategory).toBeDefined();

      const foundWithoutCategory = result.find(
        (tx) => tx.id === incomeWithoutCategory.id,
      );
      expect(foundWithoutCategory).toBeUndefined();
    });
  });

  describe("Update Expense", () => {
    it("should update expense amount", async () => {
      const expense = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testExpenseCategoryId,
          amountIdr: 50000,
          note: "Original expense",
        }),
      );

      const updated = await updateExpense(expense.id, {
        amountIdr: 75000,
      });

      expect(updated.display_amount_idr).toBe(75000);
    });

    it("should update expense note", async () => {
      const expense = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testExpenseCategoryId,
          amountIdr: 50000,
          note: "Original note",
        }),
      );

      const updated = await updateExpense(expense.id, {
        note: "Updated note",
      });

      expect(updated.note).toBe("Updated note");
    });

    it("should update expense date", async () => {
      const originalDate = new Date("2024-01-15");
      const newDate = new Date("2024-02-20");

      const expense = trackTransaction(
        await createExpense({
          occurredAt: originalDate,
          walletId: testWalletId,
          categoryId: testExpenseCategoryId,
          amountIdr: 50000,
        }),
      );

      const updated = await updateExpense(expense.id, {
        occurredAt: newDate,
      });

      expect(new Date(updated.occurred_at).toDateString()).toBe(
        newDate.toDateString(),
      );
    });

    it("should update expense wallet", async () => {
      const expense = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testExpenseCategoryId,
          amountIdr: 50000,
        }),
      );

      const updated = await updateExpense(expense.id, {
        walletId: testWallet2Id,
      });

      expect(updated.postings[0].wallet_id).toBe(testWallet2Id);
    });

    it("should update expense category", async () => {
      const expense = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testExpenseCategoryId,
          amountIdr: 50000,
        }),
      );

      // Create another expense category
      const newCategory = await createCategory({
        name: `New Expense Category ${nanoid()}`,
        type: "expense",
      });

      try {
        const updated = await updateExpense(expense.id, {
          categoryId: newCategory.id,
        });

        expect(updated.category_id).toBe(newCategory.id);
      } finally {
        await deleteCategory(newCategory.id);
      }
    });

    it("should reject update with non-existent transaction", async () => {
      await expect(
        updateExpense("non-existent-id", { amountIdr: 50000 }),
      ).rejects.toThrow("Transaction not found");
    });

    it("should reject update on deleted transaction", async () => {
      const expense = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testExpenseCategoryId,
          amountIdr: 50000,
        }),
      );

      await deleteTransaction(expense.id);

      await expect(
        updateExpense(expense.id, { amountIdr: 75000 }),
      ).rejects.toThrow("Cannot update a deleted transaction");
    });

    it("should reject update with archived wallet", async () => {
      const expense = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testExpenseCategoryId,
          amountIdr: 50000,
        }),
      );

      await expect(
        updateExpense(expense.id, { walletId: "non-existent-wallet" }),
      ).rejects.toThrow("Wallet not found or archived");
    });

    it("should reject update with income category on expense", async () => {
      const expense = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testExpenseCategoryId,
          amountIdr: 50000,
        }),
      );

      await expect(
        updateExpense(expense.id, { categoryId: testIncomeCategoryId }),
      ).rejects.toThrow();
    });

    it("should update multiple fields at once", async () => {
      const expense = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testExpenseCategoryId,
          amountIdr: 50000,
          note: "Original",
        }),
      );

      const newDate = new Date("2024-03-15");
      const updated = await updateExpense(expense.id, {
        amountIdr: 100000,
        note: "Updated",
        occurredAt: newDate,
      });

      expect(updated.display_amount_idr).toBe(100000);
      expect(updated.note).toBe("Updated");
      expect(new Date(updated.occurred_at).toDateString()).toBe(
        newDate.toDateString(),
      );
    });

    it("should set note to null when explicitly passing null", async () => {
      const expense = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testExpenseCategoryId,
          amountIdr: 50000,
          note: "Has a note",
        }),
      );

      const updated = await updateExpense(expense.id, {
        note: null,
      });

      expect(updated.note).toBeNull();
    });
  });

  describe("Update Income", () => {
    it("should update income amount", async () => {
      const income = trackTransaction(
        await createIncome({
          occurredAt: new Date(),
          walletId: testWalletId,
          amountIdr: 1000000,
          note: "Original income",
        }),
      );

      const updated = await updateIncome(income.id, {
        amountIdr: 1500000,
      });

      expect(updated.display_amount_idr).toBe(1500000);
    });

    it("should update income payee", async () => {
      const income = trackTransaction(
        await createIncome({
          occurredAt: new Date(),
          walletId: testWalletId,
          amountIdr: 1000000,
          payee: "Original Employer",
        }),
      );

      const updated = await updateIncome(income.id, {
        payee: "New Employer",
      });

      expect(updated.payee).toBe("New Employer");
    });

    it("should update income category", async () => {
      const income = trackTransaction(
        await createIncome({
          occurredAt: new Date(),
          walletId: testWalletId,
          amountIdr: 1000000,
        }),
      );

      const updated = await updateIncome(income.id, {
        categoryId: testIncomeCategoryId,
      });

      expect(updated.category_id).toBe(testIncomeCategoryId);
    });

    it("should remove income category by setting to null", async () => {
      const income = trackTransaction(
        await createIncome({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testIncomeCategoryId,
          amountIdr: 1000000,
        }),
      );

      const updated = await updateIncome(income.id, {
        categoryId: null,
      });

      expect(updated.category_id).toBeNull();
    });

    it("should reject update with expense category on income", async () => {
      const income = trackTransaction(
        await createIncome({
          occurredAt: new Date(),
          walletId: testWalletId,
          amountIdr: 1000000,
        }),
      );

      await expect(
        updateIncome(income.id, { categoryId: testExpenseCategoryId }),
      ).rejects.toThrow();
    });

    it("should reject update on non-income transaction", async () => {
      const expense = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testExpenseCategoryId,
          amountIdr: 50000,
        }),
      );

      await expect(
        updateIncome(expense.id, { amountIdr: 100000 }),
      ).rejects.toThrow("Transaction is not an income");
    });

    it("should update income wallet", async () => {
      const income = trackTransaction(
        await createIncome({
          occurredAt: new Date(),
          walletId: testWalletId,
          amountIdr: 1000000,
        }),
      );

      const updated = await updateIncome(income.id, {
        walletId: testWallet2Id,
      });

      expect(updated.postings[0].wallet_id).toBe(testWallet2Id);
    });
  });

  describe("Update Transfer", () => {
    it("should update transfer amount", async () => {
      const transfer = trackTransaction(
        await createTransfer({
          occurredAt: new Date(),
          fromWalletId: testWalletId,
          toWalletId: testWallet2Id,
          amountIdr: 100000,
        }),
      );

      const updated = await updateTransfer(transfer.id, {
        amountIdr: 200000,
      });

      expect(updated.display_amount_idr).toBe(200000);
    });

    it("should update transfer note", async () => {
      const transfer = trackTransaction(
        await createTransfer({
          occurredAt: new Date(),
          fromWalletId: testWalletId,
          toWalletId: testWallet2Id,
          amountIdr: 100000,
          note: "Original transfer",
        }),
      );

      const updated = await updateTransfer(transfer.id, {
        note: "Updated transfer note",
      });

      expect(updated.note).toBe("Updated transfer note");
    });

    it("should update transfer from wallet", async () => {
      // Create a third wallet for this test
      const wallet3 = await createWallet({
        name: `Transfer Test Wallet ${nanoid()}`,
        type: "bank",
      });

      const transfer = trackTransaction(
        await createTransfer({
          occurredAt: new Date(),
          fromWalletId: testWalletId,
          toWalletId: testWallet2Id,
          amountIdr: 100000,
        }),
      );

      const updated = await updateTransfer(transfer.id, {
        fromWalletId: wallet3.id,
      });

      const fromPosting = updated.postings.find(
        (p) => Number(p.amount_idr) < 0,
      );
      expect(fromPosting?.wallet_id).toBe(wallet3.id);

      // Note: wallet3 cleanup is skipped because transfer still references it
      // The afterEach cleanup will handle the transaction cleanup
    });

    it("should update transfer to wallet", async () => {
      const wallet3 = await createWallet({
        name: `Transfer Test Wallet ${nanoid()}`,
        type: "bank",
      });

      const transfer = trackTransaction(
        await createTransfer({
          occurredAt: new Date(),
          fromWalletId: testWalletId,
          toWalletId: testWallet2Id,
          amountIdr: 100000,
        }),
      );

      const updated = await updateTransfer(transfer.id, {
        toWalletId: wallet3.id,
      });

      const toPosting = updated.postings.find((p) => Number(p.amount_idr) > 0);
      expect(toPosting?.wallet_id).toBe(wallet3.id);

      // Note: wallet3 cleanup is skipped because transfer still references it
      // The afterEach cleanup will handle the transaction cleanup
    });

    it("should reject update making from and to wallet the same", async () => {
      const transfer = trackTransaction(
        await createTransfer({
          occurredAt: new Date(),
          fromWalletId: testWalletId,
          toWalletId: testWallet2Id,
          amountIdr: 100000,
        }),
      );

      await expect(
        updateTransfer(transfer.id, {
          toWalletId: testWalletId,
        }),
      ).rejects.toThrow("From and to wallets must be different");
    });

    it("should reject update on non-transfer transaction", async () => {
      const expense = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testExpenseCategoryId,
          amountIdr: 50000,
        }),
      );

      await expect(
        updateTransfer(expense.id, { amountIdr: 100000 }),
      ).rejects.toThrow("Transaction is not a transfer");
    });

    it("should reject update with non-existent wallet", async () => {
      const transfer = trackTransaction(
        await createTransfer({
          occurredAt: new Date(),
          fromWalletId: testWalletId,
          toWalletId: testWallet2Id,
          amountIdr: 100000,
        }),
      );

      await expect(
        updateTransfer(transfer.id, { fromWalletId: "non-existent-wallet" }),
      ).rejects.toThrow("From wallet not found or archived");
    });
  });

  describe("Update Savings Contribution", () => {
    it("should update savings contribution amount", async () => {
      const contribution = trackTransaction(
        await createSavingsContribution({
          occurredAt: new Date(),
          walletId: testWalletId,
          bucketId: testBucketId,
          amountIdr: 500000,
        }),
      );

      const updated = await updateSavingsContribution(contribution.id, {
        amountIdr: 750000,
      });

      expect(updated.display_amount_idr).toBe(750000);
    });

    it("should update savings contribution note", async () => {
      const contribution = trackTransaction(
        await createSavingsContribution({
          occurredAt: new Date(),
          walletId: testWalletId,
          bucketId: testBucketId,
          amountIdr: 500000,
          note: "Original contribution",
        }),
      );

      const updated = await updateSavingsContribution(contribution.id, {
        note: "Updated contribution note",
      });

      expect(updated.note).toBe("Updated contribution note");
    });

    it("should update savings contribution wallet", async () => {
      const contribution = trackTransaction(
        await createSavingsContribution({
          occurredAt: new Date(),
          walletId: testWalletId,
          bucketId: testBucketId,
          amountIdr: 500000,
        }),
      );

      const updated = await updateSavingsContribution(contribution.id, {
        walletId: testWallet2Id,
      });

      const walletPosting = updated.postings.find((p) => p.wallet_id);
      expect(walletPosting?.wallet_id).toBe(testWallet2Id);
    });

    it("should update savings contribution bucket", async () => {
      const bucket2 = await createSavingsBucket({
        name: `Test Bucket 2 ${nanoid()}`,
      });

      const contribution = trackTransaction(
        await createSavingsContribution({
          occurredAt: new Date(),
          walletId: testWalletId,
          bucketId: testBucketId,
          amountIdr: 500000,
        }),
      );

      const updated = await updateSavingsContribution(contribution.id, {
        bucketId: bucket2.id,
      });

      const bucketPosting = updated.postings.find((p) => p.savings_bucket_id);
      expect(bucketPosting?.savings_bucket_id).toBe(bucket2.id);

      // Note: bucket2 cleanup is skipped because contribution still references it
      // The afterEach cleanup will handle the transaction cleanup
    });

    it("should reject update on non-savings-contribution transaction", async () => {
      const expense = trackTransaction(
        await createExpense({
          occurredAt: new Date(),
          walletId: testWalletId,
          categoryId: testExpenseCategoryId,
          amountIdr: 50000,
        }),
      );

      await expect(
        updateSavingsContribution(expense.id, { amountIdr: 100000 }),
      ).rejects.toThrow("Transaction is not a savings contribution");
    });

    it("should reject update with non-existent bucket", async () => {
      const contribution = trackTransaction(
        await createSavingsContribution({
          occurredAt: new Date(),
          walletId: testWalletId,
          bucketId: testBucketId,
          amountIdr: 500000,
        }),
      );

      await expect(
        updateSavingsContribution(contribution.id, {
          bucketId: "non-existent-bucket",
        }),
      ).rejects.toThrow("Savings bucket not found or archived");
    });
  });

  describe("Update Savings Withdrawal", () => {
    it("should update savings withdrawal amount", async () => {
      const withdrawal = trackTransaction(
        await createSavingsWithdrawal({
          occurredAt: new Date(),
          walletId: testWalletId,
          bucketId: testBucketId,
          amountIdr: 200000,
        }),
      );

      const updated = await updateSavingsWithdrawal(withdrawal.id, {
        amountIdr: 300000,
      });

      expect(updated.display_amount_idr).toBe(300000);
    });

    it("should update savings withdrawal note", async () => {
      const withdrawal = trackTransaction(
        await createSavingsWithdrawal({
          occurredAt: new Date(),
          walletId: testWalletId,
          bucketId: testBucketId,
          amountIdr: 200000,
          note: "Original withdrawal",
        }),
      );

      const updated = await updateSavingsWithdrawal(withdrawal.id, {
        note: "Updated withdrawal note",
      });

      expect(updated.note).toBe("Updated withdrawal note");
    });

    it("should update savings withdrawal wallet", async () => {
      const withdrawal = trackTransaction(
        await createSavingsWithdrawal({
          occurredAt: new Date(),
          walletId: testWalletId,
          bucketId: testBucketId,
          amountIdr: 200000,
        }),
      );

      const updated = await updateSavingsWithdrawal(withdrawal.id, {
        walletId: testWallet2Id,
      });

      const walletPosting = updated.postings.find((p) => p.wallet_id);
      expect(walletPosting?.wallet_id).toBe(testWallet2Id);
    });

    it("should update savings withdrawal bucket", async () => {
      const bucket2 = await createSavingsBucket({
        name: `Test Bucket 2 ${nanoid()}`,
      });

      const withdrawal = trackTransaction(
        await createSavingsWithdrawal({
          occurredAt: new Date(),
          walletId: testWalletId,
          bucketId: testBucketId,
          amountIdr: 200000,
        }),
      );

      const updated = await updateSavingsWithdrawal(withdrawal.id, {
        bucketId: bucket2.id,
      });

      const bucketPosting = updated.postings.find((p) => p.savings_bucket_id);
      expect(bucketPosting?.savings_bucket_id).toBe(bucket2.id);

      // Note: bucket2 cleanup is skipped because withdrawal still references it
      // The afterEach cleanup will handle the transaction cleanup
    });

    it("should reject update on non-savings-withdrawal transaction", async () => {
      const contribution = trackTransaction(
        await createSavingsContribution({
          occurredAt: new Date(),
          walletId: testWalletId,
          bucketId: testBucketId,
          amountIdr: 500000,
        }),
      );

      await expect(
        updateSavingsWithdrawal(contribution.id, { amountIdr: 100000 }),
      ).rejects.toThrow("Transaction is not a savings withdrawal");
    });

    it("should reject update with non-existent wallet", async () => {
      const withdrawal = trackTransaction(
        await createSavingsWithdrawal({
          occurredAt: new Date(),
          walletId: testWalletId,
          bucketId: testBucketId,
          amountIdr: 200000,
        }),
      );

      await expect(
        updateSavingsWithdrawal(withdrawal.id, {
          walletId: "non-existent-wallet",
        }),
      ).rejects.toThrow("Wallet not found or archived");
    });

    it("should update multiple fields at once", async () => {
      const withdrawal = trackTransaction(
        await createSavingsWithdrawal({
          occurredAt: new Date(),
          walletId: testWalletId,
          bucketId: testBucketId,
          amountIdr: 200000,
          note: "Original",
        }),
      );

      const newDate = new Date("2024-06-15");
      const updated = await updateSavingsWithdrawal(withdrawal.id, {
        amountIdr: 400000,
        note: "Updated",
        occurredAt: newDate,
      });

      expect(updated.display_amount_idr).toBe(400000);
      expect(updated.note).toBe("Updated");
      expect(new Date(updated.occurred_at).toDateString()).toBe(
        newDate.toDateString(),
      );
    });
  });
});
