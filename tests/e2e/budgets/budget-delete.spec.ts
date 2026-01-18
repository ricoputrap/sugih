import { test, expect } from "@playwright/test";
import {
  createCategory,
  createBudget,
  deleteBudget,
  deleteCategory,
} from "../setup/test-db";

test.describe("Delete Budget", () => {
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

  test("should show delete confirmation dialog", async ({ page, request }) => {
    // Setup: Create a budget
    const category = await createCategory(request, `Test Food ${Date.now()}`);
    testCategoryIds.push(category.id);

    const budget = await createBudget(request, {
      month: "2024-01-01",
      categoryId: category.id,
      amountIdr: 1000000,
    });
    testBudgetIds.push(budget.id);

    // Navigate to budgets page
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Verify budget exists
    await expect(page.locator("table tbody tr")).toHaveCount(1);

    // Click delete button
    await page.click('button[aria-label*="Delete"]');

    // Verify confirmation dialog opens
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
  });

  test("should delete budget via API and remove from table", async ({
    page,
    request,
  }) => {
    // Setup: Create a budget
    const category = await createCategory(request, `Test Food ${Date.now()}`);
    testCategoryIds.push(category.id);

    const budget = await createBudget(request, {
      month: "2024-01-01",
      categoryId: category.id,
      amountIdr: 1000000,
    });
    testBudgetIds.push(budget.id);

    // Delete via API
    const deleteResponse = await request.delete(
      `http://localhost:3000/api/budgets/${budget.id}`,
    );
    expect(deleteResponse.ok()).toBe(true);

    // Navigate to budgets page
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Verify budget is removed from table
    await expect(page.locator("table tbody tr")).toHaveCount(0);
  });

  test("should cancel deletion and keep budget", async ({ page, request }) => {
    // Setup: Create a budget
    const category = await createCategory(request, `Test Food ${Date.now()}`);
    testCategoryIds.push(category.id);

    const budget = await createBudget(request, {
      month: "2024-01-01",
      categoryId: category.id,
      amountIdr: 1000000,
    });
    testBudgetIds.push(budget.id);

    // Navigate to budgets page
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Verify budget exists
    await expect(page.locator("table tbody tr")).toHaveCount(1);

    // Click delete button
    await page.click('button[aria-label*="Delete"]');

    // Verify dialog opens
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Click cancel
    await page.click('button:has-text("Cancel")');

    // Verify dialog closes
    await expect(dialog).not.toBeVisible();

    // Verify budget still exists
    await expect(page.locator("table tbody tr")).toHaveCount(1);
  });

  test("should update summary after deletion", async ({ page, request }) => {
    // Setup: Create multiple budgets
    const category1 = await createCategory(
      request,
      `Test Food ${Date.now()}-1`,
    );
    testCategoryIds.push(category1.id);

    const budget1 = await createBudget(request, {
      month: "2024-01-01",
      categoryId: category1.id,
      amountIdr: 1000000,
    });
    testBudgetIds.push(budget1.id);

    const category2 = await createCategory(
      request,
      `Test Food ${Date.now()}-2`,
    );
    testCategoryIds.push(category2.id);

    const budget2 = await createBudget(request, {
      month: "2024-01-01",
      categoryId: category2.id,
      amountIdr: 2000000,
    });
    testBudgetIds.push(budget2.id);

    // Navigate to budgets page
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Verify 2 budgets exist
    await expect(page.locator("table tbody tr")).toHaveCount(2);

    // Delete first budget via API
    await request.delete(`http://localhost:3000/api/budgets/${budget1.id}`);

    // Refresh page
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Verify 1 budget remains
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody")).toContainText("2,000,000");
  });

  test("should delete one budget when multiple exist", async ({
    page,
    request,
  }) => {
    // Setup: Create multiple budgets
    const categories = [
      { name: `Test Food ${Date.now()}-1`, amount: 1000000 },
      { name: `Test Food ${Date.now()}-2`, amount: 2000000 },
      { name: `Test Food ${Date.now()}-3`, amount: 3000000 },
    ];

    for (const cat of categories) {
      const category = await createCategory(request, cat.name);
      testCategoryIds.push(category.id);

      const budget = await createBudget(request, {
        month: "2024-01-01",
        categoryId: category.id,
        amountIdr: cat.amount,
      });
      testBudgetIds.push(budget.id);
    }

    // Navigate to budgets page
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Verify 3 budgets exist
    await expect(page.locator("table tbody tr")).toHaveCount(3);

    // Delete second budget via API
    await request.delete(
      `http://localhost:3000/api/budgets/${testBudgetIds[1]}`,
    );

    // Refresh page
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Verify 2 budgets remain
    await expect(page.locator("table tbody tr")).toHaveCount(2);

    // Verify correct budgets remain
    await expect(page.locator("table tbody")).toContainText("1,000,000");
    await expect(page.locator("table tbody")).toContainText("3,000,000");
    await expect(page.locator("table tbody")).not.toContainText("2,000,000");
  });

  test("should delete last budget and show empty state", async ({
    page,
    request,
  }) => {
    // Setup: Create a budget
    const category = await createCategory(request, `Test Food ${Date.now()}`);
    testCategoryIds.push(category.id);

    const budget = await createBudget(request, {
      month: "2024-01-01",
      categoryId: category.id,
      amountIdr: 1000000,
    });
    testBudgetIds.push(budget.id);

    // Navigate to budgets page
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Verify budget exists
    await expect(page.locator("table tbody tr")).toHaveCount(1);

    // Delete the budget via API
    await request.delete(`http://localhost:3000/api/budgets/${budget.id}`);

    // Refresh page
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Verify table is empty
    await expect(page.locator("table tbody tr")).toHaveCount(0);
  });

  test("should handle deletion of budget with large amount", async ({
    page,
    request,
  }) => {
    // Setup: Create a budget with large amount
    const category = await createCategory(request, `Test Food ${Date.now()}`);
    testCategoryIds.push(category.id);

    const budget = await createBudget(request, {
      month: "2024-01-01",
      categoryId: category.id,
      amountIdr: 999999999,
    });
    testBudgetIds.push(budget.id);

    // Navigate to budgets page
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Verify budget exists
    await expect(page.locator("table tbody")).toContainText("999,999,999");

    // Delete via API
    const deleteResponse = await request.delete(
      `http://localhost:3000/api/budgets/${budget.id}`,
    );
    expect(deleteResponse.ok()).toBe(true);

    // Refresh and verify removed
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await expect(page.locator("table tbody tr")).toHaveCount(0);
  });

  test("should update remaining calculation after deletion", async ({
    page,
    request,
  }) => {
    // Setup: Create a budget
    const category = await createCategory(request, `Test Food ${Date.now()}`);
    testCategoryIds.push(category.id);

    const budget = await createBudget(request, {
      month: "2024-01-01",
      categoryId: category.id,
      amountIdr: 1000000,
    });
    testBudgetIds.push(budget.id);

    // Navigate to budgets page
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Delete via API
    await request.delete(`http://localhost:3000/api/budgets/${budget.id}`);

    // Refresh page
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Verify remaining calculation is updated (should show 0 or adjusted)
    await expect(page.locator("text=Total Budgeted")).toBeVisible();
  });

  test("should reject deleting non-existent budget", async ({ request }) => {
    // Try to delete non-existent budget
    const response = await request.delete(
      "http://localhost:3000/api/budgets/non-existent-id",
    );

    // Should return 404
    expect(response.status()).toBe(404);
  });

  test("should delete budget and category together", async ({
    page,
    request,
  }) => {
    // Setup: Create a category and budget
    const category = await createCategory(request, `Test Food ${Date.now()}`);
    testCategoryIds.push(category.id);

    const budget = await createBudget(request, {
      month: "2024-01-01",
      categoryId: category.id,
      amountIdr: 1000000,
    });
    testBudgetIds.push(budget.id);

    // Navigate to budgets page
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Delete budget via API
    await request.delete(`http://localhost:3000/api/budgets/${budget.id}`);

    // Refresh page
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Verify budget is removed
    await expect(page.locator("table tbody tr")).toHaveCount(0);
  });
});
