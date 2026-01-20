# Plan: Weekly Category Spending Area Chart

Implement a stacked area chart for displaying weekly category spending trends, following the shadcn chart pattern from `AreaChartExample.tsx`.

Date: Tue, 20 Jan 2026

## Module Structure Check

- [x] Confirmed that new files are colocated within their modules.
- [x] Confirmed types are using .ts and are properly exported.
- [x] Confirmed that every logic change has a planned test file.

## Context

The goal is to create a new `CategorySpendingAreaChart.tsx` component in the Dashboard module that:

- Displays category spending as a stacked area chart
- Uses weekly granularity (last 8 weeks by default)
- Follows the shadcn chart pattern with gradient fills
- Dynamically handles categories (up to 5 top categories)

## Execution Steps

### Backend Changes

- [x] **Step 1**: Verify and fix `categorySpendingTrend` in `/src/modules/Report/actions.ts` to properly handle week granularity format (`IYYY-"W"IW`). **AND** verify existing tests cover this granularity.
  - Created `categorySpendingTrend` function with proper granularity handling (day, week, month, quarter)
  - Added `CategorySpendingTrendQuerySchema` and `CategorySpendingTrendData` to Report schema
  - Added 6 integration tests - all passing

- [x] **Step 2**: Update `getCategorySpendingTrendChartData` in `/src/modules/Dashboard/actions.ts` to use `granularity: "week"` and default to last 8 weeks. **AND** update/create `/src/modules/Dashboard/actions.test.ts` to test weekly granularity.
  - Created `getCategorySpendingTrendChartData` function with weekly granularity
  - Updated `getDashboardData` to include `categorySpendingTrend` in parallel fetch
  - Added 5 integration tests - all passing

### Schema Changes

- [x] **Step 3**: Add `CategorySpendingTrendChartData` interface to `/src/modules/Dashboard/schema.ts` if not already present (with proper period and categories structure). **AND** verify types are exported correctly.
  - Added `CategorySpendingTrendChartData` interface with period and categories array
  - Updated `DashboardData` interface to include `categorySpendingTrend` field

### Frontend Changes

- [ ] **Step 4**: Create `/src/modules/Dashboard/components/CategorySpendingAreaChart.tsx` based on `AreaChartExample.tsx` pattern with:
  - Dynamic category support (up to 5 categories with distinct colors)
  - Gradient fills for each category area
  - Week period formatting on X-axis
  - Custom tooltip showing all categories with amounts
  - Loading and empty states

- [ ] **Step 5**: Export `CategorySpendingAreaChart` from `/src/modules/Dashboard/components/index.ts`.

### Integration

- [ ] **Step 6**: Update `/src/app/page.tsx` to:
  - Import `CategorySpendingAreaChart`
  - Add state for `categorySpendingTrend` data
  - Fetch category spending trend from the API response
  - Replace `ChartAreaInteractive` with `CategorySpendingAreaChart`
    **AND** verify integration works with existing dashboard tests.

## File Locations Summary

| File                                                                  | Purpose                               |
| --------------------------------------------------------------------- | ------------------------------------- |
| `src/modules/Report/actions.ts`                                       | Backend - week granularity SQL format |
| `src/modules/Dashboard/actions.ts`                                    | Backend - weekly trend data fetching  |
| `src/modules/Dashboard/schema.ts`                                     | Types for category spending trend     |
| `src/modules/Dashboard/components/CategorySpendingAreaChart.tsx`      | New area chart component              |
| `src/modules/Dashboard/components/CategorySpendingAreaChart.test.tsx` | Component tests                       |
| `src/modules/Dashboard/components/index.ts`                           | Export new component                  |
| `src/app/page.tsx`                                                    | Dashboard integration                 |

## Notes

- The chart should use ISO week format (e.g., "2024-W05") from backend
- Frontend should convert week format to readable dates (e.g., "Jan 27")
- Color palette should support up to 5 categories using CSS variables (--chart-1 through --chart-5)
- Stacking order should be by total amount (highest at bottom)
