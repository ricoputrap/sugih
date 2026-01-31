/**
 * TanStack Query key factory for SavingsBucket module
 * Provides consistent query keys for caching and invalidation
 */

export const savingsBucketKeys = {
  /** Base key for all savings bucket-related queries */
  all: ["savingsBuckets"] as const,

  /** Key for fetching all savings buckets */
  list: () => [...savingsBucketKeys.all, "list"] as const,
};
