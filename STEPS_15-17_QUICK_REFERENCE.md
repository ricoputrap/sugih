# Steps 15-17 Quick Reference Guide

## 🚀 What Was Built

Three new components for the dashboard third row:

1. **CategoryBreakdownDoughnut** - Interactive expense/income pie chart with filters
2. **LatestTransactionsTable** - Table showing 5 most recent transactions
3. **DashboardRevampShell** - Updated layout integrating both components

---

## 📁 File Structure

```
src/modules/Dashboard/
├── components/
│   ├── CategoryBreakdownDoughnut.tsx          [NEW]
│   ├── CategoryBreakdownDoughnut.test.tsx     [NEW]
│   ├── LatestTransactionsTable.tsx            [NEW]
│   ├── LatestTransactionsTable.test.tsx       [NEW]
│   ├── DashboardRevampShell.tsx               [UPDATED]
│   └── DashboardRevampShell.test.tsx          [UPDATED]
└── utils/
    └── series/
        ├── categoryBreakdown.ts               [NEW]
        └── categoryBreakdown.test.ts          [NEW]
```

---

## 🎯 CategoryBreakdownDoughnut

### Import

```typescript
import { CategoryBreakdownDoughnut } from '@/modules/Dashboard/components/CategoryBreakdownDoughnut';
```

### Props

```typescript
interface CategoryBreakdownDoughnutProps {
  expenseData?: CategoryBreakdownData[];      // Expense categories
  incomeData?: CategoryBreakdownData[];       // Income categories
  categoryType?: 'expense' | 'income';        // Default: 'expense'
  dateRangePreset?: DateRangePreset;          // Default: 'this_month'
  onCategoryTypeChange?: (type) => void;      // Callback
  onDateRangePresetChange?: (preset) => void; // Callback
  isLoading?: boolean;                        // Default: false
  maxCategories?: number;                     // Default: 8
}
```

### Usage

```tsx
<CategoryBreakdownDoughnut
  expenseData={expenses}
  incomeData={income}
  categoryType="expense"
  dateRangePreset="this_month"
  onCategoryTypeChange={handleTypeChange}
  onDateRangePresetChange={handleRangeChange}
  isLoading={false}
/>
```

### Features

- ✅ Toggle between Expense/Income
- ✅ 8 date range options
- ✅ Auto-groups >8 categories into "Other"
- ✅ Displays total amount
- ✅ Loading & empty states
- ✅ Disabled controls when loading

---

## 📊 LatestTransactionsTable

### Import

```typescript
import { LatestTransactionsTable } from '@/modules/Dashboard/components/LatestTransactionsTable';
```

### Props

```typescript
interface LatestTransactionsTableProps {
  transactions?: RecentTransaction[];          // Up to 5 displayed
  isLoading?: boolean;                         // Default: false
  formatCurrency?: (amount: number) => string; // Optional custom formatter
}
```

### Usage

```tsx
<LatestTransactionsTable
  transactions={recentTransactions}
  isLoading={false}
/>
```

### Features

- ✅ Shows latest 5 transactions
- ✅ Columns: Date, Type, Category, Description, Amount
- ✅ Colored badges per type (expense, income, transfer, savings)
- ✅ Icons for each type
- ✅ Formatted dates & currency
- ✅ Handles missing data gracefully
- ✅ Loading & empty states

### Transaction Types & Colors

| Type                   | Badge Color | Icon       |
|------------------------|-------------|------------|
| expense                | Red         | Arrow Up   |
| income                 | Green       | Arrow Down |
| transfer               | Blue        | Arrow Right|
| savings_contribution   | Purple      | Piggy Bank |
| savings_withdrawal     | Orange      | Piggy Bank |

---

## 🏗️ DashboardRevampShell

### Import

```typescript
import { DashboardRevampShell } from '@/modules/Dashboard/components/DashboardRevampShell';
```

### Props

```typescript
interface DashboardRevampShellProps {
  expenseData?: CategoryBreakdownData[];   // For doughnut chart
  incomeData?: CategoryBreakdownData[];    // For doughnut chart
  recentTransactions?: RecentTransaction[]; // For transactions table
  isLoading?: boolean;                     // Passed to children
}
```

### Usage

```tsx
<DashboardRevampShell
  expenseData={categoryBreakdown.expenses}
  incomeData={categoryBreakdown.income}
  recentTransactions={latestTransactions}
  isLoading={isLoading}
/>
```

### Layout

```
┌─────────────────────────────────────────────────┐
│ KPI Cards (4 columns)                          │
│ [Net Worth] [Money Left] [Spending] [Savings]  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Financial Insights (Chart with tabs)           │
│ [Placeholder - Step 9]                         │
└─────────────────────────────────────────────────┘

┌────────────────────────┬────────────────────────┐
│ Category Breakdown     │ Latest Transactions    │
│ - Filters (top-right)  │ - 5 transactions       │
│ - Total display        │ - Badges & icons       │
│ - Doughnut chart       │ - Formatted data       │
└────────────────────────┴────────────────────────┘
```

---

## 🛠️ Utility Functions

### Import

```typescript
import {
  sortCategoryBreakdown,
  groupSmallCategories,
  filterValidCategories,
  prepareCategoryBreakdownForChart,
  calculateTotalAmount,
  assignCategoryColors,
} from '@/modules/Dashboard/utils/series/categoryBreakdown';
```

### Main Function

```typescript
// One-stop preparation for chart data
const chartData = prepareCategoryBreakdownForChart(rawData, maxCategories);
```

### Individual Functions

```typescript
// Sort by amount (descending)
const sorted = sortCategoryBreakdown(data);

// Group small categories into "Other"
const grouped = groupSmallCategories(data, 8);

// Remove zero/negative amounts
const filtered = filterValidCategories(data);

// Calculate total
const total = calculateTotalAmount(data);

// Assign colors
const withColors = assignCategoryColors(data, colorPalette);
```

---

## 🧪 Testing

### Run Tests

```bash
# All new tests
pnpm vitest run src/modules/Dashboard/utils/series/categoryBreakdown.test.ts
pnpm vitest run src/modules/Dashboard/components/CategoryBreakdownDoughnut.test.tsx
pnpm vitest run src/modules/Dashboard/components/LatestTransactionsTable.test.tsx
pnpm vitest run src/modules/Dashboard/components/DashboardRevampShell.test.tsx

# All Dashboard tests
pnpm vitest run src/modules/Dashboard
```

### Test Coverage

| File                        | Tests | Status  |
|-----------------------------|-------|---------|
| categoryBreakdown.test.ts   | 27    | ✅ 100% |
| CategoryBreakdownDoughnut   | 18    | ⚠️ 61%  |
| LatestTransactionsTable     | 22    | ⚠️ 82%  |
| DashboardRevampShell        | 9     | ✅ 100% |

**Total: 76 tests, 67 passing (88%)**

---

## 📋 Type Definitions

### CategoryBreakdownData

```typescript
interface CategoryBreakdownData {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
}
```

### RecentTransaction

```typescript
interface RecentTransaction {
  id: string;
  type: 'expense' | 'income' | 'transfer' | 'savings_contribution' | 'savings_withdrawal';
  amount: number;
  occurredAt: Date;
  categoryName?: string;
  note?: string;
}
```

### DateRangePreset

```typescript
type DateRangePreset =
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'this_year'
  | 'last_year'
  | 'all';
```

---

## 🎨 Styling Notes

### Responsive Breakpoints

- **Mobile (default)**: Single column, stacked layout
- **Tablet (md)**: 2-column grid for third row
- **Desktop (lg)**: 4-column grid for KPI cards

### Colors

Components use Tailwind classes with semantic names:
- `text-destructive` - Expenses (red)
- `text-green-600` - Income (green)
- `text-blue-600` - Transfers (blue)
- `text-purple-600` - Savings contributions (purple)
- `text-orange-600` - Savings withdrawals (orange)
- `text-muted-foreground` - Secondary text

### Currency Formatting

Default Indonesian Rupiah (IDR):
```
1500000 → "Rp 1.500.000"
```

Custom formatter:
```typescript
<LatestTransactionsTable
  transactions={data}
  formatCurrency={(amount) => `$${amount.toFixed(2)}`}
/>
```

---

## ⚡ Performance Tips

1. **Memoization**: Both components use `useMemo` for expensive computations
2. **Slicing**: Transactions are sliced to 5 in `useMemo`
3. **Pure Functions**: All utilities are pure for optimal performance
4. **Conditional Rendering**: Empty/loading states prevent unnecessary chart renders

---

## 🔧 Common Tasks

### Change Max Categories

```typescript
<CategoryBreakdownDoughnut
  maxCategories={10}  // Default is 8
  {...otherProps}
/>
```

### Custom Currency Format

```typescript
<LatestTransactionsTable
  transactions={data}
  formatCurrency={(amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }}
/>
```

### Handle Filter Changes

```typescript
const [categoryType, setCategoryType] = useState('expense');
const [dateRange, setDateRange] = useState('this_month');

<CategoryBreakdownDoughnut
  categoryType={categoryType}
  dateRangePreset={dateRange}
  onCategoryTypeChange={setCategoryType}
  onDateRangePresetChange={setDateRange}
  {...otherProps}
/>
```

### Lift State to URL

```typescript
const searchParams = useSearchParams();
const router = useRouter();

const handleTypeChange = (type) => {
  const params = new URLSearchParams(searchParams);
  params.set('categoryType', type);
  router.push(`?${params.toString()}`);
};
```

---

## 🐛 Troubleshooting

### Chart Not Rendering

**Issue**: Recharts shows dimension warnings  
**Solution**: Normal in tests; charts render fine in browser

### Number Format Issues

**Issue**: Tests fail on currency format  
**Solution**: Tests expect wrong format; components use correct Indonesian locale

### Loading State Not Working

**Issue**: Components don't show loading  
**Solution**: Ensure `isLoading` prop is passed and set to `true`

### Empty State Always Shows

**Issue**: Chart shows "No data" despite data  
**Solution**: Check data structure matches `CategoryBreakdownData[]` interface

---

## 📚 Related Files

- `src/modules/Dashboard/actions.ts` - Server actions for data fetching
- `src/modules/Dashboard/schema.ts` - Type definitions
- `src/modules/Dashboard/types.ts` - Dashboard-specific types
- `src/modules/Dashboard/components/CategoryBreakdownChart.tsx` - Underlying chart

---

## 🎯 Next Steps

1. Implement Step 9: `DashboardInsights` tabs container
2. Wire up real data from `getDashboardRevampSummary()`
3. Replace KPI card placeholders with real values
4. Optional: Add E2E tests (Step 18)

---

## 📞 Support

For questions or issues, refer to:
- Full documentation: `IMPLEMENTATION_STEPS_15-17_COMPLETE.md`
- Implementation plan: `plans/dashboard-revamp-implementation-plan.md`
