/**
 * Bulk delete confirmation dialog for transactions
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
import {
  useTransactionsPageStore,
} from "@/modules/Transaction/stores";
import { useTransactionMutations } from "@/modules/Transaction/hooks";
import { useState } from "react";

export function TransactionBulkDeleteDialog() {
  const {
    isDeleteDialogOpen,
    selectedTransactionIds,
    closeDeleteDialog,
    clearSelection,
  } = useTransactionsPageStore();

  const { bulkDeleteTransactions } = useTransactionMutations();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await bulkDeleteTransactions.mutateAsync(selectedTransactionIds);
      clearSelection();
      closeDeleteDialog();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={closeDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete transactions?</AlertDialogTitle>
          <AlertDialogDescription>
            This will move {selectedTransactionIds.length} transaction
            {selectedTransactionIds.length !== 1 ? "s" : ""} to trash (soft
            delete). You can restore them later if needed.
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
