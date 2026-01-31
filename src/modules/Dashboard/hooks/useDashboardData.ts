import { useQuery } from "@tanstack/react-query";
import type {
  CategoryBreakdownData,
  CategorySpendingTrendChartData,
  KpiCardData,
  NetWorthChartData,
  RecentTransaction,
} from "../schema";
import { dashboardKeys } from "../utils/queryKeys";

export interface DashboardData {
  kpis: {
    netWorth: KpiCardData;
    moneyLeftToSpend: KpiCardData;
    totalSpending: KpiCardData;
    totalSavings: KpiCardData;
  };
  timeSeries: {
    netWorth: NetWorthChartData[];
    spending: CategorySpendingTrendChartData[];
    income: CategorySpendingTrendChartData[];
    savings: NetWorthChartData[];
  };
  categoryBreakdown: {
    expenses: CategoryBreakdownData[];
    income: CategoryBreakdownData[];
  };
  latestTransactions: RecentTransaction[];
}

async function fetchDashboardData(
  period: string,
  dateRangePreset: string,
): Promise<DashboardData> {
  const params = new URLSearchParams();
  params.set("period", period);
  params.set("dateRangePreset", dateRangePreset);

  const response = await fetch(`/api/dashboard/revamp?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const result = await response.json();
  return result.data;
}

export function useDashboardData(period: string, dateRangePreset: string) {
  return useQuery({
    queryKey: dashboardKeys.revamp(period, dateRangePreset),
    queryFn: () => fetchDashboardData(period, dateRangePreset),
  });
}
