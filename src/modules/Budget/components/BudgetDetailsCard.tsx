"use client";

import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useBudgetMonth,
  useBudgetMonthOptions,
  useBudgetMutations,
  useBudgetsData,
  useBudgetView,
} from "@/modules/Budget/hooks";
import { useBudgetMonthNavigation } from "@/modules/Budget/hooks/useBudgetMonthNavigation";
import { useBudgetsPageStore } from "@/modules/Budget/stores";
import { BudgetCardGrid } from "./BudgetCardGrid";
import { BudgetTable } from "./BudgetTable";
import { MonthSelector } from "./MonthSelector";
import { ViewToggle } from "./ViewToggle";

function getSelectedMonthDisplay(
  month: string,
  monthOptions: Array<{ value: string; label: string }>,
) {
  const option = monthOptions.find((opt) => opt.value === month);
  return option?.label || "Select a month";
}

export function BudgetDetailsCard() {
  // URL state (NUQS)
  const [month, setMonth] = useBudgetMonth();
  const [viewMode, setViewMode] = useBudgetView();
  const monthOptions = useBudgetMonthOptions();
  const monthNavigation = useBudgetMonthNavigation(month);

  // Server state (TanStack Query)
  const { data, isLoading } = useBudgetsData(month);
  const budgets = data?.budgets ?? [];
  const summary = data?.summary ?? null;

  // UI state (Zustand)
  const { openEditDialog, selectedBudgetIds, setSelectedBudgetIds, clearSelection } = useBudgetsPageStore();

  // Mutations
  const { deleteBudget } = useBudgetMutations();

  // Handle delete budget
  const handleDeleteBudget = async (id: string) => {
    await deleteBudget.mutateAsync({ id, month });
  };

  // Clear selection when month changes or when switching FROM list view TO grid view
  // (Grid view doesn't support multi-select)
  useEffect(() => {
    clearSelection();
  }, [month, clearSelection]);

  // Clear selection when switching from list to grid view
  useEffect(() => {
    if (viewMode !== "list" && selectedBudgetIds.size > 0) {
      clearSelection();
    }
  }, [viewMode, selectedBudgetIds, clearSelection]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Budget Details</CardTitle>
          <CardDescription>
            {month
              ? `Budget breakdown for ${getSelectedMonthDisplay(month, monthOptions)}`
              : "Select a month to view budget details"}
          </CardDescription>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center md:gap-4">
          <MonthSelector
            month={month}
            onMonthChange={setMonth}
            monthOptions={monthOptions}
            isLoading={isLoading}
            navigation={monthNavigation}
          />
          <ViewToggle
            value={viewMode}
            onChange={setViewMode}
            disabled={isLoading}
            data-testid="view-toggle"
          />
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === "list" ? (
          <BudgetTable
            budgets={budgets}
            summary={summary || undefined}
            onEdit={openEditDialog}
            onDelete={handleDeleteBudget}
            isLoading={isLoading}
            selectedIds={Array.from(selectedBudgetIds)}
            onSelectionChange={setSelectedBudgetIds}
          />
        ) : (
          <BudgetCardGrid
            budgets={budgets}
            summary={summary || undefined}
            onEdit={openEditDialog}
            onDelete={handleDeleteBudget}
            isLoading={isLoading}
          />
        )}
      </CardContent>
    </Card>
  );
}
