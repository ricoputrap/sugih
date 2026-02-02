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

  return {
    createBudget,
    updateBudget,
    deleteBudget,
    copyBudgets,
    bulkDeleteBudgets,
  };
}
