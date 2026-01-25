"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DashboardKpiCards,
  DashboardInsights,
  CategoryBreakdownDoughnut,
  LatestTransactionsTable,
} from "@/modules/Dashboard/components";
import { DashboardChartControls } from "@/modules/Dashboard/components/DashboardChartControls";
import { ChartVariantToggle } from "@/modules/Dashboard/components/ChartVariantToggle";
import type {
  CategorySpendingTrendChartData,
  NetWorthChartData,
  CategoryBreakdownData,
  RecentTransaction,
  KpiCardData,
} from "@/modules/Dashboard/schema";
import type {
  Period,
  DateRangePreset,
  ChartVariant,
  InsightTab,
} from "@/modules/Dashboard/types";

// Temporary mock data for KPI cards until API is updated
const mockKpiData: {
  netWorth: KpiCardData;
  moneyLeftToSpend: KpiCardData;
  totalSpending: KpiCardData;
  totalSavings: KpiCardData;
} = {
  netWorth: {
    title: "Total Net Worth",
    value: 0,
    growth: {
      value: 0,
      label: "Total Wallets + Savings",
      isPositive: false,
      isNegative: false,
      isNeutral: true,
    },
    period: "All time",
  },
  moneyLeftToSpend: {
    title: "Money Left to Spend",
    value: 0,
    growth: {
      value: 0,
      label: "this month",
      isPositive: false,
      isNegative: false,
      isNeutral: true,
    },
    period: "This month",
  },
  totalSpending: {
    title: "Total Spending",
    value: 0,
    growth: {
      value: 0,
      label: "vs last month",
      isPositive: false,
      isNegative: false,
      isNeutral: true,
    },
    period: "This month",
  },
  totalSavings: {
    title: "Total Savings",
    value: 0,
    growth: {
      value: 0,
      label: "all time",
      isPositive: false,
      isNegative: false,
      isNeutral: true,
    },
    period: "All time",
  },
};

export default function DashboardPage() {
  // Data state
  const [categorySpendingTrend, setCategorySpendingTrend] = useState<
    CategorySpendingTrendChartData[]
  >([]);
  const [netWorthTrend, setNetWorthTrend] = useState<NetWorthChartData[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<{
    expenses: CategoryBreakdownData[];
    income: CategoryBreakdownData[];
  }>({ expenses: [], income: [] });
  const [recentTransactions, setRecentTransactions] = useState<
    RecentTransaction[]
  >([]);
  const [kpiData, setKpiData] = useState(mockKpiData);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chart controls state
  const [period, setPeriod] = useState<Period>("monthly");
  const [dateRangePreset, setDateRangePreset] =
    useState<DateRangePreset>("last_3_months");
  const [chartVariant, setChartVariant] = useState<ChartVariant>("line");
  const [selectedInsightTab, setSelectedInsightTab] =
    useState<InsightTab>("netWorth");

  // Category breakdown filters
  const [categoryType, setCategoryType] = useState<"expense" | "income">(
    "expense",
  );
  const [categoryDateRange, setCategoryDateRange] =
    useState<DateRangePreset>("this_month");

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      params.set("period", period);
      params.set("dateRangePreset", dateRangePreset);

      // Fetch data from revamp API
      const response = await fetch(
        `/api/dashboard/revamp?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const data = result.data;

      // Update state with API data from revamp summary
      if (data.timeSeries) {
        setNetWorthTrend(data.timeSeries.netWorth || []);
      }

      if (data.timeSeries?.spending) {
        setCategorySpendingTrend(data.timeSeries.spending || []);
      }

      if (data.latestTransactions) {
        setRecentTransactions(data.latestTransactions || []);
      }

      // Map category breakdown
      if (data.categoryBreakdown) {
        setCategoryBreakdown({
          expenses: data.categoryBreakdown.expenses || [],
          income: data.categoryBreakdown.income || [],
        });
      }

      // Use KPI data directly from API (includes correct labels and growth metrics)
      if (data.kpis) {
        setKpiData({
          netWorth: data.kpis.netWorth,
          moneyLeftToSpend: data.kpis.moneyLeftToSpend,
          totalSpending: data.kpis.totalSpending,
          totalSavings: data.kpis.totalSavings,
        });
      }
    } catch (err: unknown) {
      console.error("Failed to fetch dashboard data:", err);
      const message =
        err instanceof Error ? err.message : "Failed to load dashboard data";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [period, dateRangePreset]);

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your financial health and spending patterns
          </p>
        </div>

        {/* Loading KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-lg border bg-card p-6 shadow-sm animate-pulse"
            >
              <div className="h-4 w-24 bg-muted rounded mb-3" />
              <div className="h-8 w-32 bg-muted rounded mb-2" />
              <div className="h-3 w-20 bg-muted rounded" />
            </div>
          ))}
        </div>

        {/* Loading Insights */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="h-[450px] flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="h-6 w-32 bg-muted rounded mx-auto animate-pulse" />
              <div className="h-64 w-full bg-muted rounded animate-pulse mt-4" />
            </div>
          </div>
        </div>

        {/* Loading Third Row */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-card p-6 shadow-sm h-[400px] animate-pulse" />
          <div className="rounded-lg border bg-card p-6 shadow-sm h-[400px] animate-pulse" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your financial health and spending patterns
          </p>
        </div>

        <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
          <h3 className="text-lg font-semibold text-destructive mb-2">
            Error Loading Dashboard
          </h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            type="button"
            onClick={() => fetchData()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your financial health and spending patterns
        </p>
      </div>

      {/* KPI Cards */}
      <DashboardKpiCards
        netWorth={kpiData.netWorth}
        moneyLeftToSpend={kpiData.moneyLeftToSpend}
        totalSpending={kpiData.totalSpending}
        totalSavings={kpiData.totalSavings}
      />

      {/* Financial Insights with Controls */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Financial Insights</h3>
              <p className="text-sm text-muted-foreground">
                Track your financial trends over time
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ChartVariantToggle
                value={chartVariant}
                onChange={setChartVariant}
              />
            </div>
          </div>

          {/* Chart Controls */}
          <div className="mb-4">
            <DashboardChartControls
              period={period}
              dateRangePreset={dateRangePreset}
              onPeriodChange={setPeriod}
              onDateRangePresetChange={setDateRangePreset}
            />
          </div>
        </div>

        {/* Insights Charts with Tabs */}
        <div className="px-6 pb-6">
          <DashboardInsights
            netWorthData={netWorthTrend}
            spendingData={categorySpendingTrend}
            incomeData={[]} // TODO: Get income data from API
            savingsData={netWorthTrend} // Reuse for now
            variant={chartVariant}
            isLoading={isLoading}
            defaultTab={selectedInsightTab}
            onTabChange={setSelectedInsightTab}
          />
        </div>
      </div>

      {/* Third Row: Category Breakdown + Latest Transactions */}
      <div className="grid gap-4 md:grid-cols-2">
        <CategoryBreakdownDoughnut
          expenseData={categoryBreakdown.expenses}
          incomeData={categoryBreakdown.income}
          categoryType={categoryType}
          dateRangePreset={categoryDateRange}
          onCategoryTypeChange={setCategoryType}
          onDateRangePresetChange={setCategoryDateRange}
          isLoading={isLoading}
        />

        <LatestTransactionsTable
          transactions={recentTransactions}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
