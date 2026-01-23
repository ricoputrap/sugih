/**
 * Dashboard Revamp Shell
 *
 * Main container component for the revamped dashboard.
 * Contains placeholder sections for:
 * - Top KPI cards (Net Worth, Money Left, Spending, Savings)
 * - Financial Insights chart with tabs
 * - Third row (Category breakdown doughnut + Latest transactions)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardRevampShell() {
  return (
    <div className="space-y-6" data-testid="dashboard-revamp-shell">
      {/* Top KPI Cards Section */}
      <section data-testid="kpi-cards-section" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp 0</div>
            <p className="text-xs text-muted-foreground">Placeholder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Money Left to Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp 0</div>
            <p className="text-xs text-muted-foreground">Placeholder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp 0</div>
            <p className="text-xs text-muted-foreground">Placeholder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp 0</div>
            <p className="text-xs text-muted-foreground">Placeholder</p>
          </CardContent>
        </Card>
      </section>

      {/* Financial Insights Section */}
      <section data-testid="financial-insights-section">
        <Card>
          <CardHeader>
            <CardTitle>Financial Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Chart placeholder - tabs and controls to be implemented
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Third Row: Breakdown + Transactions */}
      <section data-testid="third-row-section" className="grid gap-4 md:grid-cols-2">
        {/* Category Breakdown Doughnut */}
        <Card data-testid="category-breakdown-card">
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Doughnut chart placeholder
            </div>
          </CardContent>
        </Card>

        {/* Latest Transactions */}
        <Card data-testid="latest-transactions-card">
          <CardHeader>
            <CardTitle>Latest Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-muted-foreground text-sm">
              <p>Latest 5 transactions placeholder</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
