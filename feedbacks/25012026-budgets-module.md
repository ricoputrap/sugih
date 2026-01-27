# Feedbacks on Budgets Module

Date: Sunday, 25 January 2026

## 1. Filter by Month - Status: DONE

Currently, the month selector/dropdown is placed inside its own "Select Month" container, separated from the "Budget Details" container. I want this month selector to be moved out from its own container into the "Budget Details" container. My suggestion is to put it on the top-right corner of this "Budget Details" container.

## 2. Copy Budgets - Status: DONE

Currently, I can see a button [Copy from Previous] on the top-right corner of the page. When I click on it, it will automatically create new budgets for THIS MONTH by copy & paste the existing budgets set for the previous month.

I want to enhance this functionality. Instead of only creating new budgets only for THIS MONTH by copying from PREVOUS MONTH, I want to also be able to create new budgets for specific month by copying from the existing budgets set for specific previous month.

For example, today is 25 January 2026 and I have already budgets set for November and December 2025. I want to be able to create new budget for February 2026 by copying from existing budgets set for November 2025.

## 3. Budget Data View - Status: DONE

Currently, there is only 1 data view to see budgets: list view (data table). I want also to see the budgets as cards (grid view). And I want to be able to switch between list view and grid view by choosing it on the top-right corner of this "Budget Details" container.

## 4. Budget Category - Status: PLANNED

When creating/updating a budget, only "expense" categories should be available in the category selector. There is no such "income" budget as it does not make sense, no? Fix it to make sure only "expense" categories are available in the category selector when creating/updating a budget.

## 5. Allocating budget for savings - Status: PLANNED

I want to be able to allocate a budget for a savings bucket. For example, today is 25 January 2026, and I want to create a budget for "Child School" savings bucket for Febuary 2026. You know, the goal is only to make sure I allocate my money precisely. Give me better solution if any.

## 6. Code Cleanup - Status: DONE

Once every enhancements above are completed, I want:

1. All unused code related to Budgets module to be removed.
2. All test files to be refined and make sure all mock/dummy data are deleted after finishing the tests.

### Completed Actions:

1. ✅ Removed unused `eslint-disable` comment from `CopyBudgetDialog.tsx`
2. ✅ Fixed Tailwind class names: replaced `flex-shrink-0` with `shrink-0` in `CopyBudgetDialog.tsx` and `BudgetCardGrid.tsx`
3. ✅ Verified all integration tests properly clean up mock data in `afterEach` hooks
4. ✅ All 1961 tests pass
