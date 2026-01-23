/**
 * @vitest-environment jsdom
 */

/**
 * Dashboard Revamp Shell Tests
 *
 * Integration tests for the DashboardRevampShell component.
 * Verifies that all core sections exist and are properly structured.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DashboardRevampShell } from "./DashboardRevampShell";

describe("DashboardRevampShell", () => {
  it("renders the main shell container", () => {
    render(<DashboardRevampShell />);

    const shell = screen.getByTestId("dashboard-revamp-shell");
    expect(shell).toBeInTheDocument();
  });

  it("renders the KPI cards section with all 4 cards", () => {
    render(<DashboardRevampShell />);

    const kpiSection = screen.getByTestId("kpi-cards-section");
    expect(kpiSection).toBeInTheDocument();

    // Check all 4 KPI card titles
    expect(screen.getByText("Total Net Worth")).toBeInTheDocument();
    expect(screen.getByText("Money Left to Spend")).toBeInTheDocument();
    expect(screen.getByText("Total Spending")).toBeInTheDocument();
    expect(screen.getByText("Total Savings")).toBeInTheDocument();
  });

  it("renders the financial insights section", () => {
    render(<DashboardRevampShell />);

    const insightsSection = screen.getByTestId("financial-insights-section");
    expect(insightsSection).toBeInTheDocument();

    expect(screen.getByText("Financial Insights")).toBeInTheDocument();
  });

  it("renders the third row section with category breakdown and transactions", () => {
    render(<DashboardRevampShell />);

    const thirdRowSection = screen.getByTestId("third-row-section");
    expect(thirdRowSection).toBeInTheDocument();

    // Check category breakdown card
    const categoryCard = screen.getByTestId("category-breakdown-card");
    expect(categoryCard).toBeInTheDocument();
    expect(screen.getByText("Category Breakdown")).toBeInTheDocument();

    // Check latest transactions card
    const transactionsCard = screen.getByTestId("latest-transactions-card");
    expect(transactionsCard).toBeInTheDocument();
    expect(screen.getByText("Latest Transactions")).toBeInTheDocument();
  });

  it("has proper grid layout classes for responsive design", () => {
    render(<DashboardRevampShell />);

    const kpiSection = screen.getByTestId("kpi-cards-section");
    expect(kpiSection).toHaveClass(
      "grid",
      "gap-4",
      "md:grid-cols-2",
      "lg:grid-cols-4",
    );

    const thirdRowSection = screen.getByTestId("third-row-section");
    expect(thirdRowSection).toHaveClass("grid", "gap-4", "md:grid-cols-2");
  });
});
