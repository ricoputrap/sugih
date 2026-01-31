import { useQuery } from "@tanstack/react-query";
import type { Category } from "../schema";
import { categoryKeys } from "../utils/queryKeys";

/**
 * Fetch all categories
 */
async function fetchCategories(): Promise<Category[]> {
  const response = await fetch("/api/categories");
  if (!response.ok) {
    throw new Error("Failed to fetch categories");
  }
  return response.json();
}

/**
 * Hook to fetch categories using TanStack Query.
 * Provides automatic caching, refetching, and error handling.
 */
export function useCategoriesData() {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: fetchCategories,
  });
}
