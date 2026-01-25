# Plan: Budget Card Circular Progress Redesign

## Goal

Redesign the `BudgetCardGrid` component to match the new design with:

- Circular progress indicator on the left showing percentage spent
- Compact right-side layout with "Remaning" label and remaining/total amounts
- "on track" status badge
- Maintain existing functionality (edit/delete actions)

## Current vs Target Analysis

### Current Design

- Vertical layout with category name at top
- Budget/Spent/Remaining in list format
- Horizontal progress bar
- Status badge at bottom
- Three-dot menu in header

### Target Design (from image)

- Horizontal split layout
- Left: Circular progress chart with percentage and spent amount in center
- Right: "Remaining" label, remaining/total amount, status badge
- More compact and visual

## Module Structure Check

- [x] Confirmed that new files are colocated within Budget module (`/src/modules/Budget/components/`)
- [x] Confirmed types are using `.ts` and are properly exported
- [x] Confirmed that every logic change has a planned test file

## Execution Steps

### Step 1: Create Circular Progress Component

- [x] **Step 1.1**: Create `/src/modules/Budget/components/CircularProgress.tsx` with SVG-based circular progress indicator **AND** create `/src/modules/Budget/components/CircularProgress.test.tsx`
  - Support percentage value (0-100+)
  - Display center content (spent amount)
  - Use gradient colors (purple/blue theme from image)
  - Handle over-budget scenarios (>100%)
  - ✅ 29 tests passing

### Step 2: Create Utility Functions

- [x] **Step 2.1**: Create `/src/modules/Budget/utils/formatters.ts` for currency and percentage formatting **AND** create `/src/modules/Budget/utils/formatters.test.ts`
  - Move `formatCurrency` to shared util
  - Add `formatPercentage` function
  - Ensure IDR formatting consistency
  - ✅ 31 tests passing (including formatCurrency, formatPercentage, formatCompactCurrency)

### Step 3: Redesign Budget Card Layout

- [x] **Step 3.1**: Update `/src/modules/Budget/components/BudgetCardGrid.tsx` to use new horizontal layout **AND** update `/src/modules/Budget/components/BudgetCardGrid.test.tsx`
  - Replace vertical layout with flex horizontal
  - Integrate `CircularProgress` component on left side
  - Create compact right-side stats section
  - Update responsive behavior for mobile
  - Keep three-dot menu but reposition if needed
  - ✅ 21 tests passing
  - ✅ Uses new formatter utilities

### Step 4: Update Card Styling

- [x] **Step 4.1**: Refine visual styling to match target design **AND** verify with visual regression test
  - Adjust spacing and padding
  - Update typography (font sizes, weights)
  - Ensure status badge positioning matches design
  - Test dark mode compatibility
  - ✅ Horizontal layout with circular progress styling applied
  - ✅ Responsive design maintained

### Step 5: Test Integration

- [x] **Step 5.1**: Run all Budget module tests to ensure no regressions
  - Execute: `pnpm test src/modules/Budget`
  - Verify all existing functionality works
  - Check responsive behavior on different screen sizes
  - ✅ 255 tests passed (11 test files, 0 failures)
  - ✅ All existing functionality preserved
  - ✅ All new components integrated successfully

### Step 6: Documentation

- [x] **Step 6.1**: Update component documentation
  - Document new props for `CircularProgress`
  - Update JSDoc comments
  - Add usage examples if needed
  - ✅ Comprehensive JSDoc added to CircularProgress component
  - ✅ All functions documented with @example tags
  - ✅ Type interfaces fully documented

## Notes

- Use existing `recharts` library if needed, but prefer lightweight SVG solution for simple circular progress
- Maintain all existing props and callbacks (`onEdit`, `onDelete`, etc.)
- Ensure accessibility (ARIA labels, screen reader support)
- Keep existing loading and empty states
- Preserve summary cards at the top
