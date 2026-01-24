/**
 * IncomeTrendsChart Component Tests
 *
 * Unit tests for the IncomeTrendsChart component.
 * Focuses on functionality: data shaping, empty states, loading states,
 * and prop handling rather than Recharts rendering internals.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { IncomeTrendsChart } from "./IncomeTrendsChart";
import type { CategorySpendingTrendChartData } from "../../schema";

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

describe("IncomeTrendsChart", () => {
  const mockData: CategorySpendingTrendChartData[] = [
    {
      period: "2024-01",
      categories: [
        { categoryId: "1", categoryName: "Salary", amount: 10000000 },
        { categoryId: "2", categoryName: "Freelance", amount: 2000000 },
        { categoryId: "3", categoryName: "Investment", amount: 500000 },
      ],
    },
    {
      period: "2024-02",
      categories: [
        { categoryId: "1", categoryName: "Salary", amount: 10000000 },
        { categoryId: "2", categoryName: "Freelance", amount: 2500000 },
        { categoryId: "3", categoryName: "Investment", amount: 600000 },
      ],
    },
    {
      period: "2024-03",
      categories: [
        { categoryId: "1", categoryName: "Salary", amount: 10500000 },
        { categoryId: "2", categoryName: "Freelance", amount: 1800000 },
        { categoryId: "3", categoryName: "Investment", amount: 750000 },
      ],
    },
  ];

  describe("rendering", () => {
    it("should render the chart with default title and description", () => {
      render(<IncomeTrendsChart data={mockData} />);

      expect(screen.getByText("Income Trends")).toBeInTheDocument();
      expect(
        screen.getByText("Your income by category over time"),
      ).toBeInTheDocument();
    });

    it("should render custom title and description", () => {
      render(
        <IncomeTrendsChart
          data={mockData}
          title="Custom Income Title"
          description="Custom Income Description"
        />,
      );

      expect(screen.getByText("Custom Income Title")).toBeInTheDocument();
      expect(screen.getByText("Custom Income Description")).toBeInTheDocument();
    });

    it("should apply custom className to the card", () => {
      const { container } = render(
        <IncomeTrendsChart data={mockData} className="custom-income-class" />,
      );

      const card = container.querySelector(".custom-income-class");
      expect(card).toBeInTheDocument();
    });

    it("should display category and period count in footer", () => {
      render(<IncomeTrendsChart data={mockData} />);

      expect(screen.getByText(/Tracking 3 categories/)).toBeInTheDocument();
      expect(screen.getByText(/3 periods/)).toBeInTheDocument();
    });

    it("should display total income in footer", () => {
      render(<IncomeTrendsChart data={mockData} />);

      // Total income should be displayed
      expect(screen.getByText(/Total:/)).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show empty state when data is empty array", () => {
      render(<IncomeTrendsChart data={[]} />);

      expect(screen.getByText("No income data available")).toBeInTheDocument();
      expect(
        screen.getByText("Start recording income to see your income trends"),
      ).toBeInTheDocument();
    });

    it("should show empty state when all categories have zero amounts", () => {
      const zeroData: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01",
          categories: [
            { categoryId: "1", categoryName: "Salary", amount: 0 },
            { categoryId: "2", categoryName: "Freelance", amount: 0 },
          ],
        },
        {
          period: "2024-02",
          categories: [
            { categoryId: "1", categoryName: "Salary", amount: 0 },
            { categoryId: "2", categoryName: "Freelance", amount: 0 },
          ],
        },
      ];

      render(<IncomeTrendsChart data={zeroData} />);

      expect(screen.getByText("No income data available")).toBeInTheDocument();
    });

    it("should show empty state when categories array is empty in all periods", () => {
      const noCategoriesData: CategorySpendingTrendChartData[] = [
        { period: "2024-01", categories: [] },
        { period: "2024-02", categories: [] },
      ];

      render(<IncomeTrendsChart data={noCategoriesData} />);

      expect(screen.getByText("No income data available")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show loading skeleton when isLoading is true", () => {
      render(<IncomeTrendsChart data={mockData} isLoading={true} />);

      // Title and description should still be visible
      expect(screen.getByText("Income Trends")).toBeInTheDocument();
      expect(
        screen.getByText("Your income by category over time"),
      ).toBeInTheDocument();

      // Loading skeleton elements should be present
      const loadingElements = document.querySelectorAll(".animate-pulse");
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it("should not show chart content when loading", () => {
      render(<IncomeTrendsChart data={mockData} isLoading={true} />);

      // The chart container should not render the actual chart
      const rechartWrapper = document.querySelector(".recharts-wrapper");
      expect(rechartWrapper).not.toBeInTheDocument();
    });
  });

  describe("chart variant", () => {
    it("should default to line chart variant", () => {
      render(<IncomeTrendsChart data={mockData} />);

      // Component renders without error with default variant
      expect(screen.getByText("Income Trends")).toBeInTheDocument();
    });

    it("should accept line variant prop", () => {
      render(<IncomeTrendsChart data={mockData} variant="line" />);

      expect(screen.getByText("Income Trends")).toBeInTheDocument();
    });

    it("should accept area variant prop", () => {
      render(<IncomeTrendsChart data={mockData} variant="area" />);

      expect(screen.getByText("Income Trends")).toBeInTheDocument();
    });
  });

  describe("maxCategories prop", () => {
    it("should limit categories to maxCategories value", () => {
      const manyCategories: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01",
          categories: [
            { categoryId: "1", categoryName: "Salary", amount: 10000000 },
            { categoryId: "2", categoryName: "Freelance", amount: 2000000 },
            { categoryId: "3", categoryName: "Investment", amount: 1500000 },
            { categoryId: "4", categoryName: "Bonus", amount: 1000000 },
            { categoryId: "5", categoryName: "Rental", amount: 800000 },
            { categoryId: "6", categoryName: "Dividends", amount: 500000 },
            { categoryId: "7", categoryName: "Other", amount: 200000 },
          ],
        },
        {
          period: "2024-02",
          categories: [
            { categoryId: "1", categoryName: "Salary", amount: 10000000 },
            { categoryId: "2", categoryName: "Freelance", amount: 2100000 },
            { categoryId: "3", categoryName: "Investment", amount: 1600000 },
            { categoryId: "4", categoryName: "Bonus", amount: 0 },
            { categoryId: "5", categoryName: "Rental", amount: 800000 },
            { categoryId: "6", categoryName: "Dividends", amount: 550000 },
            { categoryId: "7", categoryName: "Other", amount: 250000 },
          ],
        },
        {
          period: "2024-03",
          categories: [
            { categoryId: "1", categoryName: "Salary", amount: 10500000 },
            { categoryId: "2", categoryName: "Freelance", amount: 1900000 },
            { categoryId: "3", categoryName: "Investment", amount: 1700000 },
            { categoryId: "4", categoryName: "Bonus", amount: 500000 },
            { categoryId: "5", categoryName: "Rental", amount: 800000 },
            { categoryId: "6", categoryName: "Dividends", amount: 600000 },
            { categoryId: "7", categoryName: "Other", amount: 300000 },
          ],
        },
      ];

      render(<IncomeTrendsChart data={manyCategories} maxCategories={3} />);

      // Should show only 3 categories
      expect(screen.getByText(/Tracking 3 categories/)).toBeInTheDocument();
    });

    it("should default to 5 max categories", () => {
      render(<IncomeTrendsChart data={mockData} />);

      // With 3 categories in mock data, all should be shown
      expect(screen.getByText(/Tracking 3 categories/)).toBeInTheDocument();
    });
  });

  describe("limited data warning", () => {
    it("should show warning when data has fewer than 3 periods", () => {
      const limitedData: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01",
          categories: [
            { categoryId: "1", categoryName: "Salary", amount: 10000000 },
          ],
        },
        {
          period: "2024-02",
          categories: [
            { categoryId: "1", categoryName: "Salary", amount: 10500000 },
          ],
        },
      ];

      render(<IncomeTrendsChart data={limitedData} />);

      expect(screen.getByText(/Limited data available/)).toBeInTheDocument();
      expect(screen.getByText(/\(2 periods\)/)).toBeInTheDocument();
    });

    it("should show singular period text for 1 period", () => {
      const singleData: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01",
          categories: [
            { categoryId: "1", categoryName: "Salary", amount: 10000000 },
          ],
        },
      ];

      render(<IncomeTrendsChart data={singleData} />);

      expect(screen.getByText(/1 period\)/)).toBeInTheDocument();
    });

    it("should not show warning when data has 3 or more periods", () => {
      render(<IncomeTrendsChart data={mockData} />);

      expect(
        screen.queryByText(/Limited data available/),
      ).not.toBeInTheDocument();
    });
  });

  describe("period formatting", () => {
    it("should handle monthly period format (YYYY-MM)", () => {
      const monthlyData: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01",
          categories: [
            { categoryId: "1", categoryName: "Salary", amount: 10000000 },
          ],
        },
        {
          period: "2024-02",
          categories: [
            { categoryId: "1", categoryName: "Salary", amount: 10000000 },
          ],
        },
        {
          period: "2024-03",
          categories: [
            { categoryId: "1", categoryName: "Salary", amount: 10500000 },
          ],
        },
      ];

      render(<IncomeTrendsChart data={monthlyData} />);
      expect(screen.getByText("Income Trends")).toBeInTheDocument();
    });

    it("should handle daily period format (YYYY-MM-DD)", () => {
      const dailyData: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01-15",
          categories: [
            { categoryId: "1", categoryName: "Freelance", amount: 500000 },
          ],
        },
        {
          period: "2024-01-16",
          categories: [
            { categoryId: "1", categoryName: "Freelance", amount: 750000 },
          ],
        },
        {
          period: "2024-01-17",
          categories: [
            { categoryId: "1", categoryName: "Freelance", amount: 600000 },
          ],
        },
      ];

      render(<IncomeTrendsChart data={dailyData} />);
      expect(screen.getByText("Income Trends")).toBeInTheDocument();
    });

    it("should handle weekly period format (YYYY-Www)", () => {
      const weeklyData: CategorySpendingTrendChartData[] = [
        {
          period: "2024-W01",
          categories: [
            { categoryId: "1", categoryName: "Salary", amount: 2500000 },
          ],
        },
        {
          period: "2024-W02",
          categories: [
            { categoryId: "1", categoryName: "Salary", amount: 2500000 },
          ],
        },
        {
          period: "2024-W03",
          categories: [
            { categoryId: "1", categoryName: "Salary", amount: 2500000 },
          ],
        },
      ];

      render(<IncomeTrendsChart data={weeklyData} />);
      expect(screen.getByText("Income Trends")).toBeInTheDocument();
    });
  });

  describe("data integrity", () => {
    it("should handle single category data", () => {
      const singleCategoryData: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01",
          categories: [
            { categoryId: "1", categoryName: "Salary", amount: 10000000 },
          ],
        },
        {
          period: "2024-02",
          categories: [
            { categoryId: "1", categoryName: "Salary", amount: 10000000 },
          ],
        },
        {
          period: "2024-03",
          categories: [
            { categoryId: "1", categoryName: "Salary", amount: 10500000 },
          ],
        },
      ];

      render(<IncomeTrendsChart data={singleCategoryData} />);

      expect(screen.getByText("Income Trends")).toBeInTheDocument();
      expect(screen.getByText(/Tracking 1 category/)).toBeInTheDocument();
    });

    it("should handle large income values", () => {
      const largeData: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01",
          categories: [
            {
              categoryId: "1",
              categoryName: "Business Revenue",
              amount: 1000000000,
            },
            { categoryId: "2", categoryName: "Investments", amount: 500000000 },
          ],
        },
        {
          period: "2024-02",
          categories: [
            {
              categoryId: "1",
              categoryName: "Business Revenue",
              amount: 1100000000,
            },
            { categoryId: "2", categoryName: "Investments", amount: 550000000 },
          ],
        },
        {
          period: "2024-03",
          categories: [
            {
              categoryId: "1",
              categoryName: "Business Revenue",
              amount: 1200000000,
            },
            { categoryId: "2", categoryName: "Investments", amount: 600000000 },
          ],
        },
      ];

      render(<IncomeTrendsChart data={largeData} />);
      expect(screen.getByText("Income Trends")).toBeInTheDocument();
    });

    it("should handle mixed zero and non-zero amounts", () => {
      const mixedData: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01",
          categories: [
            { categoryId: "1", categoryName: "Salary", amount: 10000000 },
            { categoryId: "2", categoryName: "Bonus", amount: 0 },
          ],
        },
        {
          period: "2024-02",
          categories: [
            { categoryId: "1", categoryName: "Salary", amount: 10000000 },
            { categoryId: "2", categoryName: "Bonus", amount: 5000000 },
          ],
        },
        {
          period: "2024-03",
          categories: [
            { categoryId: "1", categoryName: "Salary", amount: 10500000 },
            { categoryId: "2", categoryName: "Bonus", amount: 0 },
          ],
        },
      ];

      render(<IncomeTrendsChart data={mixedData} />);
      expect(screen.getByText("Income Trends")).toBeInTheDocument();
    });

    it("should handle irregular income patterns", () => {
      const irregularData: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01",
          categories: [
            { categoryId: "1", categoryName: "Freelance", amount: 2000000 },
          ],
        },
        {
          period: "2024-02",
          categories: [
            { categoryId: "1", categoryName: "Freelance", amount: 0 },
          ],
        },
        {
          period: "2024-03",
          categories: [
            { categoryId: "1", categoryName: "Freelance", amount: 5000000 },
          ],
        },
      ];

      render(<IncomeTrendsChart data={irregularData} />);
      expect(screen.getByText("Income Trends")).toBeInTheDocument();
    });
  });
});
