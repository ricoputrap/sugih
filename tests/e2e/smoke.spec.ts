/**
 * Smoke Test for Budgets Page
 *
 * A simple test to verify Playwright setup is working correctly.
 * Run this first to confirm your E2E testing environment is ready.
 */

import { test, expect } from "@playwright/test";

test.describe("Budgets Page Smoke Test", () => {
  test("should load the budgets page without errors", async ({ page }) => {
    // Navigate to budgets page
    const response = await page.goto("/budgets", {
      waitUntil: "domcontentloaded",
    });

    // Verify page loads successfully
    expect(response?.status()).toBeLessThan(400);

    // Wait for React to hydrate
    await page.waitForTimeout(1000);

    // Verify page heading exists (use more specific selector for "Budgets" heading)
    await expect(page.locator("h1:has-text('Budgets')")).toBeVisible();
  });

  test("should display page structure", async ({ page }) => {
    await page.goto("/budgets", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Verify main structural elements exist
    await expect(page.locator("h1:has-text('Budgets')")).toBeVisible();

    // Verify Add Budget button is present
    await expect(page.locator('button:has-text("Add Budget")')).toBeVisible();

    // Verify month selector trigger is present
    await expect(page.locator('[data-testid="month-select"]')).toBeVisible();

    // Verify table is present
    await expect(page.locator("table")).toBeVisible();
  });

  test("should respond to navigation", async ({ page }) => {
    // Navigate to budgets page
    await page.goto("/budgets", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Verify we can navigate to the page
    await expect(page).toHaveURL(/.*budgets/);
  });
});
