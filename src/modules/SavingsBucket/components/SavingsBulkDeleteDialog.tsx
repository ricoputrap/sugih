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
import { useSavingsPageStore } from "@/modules/SavingsBucket/stores";
import { useSavingsBucketMutations } from "@/modules/SavingsBucket/hooks";
import { toast } from "sonner";

export function SavingsBulkDeleteDialog() {
  const {
    isDeleteDialogOpen,
    closeDeleteDialog,
    selectedBucketIds,
    clearSelection,
  } = useSavingsPageStore();
  const { bulkDelete } = useSavingsBucketMutations();

  const handleBulkDelete = async () => {
    try {
      const result = await bulkDelete.mutateAsync(selectedBucketIds);
      toast.success(
        `${result.deletedCount} savings bucket(s) deleted successfully`,
      );
      clearSelection();
      closeDeleteDialog();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete savings buckets");
    }
  };

  return (
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={closeDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete savings buckets?</AlertDialogTitle>
          <AlertDialogDescription>
            This will move {selectedBucketIds.length} savings bucket(s) to trash
            (soft delete). You can restore them later if needed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={bulkDelete.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBulkDelete}
            disabled={bulkDelete.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {bulkDelete.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
