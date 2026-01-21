"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CategorySpendingAreaChart,
  NetWorthTrendChart,
} from "@/modules/Dashboard/components";
import type {
  CategorySpendingTrendChartData,
  DashboardData,
  DashboardDateRangeInput,
  DashboardSummary,
  DateRangePreset,
  NetWorthChartData,
  PeriodGranularity,
} from "@/modules/Dashboard/schema";

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [categorySpendingTrend, setCategorySpendingTrend] = useState<
    CategorySpendingTrendChartData[]
  >([]);
  const [netWorthTrend, setNetWorthTrend] = useState<NetWorthChartData[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range state (default to last 30 days)
  const [dateRange, setDateRange] = useState<DashboardDateRangeInput>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });

  // Category spending chart filter state
  const [categoryPeriod, setCategoryPeriod] =
    useState<PeriodGranularity>("week");
  const [categoryDateRangePreset, setCategoryDateRangePreset] =
    useState<DateRangePreset>("last_3_months");

  // Fetch dashboard data with optional category filters
  const fetchData = useCallback(
    async (filters?: {
      period?: PeriodGranularity;
      dateRangePreset?: DateRangePreset;
    }) => {
      try {
        setIsLoading(true);
        setError(null);

        // Build query parameters
        const params = new URLSearchParams();
        if (dateRange.from) {
          params.set("from", dateRange.from.toISOString());
        }
        if (dateRange.to) {
          params.set("to", dateRange.to.toISOString());
        }

        // Add category chart filters
        if (filters?.period) {
          params.set("categoryPeriod", filters.period);
        }
        if (filters?.dateRangePreset) {
          params.set("categoryDateRangePreset", filters.dateRangePreset);
        }

        // Fetch data from API
        const response = await fetch(`/api/dashboard?${params.toString()}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const data = result.data;

        setDashboardData(data);
        setCategorySpendingTrend(data.categorySpendingTrend || []);
        setNetWorthTrend(data.netWorthTrend || []);
        setSummary(data.summary);
      } catch (err: unknown) {
        console.error("Failed to fetch dashboard data:", err);
        const message =
          err instanceof Error ? err.message : "Failed to load dashboard data";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [dateRange],
  );

  // Handle category chart filter changes
  const handleCategoryFilterChange = useCallback(
    (params: {
      period: PeriodGranularity;
      dateRangePreset: DateRangePreset;
    }) => {
      setCategoryPeriod(params.period);
      setCategoryDateRangePreset(params.dateRangePreset);
      fetchData({
        period: params.period,
        dateRangePreset: params.dateRangePreset,
      });
    },
    [fetchData],
  );

  // Fetch data on component mount and date range change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Format currency helper (fallback)
  const formatCurrencyDisplay = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Handle date range changes
  const _handleDateRangeChange = (newRange: DashboardDateRangeInput) => {
    setDateRange(newRange);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your financial health and spending patterns
          </p>
        </div>

        {/* Loading skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {["net-worth", "money-left", "total-spending", "total-income"].map(
            (cardId) => (
              <Card key={`skeleton-card-${cardId}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Loading...
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-20 bg-muted animate-pulse rounded mb-2" />
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ),
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Spending Trend</CardTitle>
              <CardDescription>Loading spending data...</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] flex items-center justify-center">
              <div className="animate-pulse space-y-2 w-full">
                <div className="h-4 w-24 bg-muted rounded mx-auto" />
                <div className="h-40 w-full bg-muted rounded mt-4" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Net Worth Trend</CardTitle>
              <CardDescription>Loading net worth data...</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] flex items-center justify-center">
              <div className="animate-pulse space-y-2 w-full">
                <div className="h-4 w-24 bg-muted rounded mx-auto" />
                <div className="h-40 w-full bg-muted rounded mt-4" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your financial health and spending patterns
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">
              Error Loading Dashboard
            </CardTitle>
            <CardDescription>
              There was an error loading your dashboard data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{error}</p>
              <button
                type="button"
                onClick={fetchData}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Try Again
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your financial health and spending patterns
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Net Worth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary
                ? formatCurrencyDisplay(summary.currentNetWorth)
                : "Rp 0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Wallets + Savings Buckets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Money Left to Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary
                ? formatCurrencyDisplay(summary.moneyLeftToSpend)
                : "Rp 0"}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? formatCurrencyDisplay(summary.totalSpending) : "Rp 0"}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary ? summary.period : "This month"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? formatCurrencyDisplay(summary.totalIncome) : "Rp 0"}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary ? summary.period : "This month"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <CategorySpendingAreaChart
          data={categorySpendingTrend}
          isLoading={isLoading}
          title="Category Spending Trends"
          description="Track how spending in each category changes over time"
          initialPeriod={categoryPeriod}
          initialDateRangePreset={categoryDateRangePreset}
          onFilterChange={handleCategoryFilterChange}
        />

        <NetWorthTrendChart
          data={netWorthTrend}
          isLoading={isLoading}
          title="Net Worth Trend"
          description="Your net worth progression over time"
        />
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>Spending by category this month</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardData?.categoryBreakdown &&
          dashboardData.categoryBreakdown.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.categoryBreakdown.slice(0, 5).map((category) => (
                <div
                  key={category.categoryId}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-sm font-medium">
                      {category.categoryName}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {formatCurrencyDisplay(category.amount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {category.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-sm">No category data available</p>
                <p className="text-xs mt-1">
                  Start recording expenses to see category breakdown
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest financial activity</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardData?.recentTransactions &&
          dashboardData.recentTransactions.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between border-b pb-3 last:border-b-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium capitalize">
                        {transaction.type.replace("_", " ")}
                      </span>
                      {transaction.categoryName && (
                        <span className="text-xs text-muted-foreground">
                          • {transaction.categoryName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.occurredAt).toLocaleDateString(
                        "id-ID",
                      )}
                      {transaction.note && ` • ${transaction.note}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-sm font-semibold ${
                        transaction.type === "income"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {transaction.type === "expense" ? "-" : "+"}
                      {formatCurrencyDisplay(Math.abs(transaction.amount))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">No transactions yet.</p>
              <p className="text-xs mt-1">
                Start by adding your first transaction.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
