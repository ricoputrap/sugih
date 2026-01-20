import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { CategorySpendingAreaChart } from "./CategorySpendingAreaChart"

describe("CategorySpendingAreaChart", () => {
  const mockData = [
    {
      period: "2026-W01",
      categories: [
        { categoryId: "1", categoryName: "Food", amount: 150000 },
        { categoryId: "2", categoryName: "Transport", amount: 75000 },
        { categoryId: "3", categoryName: "Shopping", amount: 50000 },
      ],
    },
    {
      period: "2026-W02",
      categories: [
        { categoryId: "1", categoryName: "Food", amount: 200000 },
        { categoryId: "2", categoryName: "Transport", amount: 100000 },
        { categoryId: "3", categoryName: "Shopping", amount: 75000 },
      ],
    },
    {
      period: "2026-W03",
      categories: [
        { categoryId: "1", categoryName: "Food", amount: 180000 },
        { categoryId: "2", categoryName: "Transport", amount: 80000 },
        { categoryId: "3", categoryName: "Shopping", amount: 60000 },
      ],
    },
  ]

  describe("Rendering", () => {
    it("should render the chart title and description", () => {
      render(
        <CategorySpendingAreaChart
          data={mockData}
          title="Weekly Spending"
          description="Track your weekly spending by category"
        />,
      )

      expect(screen.getByText("Weekly Spending")).toBeInTheDocument()
      expect(screen.getByText("Track your weekly spending by category")).toBeInTheDocument()
    })

    it("should render chart areas for each category", () => {
      render(<CategorySpendingAreaChart data={mockData} />)

      expect(screen.getByText("Food")).toBeInTheDocument()
      expect(screen.getByText("Transport")).toBeInTheDocument()
      expect(screen.getByText("Shopping")).toBeInTheDocument()
    })

    it("should render period labels on x-axis", () => {
      render(<CategorySpendingAreaChart data={mockData} />)

      // Week labels should be formatted dates
      expect(screen.getByText(/[A-Z][a-z]{2} \d{1,2}/)).toBeInTheDocument()
    })

    it("should show tracking info at the bottom", () => {
      render(<CategorySpendingAreaChart data={mockData} />)

      expect(screen.getByText(/Tracking 3 categories over 3 weeks/)).toBeInTheDocument()
    })
  })

  describe("Loading State", () => {
    it("should show loading skeleton when isLoading is true", () => {
      render(<CategorySpendingAreaChart data={[]} isLoading />)

      expect(screen.getByRole("heading")).toBeInTheDocument()
      expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument()
    })
  })

  describe("Empty State", () => {
    it("should show empty state when no data is provided", () => {
      render(<CategorySpendingAreaChart data={[]} />)

      expect(screen.getByText("No category spending data available")).toBeInTheDocument()
      expect(
        screen.getByText("Start recording transactions with categories to see trends"),
      ).toBeInTheDocument()
    })

    it("should show empty state when data has no categories", () => {
      render(<CategorySpendingAreaChart data={[{ period: "2026-W01", categories: [] }]} />)

      expect(screen.getByText("No category spending data available")).toBeInTheDocument()
    })
  })

  describe("Limited Data Warning", () => {
    it("should show warning when less than 3 weeks of data", () => {
      const limitedData = [mockData[0], mockData[1]]
      render(<CategorySpendingAreaChart data={limitedData} />)

      expect(screen.getByText(/Limited data available/)).toBeInTheDocument()
    })

    it("should not show warning when 3 or more weeks of data", () => {
      render(<CategorySpendingAreaChart data={mockData} />)

      expect(screen.queryByText(/Limited data available/)).not.toBeInTheDocument()
    })
  })

  describe("Period Label Formatting", () => {
    it("should format ISO week labels correctly", () => {
      render(<CategorySpendingAreaChart data={mockData} />)

      // Should show dates like "Dec 29" for W01 2026
      expect(screen.getByText(/[A-Z][a-z]{2} \d{1,2}/)).toBeInTheDocument()
    })

    it("should handle different week formats", () => {
      const monthData = [
        {
          period: "2026-01",
          categories: [{ categoryId: "1", categoryName: "Food", amount: 500000 }],
        },
      ]
      render(<CategorySpendingAreaChart data={monthData} />)

      expect(screen.getByText("Jan 2026")).toBeInTheDocument()
    })
  })

  describe("Category Sorting", () => {
    it("should sort categories by total amount (highest first)", () => {
      render(<CategorySpendingAreaChart data={mockData} />)

      // Food has highest total, should appear first in legend
      const legendItems = screen.getAllByRole("listitem")
      expect(legendItems[0]).toHaveTextContent(/Food/)
    })
  })

  describe("Stacking", () => {
    it("should stack areas with stackId", () => {
      const { container } = render(<CategorySpendingAreaChart data={mockData} />)

      // Check that area elements have stackId="1"
      const areaElements = container.querySelectorAll('Area[stackId="1"]')
      expect(areaElements.length).toBeGreaterThan(0)
    })
  })
})
