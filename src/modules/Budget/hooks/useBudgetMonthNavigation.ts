import { useMemo } from "react";
import { useBudgetMonthOptions } from "./useBudgetMonthOptions";

/**
 * Navigation helpers for budget month selection
 */
export function useBudgetMonthNavigation(currentMonth: string) {
  const monthOptions = useBudgetMonthOptions();

  return useMemo(() => {
    const currentIndex = monthOptions.findIndex(
      (option) => option.value === currentMonth,
    );

    return {
      canGoToPrevious: currentIndex > 0,
      canGoToNext: currentIndex < monthOptions.length - 1,
      previousMonth:
        currentIndex > 0 ? monthOptions[currentIndex - 1].value : null,
      nextMonth:
        currentIndex < monthOptions.length - 1
          ? monthOptions[currentIndex + 1].value
          : null,
    };
  }, [currentMonth, monthOptions]);
}
