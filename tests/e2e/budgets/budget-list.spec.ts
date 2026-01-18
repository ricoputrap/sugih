import { test, expect } from "@playwright/test";
import {
  createCategory,
  createBudget,
  deleteBudget,
  deleteCategory,
} from "../setup/test-db";

test.describe("Budget List", () => {
  const testCategoryIds: string[] = [];
  const testBudgetIds: string[] = [];

  const cleanupTestData = async (request: APIRequestContext) => {
    for (const id of testBudgetIds) {
      try {
        await deleteBudget(request, id);
      } catch {
        // Ignore errors during cleanup
      }
    }
    testBudgetIds.length = 0;

    for (const id of testCategoryIds) {
      try {
        await deleteCategory(request, id);
      } catch {
        // Ignore errors during cleanup
      }
    }
    testCategoryIds.length = 0;
  };

  test.afterEach(async ({ request }) => {
    await cleanupTestData(request);
  });

  test("should display page title", async ({ page }) => {
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Budgets" })).toBeVisible();
  });

  test("should display add budget button", async ({ page }) => {
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('button:has-text("Add Budget")')).toBeVisible();
  });

  test("should display table", async ({ page }) => {
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("table")).toBeVisible();
  });

  test("should show created budget in table", async ({ page, request }) => {
    const category = await createCategory(request, `Test ${Date.now()}`);
    testCategoryIds.push(category.id);

    await createBudget(request, {
      month: "2024-01-01",
      categoryId: category.id,
      amountIdr: 1000000,
    });

    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody")).toContainText("1,000,000");
  });

  test("should show category name in table", async ({ page, request }) => {
    const categoryName = `Test Category ${Date.now()}`;
    const category = await createCategory(request, categoryName);
    testCategoryIds.push(category.id);

    await createBudget(request, {
      month: "2024-01-01",
      categoryId: category.id,
      amountIdr: 500000,
    });

    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await expect(page.locator("table")).toContainText(categoryName);
  });

  test("should display multiple budgets", async ({ page, request }) => {
    const cat1 = await createCategory(request, `Test A ${Date.now()}`);
    const cat2 = await createCategory(request, `Test B ${Date.now()}`);
    testCategoryIds.push(cat1.id, cat2.id);

    await createBudget(request, {
      month: "2024-01-01",
      categoryId: cat1.id,
      amountIdr: 1000000,
    });
    await createBudget(request, {
      month: "2024-01-01",
      categoryId: cat2.id,
      amountIdr: 2000000,
    });

    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await expect(page.locator("table tbody tr")).toHaveCount(2);
  });

  test("should format large amount with commas", async ({ page, request }) => {
    const category = await createCategory(request, `Test ${Date.now()}`);
    testCategoryIds.push(category.id);

    await createBudget(request, {
      month: "2024-01-01",
      categoryId: category.id,
      amountIdr: 5000000,
    });

    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await expect(page.locator("table tbody")).toContainText("5,000,000");
  });

  test("should show summary cards", async ({ page, request }) => {
    const category = await createCategory(request, `Test ${Date.now()}`);
    testCategoryIds.push(category.id);

    await createBudget(request, {
      month: "2024-01-01",
      categoryId: category.id,
      amountIdr: 1000000,
    });

    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await expect(page.locator("text=Total Budgeted")).toBeVisible();
    await expect(page.locator("text=Total Spent")).toBeVisible();
    await expect(
      page.locator("text=Remaining, text=Over Budget"),
    ).toBeVisible();
  });

  test("should handle page reload", async ({ page, request }) => {
    const category = await createCategory(request, `Test ${Date.now()}`);
    testCategoryIds.push(category.id);

    await createBudget(request, {
      month: "2024-01-01",
      categoryId: category.id,
      amountIdr: 1000000,
    });

    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await expect(page.locator("table tbody tr")).toHaveCount(1);
  });
});
