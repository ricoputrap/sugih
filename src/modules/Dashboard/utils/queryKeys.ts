/**
 * TanStack Query key factory for Dashboard module
 * Provides consistent query keys for caching and invalidation
 */

export const dashboardKeys = {
  /** Base key for all dashboard-related queries */
  all: ["dashboard"] as const,

  /** Key for fetching dashboard data with filters */
  revamp: (period: string, dateRangePreset: string) =>
    [...dashboardKeys.all, "revamp", period, dateRangePreset] as const,
};
