import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BudgetCardGrid } from "./BudgetCardGrid";
import { BudgetWithCategory } from "../schema";

// Mock dependencies
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock window.confirm
global.confirm = vi.fn(() => true);

describe("BudgetCardGrid", () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createBudget = (
    overrides?: Partial<BudgetWithCategory>,
  ): BudgetWithCategory => ({
    id: "budget1",
    month: "2024-01-01",
    category_id: "cat1",
    category_name: "Food",
    amount_idr: 1000000,
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-01"),
    note: null,
    ...overrides,
  });

  describe("Rendering Cards", () => {
    it("should render budgets as cards", () => {
      const budgets = [
        createBudget({
          category_name: "Food",
        }),
        createBudget({
          id: "budget2",
          category_id: "cat2",
          category_name: "Transport",
        }),
      ];

      render(
        <BudgetCardGrid
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("Food")).toBeInTheDocument();
      expect(screen.getByText("Transport")).toBeInTheDocument();
    });

    it("should display budget amount on card", () => {
      const budgets = [
        createBudget({
          amount_idr: 2000000,
        }),
      ];

      render(
        <BudgetCardGrid
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText(/Rp 2\.000\.000/)).toBeInTheDocument();
    });

    it("should display note when present", () => {
      const budgets = [
        createBudget({
          note: "Monthly grocery budget",
        }),
      ];

      render(
        <BudgetCardGrid
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText(/Monthly grocery budget/)).toBeInTheDocument();
    });

    it("should not display note section when note is null", () => {
      const budgets = [
        createBudget({
          note: null,
        }),
      ];

      const { container } = render(
        <BudgetCardGrid
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      // Should not have note emoji
      expect(container.textContent).not.toContain("📝");
    });
  });

  describe("Empty State", () => {
    it("should display empty state message", () => {
      render(
        <BudgetCardGrid
          budgets={[]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("No budgets set")).toBeInTheDocument();
      expect(
        screen.getByText(
          /Get started by creating your first budget for a category/i,
        ),
      ).toBeInTheDocument();
    });

    it("should not display cards in empty state", () => {
      render(
        <BudgetCardGrid
          budgets={[]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      const cards = screen.queryAllByRole("button", { name: /open menu/i });
      expect(cards).toHaveLength(0);
    });
  });

  describe("Loading State", () => {
    it("should display loading skeleton", () => {
      render(
        <BudgetCardGrid
          budgets={[]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          isLoading={true}
        />,
      );

      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("should not display actual cards in loading state", () => {
      const budgets = [
        createBudget({
          category_name: "Food",
        }),
      ];

      render(
        <BudgetCardGrid
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          isLoading={true}
        />,
      );

      // Should display skeleton, not actual category name
      expect(screen.queryByText("Food")).not.toBeInTheDocument();
    });
  });

  describe("Summary Display", () => {
    it("should display total budget, spent, and remaining", () => {
      const budgets = [
        createBudget({
          amount_idr: 2000000,
        }),
      ];

      const summary = {
        totalBudget: 2000000,
        totalSpent: 1500000,
        remaining: 500000,
        items: [
          {
            categoryId: "cat1",
            categoryName: "Food",
            budgetAmount: 2000000,
            spentAmount: 1500000,
            remaining: 500000,
            percentUsed: 75,
          },
        ],
      };

      render(
        <BudgetCardGrid
          budgets={budgets}
          summary={summary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("Total Budget")).toBeInTheDocument();
      expect(screen.getByText("Total Spent")).toBeInTheDocument();
      expect(screen.getByText("Remaining")).toBeInTheDocument();
    });

    it("should display spent and remaining on card when summary available", () => {
      const budgets = [
        createBudget({
          amount_idr: 2000000,
        }),
      ];

      const summary = {
        totalBudget: 2000000,
        totalSpent: 1500000,
        remaining: 500000,
        items: [
          {
            categoryId: "cat1",
            categoryName: "Food",
            budgetAmount: 2000000,
            spentAmount: 1500000,
            remaining: 500000,
            percentUsed: 75,
          },
        ],
      };

      render(
        <BudgetCardGrid
          budgets={budgets}
          summary={summary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getAllByText(/Rp 1\.500\.000/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Rp 500\.000/)[0]).toBeInTheDocument();
    });

    it("should display progress bar with usage percentage", () => {
      const budgets = [
        createBudget({
          amount_idr: 2000000,
        }),
      ];

      const summary = {
        totalBudget: 2000000,
        totalSpent: 1500000,
        remaining: 500000,
        items: [
          {
            categoryId: "cat1",
            categoryName: "Food",
            budgetAmount: 2000000,
            spentAmount: 1500000,
            remaining: 500000,
            percentUsed: 75,
          },
        ],
      };

      render(
        <BudgetCardGrid
          budgets={budgets}
          summary={summary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("75.0%")).toBeInTheDocument();
      expect(screen.getByText("Usage")).toBeInTheDocument();
    });
  });

  describe("Status Badge Variants", () => {
    it("should display On Track badge", () => {
      const budgets = [
        createBudget({
          amount_idr: 2000000,
        }),
      ];

      const summary = {
        totalBudget: 2000000,
        totalSpent: 1000000,
        remaining: 1000000,
        items: [
          {
            categoryId: "cat1",
            categoryName: "Food",
            budgetAmount: 2000000,
            spentAmount: 1000000,
            remaining: 1000000,
            percentUsed: 50,
          },
        ],
      };

      render(
        <BudgetCardGrid
          budgets={budgets}
          summary={summary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("On Track")).toBeInTheDocument();
    });

    it("should display Near Limit badge for 80% usage", () => {
      const budgets = [
        createBudget({
          amount_idr: 2000000,
        }),
      ];

      const summary = {
        totalBudget: 2000000,
        totalSpent: 1600000,
        remaining: 400000,
        items: [
          {
            categoryId: "cat1",
            categoryName: "Food",
            budgetAmount: 2000000,
            spentAmount: 1600000,
            remaining: 400000,
            percentUsed: 80,
          },
        ],
      };

      render(
        <BudgetCardGrid
          budgets={budgets}
          summary={summary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("Near Limit")).toBeInTheDocument();
    });

    it("should display Over Budget badge when usage > 100%", () => {
      const budgets = [
        createBudget({
          amount_idr: 2000000,
        }),
      ];

      const summary = {
        totalBudget: 2000000,
        totalSpent: 2500000,
        remaining: -500000,
        items: [
          {
            categoryId: "cat1",
            categoryName: "Food",
            budgetAmount: 2000000,
            spentAmount: 2500000,
            remaining: -500000,
            percentUsed: 125,
          },
        ],
      };

      render(
        <BudgetCardGrid
          budgets={budgets}
          summary={summary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      // Get all "Over Budget" badges and filter for card badge
      const badges = screen.getAllByText("Over Budget");
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Edit and Delete Actions", () => {
    it("should call onEdit callback when edit is clicked", async () => {
      const user = userEvent.setup();
      const budgets = [
        createBudget({
          category_name: "Food",
        }),
      ];

      render(
        <BudgetCardGrid
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      const menuButton = screen.getByRole("button", { name: /open menu/i });
      await user.click(menuButton);

      const editButton = screen.getByRole("menuitem", { name: /edit budget/i });
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "budget1",
          category_name: "Food",
        }),
      );
    });

    it("should call onDelete callback when delete is clicked", async () => {
      const user = userEvent.setup();
      mockOnDelete.mockResolvedValue(undefined);

      const budgets = [
        createBudget({
          category_name: "Food",
        }),
      ];

      render(
        <BudgetCardGrid
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      const menuButton = screen.getByRole("button", { name: /open menu/i });
      await user.click(menuButton);

      const deleteButton = screen.getByRole("menuitem", {
        name: /delete budget/i,
      });
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith("budget1");
    });
  });

  describe("Grid Responsive Layout", () => {
    it("should use responsive grid classes", () => {
      const { container } = render(
        <BudgetCardGrid
          budgets={[createBudget()]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      const gridElement = container.querySelector(
        ".grid.gap-4",
      );
      expect(gridElement).toBeInTheDocument();
    });
  });

  describe("Card with No Summary Data", () => {
    it("should still display card without summary", () => {
      const budgets = [
        createBudget({
          amount_idr: 2000000,
        }),
      ];

      render(
        <BudgetCardGrid
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("Food")).toBeInTheDocument();
      expect(screen.getByText(/Rp 2\.000\.000/)).toBeInTheDocument();
    });

    it("should not display usage and status without summary", () => {
      const budgets = [
        createBudget({
          amount_idr: 2000000,
        }),
      ];

      render(
        <BudgetCardGrid
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.queryByText("Usage")).not.toBeInTheDocument();
      expect(screen.queryByText("On Track")).not.toBeInTheDocument();
    });
  });

  describe("Multiple Cards", () => {
    it("should render multiple cards correctly", () => {
      const budgets = [
        createBudget({
          id: "budget1",
          category_id: "cat1",
          category_name: "Food",
          amount_idr: 2000000,
        }),
        createBudget({
          id: "budget2",
          category_id: "cat2",
          category_name: "Transport",
          amount_idr: 1000000,
        }),
        createBudget({
          id: "budget3",
          category_id: "cat3",
          category_name: "Entertainment",
          amount_idr: 500000,
        }),
      ];

      render(
        <BudgetCardGrid
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("Food")).toBeInTheDocument();
      expect(screen.getByText("Transport")).toBeInTheDocument();
      expect(screen.getByText("Entertainment")).toBeInTheDocument();
    });

    it("should allow editing and deleting individual cards", async () => {
      const user = userEvent.setup();
      mockOnDelete.mockResolvedValue(undefined);

      const budgets = [
        createBudget({
          id: "budget1",
          category_id: "cat1",
          category_name: "Food",
        }),
        createBudget({
          id: "budget2",
          category_id: "cat2",
          category_name: "Transport",
        }),
      ];

      render(
        <BudgetCardGrid
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      const menuButtons = screen.getAllByRole("button", { name: /open menu/i });
      await user.click(menuButtons[0]);

      const editButton = screen.getByRole("menuitem", { name: /edit budget/i });
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "budget1",
          category_name: "Food",
        }),
      );
    });
  });
});
