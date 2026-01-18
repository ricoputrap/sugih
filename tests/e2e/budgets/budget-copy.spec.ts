import { test, expect } from "@playwright/test";
import {
  createCategory,
  createBudget,
  deleteBudget,
  deleteCategory,
} from "../setup/test-db";

test.describe("Copy Budgets from Previous Month", () => {
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

  test("should copy all budgets to empty month", async ({ page, request }) => {
    // Setup: Create a category and budget in January
    const category = await createCategory(request, `Test Food ${Date.now()}`);
    testCategoryIds.push(category.id);

    await createBudget(request, {
      month: "2024-01-01",
      categoryId: category.id,
      amountIdr: 1000000,
    });

    // Navigate to January
    await page.goto("/budgets?month=2024-01-01");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await expect(page.locator("table tbody tr")).toHaveCount(1);

    // Navigate to February (should be empty)
    await page.goto("/budgets?month=2024-02-01");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await expect(page.locator("table tbody tr")).toHaveCount(0);

    // Click "Copy from Previous"
    await page.click('button:has-text("Copy from Previous")');

    // Verify success toast
    await expect(page.locator(".sonner-toast")).toContainText(
      "Copied 1 budget",
    );

    // Verify budget appears in February
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody")).toContainText("1,000,000");
  });

  test("should copy multiple budgets to empty month", async ({
    page,
    request,
  }) => {
    // Setup: Create 3 categories with budgets in January
    const categories = [
      { name: `Test Food ${Date.now()}-1`, amount: 1000000 },
      { name: `Test Food ${Date.now()}-2`, amount: 2000000 },
      { name: `Test Food ${Date.now()}-3`, amount: 3000000 },
    ];

    for (const cat of categories) {
      const category = await createCategory(request, cat.name);
      testCategoryIds.push(category.id);

      await createBudget(request, {
        month: "2024-01-01",
        categoryId: category.id,
        amountIdr: cat.amount,
      });
    }

    // Navigate to January and verify 3 budgets exist
    await page.goto("/budgets?month=2024-01-01");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await expect(page.locator("table tbody tr")).toHaveCount(3);

    // Navigate to February (empty)
    await page.goto("/budgets?month=2024-02-01");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await expect(page.locator("table tbody tr")).toHaveCount(0);

    // Click "Copy from Previous"
    await page.click('button:has-text("Copy from Previous")');

    // Verify success toast
    await expect(page.locator(".sonner-toast")).toContainText(
      "Copied 3 budgets",
    );

    // Verify all 3 budgets appear in February
    await expect(page.locator("table tbody tr")).toHaveCount(3);
  });

  test("should show modal when some budgets are skipped", async ({
    page,
    request,
  }) => {
    // Setup: January has 3 categories
    const sourceCategories = [
      { name: `Test Food ${Date.now()}-A`, amount: 1000000 },
      { name: `Test Food ${Date.now()}-B`, amount: 2000000 },
      { name: `Test Food ${Date.now()}-C`, amount: 3000000 },
    ];

    for (const cat of sourceCategories) {
      const category = await createCategory(request, cat.name);
      testCategoryIds.push(category.id);

      await createBudget(request, {
        month: "2024-01-01",
        categoryId: category.id,
        amountIdr: cat.amount,
      });
    }

    // Setup: February already has 1 budget (category B)
    const existingCategory = await createCategory(
      request,
      sourceCategories[1].name,
    );
    testCategoryIds.push(existingCategory.id);

    await createBudget(request, {
      month: "2024-02-01",
      categoryId: existingCategory.id,
      amountIdr: 500000,
    });

    // Navigate to February and verify 1 budget exists
    await page.goto("/budgets?month=2024-02-01");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await expect(page.locator("table tbody tr")).toHaveCount(1);

    // Click "Copy from Previous"
    await page.click('button:has-text("Copy from Previous")');

    // Verify success toast
    await expect(page.locator(".sonner-toast")).toContainText(
      "Copied 2 budgets",
    );

    // Verify modal appears
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Copy Results");

    // Verify modal shows created count
    await expect(modal).toContainText("Created (2)");

    // Verify modal shows skipped count
    await expect(modal).toContainText("Already Exist (1)");

    // Close modal
    await page.click('button:has-text("Close")');
    await expect(modal).not.toBeVisible();

    // Verify all 3 budgets now in February (1 existing + 2 copied)
    await expect(page.locator("table tbody tr")).toHaveCount(3);
  });

  test("should show info message when all budgets already exist", async ({
    page,
    request,
  }) => {
    // Setup: Create a category with budgets in both months
    const category = await createCategory(request, `Test Food ${Date.now()}`);
    testCategoryIds.push(category.id);

    await createBudget(request, {
      month: "2024-01-01",
      categoryId: category.id,
      amountIdr: 1000000,
    });

    await createBudget(request, {
      month: "2024-02-01",
      categoryId: category.id,
      amountIdr: 1000000,
    });

    // Navigate to February and verify 1 budget exists
    await page.goto("/budgets?month=2024-02-01");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await expect(page.locator("table tbody tr")).toHaveCount(1);

    // Click "Copy from Previous"
    await page.click('button:has-text("Copy from Previous")');

    // Verify info toast (no modal should appear)
    await expect(page.locator(".sonner-toast")).toContainText(
      "All budgets from previous month already exist",
    );

    // Verify no modal appears
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Verify budget count unchanged
    await expect(page.locator("table tbody tr")).toHaveCount(1);
  });

  test("should handle copy when previous month has no budgets", async ({
    page,
    request,
  }) => {
    // Setup: Create a category in February (not January)
    const category = await createCategory(request, `Test Food ${Date.now()}`);
    testCategoryIds.push(category.id);

    await createBudget(request, {
      month: "2024-02-01",
      categoryId: category.id,
      amountIdr: 1000000,
    });

    // Navigate to February and verify 1 budget exists
    await page.goto("/budgets?month=2024-02-01");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await expect(page.locator("table tbody tr")).toHaveCount(1);

    // Navigate to March (January is the previous month but has no budgets)
    await page.goto("/budgets?month=2024-03-01");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Copy button should not be visible since previous month has no budgets
    const copyButton = page.locator('button:has-text("Copy from Previous")');
    await expect(copyButton).not.toBeVisible();
  });

  test("should update budget summary after copy", async ({ page, request }) => {
    // Setup: Create 2 categories with budgets in January
    const categories = [
      { name: `Test Food ${Date.now()}-A`, amount: 1000000 },
      { name: `Test Food ${Date.now()}-B`, amount: 2000000 },
    ];

    for (const cat of categories) {
      const category = await createCategory(request, cat.name);
      testCategoryIds.push(category.id);

      await createBudget(request, {
        month: "2024-01-01",
        categoryId: category.id,
        amountIdr: cat.amount,
      });
    }

    // Navigate to February (empty)
    await page.goto("/budgets?month=2024-02-01");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Copy from January
    await page.click('button:has-text("Copy from Previous")');

    // Wait for toast and table update
    await expect(page.locator(".sonner-toast")).toContainText(
      "Copied 2 budgets",
    );
    await expect(page.locator("table tbody tr")).toHaveCount(2);

    // Verify summary shows total budget
    await expect(page.locator("text=Total Budgeted")).toBeVisible();
  });
});
