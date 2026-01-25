/**
 * Format a number as IDR (Indonesian Rupiah) currency
 *
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "Rp 1.000.000")
 *
 * @example
 * formatCurrency(1000000) // "Rp 1.000.000"
 * formatCurrency(500) // "Rp 500"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a percentage value with optional decimal places
 *
 * @param value - The percentage value (0-100+)
 * @param decimalPlaces - Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "75.0%")
 *
 * @example
 * formatPercentage(75) // "75.0%"
 * formatPercentage(75.5, 2) // "75.50%"
 * formatPercentage(125) // "125.0%" (over-budget)
 */
export function formatPercentage(
  value: number,
  decimalPlaces: number = 1,
): string {
  return `${value.toFixed(decimalPlaces)}%`;
}

/**
 * Format a number as compact currency (K for thousands, M for millions)
 * Useful for displaying large amounts in limited space
 *
 * @param amount - The amount to format
 * @returns Formatted compact currency string (e.g., "1.5M", "500K")
 *
 * @example
 * formatCompactCurrency(1500000) // "1.5M"
 * formatCompactCurrency(500000) // "500K"
 * formatCompactCurrency(1000) // "1K"
 */
export function formatCompactCurrency(amount: number): string {
  if (Math.abs(amount) >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`;
  }
  return amount.toString();
}
