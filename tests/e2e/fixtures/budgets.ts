import { Page, APIRequestContext } from "@playwright/test";

/**
 * Budget Test Fixtures
 *
 * Helper functions for E2E testing of the Budgets module.
 * Provides utilities for creating test data via API.
 */

export class BudgetsFixtures {
  constructor(
    private page: Page,
    private request: APIRequestContext,
  ) {}

  /**
   * Create a test category via API
   */
  async createCategory(name: string): Promise<{ id: string; name: string }> {
    const response = await this.request.post("http://localhost:3000/api/categories", {
      headers: {
        "Content-Type": "application/json",
      },
      data: { name },
    });

    if (!response.ok) {
      throw new Error(`Failed to create category: ${await response.text()}`);
    }

    return response.json();
  }

  /**
   * Create a test budget via API
   */
  async createBudget(params: {
    month: string;
    categoryId: string;
    amountIdr: number;
  }): Promise<{
    id: string;
    month: string;
    category_id: string;
    amount_idr: number;
  }> {
    const response = await this.request.post("http://localhost:3000/api/budgets", {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        month: params.month,
        categoryId: params.categoryId,
        amountIdr: params.amountIdr,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to create budget: ${await response.text()}`);
    }

    return response.json();
  }

  /**
   * Delete a budget via API
   */
  async deleteBudget(id: string): Promise<void> {
    const response = await this.request.delete(
      `http://localhost:3000/api/budgets/${id}`,
    );

    if (!response.ok && response.status() !== 404) {
      throw new Error(`Failed to delete budget: ${await response.text()}`);
    }
  }

  /**
   * Delete a category via API
   */
  async deleteCategory(id: string): Promise<void> {
    const response = await this.request.delete(
      `http://localhost:3000/api/categories/${id}`,
    );

    if (!response.ok && response.status() !== 404) {
      throw new Error(`Failed to delete category: ${await response.text()}`);
    }
  }

  /**
   * Navigate to budgets page and wait for load
   */
  async gotoBudgetsPage(month?: string): Promise<void> {
    await this.page.goto("/budgets");
    await this.page.waitForLoadState("networkidle");

    if (month) {
      await this.selectMonth(month);
    }
  }

  /**
   * Select a month from the dropdown
   */
  async selectMonth(monthValue: string): Promise<void> {
    await this.page.selectOption('[data-testid="month-select"]', monthValue);
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Click the "Add Budget" button
   */
  async clickAddBudget(): Promise<void> {
    await this.page.click('button:has-text("Add Budget")');
  }

  /**
   * Click the "Copy from Previous" button
   */
  async clickCopyFromPrevious(): Promise<void> {
    await this.page.click('button:has-text("Copy from Previous")');
  }

  /**
   * Fill the create budget dialog
   */
  async fillBudgetDialog(params: {
    categoryId: string;
    amountIdr: string;
  }): Promise<void> {
    await this.page.selectOption(
      '[data-testid="budget-form-category"]',
      params.categoryId,
    );
    await this.page.fill('[data-testid="budget-form-amount"]', params.amountIdr);
  }

  /**
   * Submit the budget dialog
   */
  async submitBudgetDialog(): Promise<void> {
    await this.page.click('button[type="submit"]:has-text("Save")');
  }

  /**
   * Wait for success toast
   */
  async waitForSuccessToast(message?: string): Promise<void> {
    if (message) {
      await this.page.waitForSelector(`.sonner-toast:has-text("${message}")`);
    } else {
      await this.page.waitForSelector('.sonner-toast:has-text("success")');
    }
  }

  /**
   * Wait for error toast
   */
  async waitForErrorToast(message?: string): Promise<void> {
    if (message) {
      await this.page.waitForSelector(`.sonner-toast:has-text("${message}")`);
    } else {
      await this.page.waitForSelector('.sonner-toast:has-text("error")');
    }
  }

  /**
   * Get the number of budget rows in the table
   */
  async getBudgetRowCount(): Promise<number> {
    return this.page.locator("table tbody tr").count();
  }

  /**
   * Check if budget exists in table by amount
   */
  async budgetExistsByAmount(amount: string): Promise<boolean> {
    return this.page.locator(`table tbody:has-text("${amount}")`).isVisible();
  }

  /**
   * Get budget summary values
   */
  async getBudgetSummary(): Promise<{
    totalBudget: string;
    totalSpent: string;
    remaining: string;
  }> {
    const cards = this.page.locator(".grid gap-4.md\\:grid-cols-3 .card");
    const totalBudget = cards.nth(0).locator(".text-2xl").textContent();
    const totalSpent = cards.nth(1).locator(".text-2xl").textContent();
    const remaining = cards.nth(2).locator(".text-2xl").textContent();

    return {
      totalBudget: (await totalBudget) || "",
      totalSpent: (await totalSpent) || "",
      remaining: (await remaining) || "",
    };
  }

  /**
   * Setup test data for copy tests
   */
  async setupCopyTestData(params: {
    sourceMonth: string;
    targetMonth: string;
    categories: Array<{ name: string; amount: number }>;
    existingInTarget?: Array<{ name: string; amount: number }>;
  }): Promise<{
    sourceCategoryIds: string[];
    targetCategoryIds: string[];
  }> {
    const sourceCategoryIds: string[] = [];
    const targetCategoryIds: string[] = [];

    // Create categories and budgets for source month
    for (const cat of params.categories) {
      const category = await this.createCategory(cat.name);
      sourceCategoryIds.push(category.id);

      await this.createBudget({
        month: params.sourceMonth,
        categoryId: category.id,
        amountIdr: cat.amount,
      });
    }

    // Create existing budgets in target month (if specified)
    if (params.existingInTarget) {
      for (const cat of params.existingInTarget) {
        // Reuse same category names to test selective copy
        const category = await this.createCategory(cat.name);
        targetCategoryIds.push(category.id);

        await this.createBudget({
          month: params.targetMonth,
          categoryId: category.id,
          amountIdr: cat.amount,
        });
      }
    }

    return { sourceCategoryIds, targetCategoryIds };
  }

  /**
   * Cleanup test data
   */
  async cleanup(params: {
    categoryIds: string[];
    budgetIds?: string[];
  }): Promise<void> {
    // Delete budgets first (foreign key constraint)
    if (params.budgetIds) {
      for (const id of params.budgetIds) {
        await this.deleteBudget(id);
      }
    }

    // Delete categories
    for (const id of params.categoryIds) {
      await this.deleteCategory(id);
    }
  }
}

/**
 * Fixture function to be used with Playwright test
 */
export async function createBudgetsFixtures(
  page: Page,
  request: APIRequestContext,
) {
  return new BudgetsFixtures(page, request);
}
