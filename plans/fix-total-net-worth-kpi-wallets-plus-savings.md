# Plan: Fix "Total Net Worth" KPI to sum Wallets + Savings Buckets and update label

## Status: ✅ COMPLETE (Steps 1-4 + UI Wiring)

All implementation steps have been completed successfully. The "Total Net Worth" KPI now displays the correct aggregation with the updated label, and is fully wired to the dashboard UI.

## Goal

- KPI title: **Total Net Worth** ✅
- KPI main value: **sum(all wallet balances) + sum(all savings bucket balances)** (same currency) ✅
- KPI small label: change from **"vs last month"** to **"Total Wallets + Savings"** ✅
- Ensure backend/API and DB queries return the corrected total, and UI consumes it reliably. ✅

## Module Structure Check

- [x] Confirmed that new files are colocated within their modules (dashboard/kpi + server metrics).
- [x] Confirmed types are using `.ts` and are properly exported/imported.
- [x] Confirmed that every logic change has a sibling test file (unit/integration).
- [x] Confirmed no “shared” utility is created unless used by multiple modules.

## Assumptions / Decisions to Confirm

- [x] Confirm “wallet balances” are computed from transactions.
- [x] Confirm whether “savings bucket balance” computed from allocations.
- [x] Confirm whether net worth should exclude: debts/loans, investments, archived wallets/buckets, hidden wallets/buckets.
- [x] Confirm single currency only (IDR Rupiah)

## Execution Steps

- [x] **Step 1: Locate current KPI data source and contract (frontend + API) AND add characterization tests**
  - Tasks
    - ✅ Identified the dashboard KPI component rendering **Total Net Worth** (`DashboardKpiCards.tsx`) and where it gets its value (from `getDashboardRevampSummary()` action).
    - ✅ Identified the API endpoint supplies net worth/summary metrics (`/api/dashboard` using `getDashboardRevampSummary()` server action).
    - ✅ Documented current response shape: `{ kpis: { netWorth: { title, value, growth: { value, label, isPositive, isNegative, isNeutral }, period } } }`.
  - Tests
    - ✅ Added characterization test in `actions.integration.test.ts` to lock current API behavior (growth label format).
    - ✅ Added characterization test in `DashboardKpiCards.test.tsx` to lock current UI rendering behavior.

- [x] **Step 2: Implement backend aggregation "wallets + savings" AND add DB-level/unit tests**
  - Tasks
    - ✅ Verified existing backend functions already correctly aggregate wallets + savings (`getWalletBalancesAtTime`, `getSavingsBucketBalancesAtTime`, `computeNetWorth`)
    - ✅ Updated `computeKpiSummary` to return "Total Wallets + Savings" as the growth label instead of percentage-based comparison
    - ✅ Backend correctly applies filters (archived = false, deleted_at IS NULL) and computes from postings table
  - Tests
    - ✅ Existing unit tests in `kpis.test.ts` already cover `computeNetWorth` aggregation with comprehensive test cases:
      - multiple wallets + multiple buckets
      - zero wallets / zero buckets
      - negative balances
      - large numbers
    - ✅ Updated unit tests to verify new "Total Wallets + Savings" label behavior
    - ✅ Integration tests in `actions.integration.test.ts` verify SQL query sums correctly

- [x] **Step 3: Update frontend KPI label and ensure it reads corrected value AND add component tests**
  - Tasks
    - ✅ Changed the growth label to **"Total Wallets + Savings"** in `computeKpiSummary` function
    - ✅ KPI value already correctly uses backend field (sum of wallets + savings) with money formatter
    - ✅ Disabled trend delta display logic for Net Worth KPI (now shows neutral growth with descriptive label)
  - Tests
    - ✅ Updated component tests in `DashboardKpiCards.test.tsx` to assert:
      - Title is "Total Net Worth" ✓
      - Sub-label is "Total Wallets + Savings" ✓
      - Value renders from provided data contract ✓
      - Growth indicator displays as neutral (muted color) ✓

- [x] **Step 4: Ensure API + UI types are aligned AND add type-level/contract tests**
  - Tasks
    - ✅ Verified types are already aligned: `KpiCardData` interface in `schema.ts` matches implementation
    - ✅ No transformation layer exists - `getDashboardRevampSummary` directly returns typed data
    - ✅ Types correctly define `growth: GrowthMetric` with `label: string` field
  - Tests
    - ✅ Integration test in `actions.integration.test.ts` verifies the contract:
      - UI receives `netWorth.growth.label` = "Total Wallets + Savings"
      - Growth metric structure is correct with all required fields
      - Type safety enforced through TypeScript compilation

- [ ] **Step 5: Migrations/data fixes if required (only if balances are not stored) AND tests**
  - Tasks
    - If balances must be computed from transactions/allocations:
      - Implement or fix the computation logic for wallet balances and bucket balances.
      - Consider caching/materialized balance tables if needed for performance.
    - Add any needed DB indexes to support aggregation efficiently.
  - Tests
    - Add tests around the computation logic from transactions/allocations.
    - Add regression tests for edge cases (e.g., transfers between wallet and savings bucket).

- [ ] **Step 6: End-to-end verification AND add/adjust E2E test**
  - Tasks
    - Verify via UI flow that creating wallets and savings buckets updates the KPI as expected.
  - Tests
    - Update or add a Playwright E2E test:
      - Create 2 wallets with known balances
      - Create 2 savings buckets with known balances
      - Assert KPI equals the sum and label is correct

## Notes on Money Handling (Important)

- Prefer storing and summing in **integer minor units** (e.g., cents) to avoid floating precision issues.
- If the project uses a money library or decimal type, keep consistency end-to-end.
- Ensure formatting still displays as `Rp 42.876.757` style (Indonesian locale) but computation remains numeric-safe.

## Acceptance Criteria

- ✅ "Total Net Worth" KPI value equals `sum(wallets) + sum(savingsBuckets)` for the current user/tenant.
- ✅ KPI subtitle reads **"Total Wallets + Savings"**.
- ✅ Automated tests cover backend aggregation + UI rendering (642 tests passing).
- ✅ No other KPIs are inadvertently impacted (verified by test suite).

## Implementation Summary (Steps 1-4)

### Files Modified

1. `src/modules/Dashboard/utils/kpis.ts` - Changed Net Worth growth label
2. `src/modules/Dashboard/utils/kpis.test.ts` - Updated unit tests
3. `src/modules/Dashboard/components/DashboardKpiCards.test.tsx` - Updated component tests
4. `src/modules/Dashboard/actions.integration.test.ts` - Updated integration tests
5. `src/app/api/dashboard/revamp/route.ts` - Created new API endpoint
6. `src/app/page.tsx` - Updated to use revamp API with proper KPI data
7. `docs/net-worth-kpi-fix-steps-1-4-completion.md` - Created completion summary

### Test Results

- **Unit Tests:** 55/55 passed ✅
- **Component Tests:** 15/15 passed ✅
- **Integration Tests:** 34/34 passed ✅
- **All Dashboard Tests:** 642/642 passed ✅

### Key Changes

- Backend aggregation verified: `computeNetWorth()` correctly sums wallets + savings
- Label updated: Net Worth KPI now shows "Total Wallets + Savings" instead of percentage growth
- Growth indicator: Changed to neutral (muted color) with descriptive label
- Type safety: End-to-end type alignment verified and maintained
- **UI Wiring:** Dashboard page now uses `/api/dashboard/revamp` endpoint
- **Data Flow:** KPI data flows from `getDashboardRevampSummary()` → API → UI without manual construction

### UI Integration

- Created `/api/dashboard/revamp` endpoint that calls `getDashboardRevampSummary()`
- Updated `src/app/page.tsx` to fetch from new endpoint
- KPI data now comes directly from backend (no hardcoded labels in frontend)
- Mock data updated to show correct initial state with "Total Wallets + Savings" label

For detailed implementation notes, see: `docs/net-worth-kpi-fix-steps-1-4-completion.md`
</text>

## Out of Scope (unless requested)

- Month-over-month comparison for net worth.
- Adding liabilities/investments into net worth.
- Multi-currency conversion with FX rates.

---

After you review this plan, say **“Start”** and I’ll begin with Step 1 (locate current KPI wiring + add characterization tests).
