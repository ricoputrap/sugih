import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BudgetTable } from "./BudgetTable";
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

describe("BudgetTable", () => {
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
    savings_bucket_id: null,
    category_name: "Food",
    savings_bucket_name: null,
    target_type: "category",
    amount_idr: 1000000,
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-01"),
    note: null,
    ...overrides,
  });

  const createSavingsBucketBudget = (
    overrides?: Partial<BudgetWithCategory>,
  ): BudgetWithCategory => ({
    id: "bucket-budget1",
    month: "2024-01-01",
    category_id: null,
    savings_bucket_id: "bucket1",
    category_name: null,
    savings_bucket_name: "Emergency Fund",
    target_type: "savings_bucket",
    amount_idr: 500000,
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-01"),
    note: null,
    ...overrides,
  });

  describe("Note Display", () => {
    it("should display note text under category name when note exists", () => {
      const budgets = [
        createBudget({
          note: "Monthly grocery budget for family",
        }),
      ];

      render(
        <BudgetTable
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("Food")).toBeInTheDocument();
      expect(
        screen.getByText("Monthly grocery budget for family"),
      ).toBeInTheDocument();
    });

    it("should not display note text when note is null", () => {
      const budgets = [
        createBudget({
          note: null,
        }),
      ];

      render(
        <BudgetTable
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("Food")).toBeInTheDocument();

      // Should display placeholder for null note
      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("should not display note text when note is empty string", () => {
      const budgets = [
        createBudget({
          note: "",
        }),
      ];

      render(
        <BudgetTable
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("Food")).toBeInTheDocument();

      // Should display placeholder for empty note
      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("should display note with proper styling classes", () => {
      const budgets = [
        createBudget({
          note: "Test note",
        }),
      ];

      render(
        <BudgetTable
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      const noteElement = screen.getByText("Test note");
      expect(noteElement).toHaveClass("text-xs");
      expect(noteElement).toHaveClass("text-muted-foreground");
      expect(noteElement).toHaveClass("font-normal");
      expect(noteElement).toHaveClass("line-clamp-2");
    });

    it("should add title attribute for note hover tooltip", () => {
      const longNote =
        "This is a very long note that should be truncated in the display but still accessible via title attribute when hovering over it";

      const budgets = [
        createBudget({
          note: longNote,
        }),
      ];

      render(
        <BudgetTable
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      const noteElement = screen.getByText(longNote);
      expect(noteElement).toHaveAttribute("title", longNote);
    });

    it("should display multiple budgets with different note states", () => {
      const budgets = [
        createBudget({
          id: "budget1",
          category_id: "cat1",
          category_name: "Food",
          note: "Grocery shopping budget",
        }),
        createBudget({
          id: "budget2",
          category_id: "cat2",
          category_name: "Transport",
          note: null,
        }),
        createBudget({
          id: "budget3",
          category_id: "cat3",
          category_name: "Bills",
          note: "Apartment, Water, and Electricity",
        }),
      ];

      render(
        <BudgetTable
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      // Check all categories are displayed
      expect(screen.getByText("Food")).toBeInTheDocument();
      expect(screen.getByText("Transport")).toBeInTheDocument();
      expect(screen.getByText("Bills")).toBeInTheDocument();

      // Check notes are displayed correctly
      expect(screen.getByText("Grocery shopping budget")).toBeInTheDocument();
      expect(
        screen.getByText("Apartment, Water, and Electricity"),
      ).toBeInTheDocument();

      // Transport should have placeholder displayed
      const dashElements = screen.getAllByText("—");
      expect(dashElements.length).toBeGreaterThan(0);
    });
  });

  describe("Note Truncation", () => {
    it("should apply line-clamp-2 class for long notes", () => {
      const longNote = "A".repeat(200);
      const budgets = [
        createBudget({
          note: longNote,
        }),
      ];

      render(
        <BudgetTable
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      const noteElement = screen.getByText(longNote);
      expect(noteElement).toHaveClass("line-clamp-2");
    });
  });

  describe("Integration with Summary Data", () => {
    it("should display note alongside budget summary information", () => {
      const budgets = [
        createBudget({
          note: "January grocery budget",
          amount_idr: 2000000,
        }),
      ];

      const summary = {
        month: "2024-01-01",
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
        <BudgetTable
          budgets={budgets}
          summary={summary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      // Note should be displayed
      expect(screen.getByText("January grocery budget")).toBeInTheDocument();

      // Summary data should also be displayed
      expect(screen.getByText("Food")).toBeInTheDocument();
      expect(screen.getByText("75.0%")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("should not display notes in empty state message", () => {
      render(
        <BudgetTable
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
  });

  describe("Loading State", () => {
    it("should display loading skeleton without notes", () => {
      render(
        <BudgetTable
          budgets={[]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          isLoading={true}
        />,
      );

      // Loading skeleton should be displayed with animate-pulse classes
      const animatedElements = screen
        .getAllByText("", { selector: ".animate-pulse" })
        .filter((el) => el.className.includes("animate-pulse"));

      expect(animatedElements.length).toBeGreaterThan(0);
    });
  });

  describe("Edit and Delete Actions with Notes", () => {
    it("should pass budget with note to onEdit callback", async () => {
      const user = userEvent.setup();
      const budgets = [
        createBudget({
          note: "Budget note content",
        }),
      ];

      render(
        <BudgetTable
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      // Click dropdown menu
      const menuButton = screen.getByRole("button", { name: /open menu/i });
      await user.click(menuButton);

      // Click edit
      const editButton = screen.getByRole("menuitem", { name: /edit budget/i });
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "budget1",
          note: "Budget note content",
        }),
      );
    });

    it("should delete budget with note successfully", async () => {
      const user = userEvent.setup();
      mockOnDelete.mockResolvedValue(undefined);

      const budgets = [
        createBudget({
          note: "Budget to be deleted",
        }),
      ];

      render(
        <BudgetTable
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      // Click dropdown menu
      const menuButton = screen.getByRole("button", { name: /open menu/i });
      await user.click(menuButton);

      // Click delete
      const deleteButton = screen.getByRole("menuitem", {
        name: /delete budget/i,
      });
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith("budget1");
    });
  });

  describe("Savings Bucket Budgets Display", () => {
    it("should display savings bucket budget with piggy bank icon", () => {
      const budgets = [createSavingsBucketBudget()];

      render(
        <BudgetTable
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("Emergency Fund")).toBeInTheDocument();
      expect(screen.getByText("Savings")).toBeInTheDocument();
    });

    it("should display category budget with wallet icon", () => {
      const budgets = [createBudget()];

      render(
        <BudgetTable
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("Food")).toBeInTheDocument();
      // Should not have Savings badge
      expect(screen.queryByText("Savings")).not.toBeInTheDocument();
    });

    it("should display both category and savings bucket budgets together", () => {
      const budgets = [
        createBudget({
          id: "budget1",
          category_id: "cat1",
          category_name: "Food",
        }),
        createSavingsBucketBudget({
          id: "bucket-budget1",
          savings_bucket_id: "bucket1",
          savings_bucket_name: "Emergency Fund",
        }),
      ];

      render(
        <BudgetTable
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("Food")).toBeInTheDocument();
      expect(screen.getByText("Emergency Fund")).toBeInTheDocument();
      expect(screen.getByText("Savings")).toBeInTheDocument();
    });

    it("should display savings bucket budget with note", () => {
      const budgets = [
        createSavingsBucketBudget({
          note: "Monthly savings goal",
        }),
      ];

      render(
        <BudgetTable
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("Emergency Fund")).toBeInTheDocument();
      expect(screen.getByText("Monthly savings goal")).toBeInTheDocument();
    });

    it("should handle delete for savings bucket budget", async () => {
      const user = userEvent.setup();
      mockOnDelete.mockResolvedValue(undefined);

      const budgets = [createSavingsBucketBudget()];

      render(
        <BudgetTable
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      // Click dropdown menu
      const menuButton = screen.getByRole("button", { name: /open menu/i });
      await user.click(menuButton);

      // Click delete
      const deleteButton = screen.getByRole("menuitem", {
        name: /delete budget/i,
      });
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith("bucket-budget1");
    });

    it("should handle edit for savings bucket budget", async () => {
      const user = userEvent.setup();

      const budgets = [createSavingsBucketBudget()];

      render(
        <BudgetTable
          budgets={budgets}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      // Click dropdown menu
      const menuButton = screen.getByRole("button", { name: /open menu/i });
      await user.click(menuButton);

      // Click edit
      const editButton = screen.getByRole("menuitem", { name: /edit budget/i });
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "bucket-budget1",
          savings_bucket_id: "bucket1",
          target_type: "savings_bucket",
        }),
      );
    });

    it("should display summary data for savings bucket budgets", () => {
      const budgets = [createSavingsBucketBudget()];

      const summary = {
        month: "2024-01-01",
        totalBudget: 500000,
        totalSpent: 200000,
        remaining: 300000,
        items: [
          {
            categoryId: null,
            savingsBucketId: "bucket1",
            targetName: "Emergency Fund",
            targetType: "savings_bucket" as const,
            budgetAmount: 500000,
            spentAmount: 200000,
            remaining: 300000,
            percentUsed: 40,
          },
        ],
      };

      render(
        <BudgetTable
          budgets={budgets}
          summary={summary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("Emergency Fund")).toBeInTheDocument();
      expect(screen.getByText("40.0%")).toBeInTheDocument();
      expect(screen.getByText("On Track")).toBeInTheDocument();
    });
  });
});
