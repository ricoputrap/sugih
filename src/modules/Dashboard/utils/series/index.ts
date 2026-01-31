/**
 * Dashboard Series Utilities Index
 *
 * Centralized exports for all series data transformation utilities.
 */

export type {
  CategoryInfo as IncomeCategoryInfo,
  IncomeChartDataPoint,
} from "./incomeSeries";
// Income Series
export {
  calculateTotalIncome,
  extractIncomeCategories,
  fillIncomeBuckets,
  generateIncomeChartConfig,
  getIncomeCategoryNames,
  getIncomeCategoryTotal,
  isIncomeDataEmpty,
  limitIncomeCategories,
  transformIncomeData,
} from "./incomeSeries";
export type {
  NamedSeries as NetWorthNamedSeries,
  NetWorthChartDataPoint,
  NetWorthSeriesConfig,
  SeriesDataPoint as NetWorthSeriesDataPoint,
} from "./netWorthSeries";
// Net Worth Series
export {
  buildNetWorthSeries,
  calculateNetWorthGrowth,
  fillNetWorthBuckets,
  generateNetWorthChartConfig,
  getNetWorthSeriesKeys,
  isNetWorthDataEmpty,
  transformNetWorthData,
} from "./netWorthSeries";
export type {
  NamedSeries as SavingsNamedSeries,
  SavingsBucketInfo,
  SavingsChartDataPoint,
} from "./savingsSeries";
// Savings Series
export {
  buildSavingsBucketSeries,
  calculateSavingsGrowth,
  calculateTotalSavings,
  extractSavingsBuckets,
  fillSavingsBuckets,
  generateSavingsChartConfig,
  getLatestSavingsBalance,
  getSavingsBucketNames,
  getSavingsSeriesKeys,
  isSavingsDataEmpty,
  transformSavingsData,
} from "./savingsSeries";
export type {
  CategoryInfo as SpendingCategoryInfo,
  SpendingChartDataPoint,
} from "./spendingSeries";
// Spending Series
export {
  calculateTotalSpending,
  extractCategories as extractSpendingCategories,
  fillSpendingBuckets,
  generateSpendingChartConfig,
  getCategoryNames as getSpendingCategoryNames,
  getCategoryTotal as getSpendingCategoryTotal,
  isSpendingDataEmpty,
  limitCategories as limitSpendingCategories,
  transformSpendingData,
} from "./spendingSeries";
