import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { BudgetWithCategory } from "../types";
import { budgetKeys } from "../utils/queryKeys";

/**
 * Input for creating a new budget
 */
export interface CreateBudgetInput {
  month: string;
  categoryId?: string | null;
  savingsBucketId?: string | null;
  amountIdr: number;
  note?: string | null;
}

/**
 * Input for updating an existing budget
 */
export interface UpdateBudgetInput {
  id: string;
  month: string;
  amountIdr: number;
  note?: string | null;
}

/**
 * Input for deleting a budget
 */
export interface DeleteBudgetInput {
  id: string;
  month: string;
}

/**
 * Input for archiving a budget
 */
export interface ArchiveBudgetInput {
  id: string;
  month: string;
}

/**
 * Input for restoring a budget
 */
export interface RestoreBudgetInput {
  id: string;
  month: string;
}

/**
 * Input for copying budgets between months
 */
export interface CopyBudgetsInput {
  fromMonth: string;
  toMonth: string;
}

/**
 * Result of copying budgets
 */
export interface CopyBudgetsResult {
  created: BudgetWithCategory[];
  skipped: Array<{
    categoryId: string | null;
    savingsBucketId: string | null;
    targetName: string;
  }>;
}

/**
 * Hook providing all budget mutations with automatic cache invalidation.
 * Returns create, update, delete, and copy mutations.
 */
export function useBudgetMutations() {
  const queryClient = useQueryClient();

  const invalidateMonth = (month: string) => {
    queryClient.invalidateQueries({ queryKey: budgetKeys.month(month) });
  };

  const createBudget = useMutation({
    mutationFn: async (
      values: CreateBudgetInput,
    ): Promise<BudgetWithCategory> => {
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      return response.json();
    },
    onSuccess: (_, variables) => {
      invalidateMonth(variables.month);
    },
  });

  const updateBudget = useMutation({
    mutationFn: async (
      values: UpdateBudgetInput,
    ): Promise<BudgetWithCategory> => {
      const response = await fetch(`/api/budgets/${values.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountIdr: values.amountIdr,
          note: values.note,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update budget");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      invalidateMonth(variables.month);
    },
  });

  const deleteBudget = useMutation({
    mutationFn: async (values: DeleteBudgetInput): Promise<void> => {
      const response = await fetch(`/api/budgets/${values.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete budget");
      }
    },
    onSuccess: (_, variables) => {
      invalidateMonth(variables.month);
    },
  });

  const copyBudgets = useMutation({
    mutationFn: async (
      values: CopyBudgetsInput,
    ): Promise<CopyBudgetsResult> => {
      const response = await fetch("/api/budgets/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromMonth: values.fromMonth,
          toMonth: values.toMonth,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to copy budgets");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      invalidateMonth(variables.fromMonth);
      invalidateMonth(variables.toMonth);
    },
  });

  const bulkDeleteBudgets = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch(`/api/budgets`, {
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
        throw new Error(data.error?.message || "Failed to delete budgets");
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });

      if (data.deletedCount > 0) {
        toast.success(
          `Successfully deleted ${data.deletedCount} budget${
            data.deletedCount !== 1 ? "s" : ""
          }`,
        );
      }

      if (data.error?.details?.failedIds?.length > 0) {
        toast.error(
          `Failed to delete ${data.error.details.failedIds.length} budget${
            data.error.details.failedIds.length !== 1 ? "s" : ""
          } (not found)`,
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete budgets");
    },
  });

  const archiveBudget = useMutation({
    mutationFn: async (
      values: ArchiveBudgetInput,
    ): Promise<BudgetWithCategory> => {
      const response = await fetch(`/api/budgets/${values.id}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to archive budget");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: budgetKeys.month(variables.month),
      });
      toast.success("Budget archived successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to archive budget");
    },
  });

  const restoreBudget = useMutation({
    mutationFn: async (
      values: RestoreBudgetInput,
    ): Promise<BudgetWithCategory> => {
      const response = await fetch(`/api/budgets/${values.id}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to restore budget");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: budgetKeys.month(variables.month),
      });
      toast.success("Budget restored successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to restore budget");
    },
  });

  const bulkArchiveBudgets = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch(`/api/budgets/archive`, {
        method: "POST",
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
        throw new Error(data.error?.message || "Failed to archive budgets");
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });

      if (data.archivedCount > 0) {
        toast.success(
          `Successfully archived ${data.archivedCount} budget${
            data.archivedCount !== 1 ? "s" : ""
          }`,
        );
      }

      if (data.error?.details?.failedIds?.length > 0) {
        toast.error(
          `Failed to archive ${data.error.details.failedIds.length} budget${
            data.error.details.failedIds.length !== 1 ? "s" : ""
          } (not found)`,
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to archive budgets");
    },
  });

  const bulkRestoreBudgets = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch(`/api/budgets/restore`, {
        method: "POST",
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
        throw new Error(data.error?.message || "Failed to restore budgets");
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });

      if (data.restoredCount > 0) {
        toast.success(
          `Successfully restored ${data.restoredCount} budget${
            data.restoredCount !== 1 ? "s" : ""
          }`,
        );
      }

      if (data.error?.details?.failedIds?.length > 0) {
        toast.error(
          `Failed to restore ${data.error.details.failedIds.length} budget${
            data.error.details.failedIds.length !== 1 ? "s" : ""
          } (not found)`,
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to restore budgets");
    },
  });

  return {
    createBudget,
    updateBudget,
    deleteBudget,
    copyBudgets,
    bulkDeleteBudgets,
    archiveBudget,
    restoreBudget,
    bulkArchiveBudgets,
    bulkRestoreBudgets,
  };
}
