# Plan: Render the pie chart inside the Category Breakdown card

## Module Structure Check

- [x] Confirmed that changes stay inside the Dashboard module (no new generic shared code unless truly reusable).
- [x] Confirmed any new types are `.ts` and colocated under `src/modules/Dashboard/`.
- [x] Confirmed that every logic change has a planned test file (and UI changes update existing UI tests if present).

## Execution Steps

- [x] **Step 1**: Refactor `CategorySpendingPieChart` to accept dynamic data from `dashboardData.categoryBreakdown` (instead of hardcoded `chartData`) **AND** add/update a unit test for the data-mapping logic.
  - Implementation:
    - Create a colocated mapper util like `src/modules/Dashboard/utils/mapCategoryBreakdownToPie.ts` that:
      - Converts `categoryBreakdown[]` → recharts pie `data[]` (`{ name, amount, fill? }`).
      - Handles edge cases (empty list, missing/zero amounts).
    - Update `src/modules/Dashboard/components/CategorySpendingPieChart.tsx`:
      - Accept props for `data` (and optionally `title/description` overrides or "compact" mode).
      - Remove hardcoded `chartData` from the component.

- [x] **Step 2**: Render the pie chart inside the existing "Category Breakdown" `<Card>` in the dashboard page **AND** add/update a component test to verify it appears.
  - Implementation:
    - Update `src/app/page.tsx` "Category Breakdown" section layout to a 2-column grid:
      - Left: pie chart (using `CategorySpendingPieChart` in compact mode).
      - Right: existing top-5 list.
    - Ensure the empty state still renders gracefully (no crash, consistent messaging).

- [x] **Step 3**: Remove/relocate the standalone `CategorySpendingPieChart` from the "Charts" grid (if it becomes redundant) **AND** update snapshot/assertions accordingly.
  - Implementation:
    - Decide whether to keep the old chart location:
      - If redundant: remove it from the charts grid so "Category Breakdown" owns it.
      - If still useful: keep it but ensure both usages share the same prop-driven component.

Plan created at `sugih/plans/feature-category-breakdown-pie-chart.md`. Review it, and say "Start" to begin Step 1.
