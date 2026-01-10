# Plan: Fix Transactions Page Filters (not working properly)

## Context / Current Findings
- The UI (`src/app/transactions/page.tsx`) builds query params and calls `GET /api/transactions`.
- `GET /api/transactions` forwards the query to `listTransactions(query)`.
- `listTransactions` validates with `TransactionListQuerySchema` (Zod) and builds SQL filters.
- **Likely root cause:** `listTransactions` builds `params` and `$1/$2/...` placeholders, but the SQL uses `db.unsafe(whereClause)` without actually binding `params`. That means filters can be ignored, error, or behave inconsistently depending on the DB client. This would make *all* filters appear “not working”.

## Module Structure Check
- [ ] Confirmed that new files are colocated within their modules (Transaction module for query/filters logic, app route tests under `src/app/api/...`).
- [ ] Confirmed types use `.ts` and are exported/imported explicitly.
- [ ] Confirmed every logic change has a planned test file (unit tests for query building + route/action tests).

## Execution Steps

- [ ] **Step 1: Reproduce + pin down failure mode (baseline tests)**
  - Add a focused test that demonstrates filters are not applied (or that `listTransactions` is constructing an unsafe query without parameters).
  - **Code:** (No production code changes yet; only tests.)
  - **Tests:**
    - Add/extend a test around `listTransactions` (mock DB) to assert the final query includes required filter predicates AND binds values correctly (or fails as expected).
    - If easier, add an API route test verifying that requesting `?type=expense` results in server calling a *new* internal query builder that returns a parameterized query.

- [ ] **Step 2: Fix server-side filtering by making the query properly parameterized**
  - Implement a small, explicit query builder inside the Transaction module to avoid `db.unsafe` misuse.
  - **Code:**
    - Create `src/modules/Transaction/utils/buildTransactionListQuery.ts` that:
      - Accepts `TransactionListQueryInput` (validated).
      - Returns `{ sql: string, params: unknown[] }`.
      - Uses numbered placeholders consistently.
      - Covers: `from`, `to`, `type`, `walletId`, `categoryId`, and base `deleted_at IS NULL`.
    - Update `listTransactions` to call the new builder and execute via the DB client’s supported parameter binding (do not interpolate user-controlled values).
  - **Tests:**
    - Create `src/modules/Transaction/utils/buildTransactionListQuery.test.ts`:
      - Asserts produced `sql` contains the expected predicates.
      - Asserts `params` order matches placeholders.
      - Includes cases: each individual filter, combined filters, and no filters.

- [ ] **Step 3: Verify API route + Zod parsing match the UI query format**
  - Ensure the UI sends query values that the API + Zod will parse predictably.
  - **Code:**
    - Confirm `from`/`to` handling: the UI currently sends ISO (`new Date(input).toISOString()`).
      - If this introduces timezone/off-by-one issues for date-only inputs, change UI to send `YYYY-MM-DD` (raw) and rely on `z.coerce.date()` server-side; or change server to treat date-only as inclusive day boundaries.
    - Decide and document semantics:
      - `from`: start-of-day inclusive
      - `to`: end-of-day inclusive (recommended) OR keep current `<= exact timestamp`
  - **Tests:**
    - Update/add `src/app/api/transactions/route.test.ts` coverage for:
      - `from`/`to` values in both ISO and date-only formats (whichever we standardize on).
      - Combined filters (type + walletId + categoryId + date range).

- [ ] **Step 4: UI/UX hardening (optional but small, increases “works properly”)**
  - Reduce noisy refetching and prevent invalid ranges.
  - **Code:**
    - Add client-side guard: if `fromDate` and `toDate` and `fromDate > toDate`, show toast and skip fetch (or auto-swap).
    - Debounce fetch for date changes (optional), or switch to “Apply Filters” button (if desired).
  - **Tests:**
    - Add a simple component test for `TransactionsPage` (or extracted filter component) asserting:
      - Changing filters results in correct `/api/transactions?...` call
      - Invalid date range prevents fetch and shows an error

## Notes / Acceptance Criteria
- Filters must reliably narrow results for:
  - Type
  - Wallet
  - Category
  - Date range
- No SQL string interpolation for user-provided values.
- Tests cover:
  - Query builder output (unit)
  - API route filter plumbing (integration-ish with mocks)

## Proposed File Additions/Changes (by scope)
- Transaction module (colocated):
  - `src/modules/Transaction/utils/buildTransactionListQuery.ts`
  - `src/modules/Transaction/utils/buildTransactionListQuery.test.ts`
- Existing updates:
  - `src/modules/Transaction/actions.ts` (use builder + parameter binding)
  - `src/app/api/transactions/route.test.ts` (expand filter coverage)
  - (Optional UI test) `src/app/transactions/page.test.tsx` or better: extract filters into `src/modules/Transaction/components/TransactionFilters.tsx` + test colocated

---

Plan created at `sugih/plans/fix-transactions-filters.md`. Review it, and say **"Start"** to begin Step 1.
