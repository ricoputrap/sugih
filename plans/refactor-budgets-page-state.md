# Plan: Refactor `BudgetsPage` state management (TanStack Query + hooks + zustand + nuqs)

## Goal

Refactor `src/app/budgets/page.tsx` to reduce unnecessary re-renders and improve data management by:

- Using **TanStack Query (React Query)** for server-side data fetching, caching, and synchronization (combined `budgets` + `summary` in a single query).
- Moving URL-relevant UI state (e.g. `month`, `view`) into query params via NUQS for shareable/deep-linkable state.
- Using **zustand** only for UI-local state that doesn't require server synchronization (dialogs, selection, copy flow).
- Extracting side-effects and computed helpers into testable custom hooks and utils.
- **Consolidating dual API calls** into a single unified endpoint to reduce network overhead and ensure data consistency.

Non-goals (for this refactor):

- No API contract breaking changes (but we may enhance the response).
- No UI/UX changes (behavior should remain equivalent).
- No normalization/caching overhaul beyond what's needed to reduce re-renders.

## Module Structure Check

- [x] Confirmed that new files are colocated within their modules (Budget-related logic stays under `/src/modules/Budget/*`).
- [x] Confirmed types are using `.ts` and are properly exported/imported.
- [x] Confirmed that every logic change has a planned test file.

---

## Proposed State Ownership (what goes where)

### 1) URL query params (NUQS)

**Owned state**

- `month` (currently `selectedMonth`)
- `view` (currently `viewMode`)

**Benefits**

- Deep link/share current month and view.
- Browser back/forward works intuitively.

**Notes**

- If there's an existing localStorage preference for `view`, keep it as a compatibility fallback:
  - Prefer query param if present.
  - Else fallback to localStorage.
  - Else default `"list"`.

### 2) Server-side data (TanStack Query — Unified Query)

**Owned state / queries**

- **Query Key**: `['budgets-month', month]` → `GET /api/budgets?month={month}` → **Combined response** containing:
  ```ts
  {
    budgets: BudgetWithCategory[];
    summary: BudgetSummary;
  }
  ```

**Benefits**

- **Single network call** reduces latency and overhead.
- **Guaranteed consistency**: budgets and summary fetched at the same time.
- Automatic caching & stale-while-revalidate.
- Deduplication: if 2 components request the same month, only 1 fetch runs.
- Built-in retry/error handling.
- Easy invalidation on mutation (create/update/delete).

**Mutations**

- `useMutation` for `POST /api/budgets` (create)
- `useMutation` for `PATCH /api/budgets/{id}` (update)
- `useMutation` for `DELETE /api/budgets/{id}` (delete)
- `useMutation` for `POST /api/budgets/copy` (copy)
- Each mutation should invalidate `['budgets-month', month]` to refetch the unified data.

### 3) UI-local state (zustand — minimal)

**Owned state**

- Dialog controls: `{ isCreateDialogOpen, isEditDialogOpen, copyDialogOpen, copyResultModalOpen }`
- Selection: `{ selectedBudget }`
- Copy result display: `{ copyResult }` (for the modal)

**Benefits**

- Small, focused store for UI coordination.
- No re-renders of data consumers when dialogs open/close.

**Note**: No async actions in this store; TanStack Query mutations drive the data flow.

---

## Directory / File Plan (colocation)

All feature-local logic stays under `src/modules/Budget/`:

```
/src/modules/Budget/
├── utils/
│   ├── months.ts                          # Month generation helpers
│   ├── months.test.ts
│   ├── queryKeys.ts                       # TanStack Query key factory
│   └── queryKeys.test.ts
├── hooks/
│   ├── useBudgetMonthQuery.ts             # NUQS hook for month
│   ├── useBudgetMonthQuery.test.ts
│   ├── useBudgetViewQuery.ts              # NUQS hook for view
│   ├── useBudgetViewQuery.test.ts
│   ├── useBudgetMonthOptions.ts           # Memoized month options
│   ├── useBudgetMonthOptions.test.ts
│   ├── useBudgetsMonthData.ts             # TanStack Query hook for combined budgets + summary
│   ├── useBudgetsMonthData.test.ts
│   ├── useCreateBudgetMutation.ts         # TanStack Query mutation for create
│   ├── useCreateBudgetMutation.test.ts
│   ├── useUpdateBudgetMutation.ts         # TanStack Query mutation for update
│   ├── useUpdateBudgetMutation.test.ts
│   ├── useDeleteBudgetMutation.ts         # TanStack Query mutation for delete
│   ├── useDeleteBudgetMutation.test.ts
│   ├── useCopyBudgetsMutation.ts          # TanStack Query mutation for copy
│   └── useCopyBudgetsMutation.test.ts
├── stores/
│   ├── budgetsPageUI.store.ts             # Zustand for UI-only state (dialogs, selection)
│   └── budgetsPageUI.store.test.ts
├── types-page.ts                          # (Optional) BudgetSummary type and page-specific types
├── types-page.test.ts                     # (Optional, if logic exists)
└── ...existing files...
```

---

## Implementation Constraints / Decisions

- [ ] **Unified API response**: Ensure the backend endpoint `/api/budgets?month={month}` returns both `budgets` and `summary` in a single response object. (See Step 0.1)
- [ ] **Query Keys**: Use a factory pattern (`queryKeys.ts`) for consistent key generation to avoid typos and enable easier bulk invalidation.
- [ ] **Suspense or loading states**: TanStack Query provides `isLoading`, `isFetching`, `error` on the unified query. Handle gracefully in UI.
- [ ] **Mutation invalidation**: After create/update/delete, invalidate the unified `['budgets-month', month]` query. Copy mutation may span months.
- [ ] **No selector overuse in zustand**: Keep zustand store minimal; most data flows through React Query hooks.
- [ ] **Error handling**: TanStack Query captures errors; toast notifications stay in the component or in mutation callbacks (`onError`).
- [ ] **Stale time**: Consider setting `staleTime` on the unified query (e.g., 30 seconds) to reduce fetches if user navigates away/back quickly.

---

## Setup / Prerequisites (before Step 1)

- [x] Install TanStack Query: `pnpm add @tanstack/react-query` (already in deps? verify via `grep` first)
- [x] Install NUQS: `pnpm add nuqs` (for URL-based state) (already in deps? verify via `grep` first)
- [ ] Ensure a `QueryClientProvider` wraps the app (likely in `_app.tsx` or layout). If not, create it as part of Step 0.

---

## Execution Steps (each step includes a Test action)

- [x] **Step 0: Prepare backend and infrastructure**
  - [x] **Step 0.1**: Verify/enhance `/api/budgets` endpoint to return unified response `{ budgets: BudgetWithCategory[], summary: BudgetSummary }` when called with `?month={month}`.
    - [x] Modified `GET /api/budgets` to return unified response when month is provided
    - [x] Maintains backward compatibility: returns array when no month, unified object when month is provided
    - [x] Updated tests to verify unified response format
  - [x] **Step 0.2**: Add `QueryClientProvider` to app layout if missing.
    - [x] Created `src/app/providers.tsx` with QueryClient configuration (staleTime: 5min, gcTime: 10min)
    - [x] Wrapped root layout with Providers component
    - [x] Verified setup by running full test suite (69 test files, 2035 tests - all passing)

- [x] **Step 1: Create month utilities + tests**
  - [x] Implemented `/src/modules/Budget/utils/months.ts` with:
    - [x] `formatMonthKey(date): "YYYY-MM-01"`
    - [x] `getDefaultMonthKey(now?): string`
    - [x] `generateMonthOptions({ past, future, now? }): {value,label}[]`
  - [x] Created `/src/modules/Budget/utils/months.test.ts` with 13 comprehensive tests
  - [x] All tests passing

- [ ] **Step 2: Create TanStack Query key factory + tests**
  - Implement `/src/modules/Budget/utils/queryKeys.ts` with a `budgetKeys` object:
    ```ts
    export const budgetKeys = {
      all: ["budgets"] as const,
      months: () => [...budgetKeys.all, "month"] as const,
      month: (month: string) => [...budgetKeys.months(), { month }] as const,
    };
    ```
  - **AND** create `/src/modules/Budget/utils/queryKeys.test.ts` with basic assertions.

- [ ] **Step 3: Add hook for month options + tests**
  - Implement `/src/modules/Budget/hooks/useBudgetMonthOptions.ts` that wraps `generateMonthOptions()` (memoized).
  - **AND** create `/src/modules/Budget/hooks/useBudgetMonthOptions.test.ts`.

- [ ] **Step 4: Introduce NUQS-backed `month` state + tests**
  - Implement `/src/modules/Budget/hooks/useBudgetMonthQuery.ts`:
    - Query key: `month`
    - Default: `getDefaultMonthKey()`
    - Validation: must match `YYYY-MM-01` shape
  - **AND** create `/src/modules/Budget/hooks/useBudgetMonthQuery.test.ts`.

- [ ] **Step 5: Introduce NUQS-backed `view` state + tests**
  - Implement `/src/modules/Budget/hooks/useBudgetViewQuery.ts`:
    - Query key: `view`
    - Allowed: `"list" | "grid"`
    - Default selection rule:
      1. URL param if present and valid
      2. localStorage `"budgetViewMode"` if present and valid
      3. `"list"`
    - On change: update URL param; optionally also update localStorage for backwards compatibility.
  - **AND** create `/src/modules/Budget/hooks/useBudgetViewQuery.test.ts`.

- [ ] **Step 6: Create TanStack Query hook for unified budgets + summary data + tests**
  - Implement `/src/modules/Budget/hooks/useBudgetsMonthData.ts`:
    - Accept `month: string` as input.
    - Call `useQuery({ queryKey: budgetKeys.month(month), queryFn: () => fetch(`/api/budgets?month=${month}`).then(r => r.json()) })`
    - Return: `{ data: { budgets: BudgetWithCategory[], summary: BudgetSummary } | undefined, isLoading, isFetching, error, ... }`
    - Handle the unified response structure.
  - **AND** create `/src/modules/Budget/hooks/useBudgetsMonthData.test.ts` with mocked fetch and React Query test utilities.

- [ ] **Step 7: Create TanStack Query mutation for create budget + tests**
  - Implement `/src/modules/Budget/hooks/useCreateBudgetMutation.ts`:
    - Call `useMutation({ mutationFn: (values) => fetch(POST /api/budgets).then(...), onSuccess: (data, vars) => queryClient.invalidateQueries({ queryKey: budgetKeys.month(vars.month) }) })`
    - Return the mutation object (with `mutate`, `isPending`, `error`, etc.).
  - **AND** create `/src/modules/Budget/hooks/useCreateBudgetMutation.test.ts`.

- [ ] **Step 8: Create TanStack Query mutation for update budget + tests**
  - Implement `/src/modules/Budget/hooks/useUpdateBudgetMutation.ts`:
    - Accept budget `id` and `month` in mutationFn context.
    - Call `useMutation({ mutationFn: (values) => fetch(PATCH /api/budgets/{id}).then(...), onSuccess: (data, vars) => invalidate(budgetKeys.month(vars.month)) })`
  - **AND** create `/src/modules/Budget/hooks/useUpdateBudgetMutation.test.ts`.

- [ ] **Step 9: Create TanStack Query mutation for delete budget + tests**
  - Implement `/src/modules/Budget/hooks/useDeleteBudgetMutation.ts`:
    - Call `useMutation({ mutationFn: ({ id, month }) => fetch(DELETE /api/budgets/{id}).then(...), onSuccess: (data, vars) => invalidate(budgetKeys.month(vars.month)) })`
  - **AND** create `/src/modules/Budget/hooks/useDeleteBudgetMutation.test.ts`.

- [ ] **Step 10: Create TanStack Query mutation for copy budgets + tests**
  - Implement `/src/modules/Budget/hooks/useCopyBudgetsMutation.ts`:
    - Call `useMutation({ mutationFn: ({ fromMonth, toMonth }) => fetch(POST /api/budgets/copy).then(...), onSuccess: (data, vars) => { invalidate(budgetKeys.month(vars.fromMonth)); invalidate(budgetKeys.month(vars.toMonth)); } })`
  - **AND** create `/src/modules/Budget/hooks/useCopyBudgetsMutation.test.ts`.

- [ ] **Step 11: Create zustand store for UI-only state + tests**
  - Implement `/src/modules/Budget/stores/budgetsPageUI.store.ts`:
    - State:
      - `isCreateDialogOpen: boolean`
      - `isEditDialogOpen: boolean`
      - `copyDialogOpen: boolean`
      - `copyResultModalOpen: boolean`
      - `selectedBudget: BudgetWithCategory | null`
      - `copyResult: { created, skipped, fromMonth?, toMonth? } | null`
    - Actions: setters for each (or use Immer middleware for convenience).
  - **AND** create `/src/modules/Budget/stores/budgetsPageUI.store.test.ts`.

- [ ] **Step 12: Refactor `src/app/budgets/page.tsx` to use hooks + TanStack Query + zustand**
  - Replace:
    - `selectedMonth`/`viewMode` with NUQS hooks.
    - `budgets`, `summary`, `isLoading`, `isSummaryLoading` with unified TanStack Query hook.
    - `isCreateDialogOpen`, `isEditDialogOpen`, `copyDialogOpen`, `copyResultModalOpen`, `selectedBudget`, `copyResult` with zustand store.
    - Direct `fetch` + `setState` calls with mutation hooks (create, update, delete, copy).
  - Ensure effects:
    - When `month` changes: queries refetch automatically (TanStack Query handles this via `month` dependency in the query key).
  - Keep dialogs rendering behavior equivalent.
  - **AND** add/update a page-level test:
    - If there's an existing testing pattern for app pages, follow it.
    - Otherwise create a focused test ensuring:
      - Changing month triggers data fetch via TanStack Query (unified budgets + summary).
      - Changing view only affects the table/grid section (and doesn't re-render unrelated parts).
      - Dialog state toggles don't trigger data refetches.

- [ ] **Step 13: Performance verification + regression checks**
  - Add lightweight React DevTools Profiler checks locally (or via test instrumentation).
  - Confirm:
    - Toggling create dialog doesn't refetch budgets or summary.
    - Toggling view doesn't refetch or re-render the month selector.
    - Copy modal state changes don't refetch unrelated queries.
    - Network tab shows **only 1 fetch** per month change (not 2).
  - Run test suite and fix any flaky tests.
  - **AND** verify that the app still builds and dev server runs without errors.

---

## Completion Summary

### ✅ Completed

- **Step 0.1**: API endpoint refactored to return unified response `{ budgets, summary }` when month parameter is provided
- **Step 0.2**: QueryClientProvider added to root layout with sensible defaults (5 min staleTime, 10 min gcTime)
- **Step 1**: Month utility functions created and tested (13 tests, all passing)
  - Files: `/src/modules/Budget/utils/months.ts` and `/src/modules/Budget/utils/months.test.ts`

### 🧪 Test Results

- All 13 month utility tests passing
- All 26 budget API route tests passing (including new unified response tests)
- All 69 test files in project passing (2035 total tests)
- No test data/mocks left behind

### ✨ Notes

- Backward compatibility maintained: endpoint works with and without month parameter
- Legacy `?summary=true` parameter still works but redundant (deprecated in favor of month-only queries)
- QueryClient configured with production-ready defaults
- All code follows JS standard specified in rule

---

## Acceptance Criteria

- [ ] `month` and `view` persist in the URL (`/budgets?month=YYYY-MM-01&view=list|grid`) and are restored on refresh.
- [ ] **Single unified API call** per month fetches both budgets and summary in one request (no dual fetches).
- [ ] TanStack Query caches the unified response by month; switching between months and back doesn't re-fetch unnecessarily (unless stale).
- [ ] Mutations (create/update/delete/copy) invalidate the correct unified query and refetch data.
- [ ] Components subscribe only to the data/state they need; unrelated UI actions do not cause unnecessary re-renders.
- [ ] All new "logic" files have sibling tests and they pass.
- [ ] No regressions in create/edit/delete/copy flows.

---

## Risks / Mitigations

- **Race conditions on mutation + query refetch**: TanStack Query handles this naturally; mutations update cache, and queries refetch in the background.
- **Hydration differences (URL/localStorage)**: Ensure hooks only read localStorage on client and guard SSR.
- **Toast side effects in mutations**: Use `onSuccess` / `onError` callbacks in mutations; keep toast calls in the component or create a wrapper hook that handles toasts.
- **Over-fetching or under-fetching**: Monitor stale time and refetch intervals; adjust as needed based on UX requirements.
- **QueryClient not initialized**: Ensure `QueryClientProvider` wraps the app before Step 1 starts.
- **Backend changes for unified endpoint**: Coordinate with backend to ensure the consolidated response is available; maintain backward compatibility if needed.

---

## Notes on Incremental Delivery

You can ship this in increments:

1. **Phase 1**: Consolidate backend endpoint (Step 0.1) + NUQS for month/view (Steps 1–5) + keep the rest in component state and direct fetches.
2. **Phase 2**: TanStack Query for the unified query (Step 6) while keeping mutations as direct fetches.
3. **Phase 3**: TanStack Query mutations (Steps 7–10) for full benefits.
4. **Phase 4**: Zustand for UI state (Step 11) if performance remains an issue.

This allows for staged testing and rollout without a big-bang refactor.

---

## Dependencies to Install

```bash
pnpm add @tanstack/react-query nuqs
```

If not already installed; verify in `package.json` first.
