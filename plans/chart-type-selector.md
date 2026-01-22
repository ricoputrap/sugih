# Plan: Chart Type Selector for CategorySpendingAreaChart

## Module Structure Check

- [x] Confirmed that new files are colocated within the Dashboard module.
- [x] Confirmed types are using `.ts` and are properly exported.
- [x] Confirmed that every logic change has a planned test file.

## Overview

Add the ability to switch between Area Chart and Line Chart visualization in the CategorySpendingAreaChart component, with state persisted using Zustand.

## Implementation Steps

- [x] **Step 1**: Create Zustand store with persistence for chart type
  - Create `/src/modules/Dashboard/stores/useChartTypeStore.ts`
  - Store contains: `chartType: "area" | "line"`
  - Use `persist` middleware for localStorage persistence
  - Create `/src/modules/Dashboard/stores/useChartTypeStore.test.ts`

- [x] **Step 2**: Create ChartTypeSelector component
  - Create `/src/modules/Dashboard/components/ChartTypeSelector.tsx`
  - Simple toggle between "Area" and "Line"
  - Use Zustand store for state management
  - Create `/src/modules/Dashboard/components/ChartTypeSelector.test.tsx`

- [x] **Step 3**: Update CategorySpendingAreaChart.tsx
  - Import and use Zustand store for chartType
  - Add LineChart and Line imports from recharts
  - Integrate ChartTypeSelector in header
  - Conditionally render AreaChart or LineChart
  - Remove gradientDefs when chartType === "line"
  - Update `/src/modules/Dashboard/components/CategorySpendingAreaChart.test.tsx`

- [x] **Step 4**: Update onFilterChange to include chartType
  - Modify callback to return chartType changes
  - Update integration tests

- [x] **Step 5**: Final verification
  - Run `pnpm test` to verify all tests pass
  - Verify persistence works (refresh page, chart type remembered)

## Technical Notes

- Zustand store location: `/src/modules/Dashboard/stores/`
- Use shadcn `Segmented` control or simple button group for selector
- LineChart uses `Line` component instead of `Area`
- LineChart doesn't need gradient definitions - only stroke colors
- Default to "area" chart (stored in Zustand with persistence)

## Implementation Summary

### Files Created

- `src/modules/Dashboard/stores/useChartTypeStore.ts` - Zustand store with persist middleware
- `src/modules/Dashboard/stores/useChartTypeStore.test.ts` - Store unit tests (7 tests)
- `src/modules/Dashboard/stores/index.ts` - Store exports
- `src/modules/Dashboard/components/ChartTypeSelector.tsx` - Toggle component with Area/Line buttons
- `src/modules/Dashboard/components/ChartTypeSelector.test.tsx` - Component tests (11 tests)
- `src/modules/Dashboard/components/CategorySpendingAreaChart.test.tsx` - Chart component tests (21 tests)

### Files Modified

- `src/modules/Dashboard/components/CategorySpendingAreaChart.tsx` - Added LineChart support and ChartTypeSelector integration
- `src/modules/Dashboard/components/index.ts` - Added ChartTypeSelector export

### Dependencies Added

- `zustand` - State management with persistence

### Test Results

- All 53 Dashboard module tests pass
- All 838 unit tests pass (excluding integration tests that require DB)
