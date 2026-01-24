/**
 * Dashboard Series Utilities Index
 *
 * Centralized exports for all series data transformation utilities.
 */

// Net Worth Series
export {
  transformNetWorthData,
  buildNetWorthSeries,
  fillNetWorthBuckets,
  calculateNetWorthGrowth,
  getNetWorthSeriesKeys,
  generateNetWorthChartConfig,
  isNetWorthDataEmpty,
} from "./netWorthSeries";
export type {
  SeriesDataPoint as NetWorthSeriesDataPoint,
  NamedSeries as NetWorthNamedSeries,
  NetWorthChartDataPoint,
  NetWorthSeriesConfig,
} from "./netWorthSeries";

// Spending Series
export {
  transformSpendingData,
  extractCategories as extractSpendingCategories,
  getCategoryNames as getSpendingCategoryNames,
  fillSpendingBuckets,
  generateSpendingChartConfig,
  isSpendingDataEmpty,
  calculateTotalSpending,
  getCategoryTotal as getSpendingCategoryTotal,
  limitCategories as limitSpendingCategories,
} from "./spendingSeries";
export type {
  SpendingChartDataPoint,
  CategoryInfo as SpendingCategoryInfo,
} from "./spendingSeries";

// Income Series
export {
  transformIncomeData,
  extractIncomeCategories,
  getIncomeCategoryNames,
  fillIncomeBuckets,
  generateIncomeChartConfig,
  isIncomeDataEmpty,
  calculateTotalIncome,
  getIncomeCategoryTotal,
  limitIncomeCategories,
} from "./incomeSeries";
export type {
  IncomeChartDataPoint,
  CategoryInfo as IncomeCategoryInfo,
} from "./incomeSeries";

// Savings Series
export {
  transformSavingsData,
  buildSavingsBucketSeries,
  extractSavingsBuckets,
  getSavingsBucketNames,
  fillSavingsBuckets,
  generateSavingsChartConfig,
  isSavingsDataEmpty,
  getLatestSavingsBalance,
  calculateSavingsGrowth,
  getSavingsSeriesKeys,
  calculateTotalSavings,
} from "./savingsSeries";
export type {
  SavingsChartDataPoint,
  SavingsBucketInfo,
  NamedSeries as SavingsNamedSeries,
} from "./savingsSeries";
