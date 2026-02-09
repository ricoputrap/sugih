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
import { useBudgetMonth } from "@/modules/Budget/hooks/useBudgetMonth";
import { useBudgetsPageStore } from "@/modules/Budget/stores";

export function BudgetArchiveDialog() {
  const [month] = useBudgetMonth();
  const { isArchiveDialogOpen, closeArchiveDialog, selectedBudget } =
    useBudgetsPageStore();
  const { archiveBudget } = useBudgetMutations();

  const handleArchive = async () => {
    if (!selectedBudget) return;

    try {
      await archiveBudget.mutateAsync({
        id: selectedBudget.id,
        month,
      });
      closeArchiveDialog();
    } catch (_error) {
      // Error toast is handled by the mutation
    }
  };

  return (
    <AlertDialog open={isArchiveDialogOpen} onOpenChange={closeArchiveDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive Budget</AlertDialogTitle>
          <AlertDialogDescription>
            Archive this budget? You can restore it later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-3">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleArchive}
            disabled={archiveBudget.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {archiveBudget.isPending ? "Archiving..." : "Archive"}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
