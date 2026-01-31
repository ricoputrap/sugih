/**
 * Gradient utilities for budget status badges and charts
 */

export type BudgetStatus =
  | "on-track"
  | "near-limit"
  | "reached-limit"
  | "over-budget";

/**
 * Determine budget status based on percentage used
 */
export function getBudgetStatus(percentUsed: number): BudgetStatus {
  if (percentUsed > 100) return "over-budget";
  if (percentUsed === 100) return "reached-limit";
  if (percentUsed >= 80) return "near-limit";
  return "on-track";
}

/**
 * Get badge configuration for a budget status
 */
export function getStatusBadgeConfig(status: BudgetStatus) {
  const configs = {
    "on-track": {
      icon: "CheckCircle2" as const,
      label: "On Track",
      gradient: "bg-gradient-to-r from-green-50 to-emerald-50",
      text: "text-green-800",
      border: "border-green-200",
    },
    "near-limit": {
      icon: "AlertCircle" as const,
      label: "Near Limit",
      gradient: "bg-gradient-to-r from-orange-50 to-amber-50",
      text: "text-orange-800",
      border: "border-orange-200",
    },
    "reached-limit": {
      icon: "AlertCircle" as const,
      label: "Reached Limit",
      gradient: "bg-gradient-to-r from-yellow-50 to-orange-50",
      text: "text-yellow-900",
      border: "border-yellow-300",
    },
    "over-budget": {
      icon: "AlertCircle" as const,
      label: "Over Budget",
      gradient: "bg-gradient-to-r from-red-50 to-rose-50",
      text: "text-red-800",
      border: "border-red-200",
    },
  };
  return configs[status];
}

/**
 * Get chart color based on percentage used
 */
export function getChartGradientColor(percentUsed: number): string {
  if (percentUsed > 100) return "#ef4444"; // red-500
  if (percentUsed === 100) return "#eab308"; // yellow-500
  if (percentUsed >= 80) return "#f97316"; // orange-500
  return "#10b981"; // green-500
}
