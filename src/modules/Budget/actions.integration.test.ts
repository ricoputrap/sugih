/**
 * Budget Integration Tests
 *
 * Tests for Budget module using Drizzle ORM with raw SQL patterns.
 * Follows the same structure as Category and Wallet integration tests.
 */

import { describe, it, expect, afterEach, afterAll } from "vitest";
import { nanoid } from "nanoid";
import {
  listBudgets,
  getBudgetById,
  getBudgetsByMonth,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetSummary,
  copyBudgets,
} from "./actions";
import { createCategory, deleteCategory } from "@/modules/Category/actions";
import {
  createSavingsBucket,
  deleteSavingsBucket,
} from "@/modules/SavingsBucket/actions";
import { createWallet, deleteWallet } from "@/modules/Wallet/actions";
import {
  createSavingsContribution,
  createSavingsWithdrawal,
  deleteTransaction,
} from "@/modules/Transaction/actions";
import { closeDb } from "@/db/drizzle-client";

describe("Budget Integration Tests", () => {
  const testCategoryIds: string[] = [];
  const testSavingsBucketIds: string[] = [];
  const testBudgetIds: string[] = [];
  const testMonth = "2099-01-01";
  const testMonth2 = "2099-02-01";

  async function createTestCategory() {
    const category = await createCategory({
      name: `Budget Category ${nanoid()}`,
      type: "expense",
    });
    testCategoryIds.push(category.id);
    return category;
  }

  async function createTestSavingsBucket() {
    const bucket = await createSavingsBucket({
      name: `Budget Savings Bucket ${nanoid()}`,
      description: "Test savings bucket for budget tests",
    });
    testSavingsBucketIds.push(bucket.id);
    return bucket;
  }

  afterEach(async () => {
    // Clean up budgets first (foreign key constraint)
    for (const id of testBudgetIds) {
      try {
        await deleteBudget(id);
      } catch (_error) {
        // Budget may already be deleted
      }
    }
    testBudgetIds.length = 0;

    // Clean up categories
    for (const id of testCategoryIds) {
      try {
        await deleteCategory(id);
      } catch (_error) {
        // Category may already be deleted
      }
    }
    testCategoryIds.length = 0;

    // Clean up savings buckets
    for (const id of testSavingsBucketIds) {
      try {
        await deleteSavingsBucket(id);
      } catch (_error) {
        // Savings bucket may already be deleted
      }
    }
    testSavingsBucketIds.length = 0;
  });

  afterAll(async () => {
    await closeDb();
  });

  describe("Create Budget", () => {
    it("should create a budget for a category and month", async () => {
      const category = await createTestCategory();
      const budget = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget.id);

      expect(budget.id).toBeDefined();
      expect(budget.month).toBe(testMonth);
      expect(budget.category_id).toBe(category.id);
      expect(budget.amount_idr).toBe(1000000);
      expect(budget.category_name).toBe(category.name);
      expect(budget.created_at).toBeTruthy();
      expect(budget.updated_at).toBeTruthy();
    });

    it("should reject budget for non-existent category", async () => {
      await expect(
        createBudget({
          month: testMonth,
          categoryId: "non-existent-id",
          amountIdr: 1000000,
        }),
      ).rejects.toThrow("not found or archived");
    });

    it("should reject duplicate budget for same month and category", async () => {
      const category = await createTestCategory();
      const budget = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget.id);

      await expect(
        createBudget({
          month: testMonth,
          categoryId: category.id,
          amountIdr: 1000000,
        }),
      ).rejects.toThrow("already exists");
    });

    it("should allow same category in different months", async () => {
      const category = await createTestCategory();

      const budget1 = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget1.id);

      const budget2 = await createBudget({
        month: testMonth2,
        categoryId: category.id,
        amountIdr: 2000000,
      });
      testBudgetIds.push(budget2.id);

      expect(budget1.amount_idr).toBe(1000000);
      expect(budget2.amount_idr).toBe(2000000);
    });
  });

  describe("List Budgets", () => {
    it("should list budgets filtered by month", async () => {
      const category = await createTestCategory();
      const budget = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 1500000,
      });
      testBudgetIds.push(budget.id);

      const budgets = await listBudgets({ month: testMonth });
      const found = budgets.find((b) => b.id === budget.id);

      expect(found).toBeDefined();
      expect(Number(found?.amount_idr)).toBe(1500000);
    });

    it("should return empty array for month with no budgets", async () => {
      const budgets = await listBudgets({ month: "2100-12-01" });
      expect(budgets).toHaveLength(0);
    });

    it("should list all budgets when no month filter", async () => {
      const category = await createTestCategory();
      const budget = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget.id);

      const budgets = await listBudgets({});
      const found = budgets.find((b) => b.id === budget.id);

      expect(found).toBeDefined();
    });
  });

  describe("Get Budget by ID", () => {
    it("should return budget when ID exists", async () => {
      const category = await createTestCategory();
      const budget = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 2000000,
      });
      testBudgetIds.push(budget.id);

      const retrieved = await getBudgetById(budget.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(budget.id);
      expect(retrieved?.month).toBe(testMonth);
      expect(Number(retrieved?.amount_idr)).toBe(2000000);
      expect(retrieved?.category_name).toBe(category.name);
    });

    it("should return null when ID does not exist", async () => {
      const retrieved = await getBudgetById("non-existent-id");
      expect(retrieved).toBeNull();
    });
  });

  describe("Get Budgets by Month", () => {
    it("should return all budgets for a month", async () => {
      const cat1 = await createTestCategory();
      const cat2 = await createTestCategory();

      const budget1 = await createBudget({
        month: testMonth,
        categoryId: cat1.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget1.id);

      const budget2 = await createBudget({
        month: testMonth,
        categoryId: cat2.id,
        amountIdr: 2000000,
      });
      testBudgetIds.push(budget2.id);

      const budgets = await getBudgetsByMonth(testMonth);

      expect(budgets).toHaveLength(2);
      expect(budgets.map((b) => b.category_id).sort()).toEqual(
        [cat1.id, cat2.id].sort(),
      );
    });

    it("should order budgets by category name", async () => {
      const catA = await createCategory({
        name: `Alpha ${nanoid()}`,
        type: "expense",
      });
      const catZ = await createCategory({
        name: `Zebra ${nanoid()}`,
        type: "expense",
      });
      testCategoryIds.push(catA.id, catZ.id);

      const budgetZ = await createBudget({
        month: testMonth,
        categoryId: catZ.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budgetZ.id);

      const budgetA = await createBudget({
        month: testMonth,
        categoryId: catA.id,
        amountIdr: 2000000,
      });
      testBudgetIds.push(budgetA.id);

      const budgets = await getBudgetsByMonth(testMonth);

      expect(budgets[0].category_name).toContain("Alpha");
      expect(budgets[1].category_name).toContain("Zebra");
    });
  });

  describe("Update Budget", () => {
    it("should update budget amount", async () => {
      const category = await createTestCategory();
      const budget = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget.id);

      const updated = await updateBudget(budget.id, 3000000);

      expect(updated.amount_idr).toBe(3000000);
      expect(updated.id).toBe(budget.id);
    });

    it("should reject updating non-existent budget", async () => {
      await expect(updateBudget("non-existent-id", 1000000)).rejects.toThrow(
        "not found",
      );
    });

    it("should reject invalid amount", async () => {
      const category = await createTestCategory();
      const budget = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget.id);

      await expect(updateBudget(budget.id, -500000)).rejects.toThrow(
        "positive integer",
      );
      await expect(updateBudget(budget.id, 0)).rejects.toThrow(
        "positive integer",
      );
    });
  });

  describe("Delete Budget", () => {
    it("should permanently delete a budget", async () => {
      const category = await createTestCategory();
      const budget = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget.id);

      await deleteBudget(budget.id);

      const retrieved = await getBudgetById(budget.id);
      expect(retrieved).toBeNull();
    });

    it("should reject deleting non-existent budget", async () => {
      await expect(deleteBudget("non-existent-id")).rejects.toThrow(
        "not found",
      );
    });
  });

  describe("Get Budget Summary", () => {
    it("should return budget summary for a month", async () => {
      const category = await createTestCategory();
      const budget = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget.id);

      const summary = await getBudgetSummary(testMonth);

      expect(summary.month).toBe(testMonth);
      expect(summary.totalBudget).toBe(1000000);
      expect(summary.totalSpent).toBe(0);
      expect(summary.remaining).toBe(1000000);
      expect(summary.items).toHaveLength(1);
      expect(summary.items[0].categoryId).toBe(category.id);
      expect(summary.items[0].budgetAmount).toBe(1000000);
    });

    it("should return zero spent for month with no transactions", async () => {
      const category = await createTestCategory();
      const budget = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 500000,
      });
      testBudgetIds.push(budget.id);

      const summary = await getBudgetSummary(testMonth);

      expect(summary.totalBudget).toBe(500000);
      expect(summary.totalSpent).toBe(0);
      expect(summary.remaining).toBe(500000);
    });

    it("should return empty summary for month with no budgets", async () => {
      const summary = await getBudgetSummary("2099-12-01");

      expect(summary.month).toBe("2099-12-01");
      expect(summary.totalBudget).toBe(0);
      expect(summary.items).toHaveLength(0);
    });
  });

  describe("Copy Budgets", () => {
    it("should copy budgets from one month to another", async () => {
      const cat1 = await createTestCategory();
      const budget = await createBudget({
        month: testMonth,
        categoryId: cat1.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget.id);

      const result = await copyBudgets(testMonth, testMonth2);

      expect(result.created).toHaveLength(1);
      expect(result.skipped).toHaveLength(0);
      expect(result.created[0].month).toBe(testMonth2);
      expect(result.created[0].category_id).toBe(cat1.id);
      expect(Number(result.created[0].amount_idr)).toBe(1000000);
      expect(result.created[0].id).not.toBe(budget.id);

      testBudgetIds.push(...result.created.map((b) => b.id));
    });

    it("should copy multiple budgets", async () => {
      const cat1 = await createTestCategory();
      const cat2 = await createTestCategory();

      const budget1 = await createBudget({
        month: testMonth,
        categoryId: cat1.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget1.id);

      const budget2 = await createBudget({
        month: testMonth,
        categoryId: cat2.id,
        amountIdr: 2000000,
      });
      testBudgetIds.push(budget2.id);

      const result = await copyBudgets(testMonth, testMonth2);

      expect(result.created).toHaveLength(2);
      expect(result.skipped).toHaveLength(0);

      testBudgetIds.push(...result.created.map((b) => b.id));
    });

    it("should skip copying to month with existing budgets", async () => {
      const category = await createTestCategory();

      const budget = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget.id);

      const destBudget = await createBudget({
        month: testMonth2,
        categoryId: category.id,
        amountIdr: 500000,
      });
      testBudgetIds.push(destBudget.id);

      const result = await copyBudgets(testMonth, testMonth2);
      expect(result.created).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].categoryId).toBe(category.id);
    });

    it("should copy only missing budgets when some exist", async () => {
      const cat1 = await createTestCategory();
      const cat2 = await createTestCategory();
      const cat3 = await createTestCategory();

      const budget1 = await createBudget({
        month: testMonth,
        categoryId: cat1.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget1.id);

      const budget2 = await createBudget({
        month: testMonth,
        categoryId: cat2.id,
        amountIdr: 2000000,
      });
      testBudgetIds.push(budget2.id);

      const budget3 = await createBudget({
        month: testMonth,
        categoryId: cat3.id,
        amountIdr: 3000000,
      });
      testBudgetIds.push(budget3.id);

      const destBudget = await createBudget({
        month: testMonth2,
        categoryId: cat2.id,
        amountIdr: 500000,
      });
      testBudgetIds.push(destBudget.id);

      const result = await copyBudgets(testMonth, testMonth2);
      expect(result.created).toHaveLength(2);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].categoryId).toBe(cat2.id);

      const createdCategoryIds = result.created.map((b) => b.category_id);
      expect(createdCategoryIds).toContain(cat1.id);
      expect(createdCategoryIds).toContain(cat3.id);
      expect(createdCategoryIds).not.toContain(cat2.id);

      testBudgetIds.push(...result.created.map((b) => b.id));
    });

    it("should reject copying from month with no budgets", async () => {
      await expect(copyBudgets("2095-01-01", testMonth2)).rejects.toThrow(
        "No budgets found",
      );
    });

    it("should reject copying to same month", async () => {
      await expect(copyBudgets(testMonth, testMonth)).rejects.toThrow(
        "different",
      );
    });
  });

  describe("Budget Category Type Validation", () => {
    it("should accept budget with expense category", async () => {
      const expenseCategory = await createCategory({
        name: `Expense Category ${nanoid()}`,
        type: "expense",
      });
      testCategoryIds.push(expenseCategory.id);

      const budget = await createBudget({
        month: testMonth,
        categoryId: expenseCategory.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget.id);

      expect(budget.id).toBeDefined();
      expect(budget.category_id).toBe(expenseCategory.id);
    });

    it("should reject budget with income category", async () => {
      const incomeCategory = await createCategory({
        name: `Income Category ${nanoid()}`,
        type: "income",
      });
      testCategoryIds.push(incomeCategory.id);

      await expect(
        createBudget({
          month: testMonth,
          categoryId: incomeCategory.id,
          amountIdr: 1000000,
        }),
      ).rejects.toThrow();
    });
  });

  describe("Budget Note Field", () => {
    it("should create budget with note", async () => {
      const category = await createTestCategory();
      const budget = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 1000000,
        note: "Apartment only",
      });
      testBudgetIds.push(budget.id);

      expect(budget.note).toBe("Apartment only");

      const retrieved = await getBudgetById(budget.id);
      expect(retrieved?.note).toBe("Apartment only");
    });

    it("should create budget without note (null)", async () => {
      const category = await createTestCategory();
      const budget = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget.id);

      expect(budget.note).toBeNull();
    });

    it("should update budget to add note", async () => {
      const category = await createTestCategory();
      const budget = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget.id);

      const updated = await updateBudget(
        budget.id,
        1000000,
        "Apartment, Water, and Electricity",
      );

      expect(updated.note).toBe("Apartment, Water, and Electricity");

      const retrieved = await getBudgetById(budget.id);
      expect(retrieved?.note).toBe("Apartment, Water, and Electricity");
    });

    it("should update budget to remove note (set to null)", async () => {
      const category = await createTestCategory();
      const budget = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 1000000,
        note: "Initial note",
      });
      testBudgetIds.push(budget.id);

      const updated = await updateBudget(budget.id, 1000000, null);

      expect(updated.note).toBeNull();

      const retrieved = await getBudgetById(budget.id);
      expect(retrieved?.note).toBeNull();
    });

    it("should preserve note when updating amount only", async () => {
      const category = await createTestCategory();
      const budget = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 1000000,
        note: "My note",
      });
      testBudgetIds.push(budget.id);

      const updated = await updateBudget(budget.id, 2000000);

      expect(updated.amount_idr).toBe(2000000);
      expect(updated.note).toBe("My note");
    });

    it("should copy budgets with notes preserved", async () => {
      const category = await createTestCategory();
      const budget = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 1000000,
        note: "Note to copy",
      });
      testBudgetIds.push(budget.id);

      const result = await copyBudgets(testMonth, testMonth2);

      expect(result.created.length).toBe(1);
      expect(result.created[0].note).toBe("Note to copy");
      testBudgetIds.push(result.created[0].id);

      const copiedBudgets = await getBudgetsByMonth(testMonth2);
      const copiedBudget = copiedBudgets.find(
        (b) => b.category_id === category.id,
      );
      expect(copiedBudget?.note).toBe("Note to copy");
    });

    it("should list budgets with notes", async () => {
      const category = await createTestCategory();
      const budget = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 1000000,
        note: "Listed note",
      });
      testBudgetIds.push(budget.id);

      const budgets = await listBudgets({ month: testMonth });
      const found = budgets.find((b) => b.id === budget.id);

      expect(found?.note).toBe("Listed note");
    });
  });

  describe("Savings Bucket Budget CRUD", () => {
    it("should create a budget for a savings bucket", async () => {
      const bucket = await createTestSavingsBucket();
      const budget = await createBudget({
        month: testMonth,
        savingsBucketId: bucket.id,
        amountIdr: 2000000,
      });
      testBudgetIds.push(budget.id);

      expect(budget.id).toBeDefined();
      expect(budget.month).toBe(testMonth);
      expect(budget.savings_bucket_id).toBe(bucket.id);
      expect(budget.category_id).toBeNull();
      expect(budget.amount_idr).toBe(2000000);
      expect(budget.savings_bucket_name).toBe(bucket.name);
      expect(budget.target_type).toBe("savings_bucket");
    });

    it("should reject budget for non-existent savings bucket", async () => {
      await expect(
        createBudget({
          month: testMonth,
          savingsBucketId: "non-existent-bucket-id",
          amountIdr: 1000000,
        }),
      ).rejects.toThrow("not found or archived");
    });

    it("should reject duplicate budget for same month and savings bucket", async () => {
      const bucket = await createTestSavingsBucket();
      const budget = await createBudget({
        month: testMonth,
        savingsBucketId: bucket.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget.id);

      await expect(
        createBudget({
          month: testMonth,
          savingsBucketId: bucket.id,
          amountIdr: 2000000,
        }),
      ).rejects.toThrow("already exists");
    });

    it("should reject budget with both categoryId and savingsBucketId", async () => {
      const category = await createTestCategory();
      const bucket = await createTestSavingsBucket();

      await expect(
        createBudget({
          month: testMonth,
          categoryId: category.id,
          savingsBucketId: bucket.id,
          amountIdr: 1000000,
        }),
      ).rejects.toThrow("Cannot specify both categoryId and savingsBucketId");
    });

    it("should reject budget with neither categoryId nor savingsBucketId", async () => {
      await expect(
        createBudget({
          month: testMonth,
          amountIdr: 1000000,
        }),
      ).rejects.toThrow("Must specify either categoryId or savingsBucketId");
    });

    it("should allow same savings bucket in different months", async () => {
      const bucket = await createTestSavingsBucket();

      const budget1 = await createBudget({
        month: testMonth,
        savingsBucketId: bucket.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget1.id);

      const budget2 = await createBudget({
        month: testMonth2,
        savingsBucketId: bucket.id,
        amountIdr: 2000000,
      });
      testBudgetIds.push(budget2.id);

      expect(budget1.amount_idr).toBe(1000000);
      expect(budget2.amount_idr).toBe(2000000);
    });

    it("should get savings bucket budget by ID", async () => {
      const bucket = await createTestSavingsBucket();
      const budget = await createBudget({
        month: testMonth,
        savingsBucketId: bucket.id,
        amountIdr: 1500000,
        note: "Savings goal",
      });
      testBudgetIds.push(budget.id);

      const retrieved = await getBudgetById(budget.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(budget.id);
      expect(retrieved?.savings_bucket_id).toBe(bucket.id);
      expect(retrieved?.savings_bucket_name).toBe(bucket.name);
      expect(retrieved?.target_type).toBe("savings_bucket");
      expect(retrieved?.note).toBe("Savings goal");
    });

    it("should list both category and savings bucket budgets for a month", async () => {
      const category = await createTestCategory();
      const bucket = await createTestSavingsBucket();

      const categoryBudget = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(categoryBudget.id);

      const bucketBudget = await createBudget({
        month: testMonth,
        savingsBucketId: bucket.id,
        amountIdr: 500000,
      });
      testBudgetIds.push(bucketBudget.id);

      const budgets = await listBudgets({ month: testMonth });

      expect(budgets.length).toBeGreaterThanOrEqual(2);

      const foundCategoryBudget = budgets.find(
        (b) => b.id === categoryBudget.id,
      );
      const foundBucketBudget = budgets.find((b) => b.id === bucketBudget.id);

      expect(foundCategoryBudget?.target_type).toBe("category");
      expect(foundBucketBudget?.target_type).toBe("savings_bucket");
    });

    it("should update savings bucket budget amount", async () => {
      const bucket = await createTestSavingsBucket();
      const budget = await createBudget({
        month: testMonth,
        savingsBucketId: bucket.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget.id);

      const updated = await updateBudget(budget.id, 2500000);

      expect(updated.amount_idr).toBe(2500000);
      expect(updated.savings_bucket_id).toBe(bucket.id);
      expect(updated.target_type).toBe("savings_bucket");
    });

    it("should delete savings bucket budget", async () => {
      const bucket = await createTestSavingsBucket();
      const budget = await createBudget({
        month: testMonth,
        savingsBucketId: bucket.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget.id);

      await deleteBudget(budget.id);

      const retrieved = await getBudgetById(budget.id);
      expect(retrieved).toBeNull();
    });
  });

  describe("Copy Budgets with Savings Buckets", () => {
    it("should copy savings bucket budgets to another month", async () => {
      const bucket = await createTestSavingsBucket();
      const budget = await createBudget({
        month: testMonth,
        savingsBucketId: bucket.id,
        amountIdr: 1000000,
        note: "Monthly savings",
      });
      testBudgetIds.push(budget.id);

      const result = await copyBudgets(testMonth, testMonth2);

      expect(result.created.length).toBe(1);
      expect(result.created[0].savings_bucket_id).toBe(bucket.id);
      expect(result.created[0].target_type).toBe("savings_bucket");
      expect(result.created[0].note).toBe("Monthly savings");
      testBudgetIds.push(...result.created.map((b) => b.id));
    });

    it("should copy mixed category and savings bucket budgets", async () => {
      const category = await createTestCategory();
      const bucket = await createTestSavingsBucket();

      const categoryBudget = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(categoryBudget.id);

      const bucketBudget = await createBudget({
        month: testMonth,
        savingsBucketId: bucket.id,
        amountIdr: 500000,
      });
      testBudgetIds.push(bucketBudget.id);

      const result = await copyBudgets(testMonth, testMonth2);

      expect(result.created.length).toBe(2);

      const copiedCategoryBudget = result.created.find(
        (b) => b.category_id === category.id,
      );
      const copiedBucketBudget = result.created.find(
        (b) => b.savings_bucket_id === bucket.id,
      );

      expect(copiedCategoryBudget?.target_type).toBe("category");
      expect(copiedBucketBudget?.target_type).toBe("savings_bucket");

      testBudgetIds.push(...result.created.map((b) => b.id));
    });

    it("should skip existing savings bucket budgets when copying", async () => {
      const bucket = await createTestSavingsBucket();

      const sourceBudget = await createBudget({
        month: testMonth,
        savingsBucketId: bucket.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(sourceBudget.id);

      const destBudget = await createBudget({
        month: testMonth2,
        savingsBucketId: bucket.id,
        amountIdr: 2000000,
      });
      testBudgetIds.push(destBudget.id);

      const result = await copyBudgets(testMonth, testMonth2);

      expect(result.created.length).toBe(0);
      expect(result.skipped.length).toBe(1);
      expect(result.skipped[0].savingsBucketId).toBe(bucket.id);
    });
  });

  describe("Budget Summary with Savings Buckets", () => {
    it("should include savings bucket budgets in summary", async () => {
      const category = await createTestCategory();
      const bucket = await createTestSavingsBucket();

      const categoryBudget = await createBudget({
        month: testMonth,
        categoryId: category.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(categoryBudget.id);

      const bucketBudget = await createBudget({
        month: testMonth,
        savingsBucketId: bucket.id,
        amountIdr: 500000,
      });
      testBudgetIds.push(bucketBudget.id);

      const summary = await getBudgetSummary(testMonth);

      expect(summary.totalBudget).toBe(1500000);
      expect(summary.items.length).toBeGreaterThanOrEqual(2);

      const categoryItem = summary.items.find(
        (i) => i.categoryId === category.id,
      );
      const bucketItem = summary.items.find(
        (i) => i.savingsBucketId === bucket.id,
      );

      expect(categoryItem?.targetType).toBe("category");
      expect(bucketItem?.targetType).toBe("savings_bucket");
    });
  });

  describe("Savings Budget Spent Calculation", () => {
    const testTransactionIds: string[] = [];
    const testWalletIds: string[] = [];

    async function createTestWallet() {
      const wallet = await createWallet({
        name: `Budget Test Wallet ${nanoid()}`,
        initialBalanceIdr: 10000000,
      });
      testWalletIds.push(wallet.id);
      return wallet;
    }

    afterEach(async () => {
      for (const id of testTransactionIds) {
        try {
          await deleteTransaction(id);
        } catch (_error) {
          // Transaction may already be deleted
        }
      }
      testTransactionIds.length = 0;

      for (const id of testWalletIds) {
        try {
          await deleteWallet(id);
        } catch (_error) {
          // Wallet may already be deleted
        }
      }
      testWalletIds.length = 0;
    });

    it("should count savings contributions toward budget spent amount", async () => {
      const wallet = await createTestWallet();
      const bucket = await createTestSavingsBucket();
      const budget = await createBudget({
        month: testMonth,
        savingsBucketId: bucket.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget.id);

      const contribution = await createSavingsContribution({
        occurredAt: new Date(`${testMonth}T12:00:00Z`),
        walletId: wallet.id,
        bucketId: bucket.id,
        amountIdr: 400000,
        note: "Test contribution for budget",
      });
      testTransactionIds.push(contribution.id);

      const summary = await getBudgetSummary(testMonth);
      const bucketItem = summary.items.find(
        (i) => i.savingsBucketId === bucket.id,
      );

      expect(bucketItem).toBeDefined();
      expect(bucketItem?.spentAmount).toBe(400000);
      expect(bucketItem?.remaining).toBe(600000);
    });

    it("should not count savings withdrawals toward budget spent amount", async () => {
      const wallet = await createTestWallet();
      const bucket = await createTestSavingsBucket();
      const budget = await createBudget({
        month: testMonth,
        savingsBucketId: bucket.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget.id);

      const contribution = await createSavingsContribution({
        occurredAt: new Date(`${testMonth}T12:00:00Z`),
        walletId: wallet.id,
        bucketId: bucket.id,
        amountIdr: 400000,
        note: "Contribution",
      });
      testTransactionIds.push(contribution.id);

      const withdrawal = await createSavingsWithdrawal({
        occurredAt: new Date(`${testMonth}T13:00:00Z`),
        walletId: wallet.id,
        bucketId: bucket.id,
        amountIdr: 100000,
        note: "Withdrawal",
      });
      testTransactionIds.push(withdrawal.id);

      const summary = await getBudgetSummary(testMonth);
      const bucketItem = summary.items.find(
        (i) => i.savingsBucketId === bucket.id,
      );

      expect(bucketItem).toBeDefined();
      expect(bucketItem?.spentAmount).toBe(400000);
      expect(bucketItem?.remaining).toBe(600000);
    });
  });
});
