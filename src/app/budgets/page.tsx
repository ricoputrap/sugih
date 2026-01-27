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
import { BudgetCardGrid } from "@/modules/Budget/components/BudgetCardGrid";
import { ViewToggle } from "@/modules/Budget/components/ViewToggle";
import { BudgetDialogForm } from "@/modules/Budget/components/BudgetDialogForm";
import { CopyResultModal } from "@/modules/Budget/components/CopyResultModal";
import { CopyBudgetDialog } from "@/modules/Budget/components/CopyBudgetDialog";
import { BudgetWithCategory } from "@/modules/Budget/schema";
import { BudgetViewMode } from "@/modules/Budget/types";
import { toast } from "sonner";

interface BudgetSummary {
  month: string;
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  items: {
    categoryId: string | null;
    savingsBucketId?: string | null;
    targetName?: string;
    targetType?: "category" | "savings_bucket";
    categoryName?: string;
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
  const [selectedBudget, setSelectedBudget] =
    useState<BudgetWithCategory | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [viewMode, setViewMode] = useState<BudgetViewMode>("list");
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyResultModalOpen, setCopyResultModalOpen] = useState(false);
  const [copyResult, setCopyResult] = useState<{
    created: BudgetWithCategory[];
    skipped: Array<{
      categoryId: string | null;
      savingsBucketId: string | null;
      targetName: string;
    }>;
    fromMonth?: string;
    toMonth?: string;
  } | null>(null);

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

    // Load view preference from localStorage
    const savedViewMode = localStorage.getItem(
      "budgetViewMode",
    ) as BudgetViewMode | null;
    if (savedViewMode === "list" || savedViewMode === "grid") {
      setViewMode(savedViewMode);
    }
  }, []);

  // Fetch budgets when month changes
  useEffect(() => {
    if (selectedMonth) {
      fetchBudgets();
      fetchBudgetSummary();
    }
  }, [selectedMonth]);

  // Save view preference to localStorage
  const handleViewModeChange = (mode: BudgetViewMode) => {
    setViewMode(mode);
    localStorage.setItem("budgetViewMode", mode);
  };

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
    categoryId?: string | null;
    savingsBucketId?: string | null;
    amountIdr: number;
    note?: string | null;
  }) => {
    try {
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: values.month,
          categoryId: values.categoryId,
          savingsBucketId: values.savingsBucketId,
          amountIdr: values.amountIdr,
          note: values.note,
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
    categoryId?: string | null;
    savingsBucketId?: string | null;
    amountIdr: number;
    note?: string | null;
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
          note: values.note,
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

  // Handle copy budgets from selected months
  const handleCopyBudgets = async (fromMonth: string, toMonth: string) => {
    try {
      // Call copy endpoint
      const response = await fetch("/api/budgets/copy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromMonth,
          toMonth,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to copy budgets");
      }

      const result = await response.json();

      // Refresh budgets list if the destination is the currently selected month
      if (toMonth === selectedMonth) {
        await fetchBudgets();
      }

      // Show appropriate feedback
      if (result.created.length === 0 && result.skipped.length > 0) {
        // All budgets already exist
        toast.info("All budgets already exist in destination month");
      } else if (result.skipped.length === 0) {
        // All budgets were created (simple case)
        toast.success(
          `Copied ${result.created.length} budget${result.created.length !== 1 ? "s" : ""}`,
        );
      } else {
        // Mixed case: some created, some skipped - show modal
        toast.success(
          `Copied ${result.created.length} budget${result.created.length !== 1 ? "s" : ""}`,
        );
        setCopyResult({
          ...result,
          fromMonth,
          toMonth,
        });
        setCopyResultModalOpen(true);
      }
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
              onClick={() => setCopyDialogOpen(true)}
              disabled={isLoading}
              data-testid="copy-budgets"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Budgets
            </Button>
          )}
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Budget
          </Button>
        </div>
      </div>

      {/* Budgets Table/Grid with Month Selector and View Toggle */}
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Budget Details</CardTitle>
            <CardDescription>
              {selectedMonth
                ? `Budget breakdown for ${getSelectedMonthDisplay()}`
                : "Select a month to view budget details"}
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center md:gap-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <label className="text-sm font-medium text-muted-foreground">
                Month:
              </label>
              <Select value={selectedMonth} onValueChange={handleMonthChange}>
                <SelectTrigger
                  className="w-full md:w-48"
                  data-testid="month-select"
                >
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
            <ViewToggle
              value={viewMode}
              onChange={handleViewModeChange}
              data-testid="view-toggle"
            />
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "list" ? (
            <BudgetTable
              budgets={budgets}
              summary={summary || undefined}
              onEdit={handleEditClick}
              onDelete={handleDeleteBudget}
              isLoading={isLoading || isSummaryLoading}
            />
          ) : (
            <BudgetCardGrid
              budgets={budgets}
              summary={summary || undefined}
              onEdit={handleEditClick}
              onDelete={handleDeleteBudget}
              isLoading={isLoading || isSummaryLoading}
            />
          )}
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

      {/* Copy Budget Dialog */}
      <CopyBudgetDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
        onCopy={handleCopyBudgets}
        defaultDestinationMonth={selectedMonth}
      />

      {/* Copy Result Modal */}
      {copyResult && (
        <CopyResultModal
          open={copyResultModalOpen}
          onOpenChange={setCopyResultModalOpen}
          created={copyResult.created}
          skipped={copyResult.skipped}
          fromMonth={copyResult.fromMonth}
          toMonth={copyResult.toMonth}
        />
      )}
    </div>
  );
}
