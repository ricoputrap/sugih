"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { CategoryBreakdownChart } from "./CategoryBreakdownChart";
import { prepareCategoryBreakdownForChart } from "../utils/series/categoryBreakdown";
import type { CategoryBreakdownData } from "../schema";
import type { DateRangePreset } from "../types";
import { DATE_RANGE_PRESET_LABELS } from "../types";

/**
 * Category type for filtering breakdown
 */
export type CategoryType = "expense" | "income";

/**
 * Props for CategoryBreakdownDoughnut component
 */
export interface CategoryBreakdownDoughnutProps {
  /** Expense category breakdown data */
  expenseData?: CategoryBreakdownData[];
  /** Income category breakdown data */
  incomeData?: CategoryBreakdownData[];
  /** Currently selected category type */
  categoryType?: CategoryType;
  /** Currently selected date range preset */
  dateRangePreset?: DateRangePreset;
  /** Callback when category type changes */
  onCategoryTypeChange?: (type: CategoryType) => void;
  /** Callback when date range preset changes */
  onDateRangePresetChange?: (preset: DateRangePreset) => void;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Maximum number of categories to show before grouping into "Other" */
  maxCategories?: number;
}

/**
 * CategoryBreakdownDoughnut Component
 *
 * Displays a doughnut chart showing expense or income breakdown by category.
 *
 * Features:
 * - Toggle between expense and income breakdown
 * - Date range preset selector
 * - Automatically groups small categories into "Other" bucket
 * - Sorted by amount (descending)
 */
export function CategoryBreakdownDoughnut({
  expenseData = [],
  incomeData = [],
  categoryType = "expense",
  dateRangePreset = "this_month",
  onCategoryTypeChange,
  onDateRangePresetChange,
  isLoading = false,
  maxCategories = 8,
}: CategoryBreakdownDoughnutProps) {
  // Select data based on category type
  const rawData = categoryType === "expense" ? expenseData : incomeData;

  // Prepare data for chart (filter, sort, group)
  const chartData = React.useMemo(
    () => prepareCategoryBreakdownForChart(rawData, maxCategories),
    [rawData, maxCategories],
  );

  // Calculate total for display
  const total = React.useMemo(
    () => chartData.reduce((sum, cat) => sum + cat.amount, 0),
    [chartData],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">
          Category Breakdown
        </CardTitle>
        <div className="flex items-center gap-2">
          {/* Category Type Selector */}
          <Select
            value={categoryType}
            onValueChange={(value) =>
              onCategoryTypeChange?.(value as CategoryType)
            }
            disabled={isLoading}
          >
            <SelectTrigger
              className="w-[120px]"
              aria-label="Select category type"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expenses</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Preset Selector */}
          <Select
            value={dateRangePreset}
            onValueChange={(value) =>
              onDateRangePresetChange?.(value as DateRangePreset)
            }
            disabled={isLoading}
          >
            <SelectTrigger className="w-[160px]" aria-label="Select date range">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_week">
                {DATE_RANGE_PRESET_LABELS.last_week}
              </SelectItem>
              <SelectItem value="this_month">
                {DATE_RANGE_PRESET_LABELS.this_month}
              </SelectItem>
              <SelectItem value="last_month">
                {DATE_RANGE_PRESET_LABELS.last_month}
              </SelectItem>
              <SelectItem value="last_3_months">
                {DATE_RANGE_PRESET_LABELS.last_3_months}
              </SelectItem>
              <SelectItem value="last_6_months">
                {DATE_RANGE_PRESET_LABELS.last_6_months}
              </SelectItem>
              <SelectItem value="this_year">
                {DATE_RANGE_PRESET_LABELS.this_year}
              </SelectItem>
              <SelectItem value="last_year">
                {DATE_RANGE_PRESET_LABELS.last_year}
              </SelectItem>
              <SelectItem value="all">
                {DATE_RANGE_PRESET_LABELS.all}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">Loading...</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">
                No {categoryType} data for selected period
              </p>
              <p className="text-xs mt-1">
                Try selecting a different date range
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Total Display */}
            <div className="text-center pb-2 border-b">
              <p className="text-sm text-muted-foreground">
                Total {categoryType === "expense" ? "Expenses" : "Income"}
              </p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(total)}
              </p>
            </div>

            {/* Doughnut Chart */}
            <CategoryBreakdownChart data={chartData} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
