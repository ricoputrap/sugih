# Plan: Enhanced Copy Budgets - Select Source and Destination Months

## Overview

Currently, the [Copy from Previous] button automatically copies budgets FROM the previous month TO the currently selected month. This enhancement allows users to select both a source month and a destination month when copying budgets, enabling more flexible budget planning.

**Example Use Case:** Today is January 25, 2026. User has budgets for November and December 2025. User wants to create budgets for February 2026 by copying from November 2025 (not December 2025).

## Affected Files

- `sugih/src/modules/Budget/components/CopyBudgetDialog.tsx` - **NEW** - Modal dialog for enhanced copy functionality
- `sugih/src/modules/Budget/components/CopyBudgetDialog.test.tsx` - **NEW** - Tests for the new dialog
- `sugih/src/app/budgets/page.tsx` - Update to use new dialog instead of direct copy

## Module Structure Check

- [x] Confirmed that new files are colocated within the Budget module (`sugih/src/modules/Budget/components/`).
- [x] Confirmed types are using `.ts` and are properly exported.
- [x] Confirmed that every logic change has a planned test file.

## Current State

```tsx
// In page.tsx - [Copy from Previous] button
<Button onClick={handleCopyFromPrevious}>
  <Copy className="mr-2 h-4 w-4" />
  Copy from Previous
</Button>;

// handleCopyFromPrevious automatically calculates previous month
const handleCopyFromPrevious = async () => {
  const previousMonth = calculatePreviousMonth(selectedMonth);
  await fetch("/api/budgets/copy", {
    body: JSON.stringify({
      fromMonth: previousMonth,
      toMonth: selectedMonth, // Always current selected month
    }),
  });
};
```

## Target State

```tsx
// In page.tsx - [Copy Budgets] button opens dialog
<Button onClick={() => setCopyDialogOpen(true)}>
  <Copy className="mr-2 h-4 w-4" />
  Copy Budgets
</Button>

// CopyBudgetDialog allows selecting both months
<CopyBudgetDialog
  open={copyDialogOpen}
  onOpenChange={setCopyDialogOpen}
  onCopy={handleCopyBudgets}
  defaultDestinationMonth={selectedMonth}
/>
```

## Execution Steps

- [x] **Step 1**: Create `sugih/src/modules/Budget/components/CopyBudgetDialog.tsx` with:
  - Two month dropdowns: "Copy From" (source) and "Copy To" (destination)
  - Source dropdown should show months that HAVE existing budgets (fetch from API)
  - Destination dropdown should show available months (current + future months)
  - Validation: source and destination must be different
  - Submit button to trigger copy
  - Cancel button to close dialog
    **AND** create `sugih/src/modules/Budget/components/CopyBudgetDialog.test.tsx` with unit tests for:
  - Rendering the dialog
  - Month selection validation
  - Disabling submit when source === destination
  - onCopy callback with correct parameters

- [x] **Step 2**: Create a helper function/API to fetch months that have existing budgets (for the source dropdown). This can be done by:
  - Option A: Create a new endpoint `GET /api/budgets/months` that returns distinct months with budgets ✅
  - Option B: Use existing `listBudgets()` and extract unique months client-side
    **AND** write tests for the months fetching logic. ✅

- [x] **Step 3**: Update `sugih/src/app/budgets/page.tsx` to:
  - Import and use the new `CopyBudgetDialog` component ✅
  - Replace `handleCopyFromPrevious` with `handleCopyBudgets(fromMonth, toMonth)` ✅
  - Add state for `copyDialogOpen` ✅
  - Update button text from "Copy from Previous" to "Copy Budgets" ✅
    **AND** update any existing E2E tests for the copy functionality.

- [x] **Step 4**: Update the `CopyResultModal` to display which months were involved in the copy operation (e.g., "Copied from November 2025 to February 2026"). ✅
      **AND** update `CopyResultModal` tests if they exist.

- [ ] **Step 5**: Run all tests and verify the complete flow works:
  - Open dialog → Select source month → Select destination month → Copy → See results
    **AND** ensure all integration and E2E tests pass.

## API Considerations

The existing `/api/budgets/copy` endpoint already supports `fromMonth` and `toMonth` parameters, so no backend changes are needed. The `copyBudgets` action in `sugih/src/modules/Budget/actions.ts` already handles:

- Validation that source ≠ destination
- Skipping categories that already exist in destination
- Returning `created` and `skipped` arrays

## New Component Props Interface

```typescript
interface CopyBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCopy: (fromMonth: string, toMonth: string) => Promise<void>;
  defaultDestinationMonth?: string;
  isLoading?: boolean;
}

interface MonthOption {
  value: string; // "YYYY-MM-01" format
  label: string; // "January 2026" format
  hasBudgets?: boolean; // For source dropdown filtering
}
```

## Acceptance Criteria

1. [Copy Budgets] button opens a dialog instead of copying immediately.
2. User can select any month with existing budgets as the source.
3. User can select any month as the destination (including future months).
4. Validation prevents selecting the same month for source and destination.
5. Copy operation shows results in the existing CopyResultModal.
6. Quick copy from previous month is still possible (pre-select previous month as source).
7. All unit and E2E tests pass.

## Notes

- Consider pre-selecting the previous month as source and current month as destination for convenience.
- The source month dropdown should only show months that actually have budgets (to prevent "No budgets found" errors).
- Consider showing a count of budgets next to each source month option (e.g., "November 2025 (5 budgets)").

## Implementation Summary

### Completed Steps:

1. **CopyBudgetDialog Component** (`CopyBudgetDialog.tsx`)
   - Renders a dialog with source and destination month selectors
   - Fetches available months with budgets from `/api/budgets/months`
   - Pre-selects previous month as source when available
   - Pre-selects current/default month as destination
   - Validates that source and destination are different
   - Shows loading state while fetching months
   - Displays error messages when fetch fails
   - Calls `onCopy` callback with selected months
   - 12 passing unit tests

2. **API Endpoint** (`/api/budgets/months`)
   - New GET endpoint that returns distinct months with budget counts
   - Added `getMonthsWithBudgets()` function to Budget actions
   - Returns array of objects with `value`, `label`, and `budgetCount`
   - Tests for the months fetching logic

3. **Updated Budgets Page** (`page.tsx`)
   - Replaced `handleCopyFromPrevious` with `handleCopyBudgets(fromMonth, toMonth)`
   - Added `copyDialogOpen` state
   - Changed button from "Copy from Previous" to "Copy Budgets"
   - Integrated CopyBudgetDialog component
   - Updated copy result handling to include source and destination months

4. **Enhanced CopyResultModal**
   - Added `fromMonth` and `toMonth` props
   - Displays formatted month names in description (e.g., "Copied from November 2025 to February 2026")
   - Falls back to generic text when months not provided
