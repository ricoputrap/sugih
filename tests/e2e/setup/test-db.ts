/**
 * E2E Test Database Setup
 *
 * Utilities for setting up and cleaning up test data in E2E tests.
 * Uses direct database queries for fast test setup/teardown.
 */

import { APIRequestContext } from "@playwright/test";

/**
 * Test data storage for cleanup after tests
 */
const createdData: {
  categories: string[];
  budgets: string[];
} = {
  categories: [],
  budgets: [],
};

/**
 * Create a category via API
 */
export async function createCategory(
  request: APIRequestContext,
  name: string,
): Promise<{ id: string; name: string }> {
  const response = await request.post("http://localhost:3000/api/categories", {
    headers: {
      "Content-Type": "application/json",
    },
    data: { name },
  });

  if (!response.ok) {
    throw new Error(`Failed to create category: ${await response.text()}`);
  }

  const category = await response.json();
  createdData.categories.push(category.id);

  return category;
}

/**
 * Create a budget via API
 */
export async function createBudget(
  request: APIRequestContext,
  params: {
    month: string;
    categoryId: string;
    amountIdr: number;
  },
): Promise<{
  id: string;
  month: string;
  category_id: string;
  amount_idr: number;
}> {
  const response = await request.post("http://localhost:3000/api/budgets", {
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

  const budget = await response.json();
  createdData.budgets.push(budget.id);

  return budget;
}

/**
 * Delete a budget via API
 */
export async function deleteBudget(
  request: APIRequestContext,
  id: string,
): Promise<void> {
  const response = await request.delete(
    `http://localhost:3000/api/budgets/${id}`,
  );

  if (!response.ok && response.status() !== 404) {
    throw new Error(`Failed to delete budget: ${await response.text()}`);
  }
}

/**
 * Delete a category via API
 */
export async function deleteCategory(
  request: APIRequestContext,
  id: string,
): Promise<void> {
  const response = await request.delete(
    `http://localhost:3000/api/categories/${id}`,
  );

  if (!response.ok && response.status() !== 404) {
    throw new Error(`Failed to delete category: ${await response.text()}`);
  }
}

/**
 * Cleanup all created test data
 * Call this in test.afterEach to ensure clean state
 */
export async function cleanupTestData(
  request: APIRequestContext,
): Promise<void> {
  // Delete budgets first (foreign key constraint)
  for (const id of createdData.budgets) {
    try {
      await deleteBudget(request, id);
    } catch {
      // Ignore errors during cleanup
    }
  }
  createdData.budgets = [];

  // Delete categories
  for (const id of createdData.categories) {
    try {
      await deleteCategory(request, id);
    } catch {
      // Ignore errors during cleanup
    }
  }
  createdData.categories = [];
}

/**
 * Track a category ID for cleanup
 */
export function trackCategory(id: string): void {
  createdData.categories.push(id);
}

/**
 * Track a budget ID for cleanup
 */
export function trackBudget(id: string): void {
  createdData.budgets.push(id);
}

/**
 * Get created data for debugging
 */
export function getCreatedData(): {
  categories: string[];
  budgets: string[];
} {
  return { ...createdData };
}

/**
 * Clear tracking without deleting (use with caution)
 */
export function clearTracking(): void {
  createdData.categories = [];
  createdData.budgets = [];
}
