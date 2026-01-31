# Refactor All Pages to Self-Contained Component Pattern

## Scope

Refactor 6 pages to match the Budget module's self-contained component architecture. Work page-by-page, simplest to most complex, with tests for each new hook/store.

| Page | Current Lines | Complexity |
|---|---|---|
| 1. Wallets | 232 | Low |
| 2. Categories | 265 | Low-Medium |
| 3. Export | 264 | Low-Medium |
| 4. Savings | 332 | Medium |
| 5. Dashboard | 345 | High |
| 6. Transactions | 513 | High |

---

## Per-Page Plan

### 1. Wallets (`src/app/wallets/page.tsx`)

**New files to create:**

| File | Purpose |
|---|---|
| `src/modules/Wallet/utils/queryKeys.ts` | Query key factory: `walletKeys.all`, `walletKeys.list()` |
| `src/modules/Wallet/hooks/useWalletsData.ts` | `useQuery` wrapping `GET /api/wallets` |
| `src/modules/Wallet/hooks/useWalletMutations.ts` | `useMutation` for create/update/archive/delete + cache invalidation |
| `src/modules/Wallet/stores/useWalletsPageStore.ts` | Zustand: `isCreateDialogOpen`, `isEditDialogOpen`, `selectedWallet`, open/close actions |
| `src/modules/Wallet/components/WalletsPageHeader.tsx` | Self-contained: title + "Add Wallet" button (uses store) |
| `src/modules/Wallet/components/WalletsSummaryCards.tsx` | Self-contained: 5 summary stat cards (uses `useWalletsData`) |
| `src/modules/Wallet/components/WalletsContent.tsx` | Self-contained wrapper: uses `useWalletsData`, passes data to `WalletTable` |
| `src/modules/Wallet/components/WalletDialogFormSelfContained.tsx` | Self-contained: wraps existing dialog form logic, uses store + mutations |
| `src/modules/Wallet/hooks/index.ts` | Barrel export |
| `src/modules/Wallet/stores/index.ts` | Barrel export |

**Files to modify:**

| File | Change |
|---|---|
| `src/app/wallets/page.tsx` | Replace with pure composition (~20 lines) |
| `src/modules/Wallet/components/WalletTable.tsx` | Keep props-based but `WalletsContent` feeds it data. The `onRefresh` prop becomes unnecessary (React Query handles refetching). |

**Zustand store shape:**
```ts
interface WalletsPageState {
  isCreateDialogOpen: boolean;
  isEditDialogOpen: boolean;
  selectedWallet: WalletWithBalance | null;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openEditDialog: (wallet: WalletWithBalance) => void;
  closeEditDialog: () => void;
  reset: () => void;
}
```

**Final page.tsx:**
```tsx
export default function WalletsPage() {
  return (
    <Suspense fallback={<WalletsPageSkeleton />}>
      <div className="space-y-6">
        <WalletsPageHeader />
        <WalletsSummaryCards />
        <WalletsContent />
        <WalletDialogForm />
      </div>
    </Suspense>
  );
}
```

---

### 2. Categories (`src/app/categories/page.tsx`)

**New files to create:**

| File | Purpose |
|---|---|
| `src/modules/Category/utils/queryKeys.ts` | `categoryKeys.all`, `categoryKeys.list()` |
| `src/modules/Category/hooks/useCategoriesData.ts` | `useQuery` wrapping `GET /api/categories` |
| `src/modules/Category/hooks/useCategoryMutations.ts` | Mutations: create (`POST`), update (`PATCH`), archive (`DELETE ?action=archive`), delete (`DELETE ?action=delete`) |
| `src/modules/Category/stores/useCategoriesPageStore.ts` | Zustand: dialog states, `selectedCategory` |
| `src/modules/Category/components/CategoriesPageHeader.tsx` | Self-contained: title + "Add Category" button |
| `src/modules/Category/components/CategoriesStatsCards.tsx` | Self-contained: 4 stat cards (income/expense/active/archived) |
| `src/modules/Category/components/CategoriesContent.tsx` | Self-contained wrapper for `CategoryTable` |
| `src/modules/Category/hooks/index.ts` | Barrel export |
| `src/modules/Category/stores/index.ts` | Barrel export |

**Files to modify:**

| File | Change |
|---|---|
| `src/app/categories/page.tsx` | Pure composition (~20 lines) |
| `src/modules/Category/components/CategoryDialogForm.tsx` | Make self-contained: use store for open/mode/initialData, use mutations for submit |

**Final page.tsx:**
```tsx
export default function CategoriesPage() {
  return (
    <Suspense fallback={<CategoriesPageSkeleton />}>
      <div className="space-y-6">
        <CategoriesPageHeader />
        <CategoriesStatsCards />
        <CategoriesContent />
        <CategoryDialogForm />
      </div>
    </Suspense>
  );
}
```

---

### 3. Export (`src/app/export/page.tsx`)

**New files to create:**

| File | Purpose |
|---|---|
| `src/modules/Export/utils/queryKeys.ts` | `exportKeys.all`, `exportKeys.stats()` |
| `src/modules/Export/hooks/useExportStats.ts` | `useQuery` wrapping `GET /api/export` |
| `src/modules/Export/components/ExportPageHeader.tsx` | Self-contained: title + subtitle |
| `src/modules/Export/components/ExportByTypeSection.tsx` | Self-contained: renders 5 `ExportCard` components (uses `useExportStats`) |
| `src/modules/Export/components/DatabaseExportSection.tsx` | Self-contained: wraps `DatabaseExportCard` (uses `useExportStats` for totalRecords) |
| `src/modules/Export/components/ExportInfoSection.tsx` | Static: "About Exports" card (no state needed) |
| `src/modules/Export/hooks/index.ts` | Barrel export |

**Files to modify:**

| File | Change |
|---|---|
| `src/app/export/page.tsx` | Pure composition (~25 lines) |
| `src/modules/Export/components/ExportStats.tsx` | Make self-contained: use `useExportStats` directly instead of props |
| `src/modules/Export/components/index.ts` | Update barrel exports |

**Note:** No Zustand store needed — Export page has no dialogs or UI state. `ExportCard` remains props-based (it's a generic reusable component).

**Final page.tsx:**
```tsx
export default function ExportPage() {
  return (
    <Suspense fallback={<ExportPageSkeleton />}>
      <div className="space-y-8">
        <ExportPageHeader />
        <ExportStats />
        <ExportByTypeSection />
        <DatabaseExportSection />
        <ExportInfoSection />
      </div>
    </Suspense>
  );
}
```

---

### 4. Savings (`src/app/savings/page.tsx`)

**New files to create:**

| File | Purpose |
|---|---|
| `src/modules/SavingsBucket/utils/queryKeys.ts` | `savingsBucketKeys.all`, `savingsBucketKeys.list()` |
| `src/modules/SavingsBucket/hooks/useSavingsBucketsData.ts` | `useQuery` wrapping `GET /api/savings-buckets` |
| `src/modules/SavingsBucket/hooks/useSavingsBucketMutations.ts` | Mutations: create, update, archive, delete, bulkDelete |
| `src/modules/SavingsBucket/stores/useSavingsPageStore.ts` | Zustand: dialog states, `selectedBucket`, `selectedBucketIds`, `isDeleteDialogOpen` |
| `src/modules/SavingsBucket/components/SavingsPageHeader.tsx` | Self-contained: title + "Delete Selected" + "Add Bucket" buttons |
| `src/modules/SavingsBucket/components/SavingsStatsCards.tsx` | Self-contained: active/archived stat cards |
| `src/modules/SavingsBucket/components/SavingsContent.tsx` | Self-contained wrapper for `SavingsBucketTable` |
| `src/modules/SavingsBucket/components/SavingsBulkDeleteDialog.tsx` | Self-contained: bulk delete confirmation dialog |
| `src/modules/SavingsBucket/hooks/index.ts` | Barrel export |
| `src/modules/SavingsBucket/stores/index.ts` | Barrel export |

**Files to modify:**

| File | Change |
|---|---|
| `src/app/savings/page.tsx` | Pure composition (~25 lines) |
| `src/modules/SavingsBucket/components/SavingsBucketDialogForm.tsx` | Make self-contained: use store + mutations |

**Zustand store shape:**
```ts
interface SavingsPageState {
  isCreateDialogOpen: boolean;
  isEditDialogOpen: boolean;
  isDeleteDialogOpen: boolean;
  selectedBucket: SavingsBucket | null;
  selectedBucketIds: string[];
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openEditDialog: (bucket: SavingsBucket) => void;
  closeEditDialog: () => void;
  openDeleteDialog: () => void;
  closeDeleteDialog: () => void;
  setSelectedBucketIds: (ids: string[]) => void;
  clearSelection: () => void;
  reset: () => void;
}
```

---

### 5. Dashboard (`src/app/page.tsx`)

**New files to create:**

| File | Purpose |
|---|---|
| `src/modules/Dashboard/utils/queryKeys.ts` | `dashboardKeys.all`, `dashboardKeys.revamp(period, preset)` |
| `src/modules/Dashboard/hooks/useDashboardData.ts` | `useQuery` wrapping `GET /api/dashboard/revamp?period=X&dateRangePreset=Y` — returns KPIs, timeSeries, categoryBreakdown, latestTransactions |
| `src/modules/Dashboard/hooks/useDashboardFilters.ts` | NUQS hooks for `period` and `dateRangePreset` URL params |
| `src/modules/Dashboard/stores/useDashboardPageStore.ts` | Zustand: `chartVariant`, `selectedInsightTab`, `categoryType`, `categoryDateRange` (UI-only state not suited for URL) |
| `src/modules/Dashboard/components/DashboardPageHeader.tsx` | Self-contained: title |
| `src/modules/Dashboard/components/DashboardKpiCardsContainer.tsx` | Self-contained wrapper: uses `useDashboardData`, passes KPI data to existing `DashboardKpiCards` |
| `src/modules/Dashboard/components/DashboardInsightsPanel.tsx` | Self-contained: composes `ChartVariantToggle`, `DashboardChartControls`, `DashboardInsights` — uses store + data hook + filters |
| `src/modules/Dashboard/components/DashboardBottomRow.tsx` | Self-contained: composes `CategoryBreakdownDoughnut` + `LatestTransactionsTable` |
| `src/modules/Dashboard/hooks/index.ts` | Barrel export |

**Files to modify:**

| File | Change |
|---|---|
| `src/app/page.tsx` | Pure composition (~25 lines) |
| `src/modules/Dashboard/stores/index.ts` | Add new store export |

**Note:** Existing `useChartTypeStore` is for chart type (area/line) with localStorage persistence — separate from `chartVariant` (line/bar toggle). Keep both. The existing child components (`DashboardKpiCards`, `DashboardInsights`, `CategoryBreakdownDoughnut`, `LatestTransactionsTable`, `DashboardChartControls`, `ChartVariantToggle`) stay props-based — self-contained wrappers feed them data.

**Final page.tsx:**
```tsx
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <div className="space-y-6">
        <DashboardPageHeader />
        <DashboardKpiCardsContainer />
        <DashboardInsightsPanel />
        <DashboardBottomRow />
      </div>
    </Suspense>
  );
}
```

---

### 6. Transactions (`src/app/transactions/page.tsx`)

**New files to create:**

| File | Purpose |
|---|---|
| `src/modules/Transaction/utils/queryKeys.ts` | `transactionKeys.all`, `transactionKeys.list(filters)`, `transactionKeys.referenceData()` |
| `src/modules/Transaction/hooks/useTransactionsData.ts` | `useQuery` wrapping `GET /api/transactions?type=X&walletId=Y&...` — depends on filter state |
| `src/modules/Transaction/hooks/useTransactionReferenceData.ts` | `useQuery` wrapping parallel fetch of wallets, categories, savings-buckets (for dropdowns) |
| `src/modules/Transaction/hooks/useTransactionMutations.ts` | Mutations: delete single, bulk delete + cache invalidation |
| `src/modules/Transaction/hooks/useTransactionFilters.ts` | NUQS hooks: `typeFilter`, `walletFilter`, `categoryFilter`, `fromDate`, `toDate` URL params |
| `src/modules/Transaction/stores/useTransactionsPageStore.ts` | Zustand: `isAddDialogOpen`, `isEditDialogOpen`, `isDeleteDialogOpen`, `transactionToEdit`, `selectedTransactionIds`, `isDeleting` |
| `src/modules/Transaction/components/TransactionsPageHeader.tsx` | Self-contained: title + "Delete Selected" + "Add Transaction" buttons |
| `src/modules/Transaction/components/TransactionsStatsCards.tsx` | Self-contained: 4 stat cards computed from `useTransactionsData` |
| `src/modules/Transaction/components/TransactionsFilters.tsx` | Self-contained: filter controls using `useTransactionFilters` + `useTransactionReferenceData` |
| `src/modules/Transaction/components/TransactionsContent.tsx` | Self-contained wrapper for `TransactionTable` |
| `src/modules/Transaction/components/TransactionBulkDeleteDialog.tsx` | Self-contained: bulk delete confirmation dialog |
| `src/modules/Transaction/hooks/index.ts` | Barrel export |
| `src/modules/Transaction/stores/index.ts` | Barrel export |

**Files to modify:**

| File | Change |
|---|---|
| `src/app/transactions/page.tsx` | Pure composition (~30 lines) |
| `src/modules/Transaction/components/AddTransactionDialog.tsx` | Make self-contained: use store for open state, use `useTransactionReferenceData` for dropdowns, mutations for submit |
| `src/modules/Transaction/components/EditTransactionDialog.tsx` | Make self-contained: use store for open state + transaction, use reference data hook, mutations for submit |
| `src/modules/Transaction/components/AddTransactionDialog.test.tsx` | Update to mock stores/hooks |
| `src/modules/Transaction/components/EditTransactionDialog.test.tsx` | Update to mock stores/hooks |
| `src/modules/Transaction/components/TransactionTable.test.tsx` | Update if TransactionTable interface changes |

**Zustand store shape:**
```ts
interface TransactionsPageState {
  isAddDialogOpen: boolean;
  isEditDialogOpen: boolean;
  isDeleteDialogOpen: boolean;
  transactionToEdit: Transaction | null;
  selectedTransactionIds: string[];
  openAddDialog: () => void;
  closeAddDialog: () => void;
  openEditDialog: (transaction: Transaction) => void;
  closeEditDialog: () => void;
  openDeleteDialog: () => void;
  closeDeleteDialog: () => void;
  setSelectedTransactionIds: (ids: string[]) => void;
  clearSelection: () => void;
  reset: () => void;
}
```

---

## Execution Order & Approach

Work page-by-page. For each page:

1. Create query key factory (`utils/queryKeys.ts`)
2. Create React Query hooks (data + mutations)
3. Create NUQS hooks (if applicable)
4. Create Zustand store (if applicable)
5. Create self-contained wrapper components
6. Modify existing dialog components to be self-contained
7. Simplify `page.tsx` to pure composition
8. Run `pnpm test` to verify no regressions
9. Run `pnpm lint` and `pnpm format`

## Verification

After each page refactoring:
- `pnpm test` — all existing tests must pass
- `pnpm lint` — no linting errors
- `pnpm build` — successful build (type-check)

After all pages are done:
- `pnpm test` — full test suite passes
- `pnpm build` — clean build
- Manual spot check: each page renders correctly with data fetching, dialog open/close, and mutations working
