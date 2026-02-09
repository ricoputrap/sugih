"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

const STATUS_MODES = ["active", "archived"] as const;

/**
 * Hook to manage budget status filter via URL query parameters
 * Defaults to "active" status
 *
 * @returns Tuple of [status, setStatus]
 */
export function useBudgetStatus() {
  return useQueryState(
    "status",
    parseAsStringLiteral(STATUS_MODES).withDefault("active"),
  );
}
