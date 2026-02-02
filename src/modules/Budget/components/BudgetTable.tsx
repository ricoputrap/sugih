"use client";

import type { ColumnDef, HeaderContext, RowSelectionState } from "@tanstack/react-table";
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  PiggyBank,
  Trash2,
  Wallet,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { BudgetWithCategory } from "../schema";
import { getBudgetStatus, getStatusBadgeConfig } from "../utils/gradients";

interface BudgetSummaryItem {
  categoryId: string | null;
  savingsBucketId?: string | null;
  targetName?: string;
  targetType?: "category" | "savings_bucket";
  categoryName?: string;
  budgetAmount: number;
  spentAmount: number;
  remaining: number;
  percentUsed: number;
}

interface BudgetTableProps {
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
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export function BudgetTable({
  budgets,
  summary,
  onEdit,
  onDelete,
  isLoading = false,
  selectedIds: externalSelectedIds,
  onSelectionChange,
}: BudgetTableProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Bridge selectedIds string[] <-> RowSelectionState
  const rowSelection = useMemo(() => {
    const state: RowSelectionState = {};
    if (externalSelectedIds) {
      for (const id of externalSelectedIds) {
        state[id] = true;
      }
    }
    return state;
  }, [externalSelectedIds]);

  const handleRowSelectionChange = (updaterOrValue: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => {
    const newState = typeof updaterOrValue === 'function' ? updaterOrValue(rowSelection) : updaterOrValue;
    const newIds = Object.keys(newState).filter(k => newState[k]);
    if (onSelectionChange) {
      onSelectionChange(newIds);
    }
  };

  // Create maps of summary data by category ID and savings bucket ID for quick lookup
  const categorySummaryMap = useMemo(
    () =>
      new Map(
        summary?.items
          .filter((item) => item.categoryId != null)
          .map((item) => [item.categoryId, item]) || [],
      ),
    [summary],
  );

  const bucketSummaryMap = useMemo(
    () =>
      new Map(
        summary?.items
          .filter((item) => item.savingsBucketId != null)
          .map((item) => [item.savingsBucketId, item]) || [],
      ),
    [summary],
  );

  const handleDelete = useCallback(
    async (id: string, targetName: string) => {
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
    },
    [onDelete],
  );

  const handleEdit = useCallback(
    (budget: BudgetWithCategory) => {
      if (onEdit) {
        onEdit(budget);
      }
    },
    [onEdit],
  );

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  const getStatusBadge = useCallback((percentUsed: number) => {
    const status = getBudgetStatus(percentUsed);
    const config = getStatusBadgeConfig(status);

    const IconComponent =
      config.icon === "CheckCircle2" ? CheckCircle2 : AlertCircle;

    return (
      <Badge
        variant="outline"
        className={cn(
          "flex items-center gap-1",
          config.gradient,
          config.text,
          config.border,
        )}
      >
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  }, []);

  const columns = useMemo<ColumnDef<BudgetWithCategory>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => {
          const isAllSelected = table.getIsAllPageRowsSelected();
          const isSomeSelected = table.getIsSomePageRowsSelected();
          return (
            <button
              onClick={() => table.toggleAllPageRowsSelected()}
              className="flex items-center justify-center"
              title="Select all"
            >
              <input
                type="checkbox"
                ref={(el) => {
                  if (el) {
                    el.indeterminate = isSomeSelected && !isAllSelected;
                  }
                }}
                checked={isAllSelected || isSomeSelected}
                onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
                className="cursor-pointer"
                aria-label="Select all budgets"
              />
            </button>
          );
        },
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected(!!e.target.checked)}
            className="cursor-pointer"
            aria-label={`Select budget ${row.original.id}`}
          />
        ),
        size: 50,
      },
      {
        accessorKey: "display_name",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="-ml-4 h-8 data-[state=open]:bg-accent"
            >
              Category
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        accessorFn: (row) => {
          const isSavingsBucket = row.target_type === "savings_bucket";
          return isSavingsBucket
            ? row.savings_bucket_name || "Unknown Savings Bucket"
            : row.category_name || "Unknown Category";
        },
        cell: ({ row }) => {
          const budget = row.original;
          const isSavingsBucket = budget.target_type === "savings_bucket";
          const displayName = isSavingsBucket
            ? budget.savings_bucket_name || "Unknown Savings Bucket"
            : budget.category_name || "Unknown Category";

          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                {isSavingsBucket ? (
                  <PiggyBank className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <Wallet className="h-4 w-4 text-blue-600 shrink-0" />
                )}
                <span className="font-medium">{displayName}</span>
                {isSavingsBucket && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
                  >
                    Savings
                  </Badge>
                )}
              </div>
              {!displayName.includes("Unknown") ? null : (
                <span className="text-xs text-red-500">
                  {isSavingsBucket
                    ? "Savings bucket not found"
                    : "Category not found"}
                </span>
              )}
              <span
                className="text-xs text-muted-foreground font-normal line-clamp-2"
                title={budget.note || "No note"}
              >
                {budget.note || "—"}
              </span>
            </div>
          );
        },
        filterFn: (row, _id, value) => {
          const budget = row.original;
          const displayName =
            budget.target_type === "savings_bucket"
              ? budget.savings_bucket_name
              : budget.category_name;
          return (displayName || "")
            .toLowerCase()
            .includes(value.toLowerCase());
        },
      },
      {
        accessorKey: "amount_idr",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="-ml-4 h-8 data-[state=open]:bg-accent"
            >
              Budget Amount
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => formatCurrency(row.original.amount_idr),
      },
      ...(summary
        ? [
            {
              id: "spent",
              header: ({
                column,
              }: HeaderContext<BudgetWithCategory, unknown>) => (
                <Button
                  variant="ghost"
                  onClick={() =>
                    column.toggleSorting(column.getIsSorted() === "asc")
                  }
                  className="-ml-4 h-8 data-[state=open]:bg-accent"
                >
                  Spent
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              ),
              accessorFn: (row: BudgetWithCategory) => {
                const budgetSummary = row.category_id
                  ? categorySummaryMap.get(row.category_id)
                  : bucketSummaryMap.get(row.savings_bucket_id);
                return budgetSummary?.spentAmount || 0;
              },
              cell: ({ row }: { row: { original: BudgetWithCategory } }) => {
                const budget = row.original;
                const budgetSummary = budget.category_id
                  ? categorySummaryMap.get(budget.category_id)
                  : bucketSummaryMap.get(budget.savings_bucket_id);
                const spent = budgetSummary?.spentAmount || 0;
                return (
                  <div className="font-medium">{formatCurrency(spent)}</div>
                );
              },
              enableSorting: true,
            },
            {
              id: "remaining",
              header: ({
                column,
              }: HeaderContext<BudgetWithCategory, unknown>) => (
                <Button
                  variant="ghost"
                  onClick={() =>
                    column.toggleSorting(column.getIsSorted() === "asc")
                  }
                  className="-ml-4 h-8 data-[state=open]:bg-accent"
                >
                  Remaining
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              ),
              accessorFn: (row: BudgetWithCategory) => {
                const budgetSummary = row.category_id
                  ? categorySummaryMap.get(row.category_id)
                  : bucketSummaryMap.get(row.savings_bucket_id);
                return budgetSummary?.remaining ?? row.amount_idr;
              },
              cell: ({ row }: { row: { original: BudgetWithCategory } }) => {
                const budget = row.original;
                const budgetSummary = budget.category_id
                  ? categorySummaryMap.get(budget.category_id)
                  : bucketSummaryMap.get(budget.savings_bucket_id);
                const remaining = budgetSummary?.remaining ?? budget.amount_idr;
                return (
                  <div
                    className={cn(
                      "font-medium",
                      remaining < 0 && "text-destructive",
                    )}
                  >
                    {formatCurrency(remaining)}
                  </div>
                );
              },
              enableSorting: true,
            },
            {
              id: "usage",
              header: "Usage",
              cell: ({ row }: { row: { original: BudgetWithCategory } }) => {
                const budget = row.original;
                const budgetSummary = budget.category_id
                  ? categorySummaryMap.get(budget.category_id)
                  : bucketSummaryMap.get(budget.savings_bucket_id);
                const percentUsed = budgetSummary?.percentUsed || 0;
                return (
                  <div className="flex items-center gap-2">
                    {getStatusBadge(percentUsed)}
                  </div>
                );
              },
            },
          ]
        : []),
      {
        id: "actions",
        cell: ({ row }) => {
          const budget = row.original;
          const isSavingsBucket = budget.target_type === "savings_bucket";
          const displayName = isSavingsBucket
            ? budget.savings_bucket_name || "Unknown Savings Bucket"
            : budget.category_name || "Unknown Category";

          return (
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
          );
        },
      },
    ],
    [
      summary,
      actionLoading,
      categorySummaryMap,
      bucketSummaryMap,
      handleEdit,
      handleDelete,
      formatCurrency,
      getStatusBadge,
    ],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-[400px] w-full bg-gray-100 rounded-md animate-pulse" />
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
            aria-label="No budgets"
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

      {/* Budgets Table */}
      <DataTable
        columns={columns}
        data={budgets}
        searchKey="display_name"
        searchPlaceholder="Filter categories..."
        rowSelection={rowSelection}
        onRowSelectionChange={handleRowSelectionChange}
        getRowId={(row) => row.id}
      />
    </div>
  );
}
