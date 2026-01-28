"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useCallback } from "react";
import type { BudgetViewMode } from "../types";

const VIEW_MODES = ["list", "grid"] as const;
const STORAGE_KEY = "budgetViewMode";

/**
 * Get the default view mode from localStorage or fallback to "list".
 * Only runs on client-side.
 */
function getStoredViewMode(): BudgetViewMode {
  if (typeof window === "undefined") return "list";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "grid" ? "grid" : "list";
}

/**
 * Hook to manage the budget view mode (list/grid) via URL query parameter.
 * Uses NUQS for URL state management with localStorage fallback for backward compatibility.
 *
 * Default priority:
 * 1. URL param if present
 * 2. localStorage value if present
 * 3. "list"
 *
 * @returns Tuple of [viewMode, setViewMode]
 */
export function useBudgetView() {
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(VIEW_MODES).withDefault(getStoredViewMode()),
  );

  const setViewWithStorage = useCallback(
    (newView: BudgetViewMode | null) => {
      if (newView) {
        localStorage.setItem(STORAGE_KEY, newView);
      }
      return setView(newView);
    },
    [setView],
  );

  return [view, setViewWithStorage] as const;
}
