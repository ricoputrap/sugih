"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  BudgetSummary,
  BudgetViewMode,
  BudgetWithCategory,
} from "../types";
import { BudgetCardGrid } from "./BudgetCardGrid";
import { BudgetTable } from "./BudgetTable";
import { MonthSelector } from "./MonthSelector";
import { ViewToggle } from "./ViewToggle";

interface BudgetDetailsCardProps {
  // Month selector
  month: string;
  onMonthChange: (month: string) => void;
  monthOptions: Array<{ value: string; label: string }>;
  monthNavigation: {
    canGoToPrevious: boolean;
    canGoToNext: boolean;
    previousMonth: string | null;
    nextMonth: string | null;
  };
  // View toggle
  viewMode: BudgetViewMode;
  onViewModeChange: (mode: BudgetViewMode) => void;
  // Budget data
  budgets: BudgetWithCategory[];
  summary: BudgetSummary | null;
  isLoading: boolean;
  // Actions
  onEdit: (budget: BudgetWithCategory) => void;
  onDelete: (id: string) => Promise<void>;
}

function getSelectedMonthDisplay(
  month: string,
  monthOptions: Array<{ value: string; label: string }>,
) {
  const option = monthOptions.find((opt) => opt.value === month);
  return option?.label || "Select a month";
}

export function BudgetDetailsCard({
  month,
  onMonthChange,
  monthOptions,
  monthNavigation,
  viewMode,
  onViewModeChange,
  budgets,
  summary,
  isLoading,
  onEdit,
  onDelete,
}: BudgetDetailsCardProps) {
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
            onMonthChange={onMonthChange}
            monthOptions={monthOptions}
            isLoading={isLoading}
            navigation={monthNavigation}
          />
          <ViewToggle
            value={viewMode}
            onChange={onViewModeChange}
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
            onEdit={onEdit}
            onDelete={onDelete}
            isLoading={isLoading}
          />
        ) : (
          <BudgetCardGrid
            budgets={budgets}
            summary={summary || undefined}
            onEdit={onEdit}
            onDelete={onDelete}
            isLoading={isLoading}
          />
        )}
      </CardContent>
    </Card>
  );
}
