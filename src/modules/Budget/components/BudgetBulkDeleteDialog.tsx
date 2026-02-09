/**
 * Bulk delete confirmation dialog for budgets
 */

"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useBudgetsPageStore } from "@/modules/Budget/stores";
import { useBudgetMutations } from "@/modules/Budget/hooks";
import { useState } from "react";

export function BudgetBulkDeleteDialog() {
  const {
    isBulkDeleteDialogOpen,
    selectedBudgetIds,
    closeBulkDeleteDialog,
    clearSelection,
  } = useBudgetsPageStore();

  const { bulkDeleteBudgets } = useBudgetMutations();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await bulkDeleteBudgets.mutateAsync(Array.from(selectedBudgetIds));
      clearSelection();
      closeBulkDeleteDialog();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog
      open={isBulkDeleteDialogOpen}
      onOpenChange={closeBulkDeleteDialog}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete budgets?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete {selectedBudgetIds.size} budget
            {selectedBudgetIds.size !== 1 ? "s" : ""}. This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
