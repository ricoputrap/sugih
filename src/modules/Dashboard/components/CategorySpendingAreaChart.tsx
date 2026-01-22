"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  CategorySpendingFilters,
  type DateRangePreset,
  type PeriodGranularity,
} from "./CategorySpendingFilters";

export interface CategorySpendingTrendData {
  period: string;
  categories: {
    categoryId: string;
    categoryName: string;
    amount: number;
  }[];
}

interface CategorySpendingAreaChartProps {
  data: CategorySpendingTrendData[];
  isLoading?: boolean;
  title?: string;
  description?: string;
  initialPeriod?: PeriodGranularity;
  initialDateRangePreset?: DateRangePreset;
  onFilterChange?: (params: {
    period: PeriodGranularity;
    dateRangePreset: DateRangePreset;
  }) => void;
}

// Color palette for categories (supports up to 5 categories)
const CATEGORY_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function CategorySpendingAreaChart({
  data,
  isLoading = false,
  title = "Category Spending Trends",
  description = "Track how spending in each category changes over time",
  initialPeriod = "week",
  initialDateRangePreset = "last_3_months",
  onFilterChange,
}: CategorySpendingAreaChartProps) {
  // Filter state
  const [period, setPeriod] = React.useState<PeriodGranularity>(initialPeriod);
  const [dateRangePreset, setDateRangePreset] = React.useState<DateRangePreset>(
    initialDateRangePreset,
  );

  // Handle filter changes
  const handlePeriodChange = React.useCallback(
    (newPeriod: PeriodGranularity) => {
      setPeriod(newPeriod);
      if (onFilterChange) {
        onFilterChange({ period: newPeriod, dateRangePreset });
      }
    },
    [dateRangePreset, onFilterChange],
  );

  const handleDateRangePresetChange = React.useCallback(
    (newPreset: DateRangePreset) => {
      setDateRangePreset(newPreset);
      if (onFilterChange) {
        onFilterChange({ period, dateRangePreset: newPreset });
      }
    },
    [period, onFilterChange],
  );

  // Get unique category names sorted by total amount (for stacking order)
  const categoryTotals = React.useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of data) {
      for (const cat of item.categories) {
        totals.set(
          cat.categoryName,
          (totals.get(cat.categoryName) || 0) + cat.amount,
        );
      }
    }
    return totals;
  }, [data]);

  const categoryNames = React.useMemo(() => {
    return Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [categoryTotals]);

  // Build chart config for shadcn charts
  const chartConfig: ChartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    categoryNames.forEach((name, index) => {
      config[name] = {
        label: name,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      };
    });
    return config;
  }, [categoryNames]);

  // Transform data for recharts
  const chartData = React.useMemo(() => {
    return data.map((item) => {
      const periodData: Record<string, string | number> = {
        date: formatPeriodLabel(item.period),
      };
      for (const category of item.categories) {
        periodData[category.categoryName] = category.amount;
      }
      return periodData;
    });
  }, [data]);

  // Generate gradient definitions for each category
  const gradientDefs = React.useMemo(() => {
    return categoryNames.map((categoryName, index) => {
      const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
      const gradientId = `gradient${categoryName.replace(/\s+/g, "")}`;
      return (
        <linearGradient
          key={gradientId}
          id={gradientId}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="5%" stopColor={color} stopOpacity={0.8} />
          <stop offset="95%" stopColor={color} stopOpacity={0.3} />
        </linearGradient>
      );
    });
  }, [categoryNames]);

  // Determine period label for limited data warning
  const periodLabel = React.useMemo(() => {
    switch (period) {
      case "day":
        return "day";
      case "week":
        return "week";
      case "month":
        return "month";
      default:
        return "period";
    }
  }, [period]);

  // Filter data for limited periods
  const hasLimitedData = data.length < 3;

  // Loading state
  if (isLoading) {
    return (
      <Card className="pt-0">
        <CardHeader>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
              <CategorySpendingFilters
                period={period}
                dateRangePreset={dateRangePreset}
                onPeriodChange={handlePeriodChange}
                onDateRangePresetChange={handleDateRangePresetChange}
                isLoading
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <div className="space-y-2 text-center w-full">
            <div className="h-4 w-32 animate-pulse rounded bg-muted mx-auto" />
            <div className="h-64 w-full animate-pulse rounded bg-muted mt-4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!data || data.length === 0 || categoryNames.length === 0) {
    return (
      <Card className="pt-0">
        <CardHeader>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
              <CategorySpendingFilters
                period={period}
                dateRangePreset={dateRangePreset}
                onPeriodChange={handlePeriodChange}
                onDateRangePresetChange={handleDateRangePresetChange}
                isLoading={isLoading}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No category spending data available</p>
            <p className="text-xs mt-1">
              Start recording transactions with categories to see trends
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <CategorySpendingFilters
              period={period}
              dateRangePreset={dateRangePreset}
              onPeriodChange={handlePeriodChange}
              onDateRangePresetChange={handleDateRangePresetChange}
              isLoading={isLoading}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {hasLimitedData && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              ℹ️ Limited data available ({data.length} {periodLabel}
              {data.length === 1 ? "" : "s"}
              ). Add more transactions over multiple {periodLabel}s to see
              clearer trends.
            </p>
          </div>
        )}
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[350px] w-full"
        >
          <AreaChart data={chartData}>
            <defs>{gradientDefs}</defs>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted"
              opacity={0.3}
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => value}
              className="text-xs fill-muted-foreground"
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => value}
                  formatter={(value: number) => {
                    return new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(value);
                  }}
                  indicator="dot"
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {categoryNames.map((categoryName, index) => {
              const gradientId = `gradient${categoryName.replace(/\s+/g, "")}`;
              return (
                <Area
                  key={categoryName}
                  dataKey={categoryName}
                  type="monotone"
                  fill={`url(#${gradientId})`}
                  stroke={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                  strokeWidth={2}
                  stackId="1"
                />
              );
            })}
          </AreaChart>
        </ChartContainer>
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Tracking {categoryNames.length} categor
              {categoryNames.length === 1 ? "y" : "ies"} over {data.length}{" "}
              {periodLabel}
              {data.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to format period labels for various granularities
function formatPeriodLabel(period: string): string {
  if (period.includes("-W")) {
    // Week format: 2024-W05
    const [year, week] = period.split("-W");
    const jan4 = new Date(parseInt(year), 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const weekStart = new Date(jan4);
    weekStart.setDate(
      jan4.getDate() - dayOfWeek + 1 + (parseInt(week) - 1) * 7,
    );

    return weekStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  if (period.match(/^\d{4}-\d{2}$/)) {
    // Month format: 2024-01
    const [year, month] = period.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }

  if (period.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Day format: 2024-01-15
    const date = new Date(period);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  if (period.includes("Q")) {
    // Quarter format: 2024-Q1
    return period;
  }

  return period;
}
