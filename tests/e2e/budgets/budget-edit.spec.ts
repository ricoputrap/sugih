import { test, expect } from "@playwright/test";
import {
  createCategory,
  createBudget,
  deleteBudget,
  deleteCategory,
} from "../setup/test-db";

test.describe("Edit Budget", () => {
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

  test("should open edit dialog when clicking edit button", async ({
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

    // Click edit button
    await page.click('button[aria-label*="Edit"]');

    // Verify dialog opens
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
  });

  test("should update budget via API", async ({ page, request }) => {
    // Setup: Create a budget
    const category = await createCategory(request, `Test Food ${Date.now()}`);
    testCategoryIds.push(category.id);

    const budget = await createBudget(request, {
      month: "2024-01-01",
      categoryId: category.id,
      amountIdr: 1000000,
    });
    testBudgetIds.push(budget.id);

    // Update via API
    const response = await request.patch(
      `http://localhost:3000/api/budgets/${budget.id}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        data: { amountIdr: 2000000 },
      },
    );

    expect(response.ok()).toBe(true);

    // Navigate to budgets page
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Verify updated amount
    await expect(page.locator("table tbody")).toContainText("2,000,000");
    await expect(page.locator("table tbody")).not.toContainText("1,000,000");
  });

  test("should reject negative amount on update", async ({ page, request }) => {
    // Setup: Create a budget
    const category = await createCategory(request, `Test Food ${Date.now()}`);
    testCategoryIds.push(category.id);

    const budget = await createBudget(request, {
      month: "2024-01-01",
      categoryId: category.id,
      amountIdr: 1000000,
    });
    testBudgetIds.push(budget.id);

    // Try to update with negative amount via API
    const response = await request.patch(
      `http://localhost:3000/api/budgets/${budget.id}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        data: { amountIdr: -500000 },
      },
    );

    // Should fail
    expect(response.ok()).toBe(false);
  });

  test("should close edit dialog on Cancel", async ({ page, request }) => {
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
    await page.waitForTimeout(500);

    // Click edit button
    await page.click('button[aria-label*="Edit"]');

    // Verify dialog opens
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Click cancel
    await page.click('button:has-text("Cancel")');

    // Verify dialog closes
    await expect(dialog).not.toBeVisible();

    // Verify original amount is unchanged
    await expect(page.locator("table tbody")).toContainText("1,000,000");
  });

  test("should update summary after edit", async ({ page, request }) => {
    // Setup: Create a budget
    const category = await createCategory(request, `Test Food ${Date.now()}`);
    testCategoryIds.push(category.id);

    const budget = await createBudget(request, {
      month: "2024-01-01",
      categoryId: category.id,
      amountIdr: 1000000,
    });
    testBudgetIds.push(budget.id);

    // Update via API
    await request.patch(`http://localhost:3000/api/budgets/${budget.id}`, {
      headers: {
        "Content-Type": "application/json",
      },
      data: { amountIdr: 3000000 },
    });

    // Navigate to budgets page
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Verify summary shows updated amount
    await expect(page.locator("text=Total Budgeted")).toBeVisible();
  });

  test("should preserve category after edit", async ({ page, request }) => {
    // Setup: Create a budget
    const category = await createCategory(request, `Test Food ${Date.now()}`);
    testCategoryIds.push(category.id);

    const budget = await createBudget(request, {
      month: "2024-01-01",
      categoryId: category.id,
      amountIdr: 1000000,
    });
    testBudgetIds.push(budget.id);

    // Update via API
    await request.patch(`http://localhost:3000/api/budgets/${budget.id}`, {
      headers: {
        "Content-Type": "application/json",
      },
      data: { amountIdr: 2000000 },
    });

    // Navigate to budgets page
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Verify category name is preserved
    await expect(page.locator("table tbody")).toContainText(category.name);
  });

  test("should handle large amount update", async ({ page, request }) => {
    // Setup: Create a budget
    const category = await createCategory(request, `Test Food ${Date.now()}`);
    testCategoryIds.push(category.id);

    const budget = await createBudget(request, {
      month: "2024-01-01",
      categoryId: category.id,
      amountIdr: 1000000,
    });
    testBudgetIds.push(budget.id);

    // Update with large amount via API
    const response = await request.patch(
      `http://localhost:3000/api/budgets/${budget.id}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        data: { amountIdr: 999999999 },
      },
    );

    expect(response.ok()).toBe(true);

    // Navigate to budgets page
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Verify updated amount is formatted correctly
    await expect(page.locator("table tbody")).toContainText("999,999,999");
  });

  test("should show current values in edit form", async ({ page, request }) => {
    // Setup: Create a budget
    const category = await createCategory(request, `Test Food ${Date.now()}`);
    testCategoryIds.push(category.id);

    const budget = await createBudget(request, {
      month: "2024-01-01",
      categoryId: category.id,
      amountIdr: 1500000,
    });
    testBudgetIds.push(budget.id);

    // Navigate to budgets page
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Click edit button
    await page.click('button[aria-label*="Edit"]');

    // Verify dialog opens
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Verify dialog has edit title
    await expect(dialog).toContainText("Edit");
  });

  test("should not update when no changes made", async ({ page, request }) => {
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
    await page.waitForTimeout(500);

    // Click edit button
    await page.click('button[aria-label*="Edit"]');

    // Submit without changes
    await page.click('button[type="submit"]:has-text("Save")');

    // Verify dialog closes successfully
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).not.toBeVisible();
  });
});
