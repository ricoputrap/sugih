"use client";

import { useDashboardData, useDashboardFilters } from "../hooks";
import { DashboardKpiCards } from "./DashboardKpiCards";

export function DashboardKpiCardsContainer() {
  const { period, dateRangePreset } = useDashboardFilters();
  const { data, isLoading } = useDashboardData(period, dateRangePreset);

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg border bg-card p-6 shadow-sm animate-pulse"
          >
            <div className="h-4 w-24 bg-muted rounded mb-3" />
            <div className="h-8 w-32 bg-muted rounded mb-2" />
            <div className="h-3 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <DashboardKpiCards
      netWorth={data.kpis.netWorth}
      moneyLeftToSpend={data.kpis.moneyLeftToSpend}
      totalSpending={data.kpis.totalSpending}
      totalSavings={data.kpis.totalSavings}
    />
  );
}
