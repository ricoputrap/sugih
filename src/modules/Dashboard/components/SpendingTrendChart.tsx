"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/modules/Dashboard/utils";
import { SpendingTrendChartData } from "@/modules/Dashboard/schema";

interface SpendingTrendChartProps {
  data: SpendingTrendChartData[];
  isLoading?: boolean;
  title?: string;
  description?: string;
}

export function SpendingTrendChart({
  data,
  isLoading = false,
  title = "Spending Trend",
  description = "Your spending over time",
}: SpendingTrendChartProps) {
  // Format data for chart
  const chartData = data.map((item) => ({
    period: formatPeriodLabel(item.period),
    amount: item.amount / 1000000, // Convert to millions for better readability
  }));

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-primary">
              {formatCurrency(payload[0].value * 1000000)}
            </span>{" "}
            spent
          </p>
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
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="space-y-2 text-center">
            <div className="h-4 w-24 animate-pulse rounded bg-muted mx-auto" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted mx-auto" />
            <div className="h-32 w-full animate-pulse rounded bg-muted mt-4" />
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
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No spending data available</p>
            <p className="text-xs mt-1">
              Start recording transactions to see your spending trend
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
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
              dataKey="amount"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
              activeDot={{
                r: 6,
                stroke: "hsl(var(--primary))",
                strokeWidth: 2,
              }}
              name="Spending"
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 text-center text-xs text-muted-foreground">
          Total spending:{" "}
          {formatCurrency(data.reduce((sum, item) => sum + item.amount, 0))}
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
    const date = new Date(parseInt(year), parseInt(month) - 1);
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
