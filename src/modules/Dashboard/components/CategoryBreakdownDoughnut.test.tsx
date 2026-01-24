/**
 * @vitest-environment jsdom
 */

/**
 * CategoryBreakdownDoughnut Component Tests
 *
 * Tests for the category breakdown doughnut chart component with filters
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { CategoryBreakdownDoughnut } from "./CategoryBreakdownDoughnut";
import type { CategoryBreakdownData } from "../schema";

describe("CategoryBreakdownDoughnut", () => {
  const mockExpenseData: CategoryBreakdownData[] = [
    { categoryId: "1", categoryName: "Food", amount: 500000, percentage: 50 },
    {
      categoryId: "2",
      categoryName: "Transport",
      amount: 300000,
      percentage: 30,
    },
    {
      categoryId: "3",
      categoryName: "Entertainment",
      amount: 200000,
      percentage: 20,
    },
  ];

  const mockIncomeData: CategoryBreakdownData[] = [
    {
      categoryId: "4",
      categoryName: "Salary",
      amount: 5000000,
      percentage: 80,
    },
    {
      categoryId: "5",
      categoryName: "Freelance",
      amount: 1250000,
      percentage: 20,
    },
  ];

  describe("rendering", () => {
    it("should render with expense data by default", () => {
      render(<CategoryBreakdownDoughnut expenseData={mockExpenseData} />);

      expect(screen.getByText("Category Breakdown")).toBeInTheDocument();
      expect(screen.getByText("Total Expenses")).toBeInTheDocument();
    });

    it("should render with income data when categoryType is income", () => {
      render(
        <CategoryBreakdownDoughnut
          incomeData={mockIncomeData}
          categoryType="income"
        />,
      );

      expect(screen.getByText("Category Breakdown")).toBeInTheDocument();
      expect(screen.getByText("Total Income")).toBeInTheDocument();
    });

    it("should display total amount", () => {
      render(<CategoryBreakdownDoughnut expenseData={mockExpenseData} />);

      // Total should be 500000 + 300000 + 200000 = 1000000
      expect(screen.getByText(/Rp1\.000\.000/)).toBeInTheDocument();
    });

    it("should render filters in header", () => {
      render(<CategoryBreakdownDoughnut expenseData={mockExpenseData} />);

      // Check for category type selector
      expect(screen.getByLabelText("Select category type")).toBeInTheDocument();

      // Check for date range selector
      expect(screen.getByLabelText("Select date range")).toBeInTheDocument();
    });
  });

  describe("empty states", () => {
    it("should show empty state when no data", () => {
      render(<CategoryBreakdownDoughnut expenseData={[]} />);

      expect(
        screen.getByText("No expense data for selected period"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Try selecting a different date range"),
      ).toBeInTheDocument();
    });

    it("should show empty state for income when no income data", () => {
      render(
        <CategoryBreakdownDoughnut incomeData={[]} categoryType="income" />,
      );

      expect(
        screen.getByText("No income data for selected period"),
      ).toBeInTheDocument();
    });

    it("should show loading state when isLoading is true", () => {
      render(
        <CategoryBreakdownDoughnut
          expenseData={mockExpenseData}
          isLoading={true}
        />,
      );

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("category type toggle", () => {
    it("should call onCategoryTypeChange when category type is changed", async () => {
      const user = userEvent.setup();
      const onCategoryTypeChange = vi.fn();

      render(
        <CategoryBreakdownDoughnut
          expenseData={mockExpenseData}
          incomeData={mockIncomeData}
          categoryType="expense"
          onCategoryTypeChange={onCategoryTypeChange}
        />,
      );

      const categoryTypeSelector = screen.getByLabelText(
        "Select category type",
      );
      await user.click(categoryTypeSelector);

      const incomeOption = screen.getByRole("option", { name: "Income" });
      await user.click(incomeOption);

      expect(onCategoryTypeChange).toHaveBeenCalledWith("income");
    });

    it("should disable category type selector when loading", () => {
      render(
        <CategoryBreakdownDoughnut
          expenseData={mockExpenseData}
          isLoading={true}
        />,
      );

      const categoryTypeSelector = screen.getByLabelText(
        "Select category type",
      );
      expect(categoryTypeSelector).toBeDisabled();
    });
  });

  describe("date range preset selector", () => {
    it("should call onDateRangePresetChange when date range is changed", async () => {
      const user = userEvent.setup();
      const onDateRangePresetChange = vi.fn();

      render(
        <CategoryBreakdownDoughnut
          expenseData={mockExpenseData}
          dateRangePreset="this_month"
          onDateRangePresetChange={onDateRangePresetChange}
        />,
      );

      const dateRangeSelector = screen.getByLabelText("Select date range");
      await user.click(dateRangeSelector);

      const lastMonthOption = screen.getByRole("option", {
        name: "Last Month",
      });
      await user.click(lastMonthOption);

      expect(onDateRangePresetChange).toHaveBeenCalledWith("last_month");
    });

    it("should disable date range selector when loading", () => {
      render(
        <CategoryBreakdownDoughnut
          expenseData={mockExpenseData}
          isLoading={true}
        />,
      );

      const dateRangeSelector = screen.getByLabelText("Select date range");
      expect(dateRangeSelector).toBeDisabled();
    });

    it("should render all date range preset options", async () => {
      const user = userEvent.setup();

      render(<CategoryBreakdownDoughnut expenseData={mockExpenseData} />);

      const dateRangeSelector = screen.getByLabelText("Select date range");
      await user.click(dateRangeSelector);

      expect(
        screen.getByRole("option", { name: "Last Week" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "This Month" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Last Month" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Last 3 Months" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Last 6 Months" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "This Year" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Last Year" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "All Time" }),
      ).toBeInTheDocument();
    });
  });

  describe("data preparation", () => {
    it("should handle undefined expense data", () => {
      render(<CategoryBreakdownDoughnut categoryType="expense" />);

      expect(
        screen.getByText("No expense data for selected period"),
      ).toBeInTheDocument();
    });

    it("should handle undefined income data", () => {
      render(<CategoryBreakdownDoughnut categoryType="income" />);

      expect(
        screen.getByText("No income data for selected period"),
      ).toBeInTheDocument();
    });

    it("should filter out zero amounts from data", () => {
      const dataWithZeros: CategoryBreakdownData[] = [
        {
          categoryId: "1",
          categoryName: "Food",
          amount: 500000,
          percentage: 100,
        },
        {
          categoryId: "2",
          categoryName: "Transport",
          amount: 0,
          percentage: 0,
        },
      ];

      render(<CategoryBreakdownDoughnut expenseData={dataWithZeros} />);

      // Total should only include Food (500000)
      expect(screen.getByText(/Rp500\.000/)).toBeInTheDocument();
    });

    it("should group small categories when maxCategories is exceeded", () => {
      const manyCategories: CategoryBreakdownData[] = Array.from(
        { length: 10 },
        (_, i) => ({
          categoryId: String(i),
          categoryName: `Category ${i}`,
          amount: (10 - i) * 100000,
          percentage: 10,
        }),
      );

      render(
        <CategoryBreakdownDoughnut
          expenseData={manyCategories}
          maxCategories={5}
        />,
      );

      // Should have 5 categories + Other group
      // Total = (10+9+8+7+6+5+4+3+2+1) * 100000 = 5500000
      expect(screen.getByText(/Rp5\.500\.000/)).toBeInTheDocument();
    });
  });

  describe("switching between expense and income", () => {
    it("should display correct data when switching from expense to income", () => {
      const { rerender } = render(
        <CategoryBreakdownDoughnut
          expenseData={mockExpenseData}
          incomeData={mockIncomeData}
          categoryType="expense"
        />,
      );

      expect(screen.getByText("Total Expenses")).toBeInTheDocument();
      expect(screen.getByText(/Rp1\.000\.000/)).toBeInTheDocument();

      rerender(
        <CategoryBreakdownDoughnut
          expenseData={mockExpenseData}
          incomeData={mockIncomeData}
          categoryType="income"
        />,
      );

      expect(screen.getByText("Total Income")).toBeInTheDocument();
      // Income total: 5000000 + 1250000 = 6250000
      expect(screen.getByText(/Rp6\.250\.000/)).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have accessible labels for selectors", () => {
      render(<CategoryBreakdownDoughnut expenseData={mockExpenseData} />);

      expect(screen.getByLabelText("Select category type")).toBeInTheDocument();
      expect(screen.getByLabelText("Select date range")).toBeInTheDocument();
    });
  });
});
