"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

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
import type { NetWorthChartData } from "../../schema";
import type { ChartVariant } from "../../types";
import {
  transformNetWorthData,
  generateNetWorthChartConfig,
  getNetWorthSeriesKeys,
  isNetWorthDataEmpty,
} from "../../utils/series/netWorthSeries";

export interface NetWorthGrowthChartProps {
  /** Net worth time series data */
  data: NetWorthChartData[];
  /** Chart visualization variant (line or area) */
  variant?: ChartVariant;
  /** Loading state */
  isLoading?: boolean;
  /** Card title */
  title?: string;
  /** Card description */
  description?: string;
  /** Custom class name for the card */
  className?: string;
}

// Color palette matching the chart config
const SERIES_COLORS: Record<string, string> = {
  totalNetWorth: "var(--chart-1)",
  walletBalance: "var(--chart-2)",
  savingsBalance: "var(--chart-3)",
};

/**
 * Formats period label for display on X-axis
 */
function formatPeriodLabel(period: string): string {
  // Week format: 2024-W05
  if (period.includes("-W")) {
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

  // Month format: 2024-01
  if (period.match(/^\d{4}-\d{2}$/)) {
    const [year, month] = period.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }

  // Day format: 2024-01-15
  if (period.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const date = new Date(period);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  // ISO date format with time
  if (period.includes("T")) {
    const date = new Date(period);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return period;
}

/**
 * Formats currency value for Y-axis and tooltips
 */
function formatCurrencyCompact(value: number): string {
  if (value >= 1000000000) {
    return `Rp ${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `Rp ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `Rp ${(value / 1000).toFixed(1)}K`;
  }
  return `Rp ${value}`;
}

/**
 * NetWorthGrowthChart Component
 *
 * Displays net worth progression over time with multiple series
 * (total net worth, wallet balance, savings balance).
 * Supports both line and area chart variants.
 */
export function NetWorthGrowthChart({
  data,
  variant = "line",
  isLoading = false,
  title = "Net Worth Growth",
  description = "Your net worth progression over time",
  className,
}: NetWorthGrowthChartProps) {
  // Transform data for recharts
  const chartData = React.useMemo(() => {
    const transformed = transformNetWorthData(data);
    return transformed.map((point) => ({
      ...point,
      bucket: formatPeriodLabel(point.bucket),
    }));
  }, [data]);

  // Get series keys for dynamic rendering
  const seriesKeys = React.useMemo(
    () => getNetWorthSeriesKeys(transformNetWorthData(data)),
    [data],
  );

  // Build chart config
  const chartConfig: ChartConfig = React.useMemo(() => {
    const config = generateNetWorthChartConfig(seriesKeys);
    // Ensure proper format for ChartContainer
    const result: ChartConfig = {};
    for (const [key, value] of Object.entries(config)) {
      result[key] = {
        label: value.label,
        color: value.color,
      };
    }
    return result;
  }, [seriesKeys]);

  // Generate gradient definitions for area chart
  const gradientDefs = React.useMemo(() => {
    if (variant === "line") return null;

    return seriesKeys.map((key) => {
      const color = SERIES_COLORS[key] || `var(--chart-${(seriesKeys.indexOf(key) % 5) + 1})`;
      const gradientId = `gradient-${key}`;
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
          <stop offset="95%" stopColor={color} stopOpacity={0.1} />
        </linearGradient>
      );
    });
  }, [seriesKeys, variant]);

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
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
  if (isNetWorthDataEmpty(data)) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No net worth data available</p>
            <p className="text-xs mt-1">
              Start recording transactions to see your net worth trend
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render line chart
  const renderLineChart = () => (
    <LineChart data={chartData} accessibilityLayer>
      <CartesianGrid
        strokeDasharray="3 3"
        className="stroke-muted"
        opacity={0.3}
      />
      <XAxis
        dataKey="bucket"
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        minTickGap={32}
        className="text-xs fill-muted-foreground"
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        tickFormatter={formatCurrencyCompact}
        className="text-xs fill-muted-foreground"
        width={80}
      />
      <ChartTooltip
        cursor={false}
        content={
          <ChartTooltipContent
            indicator="line"
            formatter={(value, name) => (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{chartConfig[name]?.label || name}</span>
                <span className="font-medium">
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(value as number)}
                </span>
              </div>
            )}
          />
        }
      />
      <ChartLegend content={<ChartLegendContent />} />
      {seriesKeys.map((key, index) => (
        <Line
          key={key}
          dataKey={key}
          type="monotone"
          stroke={SERIES_COLORS[key] || `var(--chart-${(index % 5) + 1})`}
          strokeWidth={key === "totalNetWorth" ? 3 : 2}
          dot={false}
          activeDot={{ r: key === "totalNetWorth" ? 6 : 4 }}
        />
      ))}
    </LineChart>
  );

  // Render area chart
  const renderAreaChart = () => (
    <AreaChart data={chartData} accessibilityLayer>
      <defs>{gradientDefs}</defs>
      <CartesianGrid
        strokeDasharray="3 3"
        className="stroke-muted"
        opacity={0.3}
      />
      <XAxis
        dataKey="bucket"
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        minTickGap={32}
        className="text-xs fill-muted-foreground"
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        tickFormatter={formatCurrencyCompact}
        className="text-xs fill-muted-foreground"
        width={80}
      />
      <ChartTooltip
        cursor={false}
        content={
          <ChartTooltipContent
            indicator="dot"
            formatter={(value, name) => (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{chartConfig[name]?.label || name}</span>
                <span className="font-medium">
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(value as number)}
                </span>
              </div>
            )}
          />
        }
      />
      <ChartLegend content={<ChartLegendContent />} />
      {seriesKeys.map((key, index) => (
        <Area
          key={key}
          dataKey={key}
          type="monotone"
          fill={`url(#gradient-${key})`}
          stroke={SERIES_COLORS[key] || `var(--chart-${(index % 5) + 1})`}
          strokeWidth={key === "totalNetWorth" ? 2 : 1}
        />
      ))}
    </AreaChart>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[350px] w-full"
        >
          {variant === "line" ? renderLineChart() : renderAreaChart()}
        </ChartContainer>
        {chartData.length < 3 && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              ℹ️ Limited data available ({chartData.length} period
              {chartData.length === 1 ? "" : "s"}). Add more transactions over
              time to see clearer trends.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
