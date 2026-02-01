"use client";

import { useDashboardData, useDashboardFilters } from "../hooks";
import { useDashboardPageStore } from "../stores";
import { ChartVariantToggle } from "./ChartVariantToggle";
import { DashboardChartControls } from "./DashboardChartControls";
import { DashboardInsights } from "./DashboardInsights";

export function DashboardInsightsPanel() {
  const { period, setPeriod, dateRangePreset, setDateRangePreset } =
    useDashboardFilters();
  const { data, isLoading } = useDashboardData(period, dateRangePreset);
  const {
    chartVariant,
    selectedInsightTab,
    setChartVariant,
    setSelectedInsightTab,
  } = useDashboardPageStore();

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Financial Insights</h3>
            <p className="text-sm text-muted-foreground">
              Track your financial trends over time
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ChartVariantToggle
              value={chartVariant}
              onChange={setChartVariant}
            />
          </div>
        </div>

        <div className="mb-4">
          <DashboardChartControls
            period={period}
            dateRangePreset={dateRangePreset}
            onPeriodChange={setPeriod}
            onDateRangePresetChange={setDateRangePreset}
          />
        </div>
      </div>

      <div className="px-6 pb-6">
        <DashboardInsights
          netWorthData={data?.timeSeries?.netWorth || []}
          spendingData={data?.timeSeries?.spending || []}
          incomeData={[]}
          savingsData={data?.timeSeries?.netWorth || []}
          variant={chartVariant}
          isLoading={isLoading}
          defaultTab={selectedInsightTab}
          onTabChange={setSelectedInsightTab}
        />
      </div>
    </div>
  );
}
