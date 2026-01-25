/**
 * Shared types for Budget module components
 */

// View mode type for toggling between list and grid views
export type BudgetViewMode = "list" | "grid";

/**
 * Budget Summary Item
 * Represents a single category's budget summary information
 */
export interface BudgetSummaryItem {
  categoryId: string;
  categoryName: string;
  budgetAmount: number;
  spentAmount: number;
  remaining: number;
  percentUsed: number;
}

/**
 * Budget Summary
 * Represents the overall budget summary for a month
 */
export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  items: BudgetSummaryItem[];
}

// Re-export commonly used types for convenience
export type { BudgetWithCategory, Budget } from "./schema";
