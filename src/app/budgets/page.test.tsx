import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import BudgetsPage from "./page";

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

vi.mock("@/modules/Budget/components/BudgetDialogForm", () => ({
  BudgetDialogForm: () => <div data-testid="budget-dialog-form" />,
}));

vi.mock("@/modules/Budget/components/CopyResultModal", () => ({
  CopyResultModal: () => <div data-testid="copy-result-modal" />,
}));

// Mock fetch globally
global.fetch = vi.fn();

describe("BudgetsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  describe("Month Selector Relocation", () => {
    it("should display month selector in Budget Details card header", async () => {
      render(<BudgetsPage />);

      // Wait for the component to load
      await screen.findByTestId("budget-table");

      // Find the month selector
      const monthSelect = screen.getByTestId("month-select");
      expect(monthSelect).toBeInTheDocument();

      // Get the parent card header container (flex that contains title and selector)
      const cardHeader = monthSelect.closest("[data-slot='card-header']");
      expect(cardHeader).toBeInTheDocument();

      // Verify "Budget Details" text is in the same header
      expect(cardHeader?.textContent).toContain("Budget Details");
    });

    it("should have month selector in the same container as Budget Details title", async () => {
      render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // Find the month select element
      const monthSelect = screen.getByTestId("month-select");

      // Get the parent card header with flex layout
      const cardHeader = monthSelect.closest("[data-slot='card-header']");
      expect(cardHeader).toBeInTheDocument();

      // Verify text content contains Budget Details
      expect(cardHeader?.textContent).toContain("Budget Details");
    });

    it("should not have a separate Select Month card", async () => {
      render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // Verify that "Select Month" card title is not present
      const selectMonthElements = screen.queryAllByText(/select month/i);
      expect(selectMonthElements).toHaveLength(0);
    });

    it("should maintain month selector functionality", async () => {
      render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // Find the month select
      const monthSelect = screen.getByTestId("month-select");

      // Verify the select is present and interactive (has proper attributes)
      expect(monthSelect).toBeInTheDocument();
      expect(monthSelect).toHaveAttribute("role", "combobox");
      expect(monthSelect).toHaveAttribute("aria-expanded", "false");
    });

    it("should display month label before the selector", async () => {
      render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // Find the month select
      const monthSelect = screen.getByTestId("month-select");

      // Get the parent container that should have the label
      const container = monthSelect.closest("div");
      const parentText = container?.textContent || "";

      // Verify "Month:" label is present
      expect(parentText).toContain("Month:");
    });

    it("should have proper styling with flex layout in header", async () => {
      render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // Find the month select
      const monthSelect = screen.getByTestId("month-select");

      // Get the card header container
      const cardHeader = monthSelect.closest("[data-slot='card-header']");

      // Verify flex layout classes are applied
      expect(cardHeader).toHaveClass("flex");
      expect(cardHeader).toHaveClass("flex-col");
      expect(cardHeader).toHaveClass("md:flex-row");
      expect(cardHeader).toHaveClass("md:items-center");
      expect(cardHeader).toHaveClass("md:justify-between");
    });

    it("should position month selector in the header", async () => {
      render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // Find the month select
      const monthSelect = screen.getByTestId("month-select");

      // Get the card header
      const cardHeader = monthSelect.closest("[data-slot='card-header']");

      // The selector should be in the card header
      expect(cardHeader).toBeInTheDocument();

      // Verify the selector comes after the title content
      const titleDiv = cardHeader?.querySelector("div");
      const titleText = titleDiv?.textContent || "";
      expect(titleText).toContain("Budget Details");
    });
  });

  describe("Budget Details Card", () => {
    it("should render Budget Details card", async () => {
      render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // Check that Budget Details text is present
      const budgetDetailsText = screen.getByText("Budget Details");
      expect(budgetDetailsText).toBeInTheDocument();
    });

    it("should display budget table content within Budget Details card", async () => {
      render(<BudgetsPage />);

      const budgetTable = await screen.findByTestId("budget-table");
      expect(budgetTable).toBeInTheDocument();
    });

    it("should display budget description when month is selected", async () => {
      render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // The description should contain "Budget breakdown for" and the month
      const descriptions = screen.getAllByText(/budget breakdown for/i);
      expect(descriptions.length).toBeGreaterThan(0);
    });
  });

  describe("Responsive Design & Styling", () => {
    it("should apply flexbox layout classes to card header", async () => {
      render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // Get the month selector
      const monthSelect = screen.getByTestId("month-select");

      // Get its parent card header
      const cardHeader = monthSelect.closest("[data-slot='card-header']");

      expect(cardHeader).toBeInTheDocument();
      expect(cardHeader).toHaveClass("flex");
      expect(cardHeader).toHaveClass("flex-col");
      expect(cardHeader).toHaveClass("gap-4");
      expect(cardHeader).toHaveClass("md:flex-row");
      expect(cardHeader).toHaveClass("md:items-center");
      expect(cardHeader).toHaveClass("md:justify-between");
    });

    it("should have proper width constraint on month selector", async () => {
      render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      const monthSelect = screen.getByTestId("month-select");
      expect(monthSelect).toHaveClass("w-full");
      expect(monthSelect).toHaveClass("md:w-48");
    });

    it("should have consistent spacing in header", async () => {
      render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // Find the container with Month label and selector
      const monthSelect = screen.getByTestId("month-select");
      const container = monthSelect.closest(".flex.items-center.gap-2");

      expect(container).toHaveClass("flex");
      expect(container).toHaveClass("items-center");
      expect(container).toHaveClass("gap-2");
    });

    it("should align content properly in header with flex layout", async () => {
      const { container } = render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // Get the card header with flex layout
      const cardHeader = container.querySelector("[data-slot='card-header']");

      expect(cardHeader).toBeInTheDocument();
      expect(cardHeader).toHaveClass("flex");
      expect(cardHeader).toHaveClass("flex-col");
      expect(cardHeader).toHaveClass("gap-4");
      // Also check for MD breakpoint classes
      expect(cardHeader).toHaveClass("md:flex-row");
      expect(cardHeader).toHaveClass("md:items-center");
      expect(cardHeader).toHaveClass("md:justify-between");
    });

    it("should render title and description on the left side", async () => {
      const { container } = render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // Get the left side container (first div in flex header)
      const cardHeader = container.querySelector("[data-slot='card-header']");
      const leftSide = cardHeader?.querySelector("div:first-child");

      // Should contain Budget Details title
      expect(leftSide?.textContent).toContain("Budget Details");

      // Should contain the budget description
      expect(leftSide?.textContent).toContain("Budget breakdown for");
    });

    it("should render month selector on the right side", async () => {
      render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // Find the Month label
      const monthLabel = screen.getByText("Month:");
      expect(monthLabel).toBeInTheDocument();

      // Find the month select
      const monthSelect = screen.getByTestId("month-select");
      expect(monthSelect).toBeInTheDocument();

      // Verify they are near each other (in same container)
      const labelParent = monthLabel.closest(".flex");
      expect(labelParent?.querySelector("[data-testid='month-select']")).toBe(
        monthSelect,
      );
    });

    it("should have proper label styling for Month", async () => {
      render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // Find the Month label
      const monthLabel = screen.getByText("Month:");

      expect(monthLabel).toHaveClass("text-sm");
      expect(monthLabel).toHaveClass("font-medium");
      expect(monthLabel).toHaveClass("text-muted-foreground");
    });

    it("should maintain CardTitle styling", async () => {
      render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // Find Budget Details title
      const budgetDetailsTitle = screen.getByText("Budget Details");

      // Should have card-title styling
      expect(budgetDetailsTitle).toHaveClass("font-semibold");
    });

    it("should maintain CardDescription styling", async () => {
      render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // Find the description text
      const description = screen.getByText(/budget breakdown for/i);

      // Should have card-description styling
      expect(description).toHaveClass("text-sm");
      expect(description).toHaveClass("text-muted-foreground");
    });

    it("should have proper padding in card header", async () => {
      const { container } = render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // Get the card header
      const cardHeader = container.querySelector("[data-slot='card-header']");

      expect(cardHeader).toHaveClass("px-6");
    });

    it("should have proper card structure with header and content", async () => {
      const { container } = render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // Get the card
      const card = container.querySelector("[data-slot='card']");

      // Should have header
      const cardHeader = card?.querySelector("[data-slot='card-header']");
      expect(cardHeader).toBeInTheDocument();

      // Should have content
      const cardContent = card?.querySelector("[data-slot='card-content']");
      expect(cardContent).toBeInTheDocument();

      // Content should come after header
      expect(cardHeader?.nextElementSibling).toBe(cardContent);
    });

    it("should display select trigger with proper styling", async () => {
      render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      const monthSelect = screen.getByTestId("month-select");

      // Should have select trigger styling
      expect(monthSelect).toHaveAttribute("data-slot", "select-trigger");
    });

    it("should have responsive width for month selector", async () => {
      render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      const monthSelect = screen.getByTestId("month-select");

      // Should be full width on mobile (w-full) and fixed width on desktop (md:w-48)
      expect(monthSelect).toHaveClass("w-full");
      expect(monthSelect).toHaveClass("md:w-48");
    });

    it("should have responsive flex layout for month selector container", async () => {
      render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // Find the Month label
      const monthLabel = screen.getByText("Month:");

      // Get its parent flex container (the inner container with label and select)
      const selectorContainer = monthLabel.closest(".flex");

      // The inner container has flex-col on mobile, flex-row on desktop
      expect(selectorContainer).toHaveClass("flex-col");
      expect(selectorContainer).toHaveClass("md:flex-row");
      expect(selectorContainer).toHaveClass("md:items-center");

      // Verify gap for spacing
      expect(selectorContainer).toHaveClass("gap-2");
    });

    it("should stack vertically on mobile screens", async () => {
      const { container } = render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // Get the card header
      const cardHeader = container.querySelector("[data-slot='card-header']");

      // Should start with flex-col for vertical stacking on mobile
      expect(cardHeader).toHaveClass("flex-col");
      expect(cardHeader).toHaveClass("gap-4");
    });

    it("should have responsive label and selector stacking", async () => {
      render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // Find the Month label
      const monthLabel = screen.getByText("Month:");

      // Get its parent container
      const container = monthLabel.closest(".flex");

      // Should be flex-col on mobile, flex-row on desktop
      expect(container).toHaveClass("flex-col");
      expect(container).toHaveClass("md:flex-row");
    });

    it("should maintain proper spacing on all screen sizes", async () => {
      const { container } = render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      // Check card header spacing
      const cardHeader = container.querySelector("[data-slot='card-header']");
      expect(cardHeader).toHaveClass("gap-4");

      // Check selector container spacing
      const selectorContainer = container.querySelector(
        ".flex.items-center.gap-2",
      );
      expect(selectorContainer).toHaveClass("gap-2");
    });

    it("should properly align items in desktop view with md:items-center", async () => {
      const { container } = render(<BudgetsPage />);

      await screen.findByTestId("budget-table");

      const cardHeader = container.querySelector("[data-slot='card-header']");

      // Desktop view should have md:items-center and md:justify-between
      expect(cardHeader).toHaveClass("md:items-center");
      expect(cardHeader).toHaveClass("md:justify-between");

      // Mobile should have flex-col layout
      expect(cardHeader).toHaveClass("flex-col");
      expect(cardHeader).toHaveClass("gap-4");
    });
  });
});
