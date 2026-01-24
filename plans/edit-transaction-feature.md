# Plan: Edit Transaction Feature

## Goal

Enable users to edit existing transactions by adding update functionality across the backend, API, and frontend layers.

## Current State Analysis

- ✅ Transaction creation works for all types (expense, income, transfer, savings)
- ✅ Transaction deletion (soft, restore, permanent) implemented
- ✅ TransactionTable displays transactions with dropdown menu (currently only has Delete)
- ✅ AddTransactionDialog handles creating new transactions
- ❌ No update schemas in `/src/modules/Transaction/schema.ts`
- ❌ No `updateTransaction` action in `/src/modules/Transaction/actions.ts`
- ❌ No PUT/PATCH endpoint in `/src/app/api/transactions/[id]/route.ts`
- ❌ No edit UI component

## Module Structure Check

- [x] Confirmed that EditTransactionDialog is colocated in `/src/modules/Transaction/components/`
- [x] Confirmed update schemas use `.ts` files and are properly exported from `schema.ts`
- [x] Confirmed update action is added to `actions.ts` with corresponding integration tests
- [x] Confirmed API route handler is added to existing `[id]/route.ts` with tests
- [x] Confirmed all logic changes have planned test files

## Execution Steps

### Phase 1: Backend Schema & Validation

- [x] **Step 1**: Add update schemas to `/src/modules/Transaction/schema.ts` **AND** add validation tests to `/src/modules/Transaction/schema.test.ts`
  - Create `ExpenseUpdateSchema` with optional fields (can update any field except transaction type)
  - Create `IncomeUpdateSchema` with optional fields
  - Create `TransferUpdateSchema` with optional fields and validation for different wallets
  - Create `SavingsContributeUpdateSchema` with optional fields
  - Create `SavingsWithdrawUpdateSchema` with optional fields
  - Export TypeScript types for each update schema
  - Note: Category type validation should remain (expense categories for expenses, income categories for income)
  - Test schema validation for each transaction type update
  - Test that partial updates are allowed (only updating specific fields)
  - Test category type validation on updates

### Phase 2: Backend Actions

- [x] **Step 2**: Implement `updateExpense` action in `/src/modules/Transaction/actions.ts` **AND** add tests to `/src/modules/Transaction/actions.integration.test.ts`
  - Accept transaction ID and partial update data
  - Validate transaction exists and is not deleted
  - Validate all referenced resources (wallet, category) exist and are not archived
  - Update transaction event fields (occurredAt, note, categoryId)
  - Update posting if wallet or amount changed
  - Return updated transaction with postings
  - Test successful update of each field
  - Test validation errors (not found, deleted, archived references)
  - Test that transaction type cannot be changed

- [x] **Step 3**: Implement `updateIncome` action in `/src/modules/Transaction/actions.ts` **AND** add tests to `/src/modules/Transaction/actions.integration.test.ts`
  - Similar to updateExpense but handle payee field
  - Handle optional categoryId (can be null for income)
  - Update transaction event and posting
  - Test successful updates
  - Test category type validation

- [x] **Step 4**: Implement `updateTransfer` action in `/src/modules/Transaction/actions.ts` **AND** add tests to `/src/modules/Transaction/actions.integration.test.ts`
  - Validate both fromWallet and toWallet exist and are not archived
  - Update both postings if wallets or amount changed
  - Ensure fromWalletId !== toWalletId validation
  - Test successful updates
  - Test validation errors

- [x] **Step 5**: Implement `updateSavingsContribution` action in `/src/modules/Transaction/actions.ts` **AND** add tests to `/src/modules/Transaction/actions.integration.test.ts`
  - Validate wallet and savings bucket exist and are not archived
  - Update both wallet and bucket postings
  - Test successful updates
  - Test validation errors

- [x] **Step 6**: Implement `updateSavingsWithdrawal` action in `/src/modules/Transaction/actions.ts` **AND** add tests to `/src/modules/Transaction/actions.integration.test.ts`
  - Similar to updateSavingsContribution
  - Update both postings correctly (reversed amounts)
  - Test successful updates
  - Test validation errors

### Phase 3: API Layer

- [x] **Step 7**: Add `PUT` handler to `/src/app/api/transactions/[id]/route.ts` **AND** update `/src/app/api/transactions/[id]/route.test.ts`
  - Accept transaction ID from route params
  - Parse request body (must NOT include type field - type cannot be changed)
  - Fetch existing transaction to determine type
  - Route to appropriate update action based on existing type
  - Return 400 if trying to change transaction type
  - Return 404 if transaction not found
  - Return 422 for validation errors
  - Add withRouteLogging wrapper
  - Test PUT endpoint for all transaction types
  - Test error cases (not found, validation, type change attempt)

### Phase 4: Frontend Component

- [x] **Step 8**: Create `EditTransactionDialog` component in `/src/modules/Transaction/components/EditTransactionDialog.tsx` **AND** create `/src/modules/Transaction/components/EditTransactionDialog.test.tsx`
  - Accept transaction data as prop
  - Pre-fill form with existing transaction data
  - Disable transaction type switching (show current type as read-only)
  - Use same form structure as AddTransactionDialog but pre-populated
  - Handle form submission to PUT endpoint
  - Show success/error toast messages
  - Call onSuccess callback to refresh transaction list
  - Test component renders with pre-filled data
  - Test form submission calls correct API endpoint
  - Test validation errors are displayed
  - Test success/error handling

### Phase 5: UI Integration

- [x] **Step 9**: Update `TransactionTable` component in `/src/modules/Transaction/components/TransactionTable.tsx` **AND** update `/src/modules/Transaction/components/TransactionTable.test.tsx`
  - Add "Edit" menu item to dropdown (above Delete)
  - Add `onEdit` callback prop
  - Pass transaction data to onEdit callback
  - Test Edit menu item is rendered
  - Test clicking Edit calls onEdit with correct transaction

- [x] **Step 10**: Wire up edit functionality in `/src/app/transactions/page.tsx` **AND** add e2e test in `/src/app/transactions/page.test.tsx` (or create new e2e test file)
  - Add state for selected transaction to edit
  - Add handler to open EditTransactionDialog with selected transaction
  - Pass onEdit handler to TransactionTable
  - Refresh transaction list after successful edit
  - Test full edit flow: click Edit → modify data → save → see updated transaction
  - Test validation errors are shown
  - Test canceling edit closes dialog without changes

## Technical Considerations

### Transaction Type Immutability

- Transaction type CANNOT be changed after creation
- Changing type would require deleting and recreating (affects accounting accuracy)
- UI should show type as read-only in edit dialog
- API should reject any attempt to change type

### Posting Updates

- If wallet changes: update posting's wallet_id
- If amount changes: update posting's amount_idr
- For transfers: update both postings if either wallet or amount changes
- For savings: update both wallet and bucket postings

### Category Type Validation

- Expense transactions: categoryId must reference expense category
- Income transactions: categoryId must reference income category (or be null)
- Validation should happen on both frontend and backend

### Idempotency

- Updates don't use idempotency keys (only creation does)
- Each update is a discrete operation

## Files to Modify/Create

| File                                                                 | Action                                                                                              |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `/src/modules/Transaction/schema.ts`                                 | Add update schemas                                                                                  |
| `/src/modules/Transaction/schema.test.ts`                            | Add schema validation tests                                                                         |
| `/src/modules/Transaction/actions.ts`                                | Add updateExpense, updateIncome, updateTransfer, updateSavingsContribution, updateSavingsWithdrawal |
| `/src/modules/Transaction/actions.integration.test.ts`               | Add integration tests for all update actions                                                        |
| `/src/app/api/transactions/[id]/route.ts`                            | Add PUT handler                                                                                     |
| `/src/app/api/transactions/[id]/route.test.ts`                       | Add PUT endpoint tests                                                                              |
| `/src/modules/Transaction/components/EditTransactionDialog.tsx`      | Create new component                                                                                |
| `/src/modules/Transaction/components/EditTransactionDialog.test.tsx` | Create unit tests                                                                                   |
| `/src/modules/Transaction/components/TransactionTable.tsx`           | Add Edit menu item                                                                                  |
| `/src/modules/Transaction/components/TransactionTable.test.tsx`      | Add Edit tests                                                                                      |
| `/src/app/transactions/page.tsx`                                     | Wire up edit functionality                                                                          |
| `/src/app/transactions/page.test.tsx`                                | Add e2e tests (or create new e2e test file)                                                         |

## Success Criteria

- [x] User can click "Edit" on any transaction in the table
- [x] Edit dialog opens with pre-filled data
- [x] User can modify allowed fields (amount, date, wallet, category, note, payee)
- [x] Transaction type is shown but cannot be changed
- [x] Frontend validation prevents invalid data
- [x] Backend validation enforces business rules
- [x] Category type validation works (expense categories for expenses only)
- [x] Changes are saved to database
- [x] Transaction list refreshes with updated data
- [x] All tests pass (unit, integration, e2e)
- [x] Error cases are handled gracefully

## Notes

- Follow existing patterns from AddTransactionDialog for consistency
- Maintain strict type safety throughout
- Use transaction wrapper for atomic updates
- Consider adding optimistic UI updates for better UX (optional enhancement)
- This feature does NOT include bulk edit (one transaction at a time)
