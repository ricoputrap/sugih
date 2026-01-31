/**
 * @vitest-environment jsdom
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type {
  CategorySpendingTrendChartData,
  NetWorthChartData,
} from "../schema";
import { DashboardInsights } from "./DashboardInsights";

// Mock the chart components
vi.mock("./charts/NetWorthGrowthChart", () => ({
  NetWorthGrowthChart: ({
    title,
    data,
    variant,
    isLoading,
  }: {
    title?: string;
    data: NetWorthChartData[];
    variant?: string;
    isLoading?: boolean;
  }) => (
    <div
      data-testid="net-worth-chart"
      data-variant={variant}
      data-loading={isLoading}
    >
      <h3>{title}</h3>
      <div data-testid="net-worth-data">{JSON.stringify(data)}</div>
    </div>
  ),
}));

vi.mock("./charts/SpendingTrendsChart", () => ({
  SpendingTrendsChart: ({
    title,
    data,
    variant,
    isLoading,
  }: {
    title?: string;
    data: CategorySpendingTrendChartData[];
    variant?: string;
    isLoading?: boolean;
  }) => (
    <div
      data-testid="spending-chart"
      data-variant={variant}
      data-loading={isLoading}
    >
      <h3>{title}</h3>
      <div data-testid="spending-data">{JSON.stringify(data)}</div>
    </div>
  ),
}));

vi.mock("./charts/IncomeTrendsChart", () => ({
  IncomeTrendsChart: ({
    title,
    data,
    variant,
    isLoading,
  }: {
    title?: string;
    data: CategorySpendingTrendChartData[];
    variant?: string;
    isLoading?: boolean;
  }) => (
    <div
      data-testid="income-chart"
      data-variant={variant}
      data-loading={isLoading}
    >
      <h3>{title}</h3>
      <div data-testid="income-data">{JSON.stringify(data)}</div>
    </div>
  ),
}));

vi.mock("./charts/SavingsTrendsChart", () => ({
  SavingsTrendsChart: ({
    title,
    data,
    variant,
    isLoading,
  }: {
    title?: string;
    data: NetWorthChartData[];
    variant?: string;
    isLoading?: boolean;
  }) => (
    <div
      data-testid="savings-chart"
      data-variant={variant}
      data-loading={isLoading}
    >
      <h3>{title}</h3>
      <div data-testid="savings-data">{JSON.stringify(data)}</div>
    </div>
  ),
}));

describe("DashboardInsights", () => {
  const mockNetWorthData: NetWorthChartData[] = [
    {
      period: "2024-01",
      walletBalance: 5000000,
      savingsBalance: 10000000,
      totalNetWorth: 15000000,
    },
    {
      period: "2024-02",
      walletBalance: 6000000,
      savingsBalance: 11000000,
      totalNetWorth: 17000000,
    },
  ];

  const mockSpendingData: CategorySpendingTrendChartData[] = [
    {
      period: "2024-01",
      categories: [
        { categoryId: "1", categoryName: "Food", amount: 1000000 },
        { categoryId: "2", categoryName: "Transport", amount: 500000 },
      ],
    },
  ];

  const mockIncomeData: CategorySpendingTrendChartData[] = [
    {
      period: "2024-01",
      categories: [
        { categoryId: "3", categoryName: "Salary", amount: 10000000 },
        { categoryId: "4", categoryName: "Freelance", amount: 2000000 },
      ],
    },
  ];

  const mockSavingsData: NetWorthChartData[] = [
    {
      period: "2024-01",
      walletBalance: 0,
      savingsBalance: 10000000,
      totalNetWorth: 10000000,
    },
  ];

  describe("Rendering", () => {
    it("should render all four tabs", () => {
      render(
        <DashboardInsights
          netWorthData={mockNetWorthData}
          spendingData={mockSpendingData}
          incomeData={mockIncomeData}
          savingsData={mockSavingsData}
        />,
      );

      expect(screen.getByTestId("tab-netWorth")).toBeInTheDocument();
      expect(screen.getByTestId("tab-spending")).toBeInTheDocument();
      expect(screen.getByTestId("tab-income")).toBeInTheDocument();
      expect(screen.getByTestId("tab-savings")).toBeInTheDocument();
    });

    it("should render tab labels correctly", () => {
      render(
        <DashboardInsights
          netWorthData={mockNetWorthData}
          spendingData={mockSpendingData}
          incomeData={mockIncomeData}
          savingsData={mockSavingsData}
        />,
      );

      expect(screen.getByTestId("tab-netWorth")).toHaveTextContent("Net Worth");
      expect(screen.getByTestId("tab-spending")).toHaveTextContent("Spending");
      expect(screen.getByTestId("tab-income")).toHaveTextContent("Income");
      expect(screen.getByTestId("tab-savings")).toHaveTextContent("Savings");
    });

    it("should render with custom className", () => {
      render(
        <DashboardInsights
          netWorthData={mockNetWorthData}
          spendingData={mockSpendingData}
          incomeData={mockIncomeData}
          savingsData={mockSavingsData}
          className="custom-class"
        />,
      );

      const container = screen.getByTestId("dashboard-insights");
      expect(container).toHaveClass("custom-class");
    });
  });

  describe("Default Tab", () => {
    it("should default to netWorth tab", () => {
      render(
        <DashboardInsights
          netWorthData={mockNetWorthData}
          spendingData={mockSpendingData}
          incomeData={mockIncomeData}
          savingsData={mockSavingsData}
        />,
      );

      // Net Worth chart should be visible
      expect(screen.getByTestId("net-worth-chart")).toBeInTheDocument();

      // Other charts should not be in the document (not rendered)
      expect(screen.queryByTestId("spending-chart")).not.toBeInTheDocument();
      expect(screen.queryByTestId("income-chart")).not.toBeInTheDocument();
      expect(screen.queryByTestId("savings-chart")).not.toBeInTheDocument();
    });

    it("should use custom defaultTab prop", () => {
      render(
        <DashboardInsights
          netWorthData={mockNetWorthData}
          spendingData={mockSpendingData}
          incomeData={mockIncomeData}
          savingsData={mockSavingsData}
          defaultTab="spending"
        />,
      );

      // Spending chart should be visible
      expect(screen.getByTestId("spending-chart")).toBeInTheDocument();

      // Other charts should not be rendered
      expect(screen.queryByTestId("net-worth-chart")).not.toBeInTheDocument();
      expect(screen.queryByTestId("income-chart")).not.toBeInTheDocument();
      expect(screen.queryByTestId("savings-chart")).not.toBeInTheDocument();
    });
  });

  describe("Tab Switching", () => {
    it("should switch to spending chart when spending tab is clicked", async () => {
      const user = userEvent.setup();

      render(
        <DashboardInsights
          netWorthData={mockNetWorthData}
          spendingData={mockSpendingData}
          incomeData={mockIncomeData}
          savingsData={mockSavingsData}
        />,
      );

      // Initially netWorth is shown
      expect(screen.getByTestId("net-worth-chart")).toBeInTheDocument();

      // Click spending tab
      await user.click(screen.getByTestId("tab-spending"));

      // Spending chart should now be visible
      expect(screen.getByTestId("spending-chart")).toBeInTheDocument();

      // Net Worth chart should not be rendered
      expect(screen.queryByTestId("net-worth-chart")).not.toBeInTheDocument();
    });

    it("should switch to income chart when income tab is clicked", async () => {
      const user = userEvent.setup();

      render(
        <DashboardInsights
          netWorthData={mockNetWorthData}
          spendingData={mockSpendingData}
          incomeData={mockIncomeData}
          savingsData={mockSavingsData}
        />,
      );

      await user.click(screen.getByTestId("tab-income"));

      expect(screen.getByTestId("income-chart")).toBeInTheDocument();
      expect(screen.queryByTestId("net-worth-chart")).not.toBeInTheDocument();
      expect(screen.queryByTestId("spending-chart")).not.toBeInTheDocument();
      expect(screen.queryByTestId("savings-chart")).not.toBeInTheDocument();
    });

    it("should switch to savings chart when savings tab is clicked", async () => {
      const user = userEvent.setup();

      render(
        <DashboardInsights
          netWorthData={mockNetWorthData}
          spendingData={mockSpendingData}
          incomeData={mockIncomeData}
          savingsData={mockSavingsData}
        />,
      );

      await user.click(screen.getByTestId("tab-savings"));

      expect(screen.getByTestId("savings-chart")).toBeInTheDocument();
      expect(screen.queryByTestId("net-worth-chart")).not.toBeInTheDocument();
      expect(screen.queryByTestId("spending-chart")).not.toBeInTheDocument();
      expect(screen.queryByTestId("income-chart")).not.toBeInTheDocument();
    });

    it("should call onTabChange callback when tab changes", async () => {
      const user = userEvent.setup();
      const onTabChange = vi.fn();

      render(
        <DashboardInsights
          netWorthData={mockNetWorthData}
          spendingData={mockSpendingData}
          incomeData={mockIncomeData}
          savingsData={mockSavingsData}
          onTabChange={onTabChange}
        />,
      );

      await user.click(screen.getByTestId("tab-spending"));
      expect(onTabChange).toHaveBeenCalledWith("spending");

      await user.click(screen.getByTestId("tab-income"));
      expect(onTabChange).toHaveBeenCalledWith("income");

      await user.click(screen.getByTestId("tab-savings"));
      expect(onTabChange).toHaveBeenCalledWith("savings");

      await user.click(screen.getByTestId("tab-netWorth"));
      expect(onTabChange).toHaveBeenCalledWith("netWorth");

      expect(onTabChange).toHaveBeenCalledTimes(4);
    });

    it("should only mount one chart at a time", async () => {
      const user = userEvent.setup();

      render(
        <DashboardInsights
          netWorthData={mockNetWorthData}
          spendingData={mockSpendingData}
          incomeData={mockIncomeData}
          savingsData={mockSavingsData}
        />,
      );

      // Only netWorth chart initially
      expect(screen.getByTestId("net-worth-chart")).toBeInTheDocument();
      expect(screen.queryByTestId("spending-chart")).not.toBeInTheDocument();
      expect(screen.queryByTestId("income-chart")).not.toBeInTheDocument();
      expect(screen.queryByTestId("savings-chart")).not.toBeInTheDocument();

      // Switch to spending - only spending chart
      await user.click(screen.getByTestId("tab-spending"));
      expect(screen.queryByTestId("net-worth-chart")).not.toBeInTheDocument();
      expect(screen.getByTestId("spending-chart")).toBeInTheDocument();
      expect(screen.queryByTestId("income-chart")).not.toBeInTheDocument();
      expect(screen.queryByTestId("savings-chart")).not.toBeInTheDocument();

      // Switch to income - only income chart
      await user.click(screen.getByTestId("tab-income"));
      expect(screen.queryByTestId("net-worth-chart")).not.toBeInTheDocument();
      expect(screen.queryByTestId("spending-chart")).not.toBeInTheDocument();
      expect(screen.getByTestId("income-chart")).toBeInTheDocument();
      expect(screen.queryByTestId("savings-chart")).not.toBeInTheDocument();

      // Switch to savings - only savings chart
      await user.click(screen.getByTestId("tab-savings"));
      expect(screen.queryByTestId("net-worth-chart")).not.toBeInTheDocument();
      expect(screen.queryByTestId("spending-chart")).not.toBeInTheDocument();
      expect(screen.queryByTestId("income-chart")).not.toBeInTheDocument();
      expect(screen.getByTestId("savings-chart")).toBeInTheDocument();
    });
  });

  describe("Chart Props", () => {
    it("should pass correct data to each chart", () => {
      render(
        <DashboardInsights
          netWorthData={mockNetWorthData}
          spendingData={mockSpendingData}
          incomeData={mockIncomeData}
          savingsData={mockSavingsData}
        />,
      );

      const netWorthChart = screen.getByTestId("net-worth-chart");
      const netWorthDataElement =
        within(netWorthChart).getByTestId("net-worth-data");
      expect(netWorthDataElement.textContent).toBe(
        JSON.stringify(mockNetWorthData),
      );
    });

    it("should pass variant prop to all charts", async () => {
      const user = userEvent.setup();

      render(
        <DashboardInsights
          netWorthData={mockNetWorthData}
          spendingData={mockSpendingData}
          incomeData={mockIncomeData}
          savingsData={mockSavingsData}
          variant="area"
        />,
      );

      // Check netWorth chart
      expect(screen.getByTestId("net-worth-chart")).toHaveAttribute(
        "data-variant",
        "area",
      );

      // Check spending chart
      await user.click(screen.getByTestId("tab-spending"));
      expect(screen.getByTestId("spending-chart")).toHaveAttribute(
        "data-variant",
        "area",
      );

      // Check income chart
      await user.click(screen.getByTestId("tab-income"));
      expect(screen.getByTestId("income-chart")).toHaveAttribute(
        "data-variant",
        "area",
      );

      // Check savings chart
      await user.click(screen.getByTestId("tab-savings"));
      expect(screen.getByTestId("savings-chart")).toHaveAttribute(
        "data-variant",
        "area",
      );
    });

    it("should pass isLoading prop to all charts", async () => {
      const user = userEvent.setup();

      render(
        <DashboardInsights
          netWorthData={mockNetWorthData}
          spendingData={mockSpendingData}
          incomeData={mockIncomeData}
          savingsData={mockSavingsData}
          isLoading={true}
        />,
      );

      // Check each chart receives loading state
      expect(screen.getByTestId("net-worth-chart")).toHaveAttribute(
        "data-loading",
        "true",
      );

      await user.click(screen.getByTestId("tab-spending"));
      expect(screen.getByTestId("spending-chart")).toHaveAttribute(
        "data-loading",
        "true",
      );

      await user.click(screen.getByTestId("tab-income"));
      expect(screen.getByTestId("income-chart")).toHaveAttribute(
        "data-loading",
        "true",
      );

      await user.click(screen.getByTestId("tab-savings"));
      expect(screen.getByTestId("savings-chart")).toHaveAttribute(
        "data-loading",
        "true",
      );
    });

    it("should pass correct titles to each chart", async () => {
      const user = userEvent.setup();

      render(
        <DashboardInsights
          netWorthData={mockNetWorthData}
          spendingData={mockSpendingData}
          incomeData={mockIncomeData}
          savingsData={mockSavingsData}
        />,
      );

      // Net Worth chart
      expect(screen.getByText("Net Worth Growth")).toBeInTheDocument();

      // Spending chart
      await user.click(screen.getByTestId("tab-spending"));
      expect(screen.getByText("Spending Trends")).toBeInTheDocument();

      // Income chart
      await user.click(screen.getByTestId("tab-income"));
      expect(screen.getByText("Income Trends")).toBeInTheDocument();

      // Savings chart
      await user.click(screen.getByTestId("tab-savings"));
      expect(screen.getByText("Savings Trends")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty data arrays", () => {
      render(
        <DashboardInsights
          netWorthData={[]}
          spendingData={[]}
          incomeData={[]}
          savingsData={[]}
        />,
      );

      const netWorthChart = screen.getByTestId("net-worth-chart");
      const dataElement = within(netWorthChart).getByTestId("net-worth-data");
      expect(dataElement.textContent).toBe("[]");
    });

    it("should maintain tab state across re-renders", async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <DashboardInsights
          netWorthData={mockNetWorthData}
          spendingData={mockSpendingData}
          incomeData={mockIncomeData}
          savingsData={mockSavingsData}
        />,
      );

      // Switch to spending tab
      await user.click(screen.getByTestId("tab-spending"));
      expect(screen.getByTestId("spending-chart")).toBeInTheDocument();

      // Re-render with different data
      rerender(
        <DashboardInsights
          netWorthData={[...mockNetWorthData]}
          spendingData={[...mockSpendingData]}
          incomeData={[...mockIncomeData]}
          savingsData={[...mockSavingsData]}
        />,
      );

      // Should still be on spending tab
      expect(screen.getByTestId("spending-chart")).toBeInTheDocument();
      expect(screen.queryByTestId("net-worth-chart")).not.toBeInTheDocument();
    });
  });
});
