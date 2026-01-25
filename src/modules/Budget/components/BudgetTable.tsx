"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Trash2,
  Pencil,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { BudgetWithCategory } from "../schema";
import { toast } from "sonner";

interface BudgetSummaryItem {
  categoryId: string;
  categoryName: string;
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
}

export function BudgetTable({
  budgets,
  summary,
  onEdit,
  onDelete,
  isLoading = false,
}: BudgetTableProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create a map of summary data by category ID for quick lookup
  const summaryMap = new Map(
    summary?.items.map((item) => [item.categoryId, item]) || [],
  );

  const handleDelete = async (id: string, categoryName: string) => {
    if (!onDelete) return;

    if (
      !confirm(
        `Are you sure you want to delete the budget for "${categoryName}"?`,
      )
    ) {
      return;
    }

    try {
      setActionLoading(id);
      await onDelete(id);
      toast.success(`Budget for "${categoryName}" deleted successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete budget");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (budget: BudgetWithCategory) => {
    if (onEdit) {
      onEdit(budget);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent.toFixed(1)}%`;
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

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";

    try {
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Invalid date";
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Budget Amount</TableHead>
                <TableHead>Spent</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Budget Amount</TableHead>
              {summary && (
                <>
                  <TableHead>Spent</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Usage</TableHead>
                </>
              )}
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgets.map((budget) => {
              const categorySummary = summaryMap.get(budget.category_id);
              const percentUsed = categorySummary?.percentUsed || 0;
              const spent = categorySummary?.spentAmount || 0;
              const remaining = categorySummary?.remaining || budget.amount_idr;

              return (
                <TableRow key={budget.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-1">
                      <span>{budget.category_name || "Unknown Category"}</span>
                      {!budget.category_name && (
                        <span className="text-xs text-red-500">
                          Category not found
                        </span>
                      )}
                      <span
                        className="text-xs text-muted-foreground font-normal line-clamp-2"
                        title={budget.note || "No note"}
                      >
                        {budget.note || "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(budget.amount_idr)}</TableCell>
                  {summary && (
                    <>
                      <TableCell>{formatCurrency(spent)}</TableCell>
                      <TableCell
                        className={
                          remaining < 0 ? "text-red-600 font-medium" : ""
                        }
                      >
                        {formatCurrency(remaining)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(percentUsed)}
                          <span className="text-sm text-muted-foreground">
                            {formatPercent(percentUsed)}
                          </span>
                        </div>
                      </TableCell>
                    </>
                  )}
                  <TableCell>
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
                          onClick={() =>
                            handleDelete(
                              budget.id,
                              budget.category_name || "Unknown Category",
                            )
                          }
                          disabled={actionLoading === budget.id}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Budget
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
