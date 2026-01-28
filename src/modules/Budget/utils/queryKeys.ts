/**
 * TanStack Query key factory for Budget module
 * Provides consistent query keys for caching and invalidation
 */

export const budgetKeys = {
  /** Base key for all budget-related queries */
  all: ["budgets"] as const,

  /** Key for fetching budgets and summary for a specific month */
  month: (month: string) => [...budgetKeys.all, "month", month] as const,

  /** Key for fetching months that have budgets (used in copy dialog) */
  monthsWithBudgets: () => [...budgetKeys.all, "months-with-budgets"] as const,
};
