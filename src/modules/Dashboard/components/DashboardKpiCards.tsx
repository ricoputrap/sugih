/**
 * Dashboard KPI Cards Component
 *
 * Displays the top 4 KPI cards with values and growth metrics:
 * - Total Net Worth
 * - Money Left to Spend
 * - Total Spending
 * - Total Savings
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KpiCardData } from "../schema";

export interface DashboardKpiCardsProps {
  netWorth: KpiCardData;
  moneyLeftToSpend: KpiCardData;
  totalSpending: KpiCardData;
  totalSavings: KpiCardData;
  formatCurrency?: (amount: number) => string;
}

/**
 * Default currency formatter (IDR)
 */
function defaultFormatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Growth indicator component with color coding
 */
function GrowthIndicator({ growth }: { growth: KpiCardData["growth"] }) {
  if (growth.isNeutral) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="growth-neutral">
        {growth.label}
      </p>
    );
  }

  if (growth.isPositive) {
    return (
      <p className="text-xs text-green-600" data-testid="growth-positive">
        {growth.label}
      </p>
    );
  }

  return (
    <p className="text-xs text-red-600" data-testid="growth-negative">
      {growth.label}
    </p>
  );
}

/**
 * Individual KPI Card component
 */
function KpiCard({
  data,
  formatCurrency,
}: {
  data: KpiCardData;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <Card data-testid={`kpi-card-${data.title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{data.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid="kpi-value">
          {formatCurrency(data.value)}
        </div>
        <GrowthIndicator growth={data.growth} />
      </CardContent>
    </Card>
  );
}

/**
 * Dashboard KPI Cards Container
 */
export function DashboardKpiCards({
  netWorth,
  moneyLeftToSpend,
  totalSpending,
  totalSavings,
  formatCurrency = defaultFormatCurrency,
}: DashboardKpiCardsProps) {
  return (
    <div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      data-testid="dashboard-kpi-cards"
    >
      <KpiCard data={netWorth} formatCurrency={formatCurrency} />
      <KpiCard data={moneyLeftToSpend} formatCurrency={formatCurrency} />
      <KpiCard data={totalSpending} formatCurrency={formatCurrency} />
      <KpiCard data={totalSavings} formatCurrency={formatCurrency} />
    </div>
  );
}
