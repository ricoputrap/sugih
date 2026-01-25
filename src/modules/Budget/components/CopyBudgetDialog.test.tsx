import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CopyBudgetDialog } from "./CopyBudgetDialog";

// Mock fetch globally
vi.stubGlobal("fetch", vi.fn());

describe("CopyBudgetDialog", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnCopy = vi.fn();

  const mockSourceMonths = [
    { value: "2025-11-01", label: "November 2025", budgetCount: 5 },
    { value: "2025-12-01", label: "December 2025", budgetCount: 3 },
  ];

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockOnCopy.mockClear();
    vi.clearAllMocks();
  });

  it("should render the dialog when open is true", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSourceMonths,
    });

    render(
      <CopyBudgetDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCopy={mockOnCopy}
      />,
    );

    expect(screen.getByText("Copy Budgets")).toBeInTheDocument();
    expect(
      screen.getByText(/Select a source month with existing budgets/),
    ).toBeInTheDocument();
  });

  it("should not render the dialog when open is false", () => {
    render(
      <CopyBudgetDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        onCopy={mockOnCopy}
      />,
    );

    expect(screen.queryByText("Copy Budgets")).not.toBeInTheDocument();
  });

  it("should display dialog labels", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSourceMonths,
    });

    render(
      <CopyBudgetDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCopy={mockOnCopy}
      />,
    );

    expect(screen.getByText("Copy From")).toBeInTheDocument();
    expect(screen.getByText("Copy To")).toBeInTheDocument();
  });

  it("should fetch available months on open", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSourceMonths,
    });

    render(
      <CopyBudgetDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCopy={mockOnCopy}
      />,
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/budgets/months");
    });
  });

  it("should display Cancel and Copy buttons", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSourceMonths,
    });

    render(
      <CopyBudgetDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCopy={mockOnCopy}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Cancel/ }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Copy/ })).toBeInTheDocument();
    });
  });

  it("should call onOpenChange when cancel button is clicked", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSourceMonths,
    });

    const user = userEvent.setup();

    render(
      <CopyBudgetDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCopy={mockOnCopy}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /Cancel/ });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("should render test IDs for source and destination selects", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSourceMonths,
    });

    render(
      <CopyBudgetDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCopy={mockOnCopy}
      />,
    );

    expect(screen.getByTestId("source-month-select")).toBeInTheDocument();
    expect(screen.getByTestId("destination-month-select")).toBeInTheDocument();
  });

  it("should accept defaultDestinationMonth prop", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSourceMonths,
    });

    const { container } = render(
      <CopyBudgetDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCopy={mockOnCopy}
        defaultDestinationMonth="2026-01-01"
      />,
    );

    expect(container).toBeInTheDocument();
  });

  it("should accept isLoading prop", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSourceMonths,
    });

    const { container } = render(
      <CopyBudgetDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCopy={mockOnCopy}
        isLoading={true}
      />,
    );

    expect(container).toBeInTheDocument();
  });

  it("should disable copy button when loading", async () => {
    let resolveMonths: any;
    global.fetch = vi.fn().mockReturnValueOnce({
      ok: true,
      json: () =>
        new Promise((resolve) => {
          resolveMonths = resolve;
        }),
    });

    render(
      <CopyBudgetDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCopy={mockOnCopy}
      />,
    );

    await waitFor(() => {
      const copyButton = screen.getByRole("button", { name: /Copy/ });
      expect(copyButton).toBeDisabled();
    });

    resolveMonths(mockSourceMonths);
  });

  it("should call fetch with correct endpoint", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(
      <CopyBudgetDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCopy={mockOnCopy}
      />,
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/budgets/months");
    });
  });

  it("should render component with correct title", () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSourceMonths,
    });

    render(
      <CopyBudgetDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCopy={mockOnCopy}
      />,
    );

    // Check that the dialog title is rendered
    expect(screen.getByText("Copy Budgets")).toBeInTheDocument();
  });
});
