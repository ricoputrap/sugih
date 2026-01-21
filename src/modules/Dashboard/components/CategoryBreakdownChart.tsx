"use client";

import { Cell, Pie, PieChart } from "recharts";

import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import type { CategoryBreakdownData } from "@/modules/Dashboard/schema";

/**
 * Chart color palette - hardcoded colors for better visibility
 */
const CHART_COLORS = [
  "#2563eb", // blue
  "#16a34a", // green
  "#ea580c", // orange
  "#ca8a04", // yellow
  "#dc2626", // red
  "#9333ea", // purple
  "#0891b2", // cyan
  "#db2777", // pink
  "#65a30d", // lime
  "#f59e0b", // amber
] as const;

/**
 * Props for the CategoryBreakdownChart component
 */
export interface CategoryBreakdownChartProps {
  /** Category breakdown data from dashboard API */
  data?: CategoryBreakdownData[];
  /** Currency formatter function */
  formatCurrency?: (amount: number) => string;
}

/**
 * Default currency formatter for IDR
 */
const defaultFormatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * CategoryBreakdownChart - Displays a donut chart with a colored legend
 *
 * Features:
 * - Donut chart on the left showing category proportions
 * - Legend on the right with colored dots, category names, amounts, and percentages
 * - Responsive layout (stacks on mobile, side-by-side on larger screens)
 */
export function CategoryBreakdownChart({
  data,
  formatCurrency = defaultFormatCurrency,
}: CategoryBreakdownChartProps) {
  // Handle empty state
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">No category data available</p>
          <p className="text-xs mt-1">
            Start recording expenses to see breakdown
          </p>
        </div>
      </div>
    );
  }

  // Transform data for recharts with explicit colors
  const chartData = data.map((category, index) => {
    const color = CHART_COLORS[index % CHART_COLORS.length];
    return {
      name: category.categoryName,
      value: category.amount,
      percentage: category.percentage,
      fill: color,
      color: color,
    };
  });

  // Generate chart config for tooltips
  const chartConfig: ChartConfig = {
    value: {
      label: "Amount",
    },
    ...Object.fromEntries(
      data.map((category, index) => [
        category.categoryName.toLowerCase().replace(/\s+/g, "-"),
        {
          label: category.categoryName,
          color: CHART_COLORS[index % CHART_COLORS.length],
        },
      ]),
    ),
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 items-center">
      {/* Left: Donut Chart */}
      <div className="flex items-center justify-center">
        <ChartContainer
          config={chartConfig}
          className="aspect-square h-[280px] w-full"
        >
          <PieChart>
            {/* Outer Pie - External labels with category name and amount */}
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={100}
              paddingAngle={2}
              label={({ cx, cy, midAngle, outerRadius, name, value }) => {
                const RADIAN = Math.PI / 180;
                // Position label outside the slice
                const radius = outerRadius + 30;
                const angle = midAngle ?? 0;
                const x = cx + radius * Math.cos(-angle * RADIAN);
                const y = cy + radius * Math.sin(-angle * RADIAN);

                return (
                  <text
                    x={x}
                    y={y}
                    fill="currentColor"
                    textAnchor={x > cx ? "start" : "end"}
                    dominantBaseline="central"
                    className="text-[11px] font-medium"
                  >
                    <tspan x={x} dy="0">
                      {name}
                    </tspan>
                    <tspan x={x} dy="1.2em" className="text-[10px] opacity-70">
                      {formatCurrency(Number(value))}
                    </tspan>
                  </text>
                );
              }}
              labelLine={{
                stroke: "currentColor",
                strokeWidth: 1,
                className: "opacity-30",
              }}
            >
              {chartData.map((entry) => (
                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
              ))}
            </Pie>
            {/* Inner Pie - Percentage labels inside slices */}
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              label={({
                cx,
                cy,
                midAngle,
                innerRadius,
                outerRadius,
                payload,
              }) => {
                const RADIAN = Math.PI / 180;
                // Position percentage inside the slice
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const angle = midAngle ?? 0;
                const x = cx + radius * Math.cos(-angle * RADIAN);
                const y = cy + radius * Math.sin(-angle * RADIAN);

                // Get percentage from payload
                const percentage = payload?.percentage ?? 0;

                // Only show percentage if slice is large enough (> 3%)
                if (percentage < 3) return null;

                return (
                  <text
                    x={x}
                    y={y}
                    fill="white"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="text-xs font-semibold"
                  >
                    {percentage.toFixed(1)}%
                  </text>
                );
              }}
              labelLine={false}
              isAnimationActive={false}
              stroke="none"
            >
              {chartData.map((entry) => (
                <Cell
                  key={`cell-percentage-${entry.name}`}
                  fill="transparent"
                />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </div>

      {/* Right: Legend with amounts and percentages */}
      <div className="space-y-3">
        {chartData.map((category) => (
          <div
            key={`legend-${category.name}`}
            className="flex items-center gap-3"
          >
            {/* Colored dot */}
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: category.fill }}
            />
            {/* Category name */}
            <span className="text-sm font-medium flex-1 min-w-0 truncate">
              {category.name}
            </span>
            {/* Amount */}
            <span className="text-sm text-muted-foreground tabular-nums">
              {formatCurrency(category.value)}
            </span>
            {/* Percentage */}
            <span className="text-sm text-muted-foreground tabular-nums w-16 text-right">
              {category.percentage.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
