/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TransactionTable } from "./TransactionTable";

const mockTransactions = [
  {
    id: "txn_1",
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
        event_id: "txn_1",
        wallet_id: "wallet_1",
        savings_bucket_id: null,
        amount_idr: -50000,
        created_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: "txn_2",
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
        event_id: "txn_2",
        wallet_id: "wallet_1",
        savings_bucket_id: null,
        amount_idr: 5000000,
        created_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: "txn_3",
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
        event_id: "txn_3",
        wallet_id: "wallet_1",
        savings_bucket_id: null,
        amount_idr: -100000,
        created_at: new Date().toISOString(),
      },
      {
        id: "posting_4",
        event_id: "txn_3",
        wallet_id: "wallet_2",
        savings_bucket_id: null,
        amount_idr: 100000,
        created_at: new Date().toISOString(),
      },
    ],
  },
];

describe("TransactionTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the table with transactions", () => {
      render(<TransactionTable transactions={mockTransactions} />);

      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    it("should render table headers", () => {
      render(<TransactionTable transactions={mockTransactions} />);

      expect(screen.getByText("Date")).toBeInTheDocument();
      expect(screen.getByText("Type")).toBeInTheDocument();
      expect(screen.getByText("Account")).toBeInTheDocument();
      expect(screen.getByText("Category")).toBeInTheDocument();
      expect(screen.getByText("Amount")).toBeInTheDocument();
      expect(screen.getByText("Note")).toBeInTheDocument();
    });

    it("should render transaction type badges", () => {
      render(<TransactionTable transactions={mockTransactions} />);

      expect(screen.getByText("Expense")).toBeInTheDocument();
      expect(screen.getByText("Income")).toBeInTheDocument();
      expect(screen.getByText("Transfer")).toBeInTheDocument();
    });

    it("should render account names", () => {
      render(<TransactionTable transactions={mockTransactions} />);

      expect(screen.getAllByText("Main Wallet").length).toBeGreaterThan(0);
      expect(
        screen.getByText("Main Wallet → Savings Wallet"),
      ).toBeInTheDocument();
    });

    it("should render category names", () => {
      render(<TransactionTable transactions={mockTransactions} />);

      expect(screen.getByText("Food & Dining")).toBeInTheDocument();
      expect(screen.getByText("Salary")).toBeInTheDocument();
    });

    it("should render notes", () => {
      render(<TransactionTable transactions={mockTransactions} />);

      expect(screen.getByText("Lunch expense")).toBeInTheDocument();
      expect(screen.getByText("Monthly salary")).toBeInTheDocument();
      expect(screen.getByText("Transfer to savings")).toBeInTheDocument();
    });

    it("should show loading state", () => {
      render(<TransactionTable transactions={[]} isLoading={true} />);

      expect(screen.getByText("Loading transactions...")).toBeInTheDocument();
    });

    it("should show empty state when no transactions", () => {
      render(<TransactionTable transactions={[]} />);

      expect(screen.getByText("No transactions found.")).toBeInTheDocument();
    });
  });

  describe("dropdown menu", () => {
    it("should render dropdown menu trigger for each transaction", () => {
      render(<TransactionTable transactions={mockTransactions} />);

      // Using aria-haspopup to identify menu triggers
      const dropdownTriggers = screen.getAllByRole("button");
      // Filter buttons that have svg icons (these are the menu triggers)
      const menuTriggers = dropdownTriggers.filter(
        (btn) => btn.querySelector("svg") !== null && btn.textContent === "",
      );
      expect(menuTriggers.length).toBeGreaterThanOrEqual(3);
    });

    // Note: Testing Radix UI dropdown content requires additional setup
    // The onEdit and onDelete callbacks are tested indirectly via integration tests
  });

  describe("props handling", () => {
    it("should accept onEdit prop without error", () => {
      const onEdit = vi.fn();

      // Should render without errors
      expect(() => {
        render(
          <TransactionTable transactions={mockTransactions} onEdit={onEdit} />,
        );
      }).not.toThrow();
    });

    it("should accept onDelete prop without error", () => {
      const onDelete = vi.fn();

      expect(() => {
        render(
          <TransactionTable
            transactions={mockTransactions}
            onDelete={onDelete}
          />,
        );
      }).not.toThrow();
    });

    it("should accept onBulkDelete prop without error", () => {
      const onBulkDelete = vi.fn();

      expect(() => {
        render(
          <TransactionTable
            transactions={mockTransactions}
            onBulkDelete={onBulkDelete}
          />,
        );
      }).not.toThrow();
    });
  });

  describe("selection", () => {
    it("should render checkboxes for selection", () => {
      render(<TransactionTable transactions={mockTransactions} />);

      // Each row should have a checkbox, plus the header checkbox
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBe(mockTransactions.length + 1);
    });

    it("should call onSelectionChange when checkbox is clicked", () => {
      const onSelectionChange = vi.fn();

      render(
        <TransactionTable
          transactions={mockTransactions}
          onSelectionChange={onSelectionChange}
        />,
      );

      const checkboxes = screen.getAllByRole("checkbox");
      // Click the first transaction checkbox (not the header)
      fireEvent.click(checkboxes[1]);

      expect(onSelectionChange).toHaveBeenCalled();
    });

    it("should select all when header checkbox is clicked", () => {
      const onSelectionChange = vi.fn();

      render(
        <TransactionTable
          transactions={mockTransactions}
          onSelectionChange={onSelectionChange}
        />,
      );

      const checkboxes = screen.getAllByRole("checkbox");
      // Click the header checkbox
      fireEvent.click(checkboxes[0]);

      expect(onSelectionChange).toHaveBeenCalledWith(
        expect.arrayContaining(["txn_1", "txn_2", "txn_3"]),
      );
    });

    it("should use external selectedIds when provided", () => {
      render(
        <TransactionTable
          transactions={mockTransactions}
          selectedIds={["txn_1"]}
        />,
      );

      // The first transaction row should have selected styling
      const rows = screen.getAllByRole("row");
      // Find the row for txn_1 (should have data-selected="true")
      const selectedRow = rows.find(
        (row) => row.getAttribute("data-selected") === "true",
      );
      expect(selectedRow).toBeDefined();
    });
  });

  describe("currency formatting", () => {
    it("should format amounts as IDR currency", () => {
      render(<TransactionTable transactions={mockTransactions} />);

      // Check for formatted currency (IDR uses period as thousand separator)
      expect(screen.getByText(/50\.000/)).toBeInTheDocument();
      expect(screen.getByText(/5\.000\.000/)).toBeInTheDocument();
      expect(screen.getByText(/100\.000/)).toBeInTheDocument();
    });
  });

  describe("date formatting", () => {
    it("should format dates", () => {
      render(<TransactionTable transactions={mockTransactions} />);

      // Dates should be formatted - check for presence of formatted date parts
      expect(screen.getByText(/15 Jan 2024/)).toBeInTheDocument();
      expect(screen.getByText(/20 Jan 2024/)).toBeInTheDocument();
      expect(screen.getByText(/25 Jan 2024/)).toBeInTheDocument();
    });
  });

  describe("type styling", () => {
    it("should apply correct color classes for expense amounts", () => {
      render(<TransactionTable transactions={mockTransactions} />);

      // Expense amounts should have red color class
      const expenseAmount = screen.getByText(/50\.000/).closest("span");
      expect(expenseAmount).toHaveClass("text-red-600");
    });

    it("should apply correct color classes for income amounts", () => {
      render(<TransactionTable transactions={mockTransactions} />);

      // Income amounts should have green color class
      const incomeAmount = screen.getByText(/5\.000\.000/).closest("span");
      expect(incomeAmount).toHaveClass("text-green-600");
    });
  });

  describe("sorting", () => {
    it("should sort transactions by date descending", () => {
      render(<TransactionTable transactions={mockTransactions} />);

      const rows = screen.getAllByRole("row");
      // First data row (index 1, after header) should be the most recent transaction
      // txn_3 is from Jan 25, which is the most recent
      expect(rows[1]).toHaveTextContent("25 Jan 2024");
    });
  });
});
