/**
 * SpendingTrendsChart Component Tests
 *
 * Unit tests for the SpendingTrendsChart component.
 * Focuses on functionality: data shaping, empty states, loading states,
 * and prop handling rather than Recharts rendering internals.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpendingTrendsChart } from "./SpendingTrendsChart";
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

describe("SpendingTrendsChart", () => {
  const mockData: CategorySpendingTrendChartData[] = [
    {
      period: "2024-01",
      categories: [
        { categoryId: "1", categoryName: "Food", amount: 500000 },
        { categoryId: "2", categoryName: "Transport", amount: 300000 },
        { categoryId: "3", categoryName: "Entertainment", amount: 200000 },
      ],
    },
    {
      period: "2024-02",
      categories: [
        { categoryId: "1", categoryName: "Food", amount: 550000 },
        { categoryId: "2", categoryName: "Transport", amount: 320000 },
        { categoryId: "3", categoryName: "Entertainment", amount: 180000 },
      ],
    },
    {
      period: "2024-03",
      categories: [
        { categoryId: "1", categoryName: "Food", amount: 480000 },
        { categoryId: "2", categoryName: "Transport", amount: 350000 },
        { categoryId: "3", categoryName: "Entertainment", amount: 220000 },
      ],
    },
  ];

  describe("rendering", () => {
    it("should render the chart with default title and description", () => {
      render(<SpendingTrendsChart data={mockData} />);

      expect(screen.getByText("Spending Trends")).toBeInTheDocument();
      expect(
        screen.getByText("Your spending by category over time"),
      ).toBeInTheDocument();
    });

    it("should render custom title and description", () => {
      render(
        <SpendingTrendsChart
          data={mockData}
          title="Custom Spending Title"
          description="Custom Spending Description"
        />,
      );

      expect(screen.getByText("Custom Spending Title")).toBeInTheDocument();
      expect(
        screen.getByText("Custom Spending Description"),
      ).toBeInTheDocument();
    });

    it("should apply custom className to the card", () => {
      const { container } = render(
        <SpendingTrendsChart
          data={mockData}
          className="custom-spending-class"
        />,
      );

      const card = container.querySelector(".custom-spending-class");
      expect(card).toBeInTheDocument();
    });

    it("should display category and period count in footer", () => {
      render(<SpendingTrendsChart data={mockData} />);

      expect(screen.getByText(/Tracking 3 categories/)).toBeInTheDocument();
      expect(screen.getByText(/3 periods/)).toBeInTheDocument();
    });

    it("should display total spending in footer", () => {
      render(<SpendingTrendsChart data={mockData} />);

      // Total: 500000 + 300000 + 200000 + 550000 + 320000 + 180000 + 480000 + 350000 + 220000 = 3,100,000
      expect(screen.getByText(/Total:/)).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show empty state when data is empty array", () => {
      render(<SpendingTrendsChart data={[]} />);

      expect(
        screen.getByText("No spending data available"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Start recording expenses to see your spending trends",
        ),
      ).toBeInTheDocument();
    });

    it("should show empty state when all categories have zero amounts", () => {
      const zeroData: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 0 },
            { categoryId: "2", categoryName: "Transport", amount: 0 },
          ],
        },
        {
          period: "2024-02",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 0 },
            { categoryId: "2", categoryName: "Transport", amount: 0 },
          ],
        },
      ];

      render(<SpendingTrendsChart data={zeroData} />);

      expect(
        screen.getByText("No spending data available"),
      ).toBeInTheDocument();
    });

    it("should show empty state when categories array is empty in all periods", () => {
      const noCategoriesData: CategorySpendingTrendChartData[] = [
        { period: "2024-01", categories: [] },
        { period: "2024-02", categories: [] },
      ];

      render(<SpendingTrendsChart data={noCategoriesData} />);

      expect(
        screen.getByText("No spending data available"),
      ).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show loading skeleton when isLoading is true", () => {
      render(<SpendingTrendsChart data={mockData} isLoading={true} />);

      // Title and description should still be visible
      expect(screen.getByText("Spending Trends")).toBeInTheDocument();
      expect(
        screen.getByText("Your spending by category over time"),
      ).toBeInTheDocument();

      // Loading skeleton elements should be present
      const loadingElements = document.querySelectorAll(".animate-pulse");
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it("should not show chart content when loading", () => {
      render(<SpendingTrendsChart data={mockData} isLoading={true} />);

      // The chart container should not render the actual chart
      const rechartWrapper = document.querySelector(".recharts-wrapper");
      expect(rechartWrapper).not.toBeInTheDocument();
    });
  });

  describe("chart variant", () => {
    it("should default to line chart variant", () => {
      render(<SpendingTrendsChart data={mockData} />);

      // Component renders without error with default variant
      expect(screen.getByText("Spending Trends")).toBeInTheDocument();
    });

    it("should accept line variant prop", () => {
      render(<SpendingTrendsChart data={mockData} variant="line" />);

      expect(screen.getByText("Spending Trends")).toBeInTheDocument();
    });

    it("should accept area variant prop", () => {
      render(<SpendingTrendsChart data={mockData} variant="area" />);

      expect(screen.getByText("Spending Trends")).toBeInTheDocument();
    });
  });

  describe("maxCategories prop", () => {
    it("should limit categories to maxCategories value", () => {
      const manyCategories: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 500000 },
            { categoryId: "2", categoryName: "Transport", amount: 400000 },
            { categoryId: "3", categoryName: "Entertainment", amount: 300000 },
            { categoryId: "4", categoryName: "Shopping", amount: 250000 },
            { categoryId: "5", categoryName: "Utilities", amount: 200000 },
            { categoryId: "6", categoryName: "Health", amount: 150000 },
            { categoryId: "7", categoryName: "Education", amount: 100000 },
          ],
        },
        {
          period: "2024-02",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 520000 },
            { categoryId: "2", categoryName: "Transport", amount: 410000 },
            { categoryId: "3", categoryName: "Entertainment", amount: 310000 },
            { categoryId: "4", categoryName: "Shopping", amount: 260000 },
            { categoryId: "5", categoryName: "Utilities", amount: 210000 },
            { categoryId: "6", categoryName: "Health", amount: 160000 },
            { categoryId: "7", categoryName: "Education", amount: 110000 },
          ],
        },
        {
          period: "2024-03",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 540000 },
            { categoryId: "2", categoryName: "Transport", amount: 420000 },
            { categoryId: "3", categoryName: "Entertainment", amount: 320000 },
            { categoryId: "4", categoryName: "Shopping", amount: 270000 },
            { categoryId: "5", categoryName: "Utilities", amount: 220000 },
            { categoryId: "6", categoryName: "Health", amount: 170000 },
            { categoryId: "7", categoryName: "Education", amount: 120000 },
          ],
        },
      ];

      render(<SpendingTrendsChart data={manyCategories} maxCategories={3} />);

      // Should show only 3 categories
      expect(screen.getByText(/Tracking 3 categories/)).toBeInTheDocument();
    });

    it("should default to 5 max categories", () => {
      render(<SpendingTrendsChart data={mockData} />);

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
            { categoryId: "1", categoryName: "Food", amount: 500000 },
          ],
        },
        {
          period: "2024-02",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 550000 },
          ],
        },
      ];

      render(<SpendingTrendsChart data={limitedData} />);

      expect(screen.getByText(/Limited data available/)).toBeInTheDocument();
      expect(screen.getByText(/\(2 periods\)/)).toBeInTheDocument();
    });

    it("should show singular period text for 1 period", () => {
      const singleData: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 500000 },
          ],
        },
      ];

      render(<SpendingTrendsChart data={singleData} />);

      expect(screen.getByText(/1 period\)/)).toBeInTheDocument();
    });

    it("should not show warning when data has 3 or more periods", () => {
      render(<SpendingTrendsChart data={mockData} />);

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
            { categoryId: "1", categoryName: "Food", amount: 500000 },
          ],
        },
        {
          period: "2024-02",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 550000 },
          ],
        },
        {
          period: "2024-03",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 480000 },
          ],
        },
      ];

      render(<SpendingTrendsChart data={monthlyData} />);
      expect(screen.getByText("Spending Trends")).toBeInTheDocument();
    });

    it("should handle daily period format (YYYY-MM-DD)", () => {
      const dailyData: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01-15",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 50000 },
          ],
        },
        {
          period: "2024-01-16",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 55000 },
          ],
        },
        {
          period: "2024-01-17",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 48000 },
          ],
        },
      ];

      render(<SpendingTrendsChart data={dailyData} />);
      expect(screen.getByText("Spending Trends")).toBeInTheDocument();
    });

    it("should handle weekly period format (YYYY-Www)", () => {
      const weeklyData: CategorySpendingTrendChartData[] = [
        {
          period: "2024-W01",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 350000 },
          ],
        },
        {
          period: "2024-W02",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 380000 },
          ],
        },
        {
          period: "2024-W03",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 320000 },
          ],
        },
      ];

      render(<SpendingTrendsChart data={weeklyData} />);
      expect(screen.getByText("Spending Trends")).toBeInTheDocument();
    });
  });

  describe("data integrity", () => {
    it("should handle single category data", () => {
      const singleCategoryData: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 500000 },
          ],
        },
        {
          period: "2024-02",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 550000 },
          ],
        },
        {
          period: "2024-03",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 480000 },
          ],
        },
      ];

      render(<SpendingTrendsChart data={singleCategoryData} />);

      expect(screen.getByText("Spending Trends")).toBeInTheDocument();
      expect(screen.getByText(/Tracking 1 category/)).toBeInTheDocument();
    });

    it("should handle large spending values", () => {
      const largeData: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01",
          categories: [
            { categoryId: "1", categoryName: "Business", amount: 500000000 },
            { categoryId: "2", categoryName: "Operations", amount: 300000000 },
          ],
        },
        {
          period: "2024-02",
          categories: [
            { categoryId: "1", categoryName: "Business", amount: 550000000 },
            { categoryId: "2", categoryName: "Operations", amount: 320000000 },
          ],
        },
        {
          period: "2024-03",
          categories: [
            { categoryId: "1", categoryName: "Business", amount: 480000000 },
            { categoryId: "2", categoryName: "Operations", amount: 350000000 },
          ],
        },
      ];

      render(<SpendingTrendsChart data={largeData} />);
      expect(screen.getByText("Spending Trends")).toBeInTheDocument();
    });

    it("should handle mixed zero and non-zero amounts", () => {
      const mixedData: CategorySpendingTrendChartData[] = [
        {
          period: "2024-01",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 500000 },
            { categoryId: "2", categoryName: "Transport", amount: 0 },
          ],
        },
        {
          period: "2024-02",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 0 },
            { categoryId: "2", categoryName: "Transport", amount: 300000 },
          ],
        },
        {
          period: "2024-03",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 450000 },
            { categoryId: "2", categoryName: "Transport", amount: 280000 },
          ],
        },
      ];

      render(<SpendingTrendsChart data={mixedData} />);
      expect(screen.getByText("Spending Trends")).toBeInTheDocument();
    });
  });
});
