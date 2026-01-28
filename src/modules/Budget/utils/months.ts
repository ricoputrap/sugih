/**
 * Month utility functions for budget management
 * Handles month formatting, generation, and defaults
 */

/**
 * Format a date to the month key format: YYYY-MM-01
 * @param date - The date to format
 * @returns Month key in YYYY-MM-01 format
 */
export function formatMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/**
 * Get the default month key (current month)
 * @param now - Optional current date (defaults to today)
 * @returns Month key in YYYY-MM-01 format for current month
 */
export function getDefaultMonthKey(now?: Date): string {
  const date = now || new Date();
  return formatMonthKey(date);
}

/**
 * Generate month options for a date range
 * @param options.past - Number of months in the past to include
 * @param options.future - Number of months in the future to include
 * @param options.now - Optional reference date (defaults to today)
 * @returns Array of month options with value and label
 */
export function generateMonthOptions({
  past = 6,
  future = 11,
  now,
}: {
  past?: number;
  future?: number;
  now?: Date;
}): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  const referenceDate = now || new Date();
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();

  // Generate months: past months, current month, future months
  for (let i = -past; i <= future; i++) {
    const date = new Date(currentYear, currentMonth + i, 1);
    const monthKey = formatMonthKey(date);
    const monthDisplay = date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    options.push({
      value: monthKey,
      label: monthDisplay,
    });
  }

  return options;
}
