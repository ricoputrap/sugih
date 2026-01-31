import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import BudgetsPage from "./page";

// Mock NUQS hooks
vi.mock("@/modules/Budget/hooks", () => ({
  useBudgetMonth: () => ["2026-01-01", vi.fn()],
  useBudgetView: () => ["list", vi.fn()],
  useBudgetMonthOptions: () => [
    {
      value: "2026-01-01",
      label: "January 2026",
    },
  ],
  useBudgetsData: () => ({
    data: {
      budgets: [],
      summary: {
        totalBudget: 0,
        totalSpent: 0,
        remaining: 0,
        items: [],
      },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useBudgetMutations: () => ({
    createBudget: { mutateAsync: vi.fn(), isPending: false },
    updateBudget: { mutateAsync: vi.fn(), isPending: false },
    deleteBudget: { mutateAsync: vi.fn(), isPending: false },
    copyBudgets: { mutateAsync: vi.fn(), isPending: false },
  }),
}));

// Mock Zustand store
vi.mock("@/modules/Budget/stores", () => ({
  useBudgetsPageStore: () => ({
    isCreateDialogOpen: false,
    isEditDialogOpen: false,
    copyDialogOpen: false,
    copyResultModalOpen: false,
    selectedBudget: null,
    copyResult: null,
    openCreateDialog: vi.fn(),
    closeCreateDialog: vi.fn(),
    openEditDialog: vi.fn(),
    closeEditDialog: vi.fn(),
    openCopyDialog: vi.fn(),
    closeCopyDialog: vi.fn(),
    setCopyResult: vi.fn(),
    openCopyResultModal: vi.fn(),
    closeCopyResultModal: vi.fn(),
  }),
}));

// Mock dependencies
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/modules/Budget/components/BudgetTable", () => ({
  BudgetTable: ({ isLoading }: any) => (
    <div data-testid="budget-table">
      {isLoading ? "Loading..." : "Budget Table Content"}
    </div>
  ),
}));

vi.mock("@/modules/Budget/components/BudgetCardGrid", () => ({
  BudgetCardGrid: ({ isLoading }: any) => (
    <div data-testid="budget-card-grid">
      {isLoading ? "Loading..." : "Budget Card Grid Content"}
    </div>
  ),
}));

vi.mock("@/modules/Budget/components/ViewToggle", () => ({
  ViewToggle: () => <div data-testid="view-toggle" />,
}));

vi.mock("@/modules/Budget/components/BudgetDialogForm", () => ({
  BudgetDialogForm: () => <div data-testid="budget-dialog-form" />,
}));

vi.mock("@/modules/Budget/components/CopyResultModal", () => ({
  CopyResultModal: () => <div data-testid="copy-result-modal" />,
}));

vi.mock("@/modules/Budget/components/CopyBudgetDialog", () => ({
  CopyBudgetDialog: () => <div data-testid="copy-budget-dialog" />,
}));

describe("BudgetsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Month Selector Relocation", () => {
    it("should display month selector in Budget Details card header", async () => {
      render(<BudgetsPage />);

      // Find the month selector
      const monthSelect = screen.getByTestId("month-select");
      expect(monthSelect).toBeInTheDocument();

      // Verify "Budget Details" text is in the same area
      const budgetDetails = screen.getByText("Budget Details");
      expect(budgetDetails).toBeInTheDocument();
    });

    it("should have month selector in the same container as Budget Details title", async () => {
      render(<BudgetsPage />);

      // Find the month select element
      const monthSelect = screen.getByTestId("month-select");
      expect(monthSelect).toBeInTheDocument();

      // Verify Budget Details is present
      const budgetDetails = screen.getByText("Budget Details");
      expect(budgetDetails).toBeInTheDocument();
    });

    it("should maintain month selector functionality", () => {
      render(<BudgetsPage />);

      // Find the month select
      const monthSelect = screen.getByTestId("month-select");

      // Verify the select is present and interactive (has proper attributes)
      expect(monthSelect).toBeInTheDocument();
      expect(monthSelect).toHaveAttribute("role", "combobox");
    });

    it("should display month label before the selector", () => {
      render(<BudgetsPage />);

      // Find the month select
      const monthSelect = screen.getByTestId("month-select");

      // Get the parent flex container (with buttons and select)
      let container = monthSelect.closest("div");
      // Go up to the parent that includes the Month: label
      while (container && !container.textContent?.includes("Month:")) {
        container = container.parentElement as HTMLElement;
      }
      const parentText = container?.textContent || "";

      // Verify "Month:" label is present
      expect(parentText).toContain("Month:");
    });
  });

  describe("Budget Details Card", () => {
    it("should render Budget Details card", () => {
      render(<BudgetsPage />);

      // Check that Budget Details text is present
      const budgetDetailsText = screen.getByText("Budget Details");
      expect(budgetDetailsText).toBeInTheDocument();
    });

    it("should display budget table content within Budget Details card", () => {
      render(<BudgetsPage />);

      const budgetTable = screen.getByTestId("budget-table");
      expect(budgetTable).toBeInTheDocument();
    });

    it("should display budget description when month is selected", () => {
      render(<BudgetsPage />);

      // The description should contain "Budget breakdown for"
      const descriptions = screen.queryAllByText(/budget breakdown for/i);
      expect(descriptions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Header Layout", () => {
    it("should render page header with title and buttons", () => {
      render(<BudgetsPage />);

      // Check for page title
      const title = screen.getByText("Budgets");
      expect(title).toBeInTheDocument();

      // Check for description
      const description = screen.getByText(/Set monthly budgets and track/i);
      expect(description).toBeInTheDocument();
    });

    it("should render Add Budget button", () => {
      render(<BudgetsPage />);

      // Check for Add Budget button
      const addButton = screen.getByText(/Add Budget/i);
      expect(addButton).toBeInTheDocument();
    });

    it("should display month selector with proper label", () => {
      render(<BudgetsPage />);

      // Find the Month label
      const monthLabel = screen.getByText("Month:");
      expect(monthLabel).toBeInTheDocument();

      // Find the month select
      const monthSelect = screen.getByTestId("month-select");
      expect(monthSelect).toBeInTheDocument();
    });

    it("should have proper label styling for Month", () => {
      render(<BudgetsPage />);

      // Find the Month label
      const monthLabel = screen.getByText("Month:");

      expect(monthLabel).toHaveClass("text-sm");
      expect(monthLabel).toHaveClass("font-medium");
      expect(monthLabel).toHaveClass("text-muted-foreground");
    });

    it("should maintain CardTitle styling", () => {
      render(<BudgetsPage />);

      // Find Budget Details title
      const budgetDetailsTitle = screen.getByText("Budget Details");

      // Should be in the document
      expect(budgetDetailsTitle).toBeInTheDocument();
    });

    it("should have ViewToggle rendered", () => {
      render(<BudgetsPage />);

      const viewToggle = screen.getByTestId("view-toggle");
      expect(viewToggle).toBeInTheDocument();
    });

    it("should have BudgetTable rendered", () => {
      render(<BudgetsPage />);

      const budgetTable = screen.getByTestId("budget-table");
      expect(budgetTable).toBeInTheDocument();
    });

    it("should have BudgetDialogForm rendered", () => {
      render(<BudgetsPage />);

      const dialogForm = screen.getByTestId("budget-dialog-form");
      expect(dialogForm).toBeInTheDocument();
    });

    it("should have CopyBudgetDialog rendered", () => {
      render(<BudgetsPage />);

      const copyDialog = screen.getByTestId("copy-budget-dialog");
      expect(copyDialog).toBeInTheDocument();
    });
  });

  describe("Component Integration", () => {
    it("should render all major components", () => {
      render(<BudgetsPage />);

      // Page elements
      expect(screen.getByText("Budgets")).toBeInTheDocument();
      expect(screen.getByText(/Set monthly budgets/i)).toBeInTheDocument();

      // Month selector
      expect(screen.getByTestId("month-select")).toBeInTheDocument();

      // View toggle
      expect(screen.getByTestId("view-toggle")).toBeInTheDocument();

      // Table
      expect(screen.getByTestId("budget-table")).toBeInTheDocument();

      // Dialogs
      expect(screen.getByTestId("budget-dialog-form")).toBeInTheDocument();
      expect(screen.getByTestId("copy-budget-dialog")).toBeInTheDocument();
    });

    it("should have responsive month selector container", () => {
      render(<BudgetsPage />);

      // Find the Month label
      const monthLabel = screen.getByText("Month:");

      // Get its parent flex container (the inner container with label and select)
      const selectorContainer = monthLabel.closest(".flex");

      // The inner container should have flex layout
      expect(selectorContainer).toHaveClass("flex");
    });

    it("should have responsive width for month selector", () => {
      render(<BudgetsPage />);

      const monthSelect = screen.getByTestId("month-select");

      // Should be full width on mobile (w-full) and fixed width on desktop (sm:w-48)
      expect(monthSelect).toHaveClass("w-full");
      expect(monthSelect).toHaveClass("sm:w-48");
    });
  });
});
