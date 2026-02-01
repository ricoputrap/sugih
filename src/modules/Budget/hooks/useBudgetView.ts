"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

const VIEW_MODES = ["list", "grid"] as const;

/**
 * Hook to manage the budget view mode (list/grid) via URL query parameter.
 * Uses NUQS for URL state management.
 *
 * Defaults to "list" when no URL param is present.
 *
 * @returns Tuple of [viewMode, setViewMode]
 */
export function useBudgetView() {
  return useQueryState(
    "view",
    parseAsStringLiteral(VIEW_MODES).withDefault("list"),
  );
}
