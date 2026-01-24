/**
 * Dashboard Revamp Shell
 *
 * Main container component for the revamped dashboard.
 * Contains:
 * - Top KPI cards (Net Worth, Money Left, Spending, Savings)
 * - Financial Insights chart with tabs
 * - Third row (Category breakdown doughnut + Latest transactions)
 */

"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryBreakdownDoughnut } from "./CategoryBreakdownDoughnut";
import { LatestTransactionsTable } from "./LatestTransactionsTable";
import type { CategoryBreakdownData, RecentTransaction } from "../schema";
import type { DateRangePreset } from "../types";

export interface DashboardRevampShellProps {
  /** Expense category breakdown data */
  expenseData?: CategoryBreakdownData[];
  /** Income category breakdown data */
  incomeData?: CategoryBreakdownData[];
  /** Recent transactions */
  recentTransactions?: RecentTransaction[];
  /** Whether data is loading */
  isLoading?: boolean;
}

export function DashboardRevampShell({
  expenseData,
  incomeData,
  recentTransactions,
  isLoading = false,
}: DashboardRevampShellProps) {
  // State for category breakdown filters
  const [categoryType, setCategoryType] = React.useState<"expense" | "income">(
    "expense",
  );
  const [dateRangePreset, setDateRangePreset] =
    React.useState<DateRangePreset>("this_month");

  return (
    <div className="space-y-6" data-testid="dashboard-revamp-shell">
      {/* Top KPI Cards Section */}
      <section
        data-testid="kpi-cards-section"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Net Worth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp 0</div>
            <p className="text-xs text-muted-foreground">Placeholder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Money Left to Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp 0</div>
            <p className="text-xs text-muted-foreground">Placeholder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp 0</div>
            <p className="text-xs text-muted-foreground">Placeholder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp 0</div>
            <p className="text-xs text-muted-foreground">Placeholder</p>
          </CardContent>
        </Card>
      </section>

      {/* Financial Insights Section */}
      <section data-testid="financial-insights-section">
        <Card>
          <CardHeader>
            <CardTitle>Financial Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Chart placeholder - tabs and controls to be implemented
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Third Row: Breakdown + Transactions */}
      <section
        data-testid="third-row-section"
        className="grid gap-4 md:grid-cols-2"
      >
        {/* Category Breakdown Doughnut */}
        <div data-testid="category-breakdown-card">
          <CategoryBreakdownDoughnut
            expenseData={expenseData}
            incomeData={incomeData}
            categoryType={categoryType}
            dateRangePreset={dateRangePreset}
            onCategoryTypeChange={setCategoryType}
            onDateRangePresetChange={setDateRangePreset}
            isLoading={isLoading}
          />
        </div>

        {/* Latest Transactions */}
        <div data-testid="latest-transactions-card">
          <LatestTransactionsTable
            transactions={recentTransactions}
            isLoading={isLoading}
          />
        </div>
      </section>
    </div>
  );
}
