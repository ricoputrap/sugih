"use client";

import { parseAsString, useQueryState } from "nuqs";
import { getDefaultMonthKey } from "../utils/months";

/**
 * Hook to manage the selected budget month via URL query parameter.
 * Uses NUQS for URL state management.
 *
 * @returns Tuple of [month, setMonth] where month is in YYYY-MM-01 format
 */
export function useBudgetMonth() {
  return useQueryState(
    "month",
    parseAsString.withDefault(getDefaultMonthKey()),
  );
}
