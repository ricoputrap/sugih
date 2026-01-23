/**
 * KPI Computation Utilities
 *
 * Pure functions for computing dashboard KPI metrics:
 * - Total Net Worth (wallets + savings)
 * - Money Left to Spend (budget - expenses)
 * - Total Spending (current period)
 * - Total Savings (all-time)
 * - Month-over-month growth calculations
 */

/**
 * Wallet balance data
 */
export interface WalletBalance {
  id: string;
  name: string;
  balance: number;
}

/**
 * Savings bucket balance data
 */
export interface SavingsBucketBalance {
  id: string;
  name: string;
  balance: number;
}

/**
 * Budget data
 */
export interface BudgetData {
  amount: number;
  period: string;
}

/**
 * Spending data for a period
 */
export interface SpendingData {
  total: number;
  period: string;
}

/**
 * Growth metric with formatted display
 */
export interface GrowthMetric {
  value: number; // Percentage change
  label: string; // Human-readable label
  isPositive: boolean; // Whether growth is positive
  isNegative: boolean; // Whether growth is negative
  isNeutral: boolean; // Whether growth is neutral (0%)
}

/**
 * Computes total net worth from wallet and savings balances
 *
 * @param wallets - Array of wallet balances
 * @param savingsBuckets - Array of savings bucket balances
 * @returns Total net worth
 *
 * @example
 * ```ts
 * const wallets = [{ id: '1', name: 'Cash', balance: 1000 }];
 * const savings = [{ id: '1', name: 'Emergency', balance: 5000 }];
 * computeNetWorth(wallets, savings); // 6000
 * ```
 */
export function computeNetWorth(
  wallets: WalletBalance[],
  savingsBuckets: SavingsBucketBalance[],
): number {
  const walletsTotal = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  const savingsTotal = savingsBuckets.reduce(
    (sum, bucket) => sum + bucket.balance,
    0,
  );
  return walletsTotal + savingsTotal;
}

/**
 * Computes money left to spend for the current period
 *
 * @param budget - Budget data for the period
 * @param spending - Spending data for the period
 * @returns Money remaining in budget
 *
 * @example
 * ```ts
 * const budget = { amount: 5000, period: 'monthly' };
 * const spending = { total: 3000, period: 'this month' };
 * computeMoneyLeftToSpend(budget, spending); // 2000
 * ```
 */
export function computeMoneyLeftToSpend(
  budget: BudgetData | null,
  spending: SpendingData,
): number {
  if (!budget || budget.amount <= 0) {
    // No budget set, show negative spending
    return -spending.total;
  }
  return budget.amount - spending.total;
}

/**
 * Computes total spending for a period
 *
 * @param spending - Spending data for the period
 * @returns Total spending amount
 *
 * @example
 * ```ts
 * const spending = { total: 3000, period: 'this month' };
 * computeTotalSpending(spending); // 3000
 * ```
 */
export function computeTotalSpending(spending: SpendingData): number {
  return spending.total;
}

/**
 * Computes total savings from all savings buckets
 *
 * @param savingsBuckets - Array of savings bucket balances
 * @returns Total savings amount
 *
 * @example
 * ```ts
 * const savings = [
 *   { id: '1', name: 'Emergency', balance: 5000 },
 *   { id: '2', name: 'Vacation', balance: 2000 }
 * ];
 * computeTotalSavings(savings); // 7000
 * ```
 */
export function computeTotalSavings(
  savingsBuckets: SavingsBucketBalance[],
): number {
  return savingsBuckets.reduce((sum, bucket) => sum + bucket.balance, 0);
}

/**
 * Computes month-over-month growth percentage
 *
 * @param currentValue - Value for current period
 * @param previousValue - Value for previous period
 * @returns Growth percentage (positive = increase, negative = decrease)
 *
 * @example
 * ```ts
 * computeGrowthPercentage(120, 100); // 20 (20% increase)
 * computeGrowthPercentage(80, 100);  // -20 (20% decrease)
 * computeGrowthPercentage(100, 0);   // 0 (no baseline)
 * ```
 */
export function computeGrowthPercentage(
  currentValue: number,
  previousValue: number,
): number {
  // Handle edge case: no previous value (avoid division by zero)
  if (previousValue === 0) {
    // If current value is also 0, no change
    if (currentValue === 0) {
      return 0;
    }
    // If previous is 0 but current is not, treat as 100% increase
    return currentValue > 0 ? 100 : -100;
  }

  const growth = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
  // Round to 1 decimal place
  return Math.round(growth * 10) / 10;
}

/**
 * Formats growth percentage into a human-readable metric
 *
 * @param currentValue - Value for current period
 * @param previousValue - Value for previous period
 * @param customLabels - Optional custom labels for different scenarios
 * @returns Growth metric with formatted label
 *
 * @example
 * ```ts
 * formatGrowthMetric(120, 100);
 * // { value: 20, label: '+20% from last month', isPositive: true, isNegative: false, isNeutral: false }
 *
 * formatGrowthMetric(80, 100);
 * // { value: -20, label: '-20% from last month', isPositive: false, isNegative: true, isNeutral: false }
 *
 * formatGrowthMetric(100, 100);
 * // { value: 0, label: 'No change from last month', isPositive: false, isNegative: false, isNeutral: true }
 * ```
 */
export function formatGrowthMetric(
  currentValue: number,
  previousValue: number,
  customLabels?: {
    positive?: string;
    negative?: string;
    neutral?: string;
  },
): GrowthMetric {
  const growthPercentage = computeGrowthPercentage(currentValue, previousValue);

  const isPositive = growthPercentage > 0;
  const isNegative = growthPercentage < 0;
  const isNeutral = growthPercentage === 0;

  let label: string;

  if (isNeutral) {
    label = customLabels?.neutral || "No change from last month";
  } else if (isPositive) {
    const sign = "+";
    label =
      customLabels?.positive ||
      `${sign}${Math.abs(growthPercentage)}% from last month`;
  } else {
    const sign = "-";
    label =
      customLabels?.negative ||
      `${sign}${Math.abs(growthPercentage)}% from last month`;
  }

  return {
    value: growthPercentage,
    label,
    isPositive,
    isNegative,
    isNeutral,
  };
}

/**
 * KPI card data structure
 */
export interface KpiCardData {
  title: string;
  value: number;
  growth: GrowthMetric;
  period: string;
}

/**
 * Complete KPI summary for dashboard top cards
 */
export interface KpiSummary {
  netWorth: KpiCardData;
  moneyLeftToSpend: KpiCardData;
  totalSpending: KpiCardData;
  totalSavings: KpiCardData;
}

/**
 * Input data for computing KPI summary
 */
export interface KpiSummaryInput {
  currentWallets: WalletBalance[];
  currentSavings: SavingsBucketBalance[];
  previousWallets: WalletBalance[];
  previousSavings: SavingsBucketBalance[];
  currentBudget: BudgetData | null;
  previousBudget: BudgetData | null;
  currentSpending: SpendingData;
  previousSpending: SpendingData;
}

/**
 * Computes complete KPI summary for all dashboard top cards
 *
 * @param input - All required data for KPI computation
 * @returns Complete KPI summary with growth metrics
 *
 * @example
 * ```ts
 * const summary = computeKpiSummary({
 *   currentWallets: [{ id: '1', name: 'Cash', balance: 1000 }],
 *   currentSavings: [{ id: '1', name: 'Emergency', balance: 5000 }],
 *   previousWallets: [{ id: '1', name: 'Cash', balance: 900 }],
 *   previousSavings: [{ id: '1', name: 'Emergency', balance: 4500 }],
 *   currentBudget: { amount: 5000, period: 'monthly' },
 *   previousBudget: { amount: 5000, period: 'monthly' },
 *   currentSpending: { total: 3000, period: 'this month' },
 *   previousSpending: { total: 2800, period: 'last month' }
 * });
 * ```
 */
export function computeKpiSummary(input: KpiSummaryInput): KpiSummary {
  // Net Worth
  const currentNetWorth = computeNetWorth(
    input.currentWallets,
    input.currentSavings,
  );
  const previousNetWorth = computeNetWorth(
    input.previousWallets,
    input.previousSavings,
  );

  // Money Left to Spend
  const currentMoneyLeft = computeMoneyLeftToSpend(
    input.currentBudget,
    input.currentSpending,
  );
  const previousMoneyLeft = computeMoneyLeftToSpend(
    input.previousBudget,
    input.previousSpending,
  );

  // Total Spending
  const currentSpending = computeTotalSpending(input.currentSpending);
  const previousSpending = computeTotalSpending(input.previousSpending);

  // Total Savings
  const currentSavings = computeTotalSavings(input.currentSavings);
  const previousSavings = computeTotalSavings(input.previousSavings);

  return {
    netWorth: {
      title: "Total Net Worth",
      value: currentNetWorth,
      growth: formatGrowthMetric(currentNetWorth, previousNetWorth),
      period: "All time",
    },
    moneyLeftToSpend: {
      title: "Money Left to Spend",
      value: currentMoneyLeft,
      growth: formatGrowthMetric(currentMoneyLeft, previousMoneyLeft),
      period: input.currentSpending.period || "This month",
    },
    totalSpending: {
      title: "Total Spending",
      value: currentSpending,
      growth: formatGrowthMetric(currentSpending, previousSpending),
      period: input.currentSpending.period || "This month",
    },
    totalSavings: {
      title: "Total Savings",
      value: currentSavings,
      growth: formatGrowthMetric(currentSavings, previousSavings),
      period: "All time",
    },
  };
}
