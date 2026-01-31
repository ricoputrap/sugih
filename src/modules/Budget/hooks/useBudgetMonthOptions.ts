import { useMemo } from "react";
import { generateMonthOptions } from "../utils/months";

/**
 * Hook to generate memoized month options for budget selection.
 * Returns 18 months: 6 previous + current + 11 future.
 *
 * @returns Array of { value: string, label: string } for month selector
 */
export function useBudgetMonthOptions() {
  return useMemo(() => generateMonthOptions({ past: 6, future: 6 }), []);
}
