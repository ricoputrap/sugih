/**
 * Dashboard Utilities
 *
 * Shared utility functions for the dashboard module.
 * These functions are safe to use in both client and server contexts.
 */

/**
 * Format currency values as Indonesian Rupiah
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
