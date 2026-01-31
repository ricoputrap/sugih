/**
 * TanStack Query key factory for Export module
 * Provides consistent query keys for caching and invalidation
 */

export const exportKeys = {
  /** Base key for all export-related queries */
  all: ["export"] as const,

  /** Key for fetching export statistics */
  stats: () => [...exportKeys.all, "stats"] as const,
};
