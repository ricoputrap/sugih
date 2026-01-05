"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/modules/Dashboard/utils";
import type { NetWorthChartData } from "@/modules/Dashboard/schema";

interface NetWorthTrendChartProps {
  data: NetWorthChartData[];
  isLoading?: boolean;
  title?: string;
  description?: string;
}

export function NetWorthTrendChart({
  data,
  isLoading = false,
  title = "Net Worth Trend",
  description = "Your net worth progression over time",
}: NetWorthTrendChartProps) {
  // Format data for chart
  const chartData = data.map((item) => ({
    period: formatPeriodLabel(item.period),
    walletBalance: item.walletBalance / 1000000, // Convert to millions for better readability
    savingsBalance: item.savingsBalance / 1000000, // Convert to millions for better readability
    totalNetWorth: item.totalNetWorth / 1000000, // Convert to millions for better readability
  }));

  // Custom tooltip formatter
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number; color: string; name: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          {payload.map((entry) => (
            <p
              key={`tooltip-${entry.name}`}
              className="text-sm text-muted-foreground"
            >
              <span className="font-semibold" style={{ color: entry.color }}>
                {formatCurrency(entry.value * 1000000)}
              </span>{" "}
              {entry.name === "walletBalance" && "wallet balance"}
              {entry.name === "savingsBalance" && "savings balance"}
              {entry.name === "totalNetWorth" && "total net worth"}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <div className="space-y-2 text-center">
            <div className="h-4 w-24 animate-pulse rounded bg-muted mx-auto" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted mx-auto" />
            <div className="h-40 w-full animate-pulse rounded bg-muted mt-4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
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

  // Calculate summary statistics
  const totalNetWorth = data.reduce((sum, item) => sum + item.totalNetWorth, 0);
  const walletBalance = data.reduce((sum, item) => sum + item.walletBalance, 0);
  const savingsBalance = data.reduce(
    (sum, item) => sum + item.savingsBalance,
    0,
  );
  const netWorthChange =
    data.length > 1
      ? data[data.length - 1].totalNetWorth - data[0].totalNetWorth
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="period"
              className="text-xs fill-muted-foreground"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              className="text-xs fill-muted-foreground"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `Rp ${value}M`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="totalNetWorth"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
              activeDot={{
                r: 6,
                stroke: "hsl(var(--primary))",
                strokeWidth: 2,
              }}
              name="Total Net Worth"
            />
            <Line
              type="monotone"
              dataKey="walletBalance"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 2, r: 3 }}
              activeDot={{
                r: 5,
                stroke: "hsl(var(--chart-2))",
                strokeWidth: 2,
              }}
              name="Wallet Balance"
            />
            <Line
              type="monotone"
              dataKey="savingsBalance"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--chart-3))", strokeWidth: 2, r: 3 }}
              activeDot={{
                r: 5,
                stroke: "hsl(var(--chart-3))",
                strokeWidth: 2,
              }}
              name="Savings Balance"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Summary statistics */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Net Worth</p>
            <p className="text-sm font-semibold">
              {formatCurrency(totalNetWorth / data.length)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Wallet Balance</p>
            <p className="text-sm font-semibold">
              {formatCurrency(walletBalance / data.length)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Savings Balance</p>
            <p className="text-sm font-semibold">
              {formatCurrency(savingsBalance / data.length)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Net Worth Change</p>
            <p
              className={`text-sm font-semibold ${
                netWorthChange >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {netWorthChange >= 0 ? "+" : ""}
              {formatCurrency(netWorthChange)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to format period labels
function formatPeriodLabel(period: string): string {
  // Handle different period formats
  if (period.includes("T")) {
    // ISO date format: 2024-01-15T00:00:00.000Z
    const date = new Date(period);
    return date.toLocaleDateString("id-ID", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (period.includes("-W")) {
    // Week format: 2024-W05
    const [year, week] = period.split("-W");
    return `Week ${week}, ${year}`;
  }

  if (period.match(/^\d{4}-\d{2}$/)) {
    // Month format: 2024-01
    const [year, month] = period.split("-");
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
    return date.toLocaleDateString("id-ID", {
      month: "short",
      year: "numeric",
    });
  }

  if (period.match(/^\d{4}Q[1-4]$/)) {
    // Quarter format: 2024Q1
    return period;
  }

  // Default: return as-is
  return period;
}
