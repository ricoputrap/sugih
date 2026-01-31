/**
 * TanStack Query key factory for Category module
 * Provides consistent query keys for caching and invalidation
 */

export const categoryKeys = {
  /** Base key for all category-related queries */
  all: ["categories"] as const,

  /** Key for fetching all categories */
  list: () => [...categoryKeys.all, "list"] as const,
};
