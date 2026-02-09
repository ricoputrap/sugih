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
async function fetchBudgetsData(
  month: string,
  status: string = "active",
): Promise<BudgetsResponse> {
  const response = await fetch(`/api/budgets?month=${month}&status=${status}`);
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
 * @param status - Status filter: "active" or "archived" (defaults to "active")
 * @returns TanStack Query result with { budgets, summary } data
 */
export function useBudgetsData(month: string, status: string = "active") {
  return useQuery({
    queryKey: budgetKeys.month(month, status),
    queryFn: () => fetchBudgetsData(month, status),
    enabled: !!month,
    staleTime: 0,
  });
}
