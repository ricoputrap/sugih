import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  SavingsBucketCreateInput,
  SavingsBucket,
} from "../schema";
import { savingsBucketKeys } from "../utils/queryKeys";

/**
 * Hook providing all savings bucket mutations with automatic cache invalidation.
 * Returns create, update, archive, delete, and bulkDelete mutations.
 */
export function useSavingsBucketMutations() {
  const queryClient = useQueryClient();

  const invalidateBuckets = () => {
    queryClient.invalidateQueries({ queryKey: savingsBucketKeys.all });
  };

  const createBucket = useMutation({
    mutationFn: async (values: {
      name: string;
      description?: string;
    }): Promise<SavingsBucket> => {
      const response = await fetch("/api/savings-buckets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create savings bucket");
      }

      return response.json();
    },
    onSuccess: invalidateBuckets,
  });

  const updateBucket = useMutation({
    mutationFn: async (values: {
      id: string;
      name: string;
      description?: string;
    }): Promise<SavingsBucket> => {
      const { id, ...data } = values;
      const response = await fetch(`/api/savings-buckets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update savings bucket");
      }

      return response.json();
    },
    onSuccess: invalidateBuckets,
  });

  const archiveBucket = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/savings-buckets/${id}?action=archive`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to archive savings bucket");
      }
    },
    onSuccess: invalidateBuckets,
  });

  const deleteBucket = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/savings-buckets/${id}?action=delete`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete savings bucket");
      }
    },
    onSuccess: invalidateBuckets,
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]): Promise<{ deletedCount: number }> => {
      const response = await fetch("/api/savings-buckets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Handle partial failure
        if (errorData.error?.issues?.details?.failedIds) {
          const { deletedCount, failedIds } = errorData.error.issues.details;
          throw new Error(
            `${deletedCount} bucket(s) deleted, but ${failedIds.length} failed. Failed IDs: ${failedIds.join(", ")}`,
          );
        }
        throw new Error(
          errorData.error?.message || "Failed to delete savings buckets",
        );
      }

      return response.json();
    },
    onSuccess: invalidateBuckets,
  });

  return {
    createBucket,
    updateBucket,
    archiveBucket,
    deleteBucket,
    bulkDelete,
  };
}
