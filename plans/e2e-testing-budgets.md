# E2E Testing Plan: Budgets Module with Playwright

## Overview

Implement end-to-end tests for the Budgets page to ensure critical user flows work correctly. Focus on testing the complete user journey from UI interactions to API responses.

## Goals

- ✅ Test critical user flows in the Budgets module
- ✅ Ensure "Copy from Previous" feature works end-to-end
- ✅ Validate form validations and error handling
- ✅ Test data persistence and UI updates
- ✅ Catch regressions before production

## ✅ Phase 1: Setup & Configuration (COMPLETED)

### Installed Packages

| Package            | Version      | Purpose                |
| ------------------ | ------------ | ---------------------- |
| `@playwright/test` | 1.57.0       | Core testing framework |
| `chromium`         | 143.0.7499.4 | Browser for testing    |

### Created Files

| File                                    | Status     | Description                                            |
| --------------------------------------- | ---------- | ------------------------------------------------------ |
| `playwright.config.ts`                  | ✅ Created | Main Playwright configuration                          |
| `tests/e2e/setup/test-db.ts`            | ✅ Created | Test data helpers (create/delete categories & budgets) |
| `tests/e2e/fixtures/budgets.ts`         | ✅ Created | Budget fixtures with helper methods                    |
| `tests/e2e/budgets/budget-copy.spec.ts` | ✅ Created | Copy feature E2E tests (6 test cases)                  |
| `tests/e2e/smoke.spec.ts`               | ✅ Created | Smoke tests to verify setup                            |

### Added Test IDs to UI

| Component    | File       | Attribute                          |
| ------------ | ---------- | ---------------------------------- |
| Month Select | `page.tsx` | `data-testid="month-select"`       |
| Copy Button  | `page.tsx` | `data-testid="copy-from-previous"` |

### Quick Start

```bash
# Run smoke tests to verify setup
pnpm playwright test tests/e2e/smoke.spec.ts

# Run copy feature tests
pnpm playwright test tests/e2e/budgets/budget-copy.spec.ts

# Run all E2E tests
pnpm playwright test tests/e2e/
```

## ✅ Phase 1: Test Files Created

| File                                    | Status | Description                 |
| --------------------------------------- | ------ | --------------------------- |
| `playwright.config.ts`                  | ✅     | Core configuration          |
| `tests/e2e/smoke.spec.ts`               | ✅     | 3 smoke tests (all passing) |
| `tests/e2e/setup/test-db.ts`            | ✅     | Test data helpers           |
| `tests/e2e/fixtures/budgets.ts`         | ✅     | Budget fixtures             |
| `tests/e2e/budgets/budget-copy.spec.ts` | ✅     | 6 copy feature tests        |

### Test File Structure

```
tests/
└── e2e/
    ├── setup/
    │   └── test-db.ts          ✅ Database helpers
    ├── fixtures/
    │   └── budgets.ts          ✅ Budget fixtures
    ├── budgets/
    │   ├── budget-copy.spec.ts ✅ 6 tests (Copy feature)
    │   ├── budget-list.spec.ts 🔄 Pending
    │   ├── budget-create.spec.ts 🔄 Pending
    │   ├── budget-edit.spec.ts 🔄 Pending
    │   └── budget-delete.spec.ts 🔄 Pending
    └── smoke.spec.ts           ✅ 3 tests (verify setup)
```

### Git Ignore

Add these to `.gitignore`:

```gitignore
# Playwright
test-results/
playwright-report/
```

## Phase 2: Test Scenarios (Next)

### Priority 1: Core Features (Must Have)

#### 1. Budget List & Month Selection

**File**: `tests/e2e/budgets/budget-list.spec.ts`

**Scenarios**:

- ✅ Display budgets for selected month
- ✅ Switch between months
- ✅ Show empty state when no budgets
- ✅ Display budget summary (total, spent, remaining)
- ✅ Show correct currency formatting (IDR)

#### 2. Create Budget

**File**: `tests/e2e/budgets/budget-create.spec.ts`

**Scenarios**:

- ✅ Open create dialog
- ✅ Fill form and submit
- ✅ Validate required fields
- ✅ Validate amount must be positive
- ✅ Prevent duplicate (same category + month)
- ✅ New budget appears in list
- ✅ Summary updates after creation

#### 3. Edit Budget

**File**: `tests/e2e/budgets/budget-edit.spec.ts`

**Scenarios**:

- ✅ Open edit dialog from table
- ✅ Update amount
- ✅ Validate positive amount
- ✅ Changes reflect in list
- ✅ Summary updates after edit

#### 4. Delete Budget

**File**: `tests/e2e/budgets/budget-delete.spec.ts`

**Scenarios**:

- ✅ Delete budget from table
- ✅ Confirm deletion
- ✅ Budget removed from list
- ✅ Summary updates after deletion

#### 5. Copy from Previous Month

**File**: `tests/e2e/budgets/budget-copy.spec.ts`

**Scenarios**:

- ✅ Copy to empty month (all budgets copied)
- ✅ Copy with some existing (selective copy)
- ✅ Copy with all existing (shows "already exist" message)
- ✅ Show modal with created/skipped details
- ✅ Budgets appear after copy
- ✅ Summary updates correctly

### Priority 2: Edge Cases (Should Have)

- ❌ No budgets in previous month
- ❌ Large amounts (billions)
- ❌ Network errors during operations
- ❌ Concurrent edits (multiple tabs)

## Example Test Implementation

### Budget Copy Test (Complete Example)

```typescript
// tests/e2e/budgets/budget-copy.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Copy Budgets from Previous Month", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to budgets page
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");
  });

  test("should copy all budgets to empty month", async ({ page }) => {
    // Setup: Create budgets in January
    await page.selectOption('[data-testid="month-select"]', "2024-01-01");
    await page.click('button:has-text("Add Budget")');
    await page.selectOption('[name="categoryId"]', "category-1");
    await page.fill('[name="amountIdr"]', "1000000");
    await page.click('button[type="submit"]');

    // Wait for success toast
    await expect(page.locator(".sonner-toast")).toContainText("created");

    // Switch to February (empty month)
    await page.selectOption('[data-testid="month-select"]', "2024-02-01");
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

  test("should show modal when some budgets are skipped", async ({ page }) => {
    // Setup: January has 3 budgets
    await page.selectOption('[data-testid="month-select"]', "2024-01-01");
    // ... create 3 budgets ...

    // Setup: February already has 1 budget (same category)
    await page.selectOption('[data-testid="month-select"]', "2024-02-01");
    // ... create 1 budget ...

    // Click "Copy from Previous"
    await page.click('button:has-text("Copy from Previous")');

    // Verify modal appears
    await expect(page.locator("dialog")).toBeVisible();
    await expect(page.locator("dialog")).toContainText("Copy Results");

    // Verify modal shows created budgets
    await expect(page.locator("dialog")).toContainText("Created (2)");

    // Verify modal shows skipped budgets
    await expect(page.locator("dialog")).toContainText("Already Exist (1)");

    // Close modal
    await page.click('button:has-text("Close")');

    // Verify all 3 budgets now in February
    await expect(page.locator("table tbody tr")).toHaveCount(3);
  });

  test("should show info message when all budgets exist", async ({ page }) => {
    // Setup: Both months have identical budgets
    // ... setup code ...

    await page.click('button:has-text("Copy from Previous")');

    // Verify info toast
    await expect(page.locator(".sonner-toast")).toContainText(
      "All budgets from previous month already exist",
    );

    // Verify no modal appears
    await expect(page.locator("dialog")).not.toBeVisible();
  });
});
```

## Test Data Strategy

### Option 1: API Seeding (Recommended)

```typescript
// tests/e2e/fixtures/budgets.ts
export async function createTestBudget(data: {
  month: string;
  categoryId: string;
  amountIdr: number;
}) {
  const response = await fetch("http://localhost:3000/api/budgets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}
```

### Option 2: UI Seeding

```typescript
// Use the UI to create test data (slower but tests full flow)
```

### Option 3: Database Seeding

```typescript
// Direct database inserts (fastest but bypasses API validation)
```

## Best Practices

### 1. Use Data Attributes for Selectors

```typescript
// ❌ Bad - fragile
await page.click("button.bg-blue-500");

// ✅ Good - stable
await page.click('[data-testid="create-budget-btn"]');
```

### 2. Wait for Network Idle

```typescript
await page.goto("/budgets");
await page.waitForLoadState("networkidle");
```

### 3. Use Page Object Model (for complex pages)

```typescript
// tests/e2e/pages/budgets-page.ts
export class BudgetsPage {
  constructor(private page: Page) {}

  async selectMonth(month: string) {
    await this.page.selectOption('[data-testid="month-select"]', month);
  }

  async copyFromPrevious() {
    await this.page.click('[data-testid="copy-from-previous"]');
  }
}
```

### 4. Cleanup After Tests

```typescript
test.afterEach(async ({ page }) => {
  // Delete test data
  await cleanupTestData();
});
```

## Running Tests

### Local Development

```bash
# Run all E2E tests
pnpm playwright test

# Run specific test file
pnpm playwright test tests/e2e/budgets/budget-copy.spec.ts

# Run in headed mode (see browser)
pnpm playwright test --headed

# Run in debug mode
pnpm playwright test --debug

# Open test report
pnpm playwright show-report
```

### CI/CD Integration

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "24.8.0"
      - name: Install dependencies
        run: pnpm install
      - name: Install Playwright
        run: pnpm playwright install --with-deps
      - name: Run E2E tests
        run: pnpm playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## ✅ Implementation Timeline

| Phase       | Tasks                            | Status        | Duration          |
| ----------- | -------------------------------- | ------------- | ----------------- |
| **Phase 1** | Setup & Configuration            | ✅ Complete   | 2 hours           |
|             | - Install Playwright             | ✅            |                   |
|             | - Configure playwright.config.ts | ✅            |                   |
|             | - Setup test database helpers    | ✅            |                   |
|             | - Add data-testid attributes     | ✅            |                   |
| **Phase 2** | Core Tests                       | 🔄 Pending    | 4 hours           |
|             | - Budget list & month selection  | 🔄            |                   |
|             | - Create budget                  | 🔄            |                   |
|             | - Edit budget                    | 🔄            |                   |
|             | - Delete budget                  | 🔄            |                   |
| **Phase 3** | Copy Feature Tests               | ✅ Complete   | 3 hours           |
|             | - Copy to empty month            | ✅            |                   |
|             | - Copy with existing budgets     | ✅            |                   |
|             | - Modal interactions             | ✅            |                   |
| **Phase 4** | CI/CD Integration                | 🔄 Pending    | 1 hour            |
|             | - Setup GitHub Actions           | 🔄            |                   |
|             | - Configure test reporting       | 🔄            |                   |
| **Total**   |                                  | **~10 hours** | **~5 hours done** |

### Test Results

| Test Suite    | Tests | Status         |
| ------------- | ----- | -------------- |
| Smoke Tests   | 3/3   | ✅ Passing     |
| Copy Feature  | 6/6   | ✅ Implemented |
| Core Features | 0/4   | 🔄 Pending     |

## ✅ Success Metrics

- ✅ Playwright setup complete
- ✅ 3 smoke tests passing
- ✅ 6 copy feature tests implemented
- 🔄 Zero flaky tests (in progress)
- 🔄 100% pass rate in CI (in progress)
- 🔄 Tests run in < 5 minutes (in progress)

## Next Steps

1. ✅ Install Playwright
2. ✅ Configure playwright.config.ts
3. ✅ Add data-testid attributes to UI components
4. ✅ Implement budget-copy.spec.ts
5. 🔄 Implement budget-list.spec.ts
6. 🔄 Implement budget-create.spec.ts
7. 🔄 Implement budget-edit.spec.ts
8. 🔄 Implement budget-delete.spec.ts
9. 🔄 Setup CI/CD integration
10. 🔄 Run tests regularly in development

## Quick Commands

```bash
# Run smoke tests (verify setup)
pnpm playwright test tests/e2e/smoke.spec.ts

# Run copy feature tests
pnpm playwright test tests/e2e/budgets/budget-copy.spec.ts

# Run all E2E tests
pnpm playwright test tests/e2e/

# Open test report
pnpm playwright show-report
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Next.js + Playwright Guide](https://nextjs.org/docs/testing#playwright)
