# Budget API Simplification Plan

**Date**: 2025-01-18
**Objective**: Simplify Budget API by removing batch upsert functionality

---

## Background

Current implementation uses `upsertBudgets()` for POST requests, which handles:

- Creating multiple budgets in one call
- Updating existing budgets
- Deleting budgets not in the input

This is overkill for the current feature set (single budget creation only).

---

## Changes

### 1. Frontend (`src/app/budgets/page.tsx`)

- [x] Change `method: "PUT"` to `method: "POST"`
- [x] Simplify payload to single budget format

### 2. API Route (`src/app/api/budgets/route.ts`)

- [x] Remove `handlePut` function and `PUT` export
- [x] Change `handlePost` to call `createBudget()` instead of `upsertBudgets()`
- [x] Update route to handle single budget creation
- [x] Simplify error handling for single creation

### 3. Integration Tests (`src/modules/Budget/actions.integration.test.ts`)

- [x] Remove "Upsert Budgets" test suite
- [x] Update all `createBudget()` calls to use new single-object parameter format

---

## New API Surface

| Method | Endpoint                        | Action                |
| ------ | ------------------------------- | --------------------- |
| GET    | `/api/budgets`                  | List all budgets      |
| GET    | `/api/budgets?month=YYYY-MM-01` | List budgets by month |
| POST   | `/api/budgets`                  | Create single budget  |
| PATCH  | `/api/budgets/[id]`             | Update budget amount  |
| DELETE | `/api/budgets/[id]`             | Delete budget         |

---

## Rollback Plan

If issues arise:

1. Revert changes to `page.tsx` and `route.ts`
2. Restore `upsertBudgets()` calls
3. All data is preserved in database

---

## Verification

**Status**: ✅ COMPLETED

### Changes Made

- Frontend: `PUT` → `POST`, payload simplified
- API Route: `upsertBudgets()` → `createBudget()`, removed `PUT` handler
- Tests: Removed "Upsert Budgets" suite, updated all `createBudget()` calls

### Test Results

```
✓ src/modules/Budget/actions.integration.test.ts (24 tests)
Test Files: 1 passed | Tests: 24 passed
```

### API Test

```bash
curl -X POST "http://localhost:3000/api/budgets" \
  -H "Content-Type: application/json" \
  -d '{"month":"2025-01-01","categoryId":"...","amountIdr":500000}'
# Response: {"id":"...","month":"2025-01-01","category_id":"...","amount_idr":500000,...}
```

---

## Estimated Effort

- Frontend: 5 minutes
- API Route: 10 minutes
- Tests: 10 minutes
- Verification: 5 minutes

**Total: ~30 minutes**
