/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { AddTransactionDialog } from "./AddTransactionDialog";

// Mock Zustand store
vi.mock("@/modules/Transaction/stores", () => ({
  useTransactionsPageStore: vi.fn(() => ({
    isAddDialogOpen: true,
    isEditDialogOpen: false,
    isDeleteDialogOpen: false,
    transactionToEdit: null,
    selectedTransactionIds: [],
    openAddDialog: vi.fn(),
    closeAddDialog: vi.fn(),
    openEditDialog: vi.fn(),
    closeEditDialog: vi.fn(),
    openDeleteDialog: vi.fn(),
    closeDeleteDialog: vi.fn(),
    setSelectedTransactionIds: vi.fn(),
    clearSelection: vi.fn(),
    reset: vi.fn(),
  })),
}));

// Mock React Query hook
vi.mock("@/modules/Transaction/hooks", () => ({
  useTransactionReferenceData: vi.fn(() => ({
    data: {
      wallets: [
        { id: "wallet_1", name: "Main Wallet", archived: false },
        { id: "wallet_2", name: "Savings Wallet", archived: false },
      ],
      categories: [
        { id: "cat_1", name: "Food & Dining", type: "expense", archived: false },
        { id: "cat_2", name: "Salary", type: "income", archived: false },
        { id: "cat_3", name: "Freelance", type: "income", archived: false },
      ],
      savingsBuckets: [
        { id: "bucket_1", name: "Emergency Fund", archived: false },
        { id: "bucket_2", name: "Vacation", archived: false },
      ],
    },
    isLoading: false,
    error: null,
  })),
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>,
  );
};

describe("AddTransactionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the dialog when open", () => {
      renderWithProviders(<AddTransactionDialog />);
      expect(screen.getByText("Add Transaction")).toBeInTheDocument();
      expect(
        screen.getByText("Record a new financial transaction"),
      ).toBeInTheDocument();
    });

    it("should render all transaction type tabs", () => {
      renderWithProviders(<AddTransactionDialog />);
      expect(screen.getByRole("tab", { name: "Expense" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Income" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Transfer" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Save" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Withdraw" })).toBeInTheDocument();
    });
  });

  describe("expense form (default tab)", () => {
    it("should render expense form with required category selector", () => {
      renderWithProviders(<AddTransactionDialog />);
      expect(screen.getByText("Category")).toBeInTheDocument();
      expect(screen.getByText("Wallet")).toBeInTheDocument();
    });

    it("should render wallet selector for expense", () => {
      renderWithProviders(<AddTransactionDialog />);
      expect(screen.getByText("Wallet")).toBeInTheDocument();
    });

    it("should render amount field for expense", () => {
      renderWithProviders(<AddTransactionDialog />);
      expect(screen.getByText("Amount (IDR)")).toBeInTheDocument();
    });

    it("should render note field for expense", () => {
      renderWithProviders(<AddTransactionDialog />);
      expect(screen.getByText("Note (optional)")).toBeInTheDocument();
    });
  });
});
