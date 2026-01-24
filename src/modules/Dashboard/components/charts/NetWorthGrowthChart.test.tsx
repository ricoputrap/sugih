/**
 * NetWorthGrowthChart Component Tests
 *
 * Unit tests for the NetWorthGrowthChart component.
 * Focuses on functionality: data shaping, empty states, loading states,
 * and prop handling rather than Recharts rendering internals.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { NetWorthGrowthChart } from "./NetWorthGrowthChart";
import type { NetWorthChartData } from "../../schema";

// Mock ResizeObserver for Recharts
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeAll(() => {
  global.ResizeObserver =
    ResizeObserverMock as unknown as typeof ResizeObserver;
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe("NetWorthGrowthChart", () => {
  const mockData: NetWorthChartData[] = [
    {
      period: "2024-01",
      walletBalance: 1000000,
      savingsBalance: 500000,
      totalNetWorth: 1500000,
    },
    {
      period: "2024-02",
      walletBalance: 1200000,
      savingsBalance: 600000,
      totalNetWorth: 1800000,
    },
    {
      period: "2024-03",
      walletBalance: 1400000,
      savingsBalance: 700000,
      totalNetWorth: 2100000,
    },
  ];

  describe("rendering", () => {
    it("should render the chart with default title and description", () => {
      render(<NetWorthGrowthChart data={mockData} />);

      expect(screen.getByText("Net Worth Growth")).toBeInTheDocument();
      expect(
        screen.getByText("Your net worth progression over time"),
      ).toBeInTheDocument();
    });

    it("should render custom title and description", () => {
      render(
        <NetWorthGrowthChart
          data={mockData}
          title="Custom Title"
          description="Custom Description"
        />,
      );

      expect(screen.getByText("Custom Title")).toBeInTheDocument();
      expect(screen.getByText("Custom Description")).toBeInTheDocument();
    });

    it("should apply custom className to the card", () => {
      const { container } = render(
        <NetWorthGrowthChart data={mockData} className="custom-class" />,
      );

      const card = container.querySelector(".custom-class");
      expect(card).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show empty state when data is empty array", () => {
      render(<NetWorthGrowthChart data={[]} />);

      expect(
        screen.getByText("No net worth data available"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Start recording transactions to see your net worth trend",
        ),
      ).toBeInTheDocument();
    });

    it("should show empty state when all values are zero", () => {
      const zeroData: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 0,
          savingsBalance: 0,
          totalNetWorth: 0,
        },
        {
          period: "2024-02",
          walletBalance: 0,
          savingsBalance: 0,
          totalNetWorth: 0,
        },
      ];

      render(<NetWorthGrowthChart data={zeroData} />);

      expect(
        screen.getByText("No net worth data available"),
      ).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show loading skeleton when isLoading is true", () => {
      render(<NetWorthGrowthChart data={mockData} isLoading={true} />);

      // Title and description should still be visible
      expect(screen.getByText("Net Worth Growth")).toBeInTheDocument();
      expect(
        screen.getByText("Your net worth progression over time"),
      ).toBeInTheDocument();

      // Loading skeleton elements should be present
      const loadingElements = document.querySelectorAll(".animate-pulse");
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it("should not show chart content when loading", () => {
      render(<NetWorthGrowthChart data={mockData} isLoading={true} />);

      // The chart container should not render the actual chart
      const rechartWrapper = document.querySelector(".recharts-wrapper");
      expect(rechartWrapper).not.toBeInTheDocument();
    });
  });

  describe("chart variant", () => {
    it("should default to line chart variant", () => {
      render(<NetWorthGrowthChart data={mockData} />);

      // Component renders without error with default variant
      expect(screen.getByText("Net Worth Growth")).toBeInTheDocument();
    });

    it("should accept line variant prop", () => {
      render(<NetWorthGrowthChart data={mockData} variant="line" />);

      expect(screen.getByText("Net Worth Growth")).toBeInTheDocument();
    });

    it("should accept area variant prop", () => {
      render(<NetWorthGrowthChart data={mockData} variant="area" />);

      expect(screen.getByText("Net Worth Growth")).toBeInTheDocument();
    });
  });

  describe("limited data warning", () => {
    it("should show warning when data has fewer than 3 periods", () => {
      const limitedData: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 500000,
          totalNetWorth: 1500000,
        },
        {
          period: "2024-02",
          walletBalance: 1200000,
          savingsBalance: 600000,
          totalNetWorth: 1800000,
        },
      ];

      render(<NetWorthGrowthChart data={limitedData} />);

      expect(screen.getByText(/Limited data available/)).toBeInTheDocument();
      expect(screen.getByText(/\(2 periods\)/)).toBeInTheDocument();
    });

    it("should show singular period text for 1 period", () => {
      const singleData: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 500000,
          totalNetWorth: 1500000,
        },
      ];

      render(<NetWorthGrowthChart data={singleData} />);

      expect(screen.getByText(/1 period\)/)).toBeInTheDocument();
    });

    it("should not show warning when data has 3 or more periods", () => {
      render(<NetWorthGrowthChart data={mockData} />);

      expect(
        screen.queryByText(/Limited data available/),
      ).not.toBeInTheDocument();
    });
  });

  describe("period formatting", () => {
    it("should handle monthly period format (YYYY-MM)", () => {
      const monthlyData: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 500000,
          totalNetWorth: 1500000,
        },
        {
          period: "2024-02",
          walletBalance: 1200000,
          savingsBalance: 600000,
          totalNetWorth: 1800000,
        },
        {
          period: "2024-03",
          walletBalance: 1400000,
          savingsBalance: 700000,
          totalNetWorth: 2100000,
        },
      ];

      // Should render without error
      render(<NetWorthGrowthChart data={monthlyData} />);
      expect(screen.getByText("Net Worth Growth")).toBeInTheDocument();
    });

    it("should handle daily period format (YYYY-MM-DD)", () => {
      const dailyData: NetWorthChartData[] = [
        {
          period: "2024-01-15",
          walletBalance: 1000000,
          savingsBalance: 500000,
          totalNetWorth: 1500000,
        },
        {
          period: "2024-01-16",
          walletBalance: 1050000,
          savingsBalance: 510000,
          totalNetWorth: 1560000,
        },
        {
          period: "2024-01-17",
          walletBalance: 1100000,
          savingsBalance: 520000,
          totalNetWorth: 1620000,
        },
      ];

      render(<NetWorthGrowthChart data={dailyData} />);
      expect(screen.getByText("Net Worth Growth")).toBeInTheDocument();
    });

    it("should handle weekly period format (YYYY-Www)", () => {
      const weeklyData: NetWorthChartData[] = [
        {
          period: "2024-W01",
          walletBalance: 1000000,
          savingsBalance: 500000,
          totalNetWorth: 1500000,
        },
        {
          period: "2024-W02",
          walletBalance: 1100000,
          savingsBalance: 550000,
          totalNetWorth: 1650000,
        },
        {
          period: "2024-W03",
          walletBalance: 1200000,
          savingsBalance: 600000,
          totalNetWorth: 1800000,
        },
      ];

      render(<NetWorthGrowthChart data={weeklyData} />);
      expect(screen.getByText("Net Worth Growth")).toBeInTheDocument();
    });
  });

  describe("data integrity", () => {
    it("should handle data with only wallet balance", () => {
      const walletOnlyData: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 0,
          totalNetWorth: 1000000,
        },
        {
          period: "2024-02",
          walletBalance: 1200000,
          savingsBalance: 0,
          totalNetWorth: 1200000,
        },
        {
          period: "2024-03",
          walletBalance: 1400000,
          savingsBalance: 0,
          totalNetWorth: 1400000,
        },
      ];

      render(<NetWorthGrowthChart data={walletOnlyData} />);
      expect(screen.getByText("Net Worth Growth")).toBeInTheDocument();
    });

    it("should handle data with only savings balance", () => {
      const savingsOnlyData: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 0,
          savingsBalance: 500000,
          totalNetWorth: 500000,
        },
        {
          period: "2024-02",
          walletBalance: 0,
          savingsBalance: 600000,
          totalNetWorth: 600000,
        },
        {
          period: "2024-03",
          walletBalance: 0,
          savingsBalance: 700000,
          totalNetWorth: 700000,
        },
      ];

      render(<NetWorthGrowthChart data={savingsOnlyData} />);
      expect(screen.getByText("Net Worth Growth")).toBeInTheDocument();
    });

    it("should handle large values", () => {
      const largeData: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000000,
          savingsBalance: 500000000,
          totalNetWorth: 1500000000,
        },
        {
          period: "2024-02",
          walletBalance: 1200000000,
          savingsBalance: 600000000,
          totalNetWorth: 1800000000,
        },
        {
          period: "2024-03",
          walletBalance: 1400000000,
          savingsBalance: 700000000,
          totalNetWorth: 2100000000,
        },
      ];

      render(<NetWorthGrowthChart data={largeData} />);
      expect(screen.getByText("Net Worth Growth")).toBeInTheDocument();
    });
  });
});
