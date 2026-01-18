import { test, expect } from "@playwright/test";

test.describe("Create Budget", () => {
  test("should display page title", async ({ page }) => {
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Budgets" })).toBeVisible();
  });

  test("should display add budget button", async ({ page }) => {
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("button", { name: "Add Budget" }),
    ).toBeVisible();
  });

  test("should display table", async ({ page }) => {
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("should display summary cards", async ({ page }) => {
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: /Total Budgeted/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Total Spent/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Remaining|Over Budget/i }),
    ).toBeVisible();
  });

  test("should open create dialog when clicking Add Budget", async ({
    page,
  }) => {
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Add Budget" }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test("should close dialog on Cancel", async ({ page }) => {
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Add Budget" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test("should handle page navigation", async ({ page }) => {
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/.*budgets/);
  });

  test("should display table headers", async ({ page }) => {
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
    const table = page.getByRole("table");
    await expect(table.getByText("Category")).toBeVisible();
    await expect(table.getByText("Budget Amount")).toBeVisible();
    await expect(table.getByText("Spent")).toBeVisible();
  });
});
