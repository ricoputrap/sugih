/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EditTransactionDialog } from "./EditTransactionDialog";

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
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
  desc: vi.fn(),
  asc: vi.fn(),
  isNull: vi.fn(),
  isNotNull: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  gt: vi.fn(),
  lt: vi.fn(),
  inArray: vi.fn(),
  notInArray: vi.fn(),
  like: vi.fn(),
  notLike: vi.fn(),
  between: vi.fn(),
  exists: vi.fn(),
  notExists: vi.fn(),
}));

const mockWallets = [
  { id: "wallet_1", name: "Main Wallet" },
  { id: "wallet_2", name: "Savings Wallet" },
];

const mockCategories = [
  { id: "cat_1", name: "Food & Dining", type: "expense" as const },
  { id: "cat_2", name: "Salary", type: "income" as const },
  { id: "cat_3", name: "Freelance", type: "income" as const },
];

const mockSavingsBuckets = [
  { id: "bucket_1", name: "Emergency Fund" },
  { id: "bucket_2", name: "Vacation" },
];

const mockExpenseTransaction = {
  id: "txn_expense_1",
  occurred_at: new Date("2024-01-15T10:00:00Z"),
  type: "expense" as const,
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
      event_id: "txn_expense_1",
      wallet_id: "wallet_1",
      savings_bucket_id: null,
      amount_idr: -50000,
      created_at: new Date(),
    },
  ],
};

const mockIncomeTransaction = {
  id: "txn_income_1",
  occurred_at: new Date("2024-01-20T10:00:00Z"),
  type: "income" as const,
  note: "Monthly salary",
  payee: "Company XYZ",
  category_id: "cat_2",
  category_name: "Salary",
  deleted_at: null,
  created_at: new Date("2024-01-20T10:00:00Z"),
  updated_at: new Date("2024-01-20T10:00:00Z"),
  idempotency_key: null,
  display_amount_idr: 5000000,
  display_account: "Main Wallet",
  postings: [
    {
      id: "posting_2",
      event_id: "txn_income_1",
      wallet_id: "wallet_1",
      savings_bucket_id: null,
      amount_idr: 5000000,
      created_at: new Date(),
    },
  ],
};

const mockTransferTransaction = {
  id: "txn_transfer_1",
  occurred_at: new Date("2024-01-25T10:00:00Z"),
  type: "transfer" as const,
  note: "Transfer to savings",
  payee: null,
  category_id: null,
  category_name: null,
  deleted_at: null,
  created_at: new Date("2024-01-25T10:00:00Z"),
  updated_at: new Date("2024-01-25T10:00:00Z"),
  idempotency_key: null,
  display_amount_idr: 100000,
  display_account: "Main Wallet → Savings Wallet",
  postings: [
    {
      id: "posting_3",
      event_id: "txn_transfer_1",
      wallet_id: "wallet_1",
      savings_bucket_id: null,
      amount_idr: -100000,
      created_at: new Date(),
    },
    {
      id: "posting_4",
      event_id: "txn_transfer_1",
      wallet_id: "wallet_2",
      savings_bucket_id: null,
      amount_idr: 100000,
      created_at: new Date(),
    },
  ],
};

const mockSavingsContributionTransaction = {
  id: "txn_savings_1",
  occurred_at: new Date("2024-02-01T10:00:00Z"),
  type: "savings_contribution" as const,
  note: "Monthly savings",
  payee: null,
  category_id: null,
  category_name: null,
  deleted_at: null,
  created_at: new Date("2024-02-01T10:00:00Z"),
  updated_at: new Date("2024-02-01T10:00:00Z"),
  idempotency_key: null,
  display_amount_idr: 500000,
  display_account: "To: Emergency Fund",
  postings: [
    {
      id: "posting_5",
      event_id: "txn_savings_1",
      wallet_id: "wallet_1",
      savings_bucket_id: null,
      amount_idr: -500000,
      created_at: new Date(),
    },
    {
      id: "posting_6",
      event_id: "txn_savings_1",
      wallet_id: null,
      savings_bucket_id: "bucket_1",
      amount_idr: 500000,
      created_at: new Date(),
    },
  ],
};

describe("EditTransactionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("rendering", () => {
    it("should render the dialog when open with transaction", () => {
      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={mockExpenseTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("Edit Transaction")).toBeInTheDocument();
    });

    it("should not render when transaction is null", () => {
      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={null}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.queryByText("Edit Transaction")).not.toBeInTheDocument();
    });

    it("should not render when closed", () => {
      render(
        <EditTransactionDialog
          open={false}
          onOpenChange={() => {}}
          transaction={mockExpenseTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.queryByText("Edit Transaction")).not.toBeInTheDocument();
    });

    it("should show transaction type as badge (read-only)", () => {
      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={mockExpenseTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("Expense")).toBeInTheDocument();
    });

    it("should display description about type not being changeable", () => {
      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={mockExpenseTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(
        screen.getByText(/Transaction type cannot be changed/i),
      ).toBeInTheDocument();
    });
  });

  describe("expense transaction form", () => {
    it("should render wallet selector for expense", () => {
      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={mockExpenseTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("Wallet")).toBeInTheDocument();
    });

    it("should render category selector for expense", () => {
      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={mockExpenseTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("Category")).toBeInTheDocument();
    });

    it("should render amount field for expense", () => {
      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={mockExpenseTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("Amount (IDR)")).toBeInTheDocument();
    });

    it("should render note field for expense", () => {
      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={mockExpenseTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("Note (optional)")).toBeInTheDocument();
    });

    it("should have Save Changes button", () => {
      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={mockExpenseTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Save Changes" }),
      ).toBeInTheDocument();
    });

    it("should have Cancel button", () => {
      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={mockExpenseTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Cancel" }),
      ).toBeInTheDocument();
    });
  });

  describe("income transaction form", () => {
    it("should render income type badge", () => {
      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={mockIncomeTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("Income")).toBeInTheDocument();
    });

    it("should render payee field for income", () => {
      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={mockIncomeTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("Payee (optional)")).toBeInTheDocument();
    });

    it("should render category as optional for income", () => {
      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={mockIncomeTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("Category (optional)")).toBeInTheDocument();
    });
  });

  describe("transfer transaction form", () => {
    it("should render transfer type badge", () => {
      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={mockTransferTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("Transfer")).toBeInTheDocument();
    });

    it("should render from wallet selector for transfer", () => {
      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={mockTransferTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("From Wallet")).toBeInTheDocument();
    });

    it("should render to wallet selector for transfer", () => {
      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={mockTransferTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("To Wallet")).toBeInTheDocument();
    });
  });

  describe("savings contribution form", () => {
    it("should render savings contribution type badge", () => {
      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={mockSavingsContributionTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("Savings Contribution")).toBeInTheDocument();
    });

    it("should render savings bucket selector", () => {
      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={mockSavingsContributionTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("Savings Bucket")).toBeInTheDocument();
    });
  });

  describe("form submission", () => {
    it("should call fetch with PUT method on submit", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockExpenseTransaction }),
      });

      const onSuccess = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
          transaction={mockExpenseTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      const submitButton = screen.getByRole("button", { name: "Save Changes" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/transactions/${mockExpenseTransaction.id}`,
          expect.objectContaining({
            method: "PUT",
            headers: { "Content-Type": "application/json" },
          }),
        );
      });
    });

    it("should call onSuccess callback on successful update", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockExpenseTransaction }),
      });

      const onSuccess = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
          transaction={mockExpenseTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      const submitButton = screen.getByRole("button", { name: "Save Changes" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it("should close dialog on successful update", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockExpenseTransaction }),
      });

      const onSuccess = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
          transaction={mockExpenseTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      const submitButton = screen.getByRole("button", { name: "Save Changes" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("should show error on failed update", async () => {
      const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: "Wallet not found or archived" },
        }),
      });

      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={mockExpenseTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      const submitButton = screen.getByRole("button", { name: "Save Changes" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith("Wallet not found or archived");
      });

      alertMock.mockRestore();
    });
  });

  describe("cancel button", () => {
    it("should close dialog when cancel is clicked", () => {
      const onOpenChange = vi.fn();

      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={onOpenChange}
          transaction={mockExpenseTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("props handling", () => {
    it("should handle empty wallets array", () => {
      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={mockExpenseTransaction}
          wallets={[]}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("Edit Transaction")).toBeInTheDocument();
    });

    it("should handle empty categories array", () => {
      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={mockExpenseTransaction}
          wallets={mockWallets}
          categories={[]}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("Edit Transaction")).toBeInTheDocument();
    });

    it("should handle empty savingsBuckets array", () => {
      render(
        <EditTransactionDialog
          open={true}
          onOpenChange={() => {}}
          transaction={mockSavingsContributionTransaction}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={[]}
        />,
      );

      expect(screen.getByText("Edit Transaction")).toBeInTheDocument();
    });
  });
});
