"use client";

import { Copy, Plus } from "lucide-react";
import { Suspense } from "react";
import { toast } from "sonner";
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
import { BudgetCardGrid } from "@/modules/Budget/components/BudgetCardGrid";
import { BudgetDialogForm } from "@/modules/Budget/components/BudgetDialogForm";
import { BudgetTable } from "@/modules/Budget/components/BudgetTable";
import { CopyBudgetDialog } from "@/modules/Budget/components/CopyBudgetDialog";
import { CopyResultModal } from "@/modules/Budget/components/CopyResultModal";
import { ViewToggle } from "@/modules/Budget/components/ViewToggle";
import {
  useBudgetMonth,
  useBudgetMonthOptions,
  useBudgetMutations,
  useBudgetsData,
  useBudgetView,
} from "@/modules/Budget/hooks";
import { useBudgetsPageStore } from "@/modules/Budget/stores";

export default function BudgetsPage() {
  return (
    <Suspense fallback={<BudgetsPageSkeleton />}>
      <BudgetsPageContent />
    </Suspense>
  );
}

function BudgetsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-9 w-32 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-5 w-64 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
        </CardHeader>
        <CardContent>
          <div className="h-48 animate-pulse rounded bg-gray-200" />
        </CardContent>
      </Card>
    </div>
  );
}

function BudgetsPageContent() {
  // URL state (NUQS)
  const [month, setMonth] = useBudgetMonth();
  const [viewMode, setViewMode] = useBudgetView();
  const monthOptions = useBudgetMonthOptions();

  // Server state (TanStack Query)
  const { data, isLoading } = useBudgetsData(month);
  const budgets = data?.budgets ?? [];
  const summary = data?.summary ?? null;

  // UI state (Zustand)
  const {
    isCreateDialogOpen,
    isEditDialogOpen,
    copyDialogOpen,
    copyResultModalOpen,
    selectedBudget,
    copyResult,
    openCreateDialog,
    closeCreateDialog,
    openEditDialog,
    closeEditDialog,
    openCopyDialog,
    closeCopyDialog,
    setCopyResult,
    openCopyResultModal,
    closeCopyResultModal,
  } = useBudgetsPageStore();

  // Mutations
  const { createBudget, updateBudget, deleteBudget, copyBudgets } =
    useBudgetMutations();

  // Handle create budget
  const handleCreateBudget = async (values: {
    month: string;
    categoryId?: string | null;
    savingsBucketId?: string | null;
    amountIdr: number;
    note?: string | null;
  }) => {
    await createBudget.mutateAsync({
      month: values.month,
      categoryId: values.categoryId,
      savingsBucketId: values.savingsBucketId,
      amountIdr: values.amountIdr,
      note: values.note,
    });
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

    await updateBudget.mutateAsync({
      id: selectedBudget.id,
      month,
      amountIdr: values.amountIdr,
      note: values.note,
    });
  };

  // Handle delete budget
  const handleDeleteBudget = async (id: string) => {
    await deleteBudget.mutateAsync({ id, month });
  };

  // Handle copy budgets
  const handleCopyBudgets = async (fromMonth: string, toMonth: string) => {
    try {
      const result = await copyBudgets.mutateAsync({ fromMonth, toMonth });

      // Show appropriate feedback
      if (result.created.length === 0 && result.skipped.length > 0) {
        toast.info("All budgets already exist in destination month");
      } else if (result.skipped.length === 0) {
        toast.success(
          `Copied ${result.created.length} budget${result.created.length !== 1 ? "s" : ""}`,
        );
      } else {
        toast.success(
          `Copied ${result.created.length} budget${result.created.length !== 1 ? "s" : ""}`,
        );
        setCopyResult({
          ...result,
          fromMonth,
          toMonth,
        });
        openCopyResultModal();
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to copy budgets";
      toast.error(message);
    }
  };

  // Get selected month display name
  const getSelectedMonthDisplay = () => {
    const option = monthOptions.find((opt) => opt.value === month);
    return option?.label || "Select a month";
  };

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
              onClick={openCopyDialog}
              disabled={isLoading}
              data-testid="copy-budgets"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Budgets
            </Button>
          )}
          <Button onClick={openCreateDialog}>
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
              {month
                ? `Budget breakdown for ${getSelectedMonthDisplay()}`
                : "Select a month to view budget details"}
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center md:gap-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <span className="text-sm font-medium text-muted-foreground">
                Month:
              </span>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger
                  className="w-full md:w-48"
                  data-testid="month-select"
                  aria-label="Select month"
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
              onChange={setViewMode}
              data-testid="view-toggle"
            />
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "list" ? (
            <BudgetTable
              budgets={budgets}
              summary={summary || undefined}
              onEdit={openEditDialog}
              onDelete={handleDeleteBudget}
              isLoading={isLoading}
            />
          ) : (
            <BudgetCardGrid
              budgets={budgets}
              summary={summary || undefined}
              onEdit={openEditDialog}
              onDelete={handleDeleteBudget}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <BudgetDialogForm
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeCreateDialog();
        }}
        onSubmit={handleCreateBudget}
        isLoading={createBudget.isPending}
        mode="create"
        initialData={null}
      />

      {/* Edit Dialog */}
      {selectedBudget && (
        <BudgetDialogForm
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            if (!open) closeEditDialog();
          }}
          initialData={selectedBudget}
          onSubmit={handleUpdateBudget}
          isLoading={updateBudget.isPending}
          mode="edit"
        />
      )}

      {/* Copy Budget Dialog */}
      <CopyBudgetDialog
        open={copyDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeCopyDialog();
        }}
        onCopy={handleCopyBudgets}
        defaultDestinationMonth={month}
      />

      {/* Copy Result Modal */}
      {copyResult && (
        <CopyResultModal
          open={copyResultModalOpen}
          onOpenChange={(open) => {
            if (!open) closeCopyResultModal();
          }}
          created={copyResult.created}
          skipped={copyResult.skipped}
          fromMonth={copyResult.fromMonth}
          toMonth={copyResult.toMonth}
        />
      )}
    </div>
  );
}
