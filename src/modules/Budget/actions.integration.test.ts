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
  upsertBudgets,
} from "./actions";
import { createCategory, deleteCategory } from "@/modules/Category/actions";
import { getPool, closeDb } from "@/db/drizzle-client";

describe("Budget Integration Tests", () => {
  const testCategoryIds: string[] = [];
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

  async function cleanupTestBudget(id: string) {
    const pool = getPool();
    try {
      await pool.query(`DELETE FROM budgets WHERE id = $1`, [id]);
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }

  async function cleanupTestCategory(id: string) {
    try {
      await deleteCategory(id);
    } catch (error) {
      console.error("Category cleanup error:", error);
    }
  }

  afterEach(async () => {
    // Clean up budgets first (foreign key constraint)
    for (const id of testBudgetIds) {
      await cleanupTestBudget(id);
    }
    testBudgetIds.length = 0;

    // Clean up categories
    for (const id of testCategoryIds) {
      await cleanupTestCategory(id);
    }
    testCategoryIds.length = 0;
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

      // Cleanup immediately after assertions
      await cleanupTestBudget(budget.id);
      testBudgetIds.length = 0;
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

      // Cleanup
      await cleanupTestBudget(budget.id);
      testBudgetIds.length = 0;
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

      // Cleanup
      await cleanupTestBudget(budget1.id);
      await cleanupTestBudget(budget2.id);
      testBudgetIds.length = 0;
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

      // Cleanup
      await cleanupTestBudget(budget.id);
      testBudgetIds.length = 0;
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

      // Cleanup
      await cleanupTestBudget(budget.id);
      testBudgetIds.length = 0;
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

      // Cleanup
      await cleanupTestBudget(budget.id);
      testBudgetIds.length = 0;
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

      // Cleanup
      await cleanupTestBudget(budget1.id);
      await cleanupTestBudget(budget2.id);
      testBudgetIds.length = 0;
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

      // Cleanup
      await cleanupTestBudget(budgetZ.id);
      await cleanupTestBudget(budgetA.id);
      testBudgetIds.length = 0;
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

      // Cleanup
      await cleanupTestBudget(budget.id);
      testBudgetIds.length = 0;
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

      // Cleanup
      await cleanupTestBudget(budget.id);
      testBudgetIds.length = 0;
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
      testBudgetIds.push(budget.id);

      await deleteBudget(budget.id);
      testBudgetIds.length = 0;

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

      // Cleanup
      await cleanupTestBudget(budget.id);
      testBudgetIds.length = 0;
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

      // Cleanup
      await cleanupTestBudget(budget.id);
      testBudgetIds.length = 0;
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

      // Cleanup source and destination budgets
      for (const id of testBudgetIds) {
        await cleanupTestBudget(id);
      }
      for (const b of result.created) {
        await cleanupTestBudget(b.id);
      }
      testBudgetIds.length = 0;
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

      // Cleanup all budgets
      for (const id of testBudgetIds) {
        await cleanupTestBudget(id);
      }
      for (const b of result.created) {
        await cleanupTestBudget(b.id);
      }
      testBudgetIds.length = 0;
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

      // Should succeed but skip the existing budget
      const result = await copyBudgets(testMonth, testMonth2);
      expect(result.created).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].categoryId).toBe(category.id);

      // Cleanup
      for (const id of testBudgetIds) {
        await cleanupTestBudget(id);
      }
      testBudgetIds.length = 0;
    });

    it("should copy only missing budgets when some exist", async () => {
      const cat1 = await createTestCategory();
      const cat2 = await createTestCategory();
      const cat3 = await createTestCategory();

      // Create budgets in source month (cat1, cat2, cat3)
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

      // Create existing budget in destination (cat2 only)
      const destBudget = await createBudget({
        month: testMonth2,
        categoryId: cat2.id,
        amountIdr: 500000,
      });
      testBudgetIds.push(destBudget.id);

      // Should copy cat1 and cat3, skip cat2
      const result = await copyBudgets(testMonth, testMonth2);
      expect(result.created).toHaveLength(2);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].categoryId).toBe(cat2.id);

      const createdCategoryIds = result.created.map((b) => b.category_id);
      expect(createdCategoryIds).toContain(cat1.id);
      expect(createdCategoryIds).toContain(cat3.id);
      expect(createdCategoryIds).not.toContain(cat2.id);

      // Cleanup all budgets
      for (const id of testBudgetIds) {
        await cleanupTestBudget(id);
      }
      for (const b of result.created) {
        await cleanupTestBudget(b.id);
      }
      testBudgetIds.length = 0;
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

      await cleanupTestBudget(budget.id);
      testBudgetIds.length = 0;
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

    it("should reject upsertBudgets with income category", async () => {
      const incomeCategory = await createCategory({
        name: `Income Category ${nanoid()}`,
        type: "income",
      });
      testCategoryIds.push(incomeCategory.id);

      const { upsertBudgets } = await import("./actions");

      await expect(
        upsertBudgets({
          month: testMonth,
          items: [
            {
              categoryId: incomeCategory.id,
              amountIdr: 500000,
            },
          ],
        }),
      ).rejects.toThrow();
    });

    it("should accept upsertBudgets with all expense categories", async () => {
      const expenseCategory1 = await createCategory({
        name: `Expense Category 1 ${nanoid()}`,
        type: "expense",
      });
      testCategoryIds.push(expenseCategory1.id);

      const expenseCategory2 = await createCategory({
        name: `Expense Category 2 ${nanoid()}`,
        type: "expense",
      });
      testCategoryIds.push(expenseCategory2.id);

      const { upsertBudgets } = await import("./actions");

      const result = await upsertBudgets({
        month: testMonth,
        items: [
          {
            categoryId: expenseCategory1.id,
            amountIdr: 500000,
          },
          {
            categoryId: expenseCategory2.id,
            amountIdr: 750000,
          },
        ],
      });

      expect(result.length).toBe(2);
      result.forEach((budget) => {
        testBudgetIds.push(budget.id);
      });

      for (const id of testBudgetIds) {
        await cleanupTestBudget(id);
      }
      testBudgetIds.length = 0;
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

      // Verify note is persisted
      const retrieved = await getBudgetById(budget.id);
      expect(retrieved?.note).toBe("Apartment only");

      // Cleanup
      await cleanupTestBudget(budget.id);
      testBudgetIds.length = 0;
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

      // Cleanup
      await cleanupTestBudget(budget.id);
      testBudgetIds.length = 0;
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

      // Verify note is persisted
      const retrieved = await getBudgetById(budget.id);
      expect(retrieved?.note).toBe("Apartment, Water, and Electricity");

      // Cleanup
      await cleanupTestBudget(budget.id);
      testBudgetIds.length = 0;
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

      // Verify note is removed
      const retrieved = await getBudgetById(budget.id);
      expect(retrieved?.note).toBeNull();

      // Cleanup
      await cleanupTestBudget(budget.id);
      testBudgetIds.length = 0;
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

      // Update without passing note (undefined)
      const updated = await updateBudget(budget.id, 2000000);

      expect(updated.amount_idr).toBe(2000000);
      expect(updated.note).toBe("My note");

      // Cleanup
      await cleanupTestBudget(budget.id);
      testBudgetIds.length = 0;
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

      // Verify note in destination
      const copiedBudgets = await getBudgetsByMonth(testMonth2);
      const copiedBudget = copiedBudgets.find(
        (b) => b.category_id === category.id,
      );
      expect(copiedBudget?.note).toBe("Note to copy");

      // Cleanup
      for (const id of testBudgetIds) {
        await cleanupTestBudget(id);
      }
      testBudgetIds.length = 0;
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

      // Cleanup
      await cleanupTestBudget(budget.id);
      testBudgetIds.length = 0;
    });

    it("should upsert budgets with notes", async () => {
      const category = await createTestCategory();

      const result = await upsertBudgets({
        month: testMonth,
        items: [
          {
            categoryId: category.id,
            amountIdr: 1500000,
            note: "Upserted note",
          },
        ],
      });

      expect(result.length).toBe(1);
      expect(result[0].note).toBe("Upserted note");
      testBudgetIds.push(result[0].id);

      // Verify note is persisted
      const retrieved = await getBudgetById(result[0].id);
      expect(retrieved?.note).toBe("Upserted note");

      // Cleanup
      await cleanupTestBudget(result[0].id);
      testBudgetIds.length = 0;
    });

    it("should update note via upsertBudgets", async () => {
      const category = await createTestCategory();

      // First upsert with initial note
      const result1 = await upsertBudgets({
        month: testMonth,
        items: [
          {
            categoryId: category.id,
            amountIdr: 1000000,
            note: "Initial note",
          },
        ],
      });
      testBudgetIds.push(result1[0].id);

      // Second upsert with updated note
      const result2 = await upsertBudgets({
        month: testMonth,
        items: [
          {
            categoryId: category.id,
            amountIdr: 1000000,
            note: "Updated note",
          },
        ],
      });

      expect(result2[0].note).toBe("Updated note");

      // Verify note is updated
      const retrieved = await getBudgetById(result1[0].id);
      expect(retrieved?.note).toBe("Updated note");

      // Cleanup
      await cleanupTestBudget(result1[0].id);
      testBudgetIds.length = 0;
    });
  });
});
