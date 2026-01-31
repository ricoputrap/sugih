import { useQuery } from "@tanstack/react-query";
import type { SavingsBucket } from "../schema";
import { savingsBucketKeys } from "../utils/queryKeys";

/**
 * Fetch all savings buckets
 */
async function fetchSavingsBuckets(): Promise<SavingsBucket[]> {
  const response = await fetch("/api/savings-buckets");
  if (!response.ok) {
    throw new Error("Failed to fetch savings buckets");
  }
  return response.json();
}

/**
 * Hook to fetch savings buckets using TanStack Query.
 * Provides automatic caching, refetching, and error handling.
 */
export function useSavingsBucketsData() {
  return useQuery({
    queryKey: savingsBucketKeys.list(),
    queryFn: fetchSavingsBuckets,
  });
}
