/**
 * React Query hooks for transaction mutations (delete, bulk delete)
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { transactionKeys } from "@/modules/Transaction/utils/queryKeys";

export function useTransactionMutations() {
  const queryClient = useQueryClient();

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete transaction");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });

  const bulkDeleteTransactions = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch(`/api/transactions`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if this is a partial failure
        if (response.status === 400 && data.error?.details?.failedIds) {
          return data;
        }
        throw new Error(data.error?.message || "Failed to delete transactions");
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });

      if (data.deletedCount > 0) {
        toast.success(
          `Successfully deleted ${data.deletedCount} transaction${
            data.deletedCount !== 1 ? "s" : ""
          }`,
        );
      }

      if (data.error?.details?.failedIds?.length > 0) {
        toast.error(
          `Failed to delete ${data.error.details.failedIds.length} transaction${
            data.error.details.failedIds.length !== 1 ? "s" : ""
          } (not found or already deleted)`,
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete transactions");
    },
  });

  return { deleteTransaction, bulkDeleteTransactions };
}
