# Plan: Budget Category - Expense Only Filter (Enhancement 4)

**Goal:** When creating/updating a budget, only "expense" categories should be available in the category selector. Income categories should be excluded since budgets are for spending limits.

## Context

- The `BudgetDialogForm.tsx` component fetches categories from `/api/categories` and filters out archived ones
- Server-side validation in `actions.ts` already rejects income categories (lines 163-167)
- Categories have a `type` field: `"income"` | `"expense"`
- We need to filter categories on the frontend to only show expense types

## Module Structure Check

- [x] Confirmed that new files are colocated within their modules.
- [x] Confirmed types are using .ts and are properly exported.
- [x] Confirmed that every logic change has a planned test file.

## Files to Modify

1. `sugih/src/modules/Budget/components/BudgetDialogForm.tsx` - Filter categories by expense type
2. `sugih/src/modules/Budget/components/BudgetDialogForm.test.tsx` - Add tests for expense-only filtering

## Execution Steps

- [x] **Step 1**: Update `BudgetDialogForm.tsx` to filter categories to only show expense types.
  - Modify the `Category` interface to include `type: "income" | "expense"`
  - Update `fetchCategories` to filter by `type === "expense"` in addition to `!archived`
  - Update the placeholder text to indicate expense categories only

  **AND** update `BudgetDialogForm.test.tsx` with tests:
  - Add test: "should only display expense categories in the selector"
  - Add test: "should not display income categories in the selector"
  - Update mock data to include both income and expense categories
  - Verify that expense categories are shown and income categories are hidden

## Technical Details

### Current Code (BudgetDialogForm.tsx)

```typescript
interface Category {
  id: string;
  name: string;
  archived: boolean;
}

// In fetchCategories:
const activeCategories = data.filter((cat: Category) => !cat.archived);
setCategories(activeCategories);
```

### Updated Code

```typescript
interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  archived: boolean;
}

// In fetchCategories:
const expenseCategories = data.filter(
  (cat: Category) => !cat.archived && cat.type === "expense",
);
setCategories(expenseCategories);
```

## Test Scenarios

1. **Filter validation**: Mock categories API to return mix of income/expense - verify only expense shown
2. **Empty state**: If no expense categories exist, show appropriate message
3. **Selection works**: Can still select and submit with expense category

## Acceptance Criteria

- [x] Only expense categories appear in the category dropdown when creating a budget
- [x] Income categories are never shown in the budget category selector
- [x] Existing functionality (archived filter) still works
- [x] Tests pass and cover the new filtering logic

## Completion Summary

✅ **COMPLETED** - All steps executed successfully:

1. **Updated BudgetDialogForm.tsx**:
   - Added `type: "income" | "expense"` to Category interface
   - Modified `fetchCategories()` to filter by `!archived && type === "expense"`
   - Updated empty state message to "No active expense categories found"

2. **Updated BudgetDialogForm.test.tsx**:
   - Added 4 new tests for expense-only filtering:
     - "should fetch categories with type field"
     - "should only display expense categories in the selector"
     - "should not display income categories in the selector"
     - "should filter out both archived and income categories"
     - "should filter out archived expense categories"
   - Updated mock data to include both income and expense categories with type field

3. **Test Results**:
   - All 17 tests in BudgetDialogForm.test.tsx pass ✓
   - All 1966 tests in full test suite pass ✓
   - No test data left behind (all mocks auto-cleaned)

4. **Implementation Details**:
   - Server-side validation in actions.ts already rejects income categories
   - Frontend now provides better UX by filtering categories upfront
   - Backward compatibility maintained - existing functionality preserved
