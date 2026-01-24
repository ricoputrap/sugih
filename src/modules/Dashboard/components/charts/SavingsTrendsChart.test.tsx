/**
 * SavingsTrendsChart Component Tests
 *
 * Unit tests for the SavingsTrendsChart component.
 * Focuses on functionality: data shaping, empty states, loading states,
 * and prop handling rather than Recharts rendering internals.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { SavingsTrendsChart } from "./SavingsTrendsChart";
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

describe("SavingsTrendsChart", () => {
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
      savingsBalance: 700000,
      totalNetWorth: 1900000,
    },
    {
      period: "2024-03",
      walletBalance: 1400000,
      savingsBalance: 900000,
      totalNetWorth: 2300000,
    },
  ];

  describe("rendering", () => {
    it("should render the chart with default title and description", () => {
      render(<SavingsTrendsChart data={mockData} />);

      expect(screen.getByText("Savings Trends")).toBeInTheDocument();
      expect(
        screen.getByText("Your savings balance over time"),
      ).toBeInTheDocument();
    });

    it("should render custom title and description", () => {
      render(
        <SavingsTrendsChart
          data={mockData}
          title="Custom Savings Title"
          description="Custom Savings Description"
        />,
      );

      expect(screen.getByText("Custom Savings Title")).toBeInTheDocument();
      expect(
        screen.getByText("Custom Savings Description"),
      ).toBeInTheDocument();
    });

    it("should apply custom className to the card", () => {
      const { container } = render(
        <SavingsTrendsChart data={mockData} className="custom-savings-class" />,
      );

      const card = container.querySelector(".custom-savings-class");
      expect(card).toBeInTheDocument();
    });

    it("should display period count in footer", () => {
      render(<SavingsTrendsChart data={mockData} />);

      expect(screen.getByText(/3 periods/)).toBeInTheDocument();
    });

    it("should display current savings balance in footer", () => {
      render(<SavingsTrendsChart data={mockData} />);

      expect(screen.getByText(/Current:/)).toBeInTheDocument();
    });

    it("should display growth percentage when data has 2+ periods", () => {
      render(<SavingsTrendsChart data={mockData} />);

      // Growth from 500000 to 900000 = 80%
      expect(screen.getByText(/80\.0%/)).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show empty state when data is empty array", () => {
      render(<SavingsTrendsChart data={[]} />);

      expect(screen.getByText("No savings data available")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Start contributing to savings buckets to see your savings trends",
        ),
      ).toBeInTheDocument();
    });

    it("should show empty state when all savings values are zero", () => {
      const zeroData: NetWorthChartData[] = [
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
      ];

      render(<SavingsTrendsChart data={zeroData} />);

      expect(screen.getByText("No savings data available")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show loading skeleton when isLoading is true", () => {
      render(<SavingsTrendsChart data={mockData} isLoading={true} />);

      // Title and description should still be visible
      expect(screen.getByText("Savings Trends")).toBeInTheDocument();
      expect(
        screen.getByText("Your savings balance over time"),
      ).toBeInTheDocument();

      // Loading skeleton elements should be present
      const loadingElements = document.querySelectorAll(".animate-pulse");
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it("should not show chart content when loading", () => {
      render(<SavingsTrendsChart data={mockData} isLoading={true} />);

      // The chart container should not render the actual chart
      const rechartWrapper = document.querySelector(".recharts-wrapper");
      expect(rechartWrapper).not.toBeInTheDocument();
    });
  });

  describe("chart variant", () => {
    it("should default to line chart variant", () => {
      render(<SavingsTrendsChart data={mockData} />);

      // Component renders without error with default variant
      expect(screen.getByText("Savings Trends")).toBeInTheDocument();
    });

    it("should accept line variant prop", () => {
      render(<SavingsTrendsChart data={mockData} variant="line" />);

      expect(screen.getByText("Savings Trends")).toBeInTheDocument();
    });

    it("should accept area variant prop", () => {
      render(<SavingsTrendsChart data={mockData} variant="area" />);

      expect(screen.getByText("Savings Trends")).toBeInTheDocument();
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
          savingsBalance: 700000,
          totalNetWorth: 1900000,
        },
      ];

      render(<SavingsTrendsChart data={limitedData} />);

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

      render(<SavingsTrendsChart data={singleData} />);

      expect(screen.getByText(/1 period\)/)).toBeInTheDocument();
    });

    it("should not show warning when data has 3 or more periods", () => {
      render(<SavingsTrendsChart data={mockData} />);

      expect(
        screen.queryByText(/Limited data available/),
      ).not.toBeInTheDocument();
    });
  });

  describe("growth calculation", () => {
    it("should show positive growth percentage", () => {
      const growthData: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 500000,
          totalNetWorth: 1500000,
        },
        {
          period: "2024-02",
          walletBalance: 1200000,
          savingsBalance: 1000000,
          totalNetWorth: 2200000,
        },
        {
          period: "2024-03",
          walletBalance: 1400000,
          savingsBalance: 1500000,
          totalNetWorth: 2900000,
        },
      ];

      render(<SavingsTrendsChart data={growthData} />);

      // Growth from 500000 to 1500000 = 200%
      expect(screen.getByText(/200\.0%/)).toBeInTheDocument();
    });

    it("should show negative growth percentage", () => {
      const declineData: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 1000000,
          totalNetWorth: 2000000,
        },
        {
          period: "2024-02",
          walletBalance: 1200000,
          savingsBalance: 800000,
          totalNetWorth: 2000000,
        },
        {
          period: "2024-03",
          walletBalance: 1400000,
          savingsBalance: 500000,
          totalNetWorth: 1900000,
        },
      ];

      render(<SavingsTrendsChart data={declineData} />);

      // Growth from 1000000 to 500000 = -50%
      expect(screen.getByText(/-50\.0%/)).toBeInTheDocument();
    });

    it("should not show growth percentage when only 1 period", () => {
      const singleData: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 500000,
          totalNetWorth: 1500000,
        },
      ];

      render(<SavingsTrendsChart data={singleData} />);

      // Should not show percentage
      expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
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

      render(<SavingsTrendsChart data={monthlyData} />);
      expect(screen.getByText("Savings Trends")).toBeInTheDocument();
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
          savingsBalance: 520000,
          totalNetWorth: 1570000,
        },
        {
          period: "2024-01-17",
          walletBalance: 1100000,
          savingsBalance: 540000,
          totalNetWorth: 1640000,
        },
      ];

      render(<SavingsTrendsChart data={dailyData} />);
      expect(screen.getByText("Savings Trends")).toBeInTheDocument();
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

      render(<SavingsTrendsChart data={weeklyData} />);
      expect(screen.getByText("Savings Trends")).toBeInTheDocument();
    });
  });

  describe("data integrity", () => {
    it("should handle data with zero wallet balance but positive savings", () => {
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

      render(<SavingsTrendsChart data={savingsOnlyData} />);
      expect(screen.getByText("Savings Trends")).toBeInTheDocument();
    });

    it("should handle large savings values", () => {
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

      render(<SavingsTrendsChart data={largeData} />);
      expect(screen.getByText("Savings Trends")).toBeInTheDocument();
    });

    it("should handle fluctuating savings values", () => {
      const fluctuatingData: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 500000,
          totalNetWorth: 1500000,
        },
        {
          period: "2024-02",
          walletBalance: 1200000,
          savingsBalance: 300000,
          totalNetWorth: 1500000,
        },
        {
          period: "2024-03",
          walletBalance: 1400000,
          savingsBalance: 600000,
          totalNetWorth: 2000000,
        },
      ];

      render(<SavingsTrendsChart data={fluctuatingData} />);
      expect(screen.getByText("Savings Trends")).toBeInTheDocument();
    });

    it("should handle savings starting from zero", () => {
      const zeroStartData: NetWorthChartData[] = [
        {
          period: "2024-01",
          walletBalance: 1000000,
          savingsBalance: 0,
          totalNetWorth: 1000000,
        },
        {
          period: "2024-02",
          walletBalance: 1200000,
          savingsBalance: 200000,
          totalNetWorth: 1400000,
        },
        {
          period: "2024-03",
          walletBalance: 1400000,
          savingsBalance: 500000,
          totalNetWorth: 1900000,
        },
      ];

      render(<SavingsTrendsChart data={zeroStartData} />);
      expect(screen.getByText("Savings Trends")).toBeInTheDocument();
    });
  });
});
