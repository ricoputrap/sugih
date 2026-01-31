import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CategoryCreateInput, CategoryType, Category } from "../schema";
import { categoryKeys } from "../utils/queryKeys";

/**
 * Hook providing all category mutations with automatic cache invalidation.
 * Returns create, update, archive, restore, and delete mutations.
 */
export function useCategoryMutations() {
  const queryClient = useQueryClient();

  const invalidateCategories = () => {
    queryClient.invalidateQueries({ queryKey: categoryKeys.all });
  };

  const createCategory = useMutation({
    mutationFn: async (values: {
      name: string;
      type: CategoryType;
    }): Promise<Category> => {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create category");
      }

      return response.json();
    },
    onSuccess: invalidateCategories,
  });

  const updateCategory = useMutation({
    mutationFn: async (values: {
      id: string;
      name: string;
      type: CategoryType;
    }): Promise<Category> => {
      const { id, ...data } = values;
      const response = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update category");
      }

      return response.json();
    },
    onSuccess: invalidateCategories,
  });

  const archiveCategory = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/categories/${id}?action=archive`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to archive category");
      }
    },
    onSuccess: invalidateCategories,
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/categories/${id}?action=delete`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete category");
      }
    },
    onSuccess: invalidateCategories,
  });

  return {
    createCategory,
    updateCategory,
    archiveCategory,
    deleteCategory,
  };
}
