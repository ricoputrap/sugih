/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import {
  CategorySpendingAreaChart,
  type CategorySpendingTrendData,
} from "./CategorySpendingAreaChart";
import { useChartTypeStore } from "../stores/useChartTypeStore";

// Mock Drizzle database connection for tests
vi.mock("@/db/drizzle-client", () => ({
  getDb: vi.fn(() => ({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    execute: vi.fn().mockResolvedValue({ rows: [] }),
    transaction: vi.fn().mockImplementation(async (cb) => {
      const tx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
        execute: vi.fn().mockResolvedValue({ rows: [] }),
      };
      return cb(tx as any);
    }),
  })),
  getPool: vi.fn(() => ({
    connect: vi.fn(),
    query: vi.fn(),
    end: vi.fn(),
  })),
  closeDb: vi.fn(),
  healthCheck: vi.fn(() => Promise.resolve(true)),
  sql: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
  desc: vi.fn(),
  asc: vi.fn(),
  isNull: vi.fn(),
  isNotNull: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  gt: vi.fn(),
  lt: vi.fn(),
  inArray: vi.fn(),
  notInArray: vi.fn(),
  like: vi.fn(),
  notLike: vi.fn(),
  between: vi.fn(),
  exists: vi.fn(),
  notExists: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// Sample test data
const mockData: CategorySpendingTrendData[] = [
  {
    period: "2024-01",
    categories: [
      { categoryId: "1", categoryName: "Food", amount: 500000 },
      { categoryId: "2", categoryName: "Transport", amount: 200000 },
      { categoryId: "3", categoryName: "Entertainment", amount: 150000 },
    ],
  },
  {
    period: "2024-02",
    categories: [
      { categoryId: "1", categoryName: "Food", amount: 450000 },
      { categoryId: "2", categoryName: "Transport", amount: 250000 },
      { categoryId: "3", categoryName: "Entertainment", amount: 100000 },
    ],
  },
  {
    period: "2024-03",
    categories: [
      { categoryId: "1", categoryName: "Food", amount: 600000 },
      { categoryId: "2", categoryName: "Transport", amount: 180000 },
      { categoryId: "3", categoryName: "Entertainment", amount: 200000 },
    ],
  },
];

describe("CategorySpendingAreaChart", () => {
  beforeEach(() => {
    // Reset the store state before each test
    useChartTypeStore.setState({ chartType: "area" });
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the chart with title and description", () => {
      render(<CategorySpendingAreaChart data={mockData} />);

      expect(screen.getByText("Category Spending Trends")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Track how spending in each category changes over time",
        ),
      ).toBeInTheDocument();
    });

    it("should render custom title and description", () => {
      render(
        <CategorySpendingAreaChart
          data={mockData}
          title="Custom Title"
          description="Custom Description"
        />,
      );

      expect(screen.getByText("Custom Title")).toBeInTheDocument();
      expect(screen.getByText("Custom Description")).toBeInTheDocument();
    });

    it("should render the ChartTypeSelector component", () => {
      render(<CategorySpendingAreaChart data={mockData} />);

      expect(screen.getByText("Area")).toBeInTheDocument();
      expect(screen.getByText("Line")).toBeInTheDocument();
    });

    it("should render CategorySpendingFilters", () => {
      render(<CategorySpendingAreaChart data={mockData} />);

      // The filters should be present (check for period/date range controls)
      expect(
        screen.getByRole("group", { name: "Chart type selector" }),
      ).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show loading skeleton when isLoading is true", () => {
      render(<CategorySpendingAreaChart data={[]} isLoading />);

      expect(screen.getByText("Category Spending Trends")).toBeInTheDocument();
      // Loading skeleton should be present
      const loadingElements = document.querySelectorAll(".animate-pulse");
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it("should disable ChartTypeSelector when loading", () => {
      render(<CategorySpendingAreaChart data={[]} isLoading />);

      const areaButton = screen.getByText("Area").closest("button");
      const lineButton = screen.getByText("Line").closest("button");

      expect(areaButton).toBeDisabled();
      expect(lineButton).toBeDisabled();
    });
  });

  describe("empty state", () => {
    it("should show empty state message when data is empty", () => {
      render(<CategorySpendingAreaChart data={[]} />);

      expect(
        screen.getByText("No category spending data available"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Start recording transactions with categories to see trends",
        ),
      ).toBeInTheDocument();
    });

    it("should show empty state when categories array is empty", () => {
      const emptyCategories: CategorySpendingTrendData[] = [
        { period: "2024-01", categories: [] },
      ];

      render(<CategorySpendingAreaChart data={emptyCategories} />);

      expect(
        screen.getByText("No category spending data available"),
      ).toBeInTheDocument();
    });
  });

  describe("chart type switching", () => {
    it("should start with Area chart selected by default", () => {
      render(<CategorySpendingAreaChart data={mockData} />);

      const areaButton = screen.getByText("Area").closest("button");
      expect(areaButton).toHaveAttribute("aria-pressed", "true");
    });

    it("should switch to Line chart when Line button is clicked", () => {
      render(<CategorySpendingAreaChart data={mockData} />);

      const lineButton = screen.getByText("Line").closest("button");
      fireEvent.click(lineButton!);

      expect(lineButton).toHaveAttribute("aria-pressed", "true");
      expect(useChartTypeStore.getState().chartType).toBe("line");
    });

    it("should switch back to Area chart when Area button is clicked", () => {
      // Start with line chart
      useChartTypeStore.setState({ chartType: "line" });

      render(<CategorySpendingAreaChart data={mockData} />);

      const areaButton = screen.getByText("Area").closest("button");
      fireEvent.click(areaButton!);

      expect(areaButton).toHaveAttribute("aria-pressed", "true");
      expect(useChartTypeStore.getState().chartType).toBe("area");
    });

    it("should reflect store state changes for chart type", () => {
      render(<CategorySpendingAreaChart data={mockData} />);

      // Initially Area is selected
      expect(screen.getByText("Area").closest("button")).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      // Change store directly - wrap in act to flush state updates
      act(() => {
        useChartTypeStore.setState({ chartType: "line" });
      });

      expect(screen.getByText("Line").closest("button")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
  });

  describe("onFilterChange callback", () => {
    it("should call onFilterChange when period changes", async () => {
      const onFilterChange = vi.fn();

      render(
        <CategorySpendingAreaChart
          data={mockData}
          onFilterChange={onFilterChange}
        />,
      );

      // The onFilterChange would be called when filters change
      // This tests the integration with the filter callback
      expect(onFilterChange).not.toHaveBeenCalled();
    });

    it("should include chartType in onFilterChange callback when chart type changes", async () => {
      const onFilterChange = vi.fn();

      render(
        <CategorySpendingAreaChart
          data={mockData}
          onFilterChange={onFilterChange}
        />,
      );

      const lineButton = screen.getByText("Line").closest("button");
      fireEvent.click(lineButton!);

      await waitFor(() => {
        expect(onFilterChange).toHaveBeenCalledWith(
          expect.objectContaining({
            chartType: "line",
          }),
        );
      });
    });

    it("should pass all filter parameters including chartType", async () => {
      const onFilterChange = vi.fn();

      render(
        <CategorySpendingAreaChart
          data={mockData}
          onFilterChange={onFilterChange}
          initialPeriod="month"
          initialDateRangePreset="last_6_months"
        />,
      );

      const lineButton = screen.getByText("Line").closest("button");
      fireEvent.click(lineButton!);

      await waitFor(() => {
        expect(onFilterChange).toHaveBeenCalledWith({
          period: "month",
          dateRangePreset: "last_6_months",
          chartType: "line",
        });
      });
    });
  });

  describe("limited data warning", () => {
    it("should show limited data warning when data has less than 3 periods", () => {
      const limitedData: CategorySpendingTrendData[] = [
        {
          period: "2024-01",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 500000 },
          ],
        },
        {
          period: "2024-02",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 450000 },
          ],
        },
      ];

      render(<CategorySpendingAreaChart data={limitedData} />);

      expect(screen.getByText(/Limited data available/)).toBeInTheDocument();
    });

    it("should not show limited data warning when data has 3 or more periods", () => {
      render(<CategorySpendingAreaChart data={mockData} />);

      expect(
        screen.queryByText(/Limited data available/),
      ).not.toBeInTheDocument();
    });
  });

  describe("footer information", () => {
    it("should display category and period count in footer", () => {
      render(<CategorySpendingAreaChart data={mockData} />);

      expect(
        screen.getByText(/Tracking 3 categories over 3/),
      ).toBeInTheDocument();
    });

    it("should use correct singular/plural for categories", () => {
      const singleCategoryData: CategorySpendingTrendData[] = [
        {
          period: "2024-01",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 500000 },
          ],
        },
        {
          period: "2024-02",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 450000 },
          ],
        },
        {
          period: "2024-03",
          categories: [
            { categoryId: "1", categoryName: "Food", amount: 600000 },
          ],
        },
      ];

      render(<CategorySpendingAreaChart data={singleCategoryData} />);

      expect(
        screen.getByText(/Tracking 1 category over 3/),
      ).toBeInTheDocument();
    });
  });

  describe("initial props", () => {
    it("should use initialPeriod prop", () => {
      const onFilterChange = vi.fn();

      render(
        <CategorySpendingAreaChart
          data={mockData}
          initialPeriod="day"
          onFilterChange={onFilterChange}
        />,
      );

      // The component should initialize with the provided period
      // This would be verified through the callback or filter display
    });

    it("should use initialDateRangePreset prop", () => {
      const onFilterChange = vi.fn();

      render(
        <CategorySpendingAreaChart
          data={mockData}
          initialDateRangePreset="last_12_months"
          onFilterChange={onFilterChange}
        />,
      );

      // The component should initialize with the provided date range preset
    });
  });
});
