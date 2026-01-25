import type { NextRequest } from "next/server";

import { ok, serverError } from "@/lib/http";
import { withRouteLogging } from "@/lib/logging";
import { getMonthsWithBudgets } from "@/modules/Budget/actions";

/**
 * GET /api/budgets/months
 * Get all distinct months that have budgets, with budget counts
 *
 * Returns:
 * Array of {
 *   value: string (YYYY-MM-01 format),
 *   label: string (formatted month, e.g., "January 2026"),
 *   budgetCount: number
 * }
 */
async function handleGet(_request: NextRequest) {
  try {
    const months = await getMonthsWithBudgets();
    return ok(months);
  } catch (error) {
    console.error("Error fetching months with budgets:", error);
    return serverError("Failed to fetch available months");
  }
}

export const GET = withRouteLogging(handleGet, {
  operation: "api.budgets.months",
  logQuery: true,
});
