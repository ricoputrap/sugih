"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useBudgetMutations } from "@/modules/Budget/hooks";
import { useBudgetsPageStore } from "@/modules/Budget/stores";

export function BudgetBulkArchiveDialog() {
  const {
    isBulkArchiveDialogOpen,
    closeBulkArchiveDialog,
    selectedBudgetIds,
    clearSelection,
  } = useBudgetsPageStore();
  const { bulkArchiveBudgets } = useBudgetMutations();

  const handleArchive = async () => {
    const ids = Array.from(selectedBudgetIds);
    if (ids.length === 0) return;

    try {
      await bulkArchiveBudgets.mutateAsync(ids);
      clearSelection();
      closeBulkArchiveDialog();
    } catch (_error) {
      // Error toast is handled by the mutation
    }
  };

  const count = selectedBudgetIds.size;

  return (
    <AlertDialog
      open={isBulkArchiveDialogOpen}
      onOpenChange={closeBulkArchiveDialog}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive Budgets</AlertDialogTitle>
          <AlertDialogDescription>
            Archive {count} budget{count !== 1 ? "s" : ""}? You can restore
            {count !== 1 ? " them" : " it"} later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-3">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleArchive}
            disabled={bulkArchiveBudgets.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {bulkArchiveBudgets.isPending ? "Archiving..." : "Archive"}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
