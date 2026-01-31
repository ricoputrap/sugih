"use client";

import { Suspense } from "react";
import { toast } from "sonner";
import { BudgetDetailsCard } from "@/modules/Budget/components/BudgetDetailsCard";
import { BudgetDialogForm } from "@/modules/Budget/components/BudgetDialogForm";
import { BudgetsPageHeader } from "@/modules/Budget/components/BudgetsPageHeader";
import { BudgetsPageSkeleton } from "@/modules/Budget/components/BudgetsPageSkeleton";
import { CopyBudgetDialog } from "@/modules/Budget/components/CopyBudgetDialog";
import { CopyResultModal } from "@/modules/Budget/components/CopyResultModal";
import {
  useBudgetMonth,
  useBudgetMonthOptions,
  useBudgetMutations,
  useBudgetsData,
  useBudgetView,
} from "@/modules/Budget/hooks";
import { useBudgetMonthNavigation } from "@/modules/Budget/hooks/useBudgetMonthNavigation";
import { useBudgetsPageStore } from "@/modules/Budget/stores";

export default function BudgetsPage() {
  return (
    <Suspense fallback={<BudgetsPageSkeleton />}>
      <BudgetsPageContent />
    </Suspense>
  );
}

function BudgetsPageContent() {
  // URL state (NUQS)
  const [month, setMonth] = useBudgetMonth();
  const [viewMode, setViewMode] = useBudgetView();
  const monthOptions = useBudgetMonthOptions();
  const monthNavigation = useBudgetMonthNavigation(month);

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


  return (
    <div className="space-y-6">
      {/* Header */}
      <BudgetsPageHeader />

      {/* Budget Details Card */}
      <BudgetDetailsCard
        month={month}
        onMonthChange={setMonth}
        monthOptions={monthOptions}
        monthNavigation={monthNavigation}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        budgets={budgets}
        summary={summary}
        isLoading={isLoading}
        onEdit={openEditDialog}
        onDelete={handleDeleteBudget}
      />

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
