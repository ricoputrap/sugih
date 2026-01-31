"use client";

import { useDashboardData, useDashboardFilters } from "../hooks";
import { useDashboardPageStore } from "../stores";
import { CategoryBreakdownDoughnut } from "./CategoryBreakdownDoughnut";
import { LatestTransactionsTable } from "./LatestTransactionsTable";

export function DashboardBottomRow() {
  const { period, dateRangePreset } = useDashboardFilters();
  const { data, isLoading } = useDashboardData(period, dateRangePreset);
  const {
    categoryType,
    categoryDateRange,
    setCategoryType,
    setCategoryDateRange,
  } = useDashboardPageStore();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <CategoryBreakdownDoughnut
        expenseData={data?.categoryBreakdown?.expenses || []}
        incomeData={data?.categoryBreakdown?.income || []}
        categoryType={categoryType}
        dateRangePreset={categoryDateRange}
        onCategoryTypeChange={setCategoryType}
        onDateRangePresetChange={setCategoryDateRange}
        isLoading={isLoading}
      />

      <LatestTransactionsTable
        transactions={data?.latestTransactions || []}
        isLoading={isLoading}
      />
    </div>
  );
}
