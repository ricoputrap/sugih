# Plan: Bulk Delete Transactions

## Overview

Implement the ability to delete multiple transactions at once (soft delete). This feature will allow users to select multiple transactions and delete them in a single operation **from the UI** (with the UI triggering the new bulk delete API endpoint).

## Module Structure Check

- [x] Confirmed that new files are colocated within their modules.
- [x] Confirmed types are using .ts and are properly exported.
- [x] Confirmed that every logic change has a planned test file.

## Implementation Approach

**Backend:**

1. Add `bulkDeleteTransactions` action in Transaction module
2. Add `DELETE /api/transactions` endpoint for bulk operations
3. Accept array of transaction IDs in request body

**Frontend (UI Trigger):**

1. Add multi-select support on the Transactions list (checkboxes per row + “Select all”)
2. Add a “Delete selected” bulk action (button/menu item)
3. On confirm, call `DELETE /api/transactions` with selected IDs
4. Refresh the list / reconcile local state after success

**Pattern:**

- Soft delete only (sets `deleted_at` timestamp)
- Validate all IDs exist before deleting
- Return count of deleted transactions
- Use database transaction for atomicity
- UI should use an explicit confirmation dialog and show progress/errors

## Execution Steps

- [x] **Step 1**: Add `BulkDeleteTransactionsSchema` to `/src/modules/Transaction/schema.ts` **AND** update `/src/modules/Transaction/schema.test.ts`.
  - Schema: `{ ids: z.array(z.string().min(1)).min(1).max(100) }`
  - Max 100 transactions per request for safety

- [x] **Step 2**: Implement `bulkDeleteTransactions` action in `/src/modules/Transaction/actions.ts` **AND** add tests to `/src/modules/Transaction/actions.integration.test.ts`.
  - Accept array of IDs
  - Validate all transactions exist and are not already deleted
  - Use single UPDATE query with `WHERE id IN (...)`
  - Return `{ deletedCount: number, failedIds: string[] }`

- [x] **Step 3**: Add `DELETE` handler to `/src/app/api/transactions/route.ts` **AND** update `/src/app/api/transactions/route.test.ts`.
  - Accept `{ ids: string[] }` in request body
  - Return `{ message, deletedCount }`
  - Handle validation errors and not-found cases

- [x] **Step 4 (UI)**: Add bulk delete controls to the Transactions UI **AND** add frontend tests (unit and/or e2e) for the user flow.
  - Add per-row checkbox and selection state (including “Select all on page”)
  - Add “Delete selected (N)” bulk action (disabled when N = 0)
  - Show confirmation dialog:
    - Title: “Delete transactions?”
    - Body: “This will move N transactions to trash (soft delete).”
    - Confirm button: “Delete”
    - Cancel button: “Cancel”
  - On confirm:
    - Call the API: `DELETE /api/transactions` with `{ ids }`
    - Show loading state (disable bulk controls while request is in-flight)
    - On success: show toast/notification and remove deleted rows from UI (or refetch list)
    - On partial failure: show error with `failedIds` and keep those rows selected
    - On validation errors: show message and do not change selection
  - Ensure selection state resets after successful delete and after navigating away
  - Add tests covering:
    - Selecting multiple rows enables bulk delete
    - Confirm dialog appears and triggers API call
    - Success updates the list
    - Partial failure keeps failed rows selected and displays details

- [ ] **Step 5**: Run full test suite to verify no regressions.

## API Design

### Request

```http
DELETE /api/transactions
Content-Type: application/json

{
  "ids": ["txn1", "txn2", "txn3"]
}
```

### Response (Success)

```json
{
  "message": "Transactions deleted successfully",
  "deletedCount": 3
}
```

### Response (Partial Failure)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some transactions could not be deleted",
    "details": {
      "deletedCount": 2,
      "failedIds": ["txn3"]
    }
  }
}
```

## Files to Modify/Create

| File                                                  | Action                                             |
| ----------------------------------------------------- | -------------------------------------------------- |
| `src/modules/Transaction/schema.ts`                   | Add `BulkDeleteTransactionsSchema`                 |
| `src/modules/Transaction/schema.test.ts`              | Add schema validation tests                        |
| `src/modules/Transaction/actions.ts`                  | Add `bulkDeleteTransactions` function              |
| `src/modules/Transaction/actions.integration.test.ts` | Add integration tests                              |
| `src/app/api/transactions/route.ts`                   | Add DELETE handler                                 |
| `src/app/api/transactions/route.test.ts`              | Add API route tests                                |
| Transactions list UI (page/component)                 | Add multi-select + bulk delete action              |
| Frontend tests (unit/e2e)                             | Add coverage for selecting + confirming + deleting |

## Success Criteria

- [ ] User can select multiple transactions in the UI and trigger Bulk Delete without manually crafting API requests
- [ ] UI shows confirmation before deleting
- [ ] UI calls `DELETE /api/transactions` with selected IDs
- [ ] Can delete multiple transactions in one API call
- [ ] Validates all transaction IDs before deletion
- [ ] Uses soft delete (sets `deleted_at`)
- [ ] Returns count of deleted transactions
- [ ] All tests pass
- [ ] No performance regression
