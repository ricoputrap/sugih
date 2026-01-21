# Plan: Category Spending Chart Filters

Add period granularity selector and date range preset selector to the CategorySpendingAreaChart component.

## Module Structure Check

- [x] Confirmed that new files are colocated within the Dashboard module.
- [x] Confirmed types are using .ts and are properly exported.
- [x] Confirmed that every logic change has a planned test file.

## Context

The goal is to enhance `CategorySpendingAreaChart.tsx` with:

1. **Period granularity selector**: Daily, Weekly, Monthly views
2. **Date range preset selector**: Last week, This month, Last month, Last 3 months, Last 6 months, This year, Last year, All time

These controls should trigger a data refetch with the new parameters.

## Current State

- Component accepts `data` prop (already fetched)
- Component does not have internal state for period/date range
- Data fetching is handled by the parent page component

## Implementation Approach

Two options:

1. **Internal state + onChange callback**: Component manages filters, calls parent callback to refetch
2. **Pass filters as props**: Parent manages all state, component just displays

Option 1 is cleaner as it keeps filter logic co-located with the chart.

## Execution Steps

### API Updates

- [x] **Step 1**: Update `/src/modules/Report/actions.ts` `categorySpendingTrend` function to support all granularities (day, week, month) - verify it already does
  - Verified: function already supports day, week, month, quarter granularities

- [x] **Step 2**: Update `/src/modules/Dashboard/actions.ts` `getCategorySpendingTrendChartData` to accept date range presets
  - Updated function to accept dateRangePreset parameter
  - Added date range calculation logic for all presets
  - Updated schema with DateRangePresetSchema and CategorySpendingTrendQuerySchema

### Filter Components

- [x] **Step 3**: Create `/src/modules/Dashboard/components/CategorySpendingFilters.tsx` with:
  - PeriodSelect component (daily, weekly, monthly)
  - DateRangeSelect component (preset options)
  - Helper function for date range calculation
  - Created filter component with Select components

### Component Enhancement

- [x] **Step 4**: Update `/src/modules/Dashboard/components/CategorySpendingAreaChart.tsx` to:
  - Add `onFilterChange` callback prop
  - Add internal state for `period` and `dateRangePreset`
  - Integrate filter components in CardHeader
  - Pass filter values to parent on change
  - Updated limited data warning to show correct period label

### Integration

- [x] **Step 5**: Update `/src/app/page.tsx` to:
  - Add filter state management
  - Pass filter callbacks to component
  - Refetch data when filters change
  - Updated API route to handle category filter parameters
  - **AND** verify integration tests pass (22/22 tests passing)

## File Locations Summary

| File                                                                  | Purpose                                     |
| --------------------------------------------------------------------- | ------------------------------------------- |
| `src/modules/Dashboard/components/CategorySpendingFilters.tsx`        | Reusable filter components                  |
| `src/modules/Dashboard/components/CategorySpendingFilters.test.tsx`   | Filter component tests                      |
| `src/modules/Dashboard/components/CategorySpendingAreaChart.tsx`      | Enhanced chart with filters                 |
| `src/modules/Dashboard/components/CategorySpendingAreaChart.test.tsx` | Updated component tests                     |
| `src/modules/Dashboard/actions.ts`                                    | Updated API function for date range presets |
| `src/app/page.tsx`                                                    | Parent integration with filter state        |

## Filter Options Design

### Period Options

- `day` - Daily breakdown
- `week` - Weekly breakdown (current default)
- `month` - Monthly breakdown

### Date Range Presets

- `last_week` - Last 7 days
- `this_month` - Current month
- `last_month` - Previous month
- `last_3_months` - Last 90 days
- `last_6_months` - Last 180 days
- `this_year` - Current calendar year
- `last_year` - Previous calendar year
- `all` - All time

## Implementation Notes

- Use shadcn/ui Select components (already in codebase)
- Period selector: dropdown with icons
- Date range selector: dropdown with preset labels
- Both selectors should trigger immediate data refetch
- Loading state should be shown during refetch
- Default: Weekly, Last 3 months
