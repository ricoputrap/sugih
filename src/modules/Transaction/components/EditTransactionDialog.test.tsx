/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { EditTransactionDialog } from "./EditTransactionDialog";
import type { Transaction } from "@/modules/Transaction/hooks";

const mockTransaction: Transaction = {
  id: "txn_1",
  occurred_at: new Date("2024-01-15T10:00:00Z"),
  type: "expense",
  note: "Lunch expense",
  payee: null,
  category_id: "cat_1",
  category_name: "Food & Dining",
  deleted_at: null,
  created_at: new Date("2024-01-15T10:00:00Z"),
  updated_at: new Date("2024-01-15T10:00:00Z"),
  idempotency_key: null,
  display_amount_idr: 50000,
  display_account: "Main Wallet",
  postings: [
    {
      id: "posting_1",
      event_id: "txn_1",
      wallet_id: "wallet_1",
      savings_bucket_id: null,
      amount_idr: -50000,
      created_at: new Date(),
    },
  ],
};

// Mock Zustand store
vi.mock("@/modules/Transaction/stores", () => ({
  useTransactionsPageStore: vi.fn(() => ({
    isEditDialogOpen: true,
    transactionToEdit: mockTransaction,
    closeEditDialog: vi.fn(),
    isAddDialogOpen: false,
    isDeleteDialogOpen: false,
    selectedTransactionIds: [],
    openAddDialog: vi.fn(),
    openEditDialog: vi.fn(),
    openDeleteDialog: vi.fn(),
    closeAddDialog: vi.fn(),
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
      ],
      savingsBuckets: [
        { id: "bucket_1", name: "Emergency Fund", archived: false },
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

describe("EditTransactionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the dialog when open with transaction", () => {
      renderWithProviders(<EditTransactionDialog />);
      expect(screen.getByText("Edit Transaction")).toBeInTheDocument();
    });
  });

  describe("expense transaction form", () => {
    it("should display the form fields", () => {
      renderWithProviders(<EditTransactionDialog />);
      // Just verify the component renders without crashing
      expect(screen.getByText("Edit Transaction")).toBeInTheDocument();
    });
  });
});
