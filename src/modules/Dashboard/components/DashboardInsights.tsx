"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  InsightTab,
  ChartVariant,
} from "../types";
import { INSIGHT_TAB_LABELS } from "../types";
import type { NetWorthChartData, CategorySpendingTrendChartData } from "../schema";
import { NetWorthGrowthChart } from "./charts/NetWorthGrowthChart";
import { SpendingTrendsChart } from "./charts/SpendingTrendsChart";
import { IncomeTrendsChart } from "./charts/IncomeTrendsChart";
import { SavingsTrendsChart } from "./charts/SavingsTrendsChart";

export interface DashboardInsightsProps {
  /** Net worth chart data */
  netWorthData: NetWorthChartData[];
  /** Spending trends chart data */
  spendingData: CategorySpendingTrendChartData[];
  /** Income trends chart data */
  incomeData: CategorySpendingTrendChartData[];
  /** Savings trends chart data */
  savingsData: NetWorthChartData[];
  /** Chart visualization variant (line or area) */
  variant?: ChartVariant;
  /** Loading state */
  isLoading?: boolean;
  /** Default selected tab */
  defaultTab?: InsightTab;
  /** Callback when tab changes */
  onTabChange?: (tab: InsightTab) => void;
  /** Custom class name for the container */
  className?: string;
}

/**
 * DashboardInsights Component
 *
 * Financial Insights section with tabbed interface for:
 * - Net Worth Growth (default)
 * - Spending Trends
 * - Income Trends
 * - Savings Trends
 *
 * Only one chart is visible at a time based on the selected tab.
 * Tab selection is managed internally but can be controlled via props.
 */
export function DashboardInsights({
  netWorthData,
  spendingData,
  incomeData,
  savingsData,
  variant = "line",
  isLoading = false,
  defaultTab = "netWorth",
  onTabChange,
  className,
}: DashboardInsightsProps) {
  const [selectedTab, setSelectedTab] = React.useState<InsightTab>(defaultTab);

  const handleTabChange = React.useCallback(
    (value: string) => {
      const tab = value as InsightTab;
      setSelectedTab(tab);
      onTabChange?.(tab);
    },
    [onTabChange],
  );

  return (
    <div className={className} data-testid="dashboard-insights">
      <Tabs value={selectedTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="netWorth" data-testid="tab-netWorth">
            Net Worth
          </TabsTrigger>
          <TabsTrigger value="spending" data-testid="tab-spending">
            Spending
          </TabsTrigger>
          <TabsTrigger value="income" data-testid="tab-income">
            Income
          </TabsTrigger>
          <TabsTrigger value="savings" data-testid="tab-savings">
            Savings
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="netWorth"
          className="mt-6"
          data-testid="content-netWorth"
        >
          <NetWorthGrowthChart
            data={netWorthData}
            variant={variant}
            isLoading={isLoading}
            title={INSIGHT_TAB_LABELS.netWorth}
            description="Track your total net worth over time"
          />
        </TabsContent>

        <TabsContent
          value="spending"
          className="mt-6"
          data-testid="content-spending"
        >
          <SpendingTrendsChart
            data={spendingData}
            variant={variant}
            isLoading={isLoading}
            title={INSIGHT_TAB_LABELS.spending}
            description="Analyze your spending patterns by category"
          />
        </TabsContent>

        <TabsContent
          value="income"
          className="mt-6"
          data-testid="content-income"
        >
          <IncomeTrendsChart
            data={incomeData}
            variant={variant}
            isLoading={isLoading}
            title={INSIGHT_TAB_LABELS.income}
            description="Track your income sources over time"
          />
        </TabsContent>

        <TabsContent
          value="savings"
          className="mt-6"
          data-testid="content-savings"
        >
          <SavingsTrendsChart
            data={savingsData}
            variant={variant}
            isLoading={isLoading}
            title={INSIGHT_TAB_LABELS.savings}
            description="Monitor your savings growth by bucket"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
