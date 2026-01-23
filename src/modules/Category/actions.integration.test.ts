import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { nanoid } from "nanoid";
import {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  archiveCategory,
  restoreCategory,
  deleteCategory,
  getCategoryStats,
} from "./actions";
import { getDb, closeDb } from "@/db/drizzle-client";
import { categories } from "./schema";
import { eq } from "drizzle-orm";

describe("Category Integration Tests", () => {
  const testCategoryIds: string[] = [];

  async function cleanupTestCategory(id: string) {
    const db = getDb();
    try {
      await db.delete(categories).where(eq(categories.id, id));
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }

  afterEach(async () => {
    for (const id of testCategoryIds) {
      await cleanupTestCategory(id);
    }
    testCategoryIds.length = 0;
  });

  afterAll(async () => {
    await closeDb();
  });

  describe("Create Category", () => {
    it("should create a new category with valid data", async () => {
      const name = `Test Category ${nanoid()}`;
      const category = await createCategory({ name, type: "expense" });
      testCategoryIds.push(category.id);

      expect(category.id).toBeDefined();
      expect(category.name).toBe(name);
      expect(category.type).toBe("expense");
      expect(category.archived).toBe(false);
    });

    it("should create an income category", async () => {
      const name = `Income Category ${nanoid()}`;
      const category = await createCategory({ name, type: "income" });
      testCategoryIds.push(category.id);

      expect(category.id).toBeDefined();
      expect(category.name).toBe(name);
      expect(category.type).toBe("income");
      expect(category.archived).toBe(false);
    });

    it("should create an expense category", async () => {
      const name = `Expense Category ${nanoid()}`;
      const category = await createCategory({ name, type: "expense" });
      testCategoryIds.push(category.id);

      expect(category.id).toBeDefined();
      expect(category.name).toBe(name);
      expect(category.type).toBe("expense");
      expect(category.archived).toBe(false);
    });

    it("should reject category creation without type", async () => {
      const name = `No Type ${nanoid()}`;
      await expect(createCategory({ name })).rejects.toThrow();
    });

    it("should reject duplicate category name", async () => {
      const name = `Duplicate ${nanoid()}`;
      const category = await createCategory({ name, type: "expense" });
      testCategoryIds.push(category.id);

      await expect(createCategory({ name, type: "expense" })).rejects.toThrow(
        "already exists",
      );
    });

    it("should reject empty category name", async () => {
      await expect(createCategory({ name: "" })).rejects.toThrow();
    });
  });

  describe("List Categories", () => {
    it("should list all categories ordered by name", async () => {
      const cat1 = await createCategory({
        name: `Zebra ${nanoid()}`,
        type: "expense",
      });
      const cat2 = await createCategory({
        name: `Alpha ${nanoid()}`,
        type: "income",
      });
      testCategoryIds.push(cat1.id, cat2.id);

      const allCategories = await listCategories();
      const testCategories = allCategories.filter((c) =>
        testCategoryIds.includes(c.id),
      );

      expect(testCategories[0].name).toContain("Alpha");
      expect(testCategories[1].name).toContain("Zebra");
    });

    it("should include type field in listed categories", async () => {
      const incomeCat = await createCategory({
        name: `Income ${nanoid()}`,
        type: "income",
      });
      const expenseCat = await createCategory({
        name: `Expense ${nanoid()}`,
        type: "expense",
      });
      testCategoryIds.push(incomeCat.id, expenseCat.id);

      const allCategories = await listCategories();
      const testCategories = allCategories.filter((c) =>
        testCategoryIds.includes(c.id),
      );

      const income = testCategories.find((c) => c.id === incomeCat.id);
      const expense = testCategories.find((c) => c.id === expenseCat.id);

      expect(income?.type).toBe("income");
      expect(expense?.type).toBe("expense");
    });
  });

  describe("Get Category by ID", () => {
    it("should return category when ID exists", async () => {
      const created = await createCategory({
        name: `Get Test ${nanoid()}`,
        type: "expense",
      });
      testCategoryIds.push(created.id);

      const retrieved = await getCategoryById(created.id);
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.type).toBe("expense");
    });

    it("should return null when ID does not exist", async () => {
      const retrieved = await getCategoryById("non-existent-id");
      expect(retrieved).toBeNull();
    });
  });

  describe("Update Category", () => {
    it("should update category name", async () => {
      const created = await createCategory({
        name: `Update Test ${nanoid()}`,
        type: "expense",
      });
      testCategoryIds.push(created.id);

      const newName = `Updated ${nanoid()}`;
      const updated = await updateCategory(created.id, { name: newName });

      expect(updated.name).toBe(newName);
      expect(updated.type).toBe("expense");
    });

    it("should update category type from expense to income", async () => {
      const created = await createCategory({
        name: `Type Update ${nanoid()}`,
        type: "expense",
      });
      testCategoryIds.push(created.id);

      const updated = await updateCategory(created.id, { type: "income" });

      expect(updated.type).toBe("income");
      expect(updated.name).toBe(created.name);
    });

    it("should update category type from income to expense", async () => {
      const created = await createCategory({
        name: `Type Update ${nanoid()}`,
        type: "income",
      });
      testCategoryIds.push(created.id);

      const updated = await updateCategory(created.id, { type: "expense" });

      expect(updated.type).toBe("expense");
      expect(updated.name).toBe(created.name);
    });

    it("should update both name and type", async () => {
      const created = await createCategory({
        name: `Multi Update ${nanoid()}`,
        type: "expense",
      });
      testCategoryIds.push(created.id);

      const newName = `Updated ${nanoid()}`;
      const updated = await updateCategory(created.id, {
        name: newName,
        type: "income",
      });

      expect(updated.name).toBe(newName);
      expect(updated.type).toBe("income");
    });
  });

  describe("Archive Category", () => {
    it("should archive an active category", async () => {
      const created = await createCategory({
        name: `Archive Test ${nanoid()}`,
        type: "expense",
      });
      testCategoryIds.push(created.id);

      const archived = await archiveCategory(created.id);
      expect(archived.archived).toBe(true);
      expect(archived.type).toBe("expense");
    });
  });

  describe("Restore Category", () => {
    it("should restore an archived category", async () => {
      const created = await createCategory({
        name: `Restore Test ${nanoid()}`,
        type: "income",
      });
      testCategoryIds.push(created.id);

      await archiveCategory(created.id);
      const restored = await restoreCategory(created.id);
      expect(restored.archived).toBe(false);
      expect(restored.type).toBe("income");
    });
  });

  describe("Delete Category", () => {
    it("should permanently delete a category", async () => {
      const created = await createCategory({
        name: `Delete Test ${nanoid()}`,
        type: "expense",
      });

      await deleteCategory(created.id);

      const retrieved = await getCategoryById(created.id);
      expect(retrieved).toBeNull();
    });
  });

  describe("Get Category Stats", () => {
    it("should return zero stats for category with no transactions", async () => {
      const created = await createCategory({
        name: `Stats Test ${nanoid()}`,
        type: "expense",
      });
      testCategoryIds.push(created.id);

      const stats = await getCategoryStats(created.id);
      expect(stats.transactionCount).toBe(0);
      expect(stats.totalAmount).toBe(0);
    });
  });
});
