"use client";

import { useState, useEffect } from "react";
import { Plus, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BudgetTable } from "@/modules/Budget/components/BudgetTable";
import { BudgetDialogForm } from "@/modules/Budget/components/BudgetDialogForm";
import { BudgetWithCategory } from "@/modules/Budget/schema";
import { toast } from "sonner";

interface BudgetSummary {
  month: string;
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  items: {
    categoryId: string;
    categoryName: string;
    budgetAmount: number;
    spentAmount: number;
    remaining: number;
    percentUsed: number;
  }[];
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetWithCategory[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<BudgetWithCategory | null>(
    null,
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // Generate month options (current month + 11 previous + 6 next)
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Generate 18 months total (6 previous, current, 11 next)
    for (let i = -6; i <= 11; i++) {
      const date = new Date(currentYear, currentMonth + i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const monthFirst = `${year}-${month}-01`;
      const monthDisplay = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      options.push({
        value: monthFirst,
        label: monthDisplay,
      });
    }

    return options;
  };

  const monthOptions = generateMonthOptions();

  // Initialize with current month
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${year}-${month}-01`);
  }, []);

  // Fetch budgets when month changes
  useEffect(() => {
    if (selectedMonth) {
      fetchBudgets();
      fetchBudgetSummary();
    }
  }, [selectedMonth]);

  // Fetch budgets for selected month
  const fetchBudgets = async () => {
    try {
      setIsLoading(true);
      const url = selectedMonth
        ? `/api/budgets?month=${selectedMonth}`
        : "/api/budgets";
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch budgets");
      }

      const data = await response.json();
      setBudgets(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load budgets");
      setBudgets([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch budget summary for selected month
  const fetchBudgetSummary = async () => {
    if (!selectedMonth) return;

    try {
      setIsSummaryLoading(true);
      const response = await fetch(
        `/api/budgets?month=${selectedMonth}&summary=true`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch budget summary");
      }

      const data = await response.json();
      setSummary(data);
    } catch (error: any) {
      console.error("Failed to fetch budget summary:", error);
      setSummary(null);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  // Handle create budget
  const handleCreateBudget = async (values: {
    month: string;
    categoryId: string;
    amountIdr: number;
  }) => {
    try {
      const response = await fetch("/api/budgets", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: values.month,
          items: [
            {
              categoryId: values.categoryId,
              amountIdr: values.amountIdr,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create budget");
      }

      await fetchBudgets();
    } catch (error: any) {
      throw error;
    }
  };

  // Handle update budget
  const handleUpdateBudget = async (values: {
    month: string;
    categoryId: string;
    amountIdr: number;
  }) => {
    if (!selectedBudget) return;

    try {
      const response = await fetch(`/api/budgets/${selectedBudget.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amountIdr: values.amountIdr,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update budget");
      }

      await fetchBudgets();
      setSelectedBudget(null);
    } catch (error: any) {
      throw error;
    }
  };

  // Handle delete budget
  const handleDeleteBudget = async (id: string) => {
    const response = await fetch(`/api/budgets/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete budget");
    }

    await fetchBudgets();
  };

  // Handle copy budgets from previous month
  const handleCopyFromPrevious = async () => {
    if (!selectedMonth) return;

    try {
      // Calculate previous month
      const date = new Date(selectedMonth);
      date.setMonth(date.getMonth() - 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const previousMonth = `${year}-${month}-01`;

      // Fetch budgets from previous month
      const response = await fetch(`/api/budgets?month=${previousMonth}`);
      if (!response.ok) {
        throw new Error("Failed to fetch previous month's budgets");
      }

      const previousBudgets = await response.json();

      if (previousBudgets.length === 0) {
        toast.info("No budgets found for the previous month");
        return;
      }

      // Create upsert payload
      const items = previousBudgets.map((budget: BudgetWithCategory) => ({
        categoryId: budget.category_id,
        amountIdr: budget.amount_idr,
      }));

      // Upsert budgets for current month
      const upsertResponse = await fetch("/api/budgets", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: selectedMonth,
          items,
        }),
      });

      if (!upsertResponse.ok) {
        const error = await upsertResponse.json();
        throw new Error(error.error || "Failed to copy budgets");
      }

      await fetchBudgets();
      toast.success(
        `Copied ${previousBudgets.length} budgets from previous month`,
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to copy budgets");
    }
  };

  // Open edit dialog
  const handleEditClick = (budget: BudgetWithCategory) => {
    setSelectedBudget(budget);
    setIsEditDialogOpen(true);
  };

  // Handle month change
  const handleMonthChange = (value: string) => {
    setSelectedMonth(value);
  };

  // Get selected month display name
  const getSelectedMonthDisplay = () => {
    const option = monthOptions.find((opt) => opt.value === selectedMonth);
    return option?.label || "Select a month";
  };

  // Calculate summary statistics
  const totalBudgets = budgets.length;
  const hasBudgets = budgets.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">
            Set monthly budgets and track your spending against them
          </p>
        </div>
        <div className="flex gap-2">
          {hasBudgets && (
            <Button
              variant="outline"
              onClick={handleCopyFromPrevious}
              disabled={isLoading}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy from Previous
            </Button>
          )}
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Budget
          </Button>
        </div>
      </div>

      {/* Month Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Month</CardTitle>
          <CardDescription>
            Choose a month to view or edit budgets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedMonth} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select a month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedMonth ? (
                <span>Viewing budgets for {getSelectedMonthDisplay()}</span>
              ) : (
                <span>Please select a month</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Budgeted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(summary.totalBudget)}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalBudgets} category{totalBudgets !== 1 ? "ies" : ""}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(summary.totalSpent)}
              </div>
              <p className="text-xs text-muted-foreground">
                {(
                  (summary.totalSpent / Math.max(summary.totalBudget, 1)) *
                  100
                ).toFixed(1)}
                % of budget
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {summary.remaining >= 0 ? "Remaining" : "Over Budget"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  summary.remaining < 0 ? "text-red-600" : ""
                }`}
              >
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(Math.abs(summary.remaining))}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.remaining >= 0 ? "Available to spend" : "Over budget"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Budgets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Details</CardTitle>
          <CardDescription>
            {selectedMonth
              ? `Budget breakdown for ${getSelectedMonthDisplay()}`
              : "Select a month to view budget details"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetTable
            budgets={budgets}
            summary={summary || undefined}
            onEdit={handleEditClick}
            onDelete={handleDeleteBudget}
            isLoading={isLoading || isSummaryLoading}
          />
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <BudgetDialogForm
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateBudget}
        isLoading={isLoading}
        mode="create"
        initialData={null}
      />

      {/* Edit Dialog */}
      {selectedBudget && (
        <BudgetDialogForm
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setSelectedBudget(null);
            }
          }}
          initialData={selectedBudget}
          onSubmit={handleUpdateBudget}
          isLoading={isLoading}
          mode="edit"
        />
      )}
    </div>
  );
}
