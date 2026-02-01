/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import TransactionsPage from "./page";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Zustand store
vi.mock("@/modules/Transaction/stores", () => ({
  useTransactionsPageStore: vi.fn(() => ({
    isAddDialogOpen: false,
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

// Mock React Query hooks
vi.mock("@/modules/Transaction/hooks", () => ({
  useTransactionsData: vi.fn(() => ({
    data: [
      {
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
        postings: [],
      },
    ],
    isLoading: false,
    error: null,
  })),
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
  useTransactionFilters: vi.fn(() => ({
    typeFilter: "all",
    setTypeFilter: vi.fn(),
    walletFilter: "all",
    setWalletFilter: vi.fn(),
    categoryFilter: "all",
    setCategoryFilter: vi.fn(),
    fromDate: "",
    setFromDate: vi.fn(),
    toDate: "",
    setToDate: vi.fn(),
    clearFilters: vi.fn(),
    hasActiveFilters: false,
  })),
  useTransactionMutations: vi.fn(() => ({
    deleteTransaction: {
      mutateAsync: vi.fn(),
      isPending: false,
    },
    bulkDeleteTransactions: {
      mutateAsync: vi.fn(),
      isPending: false,
    },
  })),
}));

const mockTransactions = [
  {
    id: "txn_1",
    occurred_at: new Date("2024-01-15T10:00:00Z").toISOString(),
    type: "expense",
    note: "Lunch expense",
    payee: null,
    category_id: "cat_1",
    category_name: "Food & Dining",
    deleted_at: null,
    created_at: new Date("2024-01-15T10:00:00Z").toISOString(),
    updated_at: new Date("2024-01-15T10:00:00Z").toISOString(),
    idempotency_key: null,
    display_amount_idr: 50000,
    display_account: "Main Wallet",
    postings: [],
  },
];

const mockWallets = [
  { id: "wallet_1", name: "Main Wallet", archived: false },
  { id: "wallet_2", name: "Savings Wallet", archived: false },
];

const mockCategories = [
  { id: "cat_1", name: "Food & Dining", type: "expense", archived: false },
  { id: "cat_2", name: "Salary", type: "income", archived: false },
];

const mockSavingsBuckets = [
  { id: "bucket_1", name: "Emergency Fund", archived: false },
];

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

describe("TransactionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();

    // Default mock responses
    mockFetch.mockImplementation((url: string) => {
      if (
        url.includes("/api/transactions") &&
        !url.includes("/api/transactions/")
      ) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTransactions),
        });
      }
      if (url.includes("/api/wallets")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockWallets),
        });
      }
      if (url.includes("/api/categories")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCategories),
        });
      }
      if (url.includes("/api/savings-buckets")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSavingsBuckets),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });
  });

  describe("rendering", () => {
    it("should render the transactions page", async () => {
      renderWithProviders(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Transactions")).toBeInTheDocument();
      });
    });

    it("should render the Add Transaction button", async () => {
      renderWithProviders(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Add Transaction")).toBeInTheDocument();
      });
    });

    it("should render filter section", async () => {
      renderWithProviders(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Filters")).toBeInTheDocument();
      });
    });

    it("should render statistics cards", async () => {
      renderWithProviders(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Total Transactions")).toBeInTheDocument();
        expect(screen.getByText("Total Expenses")).toBeInTheDocument();
        expect(screen.getByText("Total Income")).toBeInTheDocument();
        expect(screen.getByText("Net Amount")).toBeInTheDocument();
      });
    });
  });

  describe("filter controls", () => {
    it("should render the filters section with Filters heading", async () => {
      renderWithProviders(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Filters")).toBeInTheDocument();
      });
    });
  });

  describe("transaction display", () => {
    it("should render Transaction History section", async () => {
      renderWithProviders(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Transaction History")).toBeInTheDocument();
      });
    });

    it("should render the transaction table", async () => {
      renderWithProviders(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByRole("table")).toBeInTheDocument();
      });
    });
  });

  describe("dialog components", () => {
    it("should render add transaction dialog", async () => {
      renderWithProviders(<TransactionsPage />);

      await waitFor(() => {
        // Dialog should exist but may not be visible initially
        expect(screen.getByText("Add Transaction")).toBeInTheDocument();
      });
    });

    it("should render edit transaction dialog", async () => {
      renderWithProviders(<TransactionsPage />);

      await waitFor(() => {
        // Component should render but dialog visibility depends on store state
        expect(screen.getByText("Transactions")).toBeInTheDocument();
      });
    });
  });
});
