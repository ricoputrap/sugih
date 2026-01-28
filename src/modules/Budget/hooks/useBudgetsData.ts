import { useQuery } from "@tanstack/react-query";
import type { BudgetSummary, BudgetWithCategory } from "../types";
import { budgetKeys } from "../utils/queryKeys";

/**
 * Response from the unified budgets API endpoint
 */
export interface BudgetsResponse {
  budgets: BudgetWithCategory[];
  summary: BudgetSummary;
}

/**
 * Fetch budgets and summary for a specific month
 */
async function fetchBudgetsData(month: string): Promise<BudgetsResponse> {
  const response = await fetch(`/api/budgets?month=${month}`);
  if (!response.ok) {
    throw new Error("Failed to fetch budgets");
  }
  return response.json();
}

/**
 * Hook to fetch budgets and summary for a specific month using TanStack Query.
 * Provides automatic caching, refetching, and error handling.
 *
 * @param month - Month in YYYY-MM-01 format
 * @returns TanStack Query result with { budgets, summary } data
 */
export function useBudgetsData(month: string) {
  return useQuery({
    queryKey: budgetKeys.month(month),
    queryFn: () => fetchBudgetsData(month),
    enabled: !!month,
  });
}
