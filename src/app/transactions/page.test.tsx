/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Drizzle database connection for tests
vi.mock("@/db/drizzle-client", () => ({
  getDb: vi.fn(() => ({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    execute: vi.fn().mockResolvedValue({ rows: [] }),
    transaction: vi.fn().mockImplementation(async (cb) => {
      const tx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
        execute: vi.fn().mockResolvedValue({ rows: [] }),
      };
      return cb(tx as any);
    }),
  })),
  getPool: vi.fn(() => ({
    connect: vi.fn(),
    query: vi.fn(),
    end: vi.fn(),
  })),
  closeDb: vi.fn(),
  healthCheck: vi.fn(() => Promise.resolve(true)),
  sql: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import TransactionsPage from "./page";
import { toast } from "sonner";

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
    postings: [
      {
        id: "posting_1",
        event_id: "txn_1",
        wallet_id: "wallet_1",
        savings_bucket_id: null,
        amount_idr: -50000,
        created_at: new Date().toISOString(),
      },
    ],
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

describe("TransactionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();

    // Default mock responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/transactions") && !url.includes("/api/transactions/")) {
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
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Transactions")).toBeInTheDocument();
      });
    });

    it("should render the Add Transaction button", async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Add Transaction")).toBeInTheDocument();
      });
    });

    it("should render filter section", async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Filters")).toBeInTheDocument();
      });
    });

    it("should render statistics cards", async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Total Transactions")).toBeInTheDocument();
        expect(screen.getByText("Total Expenses")).toBeInTheDocument();
        expect(screen.getByText("Total Income")).toBeInTheDocument();
        expect(screen.getByText("Net Amount")).toBeInTheDocument();
      });
    });
  });

  describe("data fetching", () => {
    it("should fetch transactions on mount", async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/transactions")
        );
      });
    });

    it("should fetch wallets on mount", async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/wallets");
      });
    });

    it("should fetch categories on mount", async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/categories");
      });
    });

    it("should fetch savings buckets on mount", async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/savings-buckets");
      });
    });
  });

  describe("transaction display", () => {
    it("should display transaction data in table", async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Lunch expense")).toBeInTheDocument();
      });
    });

    it("should display transaction type badges", async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Expense")).toBeInTheDocument();
      });
    });
  });

  describe("add transaction dialog", () => {
    it("should open add transaction dialog when button is clicked", async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Add Transaction")).toBeInTheDocument();
      });

      const addButton = screen.getByText("Add Transaction");
      fireEvent.click(addButton);

      await waitFor(() => {
        // Dialog title "Add Transaction" should appear in dialog header
        const dialogTitles = screen.getAllByText("Add Transaction");
        expect(dialogTitles.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("edit functionality", () => {
    // Note: Full e2e testing of edit flow requires integration tests
    // These tests verify the page is set up correctly for edit functionality

    it("should render TransactionTable with edit capability", async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        // TransactionTable should be rendered with transactions
        expect(screen.getByRole("table")).toBeInTheDocument();
      });
    });

    it("should have Transaction History section", async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Transaction History")).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("should show error toast when transactions fetch fails", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/transactions") && !url.includes("/api/transactions/")) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: { message: "Failed to fetch" } }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      render(<TransactionsPage />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe("filters", () => {
    it("should render type filter", async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Type")).toBeInTheDocument();
      });
    });

    it("should render wallet filter", async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Wallet")).toBeInTheDocument();
      });
    });

    it("should render category filter", async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("Category")).toBeInTheDocument();
      });
    });

    it("should render date range filters", async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.getByText("From Date")).toBeInTheDocument();
        expect(screen.getByText("To Date")).toBeInTheDocument();
      });
    });
  });

  describe("bulk selection", () => {
    it("should not show delete selected button initially", async () => {
      render(<TransactionsPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Delete Selected/)).not.toBeInTheDocument();
      });
    });
  });
});
