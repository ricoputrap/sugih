/**
 * @vitest-environment jsdom
 */

/**
 * Dashboard KPI Cards Tests
 *
 * Component tests for DashboardKpiCards verifying:
 * - All 4 cards render correctly
 * - Values are formatted properly
 * - Growth indicators display with correct colors
 * - Custom currency formatter works
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DashboardKpiCards } from "./DashboardKpiCards";
import type { KpiCardData } from "../schema";

describe("DashboardKpiCards", () => {
  const mockKpiData = {
    netWorth: {
      title: "Total Net Worth",
      value: 10000000,
      growth: {
        value: 0,
        label: "Total Wallets + Savings",
        isPositive: false,
        isNegative: false,
        isNeutral: true,
      },
      period: "All time",
    } as KpiCardData,
    moneyLeftToSpend: {
      title: "Money Left to Spend",
      value: 2000000,
      growth: {
        value: -10.2,
        label: "-10.2% from last month",
        isPositive: false,
        isNegative: true,
        isNeutral: false,
      },
      period: "This month",
    } as KpiCardData,
    totalSpending: {
      title: "Total Spending",
      value: 3000000,
      growth: {
        value: 5.0,
        label: "+5% from last month",
        isPositive: true,
        isNegative: false,
        isNeutral: false,
      },
      period: "This month",
    } as KpiCardData,
    totalSavings: {
      title: "Total Savings",
      value: 5000000,
      growth: {
        value: 0,
        label: "No change from last month",
        isPositive: false,
        isNegative: false,
        isNeutral: true,
      },
      period: "All time",
    } as KpiCardData,
  };

  it("renders the main container", () => {
    render(<DashboardKpiCards {...mockKpiData} />);

    const container = screen.getByTestId("dashboard-kpi-cards");
    expect(container).toBeInTheDocument();
  });

  it("renders all 4 KPI cards", () => {
    render(<DashboardKpiCards {...mockKpiData} />);

    expect(screen.getByText("Total Net Worth")).toBeInTheDocument();
    expect(screen.getByText("Money Left to Spend")).toBeInTheDocument();
    expect(screen.getByText("Total Spending")).toBeInTheDocument();
    expect(screen.getByText("Total Savings")).toBeInTheDocument();
  });

  it("displays formatted currency values", () => {
    render(<DashboardKpiCards {...mockKpiData} />);

    // Check that values are rendered (exact format may vary by locale)
    const values = screen.getAllByTestId("kpi-value");
    expect(values).toHaveLength(4);

    // Each value should contain a currency symbol or number
    for (const value of values) {
      expect(value.textContent).toBeTruthy();
      expect(value.textContent?.length).toBeGreaterThan(0);
    }
  });

  it("uses custom currency formatter when provided", () => {
    const customFormatter = (amount: number) => `$${amount.toFixed(2)}`;

    render(
      <DashboardKpiCards {...mockKpiData} formatCurrency={customFormatter} />,
    );

    const values = screen.getAllByTestId("kpi-value");
    expect(values[0].textContent).toBe("$10000000.00");
    expect(values[1].textContent).toBe("$2000000.00");
    expect(values[2].textContent).toBe("$3000000.00");
    expect(values[3].textContent).toBe("$5000000.00");
  });

  it("displays positive growth indicator with green color", () => {
    render(<DashboardKpiCards {...mockKpiData} />);

    const positiveGrowths = screen.getAllByTestId("growth-positive");
    expect(positiveGrowths.length).toBeGreaterThan(0);

    // Check that positive growth has green text
    for (const growth of positiveGrowths) {
      expect(growth).toHaveClass("text-green-600");
    }
  });

  it("displays negative growth indicator with red color", () => {
    render(<DashboardKpiCards {...mockKpiData} />);

    const negativeGrowth = screen.getByTestId("growth-negative");
    expect(negativeGrowth).toBeInTheDocument();
    expect(negativeGrowth).toHaveClass("text-red-600");
    expect(negativeGrowth.textContent).toBe("-10.2% from last month");
  });

  it("displays neutral growth indicator with muted color", () => {
    render(<DashboardKpiCards {...mockKpiData} />);

    const neutralGrowths = screen.getAllByTestId("growth-neutral");
    expect(neutralGrowths.length).toBeGreaterThan(0);

    // Check that all neutral growths have muted color
    for (const growth of neutralGrowths) {
      expect(growth).toHaveClass("text-muted-foreground");
    }

    // Check that "No change from last month" is displayed (Total Savings)
    expect(screen.getByText("No change from last month")).toBeInTheDocument();

    // Check that "Total Wallets + Savings" is displayed (Net Worth)
    expect(screen.getByText("Total Wallets + Savings")).toBeInTheDocument();
  });

  it("displays growth labels correctly", () => {
    render(<DashboardKpiCards {...mockKpiData} />);

    expect(screen.getByText("Total Wallets + Savings")).toBeInTheDocument();
    expect(screen.getByText("-10.2% from last month")).toBeInTheDocument();
    expect(screen.getByText("+5% from last month")).toBeInTheDocument();
    expect(screen.getByText("No change from last month")).toBeInTheDocument();
  });

  it("has proper grid layout classes", () => {
    render(<DashboardKpiCards {...mockKpiData} />);

    const container = screen.getByTestId("dashboard-kpi-cards");
    expect(container).toHaveClass(
      "grid",
      "gap-4",
      "md:grid-cols-2",
      "lg:grid-cols-4",
    );
  });

  it("renders card with correct test IDs", () => {
    render(<DashboardKpiCards {...mockKpiData} />);

    expect(screen.getByTestId("kpi-card-total-net-worth")).toBeInTheDocument();
    expect(
      screen.getByTestId("kpi-card-money-left-to-spend"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("kpi-card-total-spending")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-card-total-savings")).toBeInTheDocument();
  });

  it("handles zero values correctly", () => {
    const zeroData = {
      ...mockKpiData,
      totalSpending: {
        ...mockKpiData.totalSpending,
        value: 0,
      },
    };

    render(<DashboardKpiCards {...zeroData} />);

    const values = screen.getAllByTestId("kpi-value");
    expect(values[2].textContent).toBeTruthy();
  });

  it("handles negative values correctly", () => {
    const negativeData = {
      ...mockKpiData,
      moneyLeftToSpend: {
        ...mockKpiData.moneyLeftToSpend,
        value: -500000,
      },
    };

    render(<DashboardKpiCards {...negativeData} />);

    const values = screen.getAllByTestId("kpi-value");
    // Should still render the value (formatted as negative)
    expect(values[1].textContent).toBeTruthy();
  });

  it("handles large numbers correctly", () => {
    const largeData = {
      ...mockKpiData,
      netWorth: {
        ...mockKpiData.netWorth,
        value: 1000000000000, // 1 trillion
      },
    };

    render(<DashboardKpiCards {...largeData} />);

    const values = screen.getAllByTestId("kpi-value");
    expect(values[0].textContent).toBeTruthy();
    expect(values[0].textContent?.length).toBeGreaterThan(5);
  });

  it("displays all growth types in same render", () => {
    render(<DashboardKpiCards {...mockKpiData} />);

    // Should have at least one of each type
    expect(screen.getAllByTestId("growth-positive").length).toBeGreaterThan(0);
    expect(screen.getByTestId("growth-negative")).toBeInTheDocument();
    expect(screen.getAllByTestId("growth-neutral").length).toBeGreaterThan(0);
  });

  it("renders Net Worth KPI with descriptive label instead of growth percentage", () => {
    render(<DashboardKpiCards {...mockKpiData} />);

    // Net Worth card should exist
    const netWorthCard = screen.getByTestId("kpi-card-total-net-worth");
    expect(netWorthCard).toBeInTheDocument();

    // Title should be "Total Net Worth"
    expect(screen.getByText("Total Net Worth")).toBeInTheDocument();

    // NEW behavior: growth label shows descriptive text
    expect(screen.getByText("Total Wallets + Savings")).toBeInTheDocument();

    // Growth should be neutral (muted color, not green/red)
    const neutralGrowths = screen.getAllByTestId("growth-neutral");
    const netWorthGrowth = neutralGrowths.find((el) =>
      el.textContent?.includes("Total Wallets + Savings"),
    );
    expect(netWorthGrowth).toBeDefined();
    expect(netWorthGrowth).toHaveClass("text-muted-foreground");
  });
});
