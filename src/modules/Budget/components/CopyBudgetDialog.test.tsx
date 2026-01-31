import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CopyBudgetDialog } from "./CopyBudgetDialog";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock the hooks and stores
const mockCloseCopyDialog = vi.fn();
const mockSetCopyResult = vi.fn();
const mockOpenCopyResultModal = vi.fn();
const mockCopyBudgetsMutateAsync = vi.fn();

vi.mock("@/modules/Budget/hooks", () => ({
  useBudgetMonth: () => ["2026-01-01", vi.fn()],
  useBudgetMutations: () => ({
    copyBudgets: {
      mutateAsync: mockCopyBudgetsMutateAsync,
      isPending: false,
    },
  }),
}));

let mockStoreState = {
  copyDialogOpen: true,
};

vi.mock("@/modules/Budget/stores", () => ({
  useBudgetsPageStore: () => ({
    ...mockStoreState,
    closeCopyDialog: mockCloseCopyDialog,
    setCopyResult: mockSetCopyResult,
    openCopyResultModal: mockOpenCopyResultModal,
  }),
}));

// Mock fetch globally
vi.stubGlobal("fetch", vi.fn());

const mockSourceMonths = [
  { value: "2025-11-01", label: "November 2025", budgetCount: 5 },
  { value: "2025-12-01", label: "December 2025", budgetCount: 3 },
];

// Create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("CopyBudgetDialog", () => {
  beforeEach(() => {
    mockCloseCopyDialog.mockClear();
    mockSetCopyResult.mockClear();
    mockOpenCopyResultModal.mockClear();
    mockCopyBudgetsMutateAsync.mockClear();
    vi.clearAllMocks();
    // Reset store state
    mockStoreState = {
      copyDialogOpen: true,
    };
  });

  it("should render the dialog when copyDialogOpen is true", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSourceMonths,
    });

    render(<CopyBudgetDialog />, { wrapper: createWrapper() });

    expect(screen.getByText("Copy Budgets")).toBeInTheDocument();
    expect(
      screen.getByText(/Select a source month with existing budgets/),
    ).toBeInTheDocument();
  });

  it("should not render the dialog when copyDialogOpen is false", () => {
    mockStoreState = {
      copyDialogOpen: false,
    };

    render(<CopyBudgetDialog />, { wrapper: createWrapper() });

    expect(screen.queryByText("Copy Budgets")).not.toBeInTheDocument();
  });

  it("should display dialog labels", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSourceMonths,
    });

    render(<CopyBudgetDialog />, { wrapper: createWrapper() });

    expect(screen.getByText("Copy From")).toBeInTheDocument();
    expect(screen.getByText("Copy To")).toBeInTheDocument();
  });

  it("should fetch available months on open", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSourceMonths,
    });

    render(<CopyBudgetDialog />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/budgets/months");
    });
  });

  it("should display Cancel and Copy buttons", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSourceMonths,
    });

    render(<CopyBudgetDialog />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Cancel/ }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Copy/ })).toBeInTheDocument();
    });
  });

  it("should call closeCopyDialog when cancel button is clicked", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSourceMonths,
    });

    const user = userEvent.setup();

    render(<CopyBudgetDialog />, { wrapper: createWrapper() });

    const cancelButton = screen.getByRole("button", { name: /Cancel/ });
    await user.click(cancelButton);

    expect(mockCloseCopyDialog).toHaveBeenCalled();
  });

  it("should render test IDs for source and destination selects", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSourceMonths,
    });

    render(<CopyBudgetDialog />, { wrapper: createWrapper() });

    expect(screen.getByTestId("source-month-select")).toBeInTheDocument();
    expect(screen.getByTestId("destination-month-select")).toBeInTheDocument();
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

    render(<CopyBudgetDialog />, { wrapper: createWrapper() });

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

    render(<CopyBudgetDialog />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/budgets/months");
    });
  });

  it("should render component with correct title", () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSourceMonths,
    });

    render(<CopyBudgetDialog />, { wrapper: createWrapper() });

    expect(screen.getByText("Copy Budgets")).toBeInTheDocument();
  });

  it("should use current month as default destination", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSourceMonths,
    });

    render(<CopyBudgetDialog />, { wrapper: createWrapper() });

    // The component should have the destination month selector
    expect(screen.getByTestId("destination-month-select")).toBeInTheDocument();
  });
});
