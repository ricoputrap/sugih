/**
 * E2E Test for Bulk Delete Transactions
 *
 * Tests the complete UI flow for bulk deleting transactions:
 * - Selecting multiple transactions with checkboxes
 * - Triggering bulk delete from the UI
 * - Confirmation dialog
 * - API call to DELETE /api/transactions
 * - Success/error handling and UI updates
 */

import { test, expect } from "@playwright/test";

test.describe("Bulk Delete Transactions", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to transactions page
    await page.goto("/transactions", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
  });

  test("should display bulk delete controls when transactions are loaded", async ({
    page,
  }) => {
    // Wait for transactions table to load
    await expect(page.locator("table")).toBeVisible();

    // Check that select all checkbox is present
    await expect(
      page.locator('input[type="checkbox"][aria-label="Select all transactions"]'),
    ).toBeVisible();

    // Check that individual checkboxes are present for each row
    const checkboxes = page.locator('tbody input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should allow selecting and deselecting individual transactions", async ({
    page,
  }) => {
    // Wait for transactions table to load
    await expect(page.locator("table")).toBeVisible();

    // Get the first checkbox in the table body
    const firstCheckbox = page.locator('tbody input[type="checkbox"]').first();

    // Click to select the first transaction
    await firstCheckbox.click();

    // Verify it's checked
    await expect(firstCheckbox).toBeChecked();

    // Verify the row is highlighted
    await expect(
      page.locator("tbody tr").first(),
    ).toHaveClass(/bg-muted\/50/);

    // Click again to deselect
    await firstCheckbox.click();

    // Verify it's unchecked
    await expect(firstCheckbox).not.toBeChecked();

    // Verify the row is no longer highlighted
    await expect(page.locator("tbody tr").first()).not.toHaveClass(
      /bg-muted\/50/,
    );
  });

  test("should show 'Delete Selected' button when transactions are selected", async ({
    page,
  }) => {
    // Wait for transactions table to load
    await expect(page.locator("table")).toBeVisible();

    // Initially, delete button should not be visible
    await expect(
      page.locator('button:has-text("Delete Selected")'),
    ).not.toBeVisible();

    // Select first transaction
    await page.locator('tbody input[type="checkbox"]').first().click();

    // Delete button should now be visible
    await expect(
      page.locator('button:has-text("Delete Selected")'),
    ).toBeVisible();

    // Verify button shows count
    await expect(
      page.locator('button:has-text("Delete Selected (1)")'),
    ).toBeVisible();
  });

  test("should select all transactions with select all checkbox", async ({
    page,
  }) {
    // Wait for transactions table to load
    await expect(page.locator("table")).toBeVisible();

    // Get initial count of selected checkboxes
    const initialSelected = page.locator('tbody input[type="checkbox"]:checked');
    const initialCount = await initialSelected.count();

    // Click select all checkbox
    await page
      .locator('input[type="checkbox"][aria-label="Select all transactions"]')
      .click();

    // Verify all checkboxes are now checked
    const allCheckboxes = page.locator('tbody input[type="checkbox"]');
    const totalCount = await allCheckboxes.count();

    for (let i = 0; i < totalCount; i++) {
      await expect(allCheckboxes.nth(i)).toBeChecked();
    }

    // Verify all rows are highlighted
    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      await expect(rows.nth(i)).toHaveClass(/bg-muted\/50/);
    }

    // Verify delete button shows correct count
    await expect(
      page.locator(`button:has-text("Delete Selected (${totalCount})")`),
    ).toBeVisible();
  });

  test("should open confirmation dialog when delete button is clicked", async ({
    page,
  }) => {
    // Wait for transactions table to load
    await expect(page.locator("table")).toBeVisible();

    // Select a transaction
    await page.locator('tbody input[type="checkbox"]').first().click();

    // Click delete button
    await page
      .locator('button:has-text("Delete Selected")')
      .click();

    // Confirmation dialog should be visible
    await expect(
      page.locator('[role="dialog"]'),
    ).toBeVisible();

    // Verify dialog title
    await expect(
      page.locator("text=Delete transactions?"),
    ).toBeVisible();

    // Verify dialog description mentions number of transactions
    const description = page.locator('[role="dialog"] p');
    await expect(description).toContainText("transaction");

    // Verify Cancel and Delete buttons are present
    await expect(page.locator("text=Cancel")).toBeVisible();
    await expect(page.locator("text=Delete")).toBeVisible();
  });

  test("should close dialog and do nothing when cancel is clicked", async ({
    page,
  }) => {
    // Wait for transactions table to load
    await expect(page.locator("table")).toBeVisible();

    // Select a transaction
    await page.locator('tbody input[type="checkbox"]').first().click();

    // Click delete button to open dialog
    await page
      .locator('button:has-text("Delete Selected")')
      .click();

    // Dialog should be open
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Click Cancel
    await page.locator("text=Cancel").click();

    // Dialog should be closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Selection should be preserved
    await expect(
      page.locator('tbody input[type="checkbox"]').first(),
    ).toBeChecked();
  });

  test("should handle bulk delete successfully", async ({ page }) => {
    // Wait for transactions table to load
    await expect(page.locator("table")).toBeVisible();

    // Select first two transactions
    await page.locator('tbody input[type="checkbox"]').first().click();
    await page.locator('tbody input[type="checkbox"]').nth(1).click();

    // Get the IDs of selected transactions
    const firstRow = page.locator("tbody tr").first();
    const secondRow = page.locator("tbody tr").nth(1);

    // Click delete button
    await page
      .locator('button:has-text("Delete Selected")')
      .click();

    // Dialog should be open
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Mock the API response to avoid actual deletion
    await page.route("DELETE /api/transactions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Transactions deleted successfully",
          deletedCount: 2,
        }),
      });
    });

    // Click Delete button
    await page.locator('[role="dialog"] button:has-text("Delete")').click();

    // Dialog should be closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Should show success toast
    await expect(
      page.locator('text=/Successfully deleted.*transactions?/'),
    ).toBeVisible({ timeout: 5000 });

    // Selection should be cleared
    const checkboxes = page.locator('tbody input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await expect(checkboxes.nth(i)).not.toBeChecked();
    }

    // Delete button should be hidden again
    await expect(
      page.locator('button:has-text("Delete Selected")'),
    ).not.toBeVisible();
  });

  test("should handle partial failure gracefully", async ({ page }) => {
    // Wait for transactions table to load
    await expect(page.locator("table")).toBeVisible();

    // Select first two transactions
    await page.locator('tbody input[type="checkbox"]').first().click();
    await page.locator('tbody input[type="checkbox"]').nth(1).click();

    // Mock API response with partial failure
    await page.route("DELETE /api/transactions", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            message: "Some transactions could not be deleted",
            issues: {
              code: "VALIDATION_ERROR",
              details: {
                deletedCount: 1,
                failedIds: ["some-failed-id"],
              },
            },
          },
        }),
      });
    });

    // Click delete button
    await page
      .locator('button:has-text("Delete Selected")')
      .click();

    // Click Delete in dialog
    await page.locator('[role="dialog"] button:has-text("Delete")').click();

    // Dialog should be closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Should show success message for deleted items
    await expect(
      page.locator('text=/Successfully deleted.*transaction?/'),
    ).toBeVisible({ timeout: 5000 });

    // Should show error message for failed items
    await expect(
      page.locator('text=/Failed to delete.*transaction?/'),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should disable controls during deletion", async ({ page }) => {
    // Wait for transactions table to load
    await expect(page.locator("table")).toBeVisible();

    // Select a transaction
    await page.locator('tbody input[type="checkbox"]').first().click();

    // Click delete button
    await page
      .locator('button:has-text("Delete Selected")')
      .click();

    // Mock slow API response
    await page.route("DELETE /api/transactions", async (route) => {
      await page.waitForTimeout(2000); // 2 second delay
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Transactions deleted successfully",
          deletedCount: 1,
        }),
      });
    });

    // Click Delete
    await page.locator('[role="dialog"] button:has-text("Delete")').click();

    // Delete button in dialog should be disabled and show loading state
    const deleteButton = page.locator(
      '[role="dialog"] button:has-text("Delete")',
    );
    await expect(deleteButton).toBeDisabled();
    await expect(deleteButton).toContainText("Deleting...");

    // Cancel button should also be disabled
    const cancelButton = page.locator('[role="dialog"] button:has-text("Cancel")');
    await expect(cancelButton).toBeDisabled();

    // Wait for request to complete
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("should clear selection after successful deletion", async ({ page }) => {
    // Wait for transactions table to load
    await expect(page.locator("table")).toBeVisible();

    // Select multiple transactions
    await page.locator('tbody input[type="checkbox"]').first().click();
    await page.locator('tbody input[type="checkbox"]').nth(1).click();
    await page.locator('tbody input[type="checkbox"]').nth(2).click();

    // Verify all are selected
    const checkboxes = page.locator('tbody input[type="checkbox"]');
    expect(await checkboxes.nth(0)).toBeChecked();
    expect(await checkboxes.nth(1)).toBeChecked();
    expect(await checkboxes.nth(2)).toBeChecked();

    // Mock successful deletion
    await page.route("DELETE /api/transactions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Transactions deleted successfully",
          deletedCount: 3,
        }),
      });
    });

    // Trigger deletion
    await page
      .locator('button:has-text("Delete Selected")')
      .click();
    await page.locator('[role="dialog"] button:has-text("Delete")').click();

    // Wait for completion
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({
      timeout: 5000,
    });

    // Verify all selections are cleared
    expect(await checkboxes.nth(0)).not.toBeChecked();
    expect(await checkboxes.nth(1)).not.toBeChecked();
    expect(await checkboxes.nth(2)).not.toBeChecked();

    // Verify no rows are highlighted
    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      await expect(rows.nth(i)).not.toHaveClass(/bg-muted\/50/);
    }

    // Verify delete button is hidden
    await expect(
      page.locator('button:has-text("Delete Selected")'),
    ).not.toBeVisible();
  });

  test("should work with select all on large transaction lists", async ({
    page,
  }) => {
    // This test verifies that select all works on multiple pages
    // or when there are many transactions

    // Wait for transactions table to load
    await expect(page.locator("table")).toBeVisible();

    // Get total number of transactions
    const totalCheckboxes = page.locator('tbody input[type="checkbox"]');
    const totalCount = await totalCheckboxes.count();

    if (totalCount > 0) {
      // Click select all
      await page
        .locator('input[type="checkbox"][aria-label="Select all transactions"]')
        .click();

      // Verify all are selected
      for (let i = 0; i < totalCount; i++) {
        await expect(totalCheckboxes.nth(i)).toBeChecked();
      }

      // Verify delete button shows correct count
      await expect(
        page.locator(`button:has-text("Delete Selected (${totalCount})")`),
      ).toBeVisible();

      // Deselect all
      await page
        .locator('input[type="checkbox"][aria-label="Select all transactions"]')
        .click();

      // Verify none are selected
      for (let i = 0; i < totalCount; i++) {
        await expect(totalCheckboxes.nth(i)).not.toBeChecked();
      }

      // Verify delete button is hidden
      await expect(
        page.locator('button:has-text("Delete Selected")'),
      ).not.toBeVisible();
    }
  });

  test("should not show bulk delete controls when there are no transactions", async ({
    page,
  }) => {
    // This test assumes we might have a way to filter to show no results
    // For now, we'll just check the initial state

    // Wait for page to load
    await expect(page.locator("h1:has-text('Transactions')")).toBeVisible();

    // If there are no transactions, check that bulk delete controls are not visible
    const emptyState = page.locator("text=No transactions found");
    const isEmptyVisible = await emptyState.isVisible();

    if (isEmptyVisible) {
      await expect(
        page.locator('input[type="checkbox"][aria-label="Select all transactions"]'),
      ).not.toBeVisible();
      await expect(
        page.locator('button:has-text("Delete Selected")'),
      ).not.toBeVisible();
    }
  });
});
