import {
  DashboardPageHeader,
  DashboardKpiCardsContainer,
  DashboardInsightsPanel,
  DashboardBottomRow,
} from "@/modules/Dashboard/components";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header - static */}
      <DashboardPageHeader />

      {/* KPI Cards - self-contained */}
      <DashboardKpiCardsContainer />

      {/* Financial Insights with Controls - self-contained */}
      <DashboardInsightsPanel />

      {/* Category Breakdown + Latest Transactions - self-contained */}
      <DashboardBottomRow />
    </div>
  );
}
