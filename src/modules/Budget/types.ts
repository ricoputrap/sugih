/**
 * Shared types for Budget module components
 */

// View mode type for toggling between list and grid views
export type BudgetViewMode = "list" | "grid";

/**
 * Budget Summary Item
 * Represents a single budget item's summary information
 * Supports both category budgets and savings bucket budgets
 */
export interface BudgetSummaryItem {
  categoryId: string | null;
  savingsBucketId?: string | null;
  targetName?: string;
  targetType?: "category" | "savings_bucket";
  categoryName?: string;
  budgetAmount: number;
  spentAmount: number;
  remaining: number;
  percentUsed: number;
}

/**
 * Budget Summary
 * Represents the overall budget summary for a month
 * Includes both category budgets and savings bucket budgets
 */
export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  items: BudgetSummaryItem[];
}

// Re-export commonly used types for convenience
export type { BudgetWithCategory, Budget } from "./schema";
