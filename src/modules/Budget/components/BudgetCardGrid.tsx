"use client";

import {
  AlertCircle,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Wallet,
  PiggyBank,
} from "lucide-react";
import { useState } from "react";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BudgetWithCategory } from "../schema";
import type { BudgetSummaryItem } from "../types";
import { formatCurrency, formatPercentage } from "../utils/formatters";

interface BudgetCardGridProps {
  budgets: BudgetWithCategory[];
  summary?: {
    totalBudget: number;
    totalSpent: number;
    remaining: number;
    items: BudgetSummaryItem[];
  };
  onEdit?: (budget: BudgetWithCategory) => void;
  onDelete?: (id: string) => Promise<void>;
  isLoading?: boolean;
}

/**
 * BudgetCardGrid Component
 * Displays budgets as a responsive grid of cards with radial progress indicators
 * Each card shows a radial progress on the left and stats on the right
 */
export function BudgetCardGrid({
  budgets,
  summary,
  onEdit,
  onDelete,
  isLoading = false,
}: BudgetCardGridProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create maps of summary data by category ID and savings bucket ID for quick lookup
  const categorySummaryMap = new Map(
    summary?.items
      .filter((item) => item.categoryId != null)
      .map((item) => [item.categoryId, item]) || [],
  );
  const bucketSummaryMap = new Map(
    summary?.items
      .filter((item) => item.savingsBucketId != null)
      .map((item) => [item.savingsBucketId, item]) || [],
  );

  const handleDelete = async (id: string, targetName: string) => {
    if (!onDelete) return;

    if (
      !confirm(
        `Are you sure you want to delete the budget for "${targetName}"?`,
      )
    ) {
      return;
    }

    try {
      setActionLoading(id);
      await onDelete(id);
      toast.success(`Budget for "${targetName}" deleted successfully`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete budget";
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (budget: BudgetWithCategory) => {
    if (onEdit) {
      onEdit(budget);
    }
  };

  const getStatusBadge = (percentUsed: number) => {
    if (percentUsed > 100) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Over Budget
        </Badge>
      );
    } else if (percentUsed >= 80) {
      return (
        <Badge
          variant="secondary"
          className="bg-orange-100 text-orange-800 hover:bg-orange-100 flex items-center gap-1"
        >
          <AlertCircle className="h-3 w-3" />
          Near Limit
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          On Track
        </Badge>
      );
    }
  };

  const getChartColor = (percentUsed: number) => {
    if (percentUsed > 100) {
      return "#ef4444"; // Red for over budget
    } else if (percentUsed >= 80) {
      return "#f97316"; // Orange for near limit
    } else {
      return "#10b981"; // Green for on track
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map(() => (
            <div
              key={Math.random()}
              className="rounded-lg border bg-card p-6 space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-32 bg-gray-200 rounded" />
                <div className="h-8 w-8 bg-gray-200 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-40 bg-gray-200 rounded" />
                <div className="h-4 w-36 bg-gray-200 rounded" />
              </div>
              <div className="h-2 w-full bg-gray-200 rounded" />
              <div className="h-6 w-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (budgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-gray-100 p-3 mb-4">
          <svg
            className="h-6 w-6 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            role="img"
            aria-label="No budgets icon"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No budgets set
        </h3>
        <p className="text-sm text-gray-500 max-w-md">
          Get started by creating your first budget for a category. This will
          help you track your spending and stay within your financial goals.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-col space-y-1.5">
              <h3 className="text-2xl font-semibold leading-none tracking-tight">
                {formatCurrency(summary.totalBudget)}
              </h3>
              <p className="text-sm text-muted-foreground">Total Budget</p>
            </div>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-col space-y-1.5">
              <h3 className="text-2xl font-semibold leading-none tracking-tight">
                {formatCurrency(summary.totalSpent)}
              </h3>
              <p className="text-sm text-muted-foreground">Total Spent</p>
            </div>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-col space-y-1.5">
              <h3
                className={`text-2xl font-semibold leading-none tracking-tight ${
                  summary.remaining < 0 ? "text-red-600" : ""
                }`}
              >
                {formatCurrency(summary.remaining)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {summary.remaining >= 0 ? "Remaining" : "Over Budget"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Budget Cards Grid - New Horizontal Layout */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {budgets.map((budget) => {
          // Get summary based on whether this is a category or savings bucket budget
          const budgetSummary = budget.category_id
            ? categorySummaryMap.get(budget.category_id)
            : bucketSummaryMap.get(budget.savings_bucket_id);
          const percentUsed = budgetSummary?.percentUsed || 0;
          const remaining = budgetSummary?.remaining || budget.amount_idr;

          // Determine display name and type
          const isSavingsBucket = budget.target_type === "savings_bucket";
          const displayName = isSavingsBucket
            ? budget.savings_bucket_name || "Unknown Savings Bucket"
            : budget.category_name || "Unknown Category";

          // Prepare chart data - clamp to 100 for visual display
          const displayPercentage = Math.min(percentUsed, 100);
          const chartData = [
            {
              name: "spent",
              value: displayPercentage,
              fill: getChartColor(percentUsed),
            },
          ];

          // Chart configuration for Recharts
          const chartConfig = {
            spent: {
              label: "Spent",
              color: getChartColor(percentUsed),
            },
          } satisfies ChartConfig;

          return (
            <div
              key={budget.id}
              className={cn(
                "rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col",
                isSavingsBucket && "border-emerald-200",
              )}
            >
              {/* Card Header with Menu */}
              <div
                className={cn(
                  "flex items-center justify-between px-4 py-2 border-b",
                  isSavingsBucket && "bg-emerald-50/50",
                )}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isSavingsBucket ? (
                    <PiggyBank className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Wallet className="h-4 w-4 text-blue-600 shrink-0" />
                  )}
                  <h3 className="font-semibold text-base leading-tight truncate">
                    {displayName}
                  </h3>
                  {isSavingsBucket && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0"
                    >
                      Savings
                    </Badge>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      disabled={actionLoading === budget.id}
                    >
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleEdit(budget)}
                      disabled={actionLoading === budget.id}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Budget
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(budget.id, displayName)}
                      disabled={actionLoading === budget.id}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Budget
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Card Body with Horizontal Layout */}
              <div className="p-4 flex-1 flex gap-4">
                {/* Left: Radial Progress Chart */}
                {summary && (
                  <div className="shrink-0 flex items-center justify-center relative">
                    <ChartContainer config={chartConfig} className="h-24 w-24">
                      <RadialBarChart
                        data={chartData}
                        innerRadius="65%"
                        outerRadius="100%"
                        startAngle={90}
                        endAngle={450}
                      >
                        <PolarAngleAxis
                          type="number"
                          domain={[0, 100]}
                          angleAxisId={0}
                          tick={false}
                        />
                        <RadialBar
                          background
                          dataKey="value"
                          cornerRadius={8}
                          angleAxisId={0}
                        />
                      </RadialBarChart>
                    </ChartContainer>
                    {/* Centered text overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                      <div className="text-xs font-medium text-muted-foreground">
                        {formatPercentage(percentUsed, 0)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Spent
                      </div>
                    </div>
                  </div>
                )}

                {/* Right: Stats Section */}
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-2 text-sm">
                    {summary && (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Remaining
                          </p>
                          <p
                            className={`font-semibold ${
                              remaining < 0 ? "text-red-600" : ""
                            }`}
                          >
                            {formatCurrency(remaining)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Total Budget
                          </p>
                          <p className="font-medium text-xs">
                            {formatCurrency(budget.amount_idr)}
                          </p>
                        </div>
                      </>
                    )}
                    {!summary && (
                      <div>
                        <p className="text-xs text-muted-foreground">Budget</p>
                        <p className="font-semibold">
                          {formatCurrency(budget.amount_idr)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  {summary && (
                    <div className="pt-2">{getStatusBadge(percentUsed)}</div>
                  )}
                </div>
              </div>

              {/* Note Section */}
              {budget.note && (
                <div className="px-4 py-3 border-t bg-muted/30">
                  <p
                    className="text-xs text-muted-foreground line-clamp-2"
                    title={budget.note}
                  >
                    📝 {budget.note}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
