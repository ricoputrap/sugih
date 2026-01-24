/**
 * @vitest-environment jsdom
 */

/**
 * LatestTransactionsTable Component Tests
 *
 * Tests for the latest transactions table component
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { LatestTransactionsTable } from "./LatestTransactionsTable";
import type { RecentTransaction } from "../schema";

describe("LatestTransactionsTable", () => {
  const mockTransactions: RecentTransaction[] = [
    {
      id: "1",
      type: "expense",
      amount: 50000,
      occurredAt: new Date("2024-01-15T10:00:00Z"),
      categoryName: "Food",
      note: "Lunch at restaurant",
    },
    {
      id: "2",
      type: "income",
      amount: 5000000,
      occurredAt: new Date("2024-01-10T08:00:00Z"),
      categoryName: "Salary",
      note: "Monthly salary",
    },
    {
      id: "3",
      type: "transfer",
      amount: 1000000,
      occurredAt: new Date("2024-01-05T14:30:00Z"),
      categoryName: undefined,
      note: "Transfer to savings",
    },
    {
      id: "4",
      type: "savings_contribution",
      amount: 500000,
      occurredAt: new Date("2024-01-03T09:00:00Z"),
      categoryName: "Emergency Fund",
      note: undefined,
    },
    {
      id: "5",
      type: "savings_withdrawal",
      amount: 200000,
      occurredAt: new Date("2024-01-01T11:00:00Z"),
      categoryName: "Vacation Fund",
      note: "Withdraw for trip",
    },
  ];

  describe("rendering", () => {
    it("should render table with transactions", () => {
      render(<LatestTransactionsTable transactions={mockTransactions} />);

      expect(screen.getByText("Latest Transactions")).toBeInTheDocument();
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    it("should render table headers", () => {
      render(<LatestTransactionsTable transactions={mockTransactions} />);

      expect(screen.getByText("Date")).toBeInTheDocument();
      expect(screen.getByText("Type")).toBeInTheDocument();
      expect(screen.getByText("Category")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByText("Amount")).toBeInTheDocument();
    });

    it("should render all transactions", () => {
      render(<LatestTransactionsTable transactions={mockTransactions} />);

      expect(screen.getByText("Food")).toBeInTheDocument();
      expect(screen.getByText("Salary")).toBeInTheDocument();
      expect(screen.getByText("Emergency Fund")).toBeInTheDocument();
      expect(screen.getByText("Vacation Fund")).toBeInTheDocument();
    });

    it("should limit to 5 transactions", () => {
      const manyTransactions: RecentTransaction[] = Array.from(
        { length: 10 },
        (_, i) => ({
          id: String(i),
          type: "expense",
          amount: 10000 * (i + 1),
          occurredAt: new Date(
            `2024-01-${String(i + 1).padStart(2, "0")}T10:00:00Z`,
          ),
          categoryName: `Category ${i}`,
          note: `Note ${i}`,
        }),
      );

      render(<LatestTransactionsTable transactions={manyTransactions} />);

      const rows = screen.getAllByRole("row");
      // 1 header row + 5 data rows = 6 total
      expect(rows).toHaveLength(6);
    });
  });

  describe("empty states", () => {
    it("should show empty state when no transactions", () => {
      render(<LatestTransactionsTable transactions={[]} />);

      expect(screen.getByText("No transactions yet")).toBeInTheDocument();
      expect(
        screen.getByText("Start recording your financial activities"),
      ).toBeInTheDocument();
    });

    it("should show empty state when transactions is undefined", () => {
      render(<LatestTransactionsTable />);

      expect(screen.getByText("No transactions yet")).toBeInTheDocument();
    });

    it("should show loading state", () => {
      render(
        <LatestTransactionsTable
          transactions={mockTransactions}
          isLoading={true}
        />,
      );

      expect(screen.getByText("Loading transactions...")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  describe("transaction types", () => {
    it("should display expense badge correctly", () => {
      const expenseTransaction: RecentTransaction[] = [
        {
          id: "1",
          type: "expense",
          amount: 50000,
          occurredAt: new Date("2024-01-15T10:00:00Z"),
          categoryName: "Food",
        },
      ];

      render(<LatestTransactionsTable transactions={expenseTransaction} />);

      expect(screen.getByText("Expense")).toBeInTheDocument();
    });

    it("should display income badge correctly", () => {
      const incomeTransaction: RecentTransaction[] = [
        {
          id: "1",
          type: "income",
          amount: 5000000,
          occurredAt: new Date("2024-01-15T10:00:00Z"),
          categoryName: "Salary",
        },
      ];

      render(<LatestTransactionsTable transactions={incomeTransaction} />);

      expect(screen.getByText("Income")).toBeInTheDocument();
    });

    it("should display transfer badge correctly", () => {
      const transferTransaction: RecentTransaction[] = [
        {
          id: "1",
          type: "transfer",
          amount: 1000000,
          occurredAt: new Date("2024-01-15T10:00:00Z"),
        },
      ];

      render(<LatestTransactionsTable transactions={transferTransaction} />);

      expect(screen.getByText("Transfer")).toBeInTheDocument();
    });

    it("should display savings contribution badge correctly", () => {
      const savingsContribution: RecentTransaction[] = [
        {
          id: "1",
          type: "savings_contribution",
          amount: 500000,
          occurredAt: new Date("2024-01-15T10:00:00Z"),
          categoryName: "Emergency Fund",
        },
      ];

      render(<LatestTransactionsTable transactions={savingsContribution} />);

      expect(screen.getByText("Savings +")).toBeInTheDocument();
    });

    it("should display savings withdrawal badge correctly", () => {
      const savingsWithdrawal: RecentTransaction[] = [
        {
          id: "1",
          type: "savings_withdrawal",
          amount: 200000,
          occurredAt: new Date("2024-01-15T10:00:00Z"),
          categoryName: "Vacation Fund",
        },
      ];

      render(<LatestTransactionsTable transactions={savingsWithdrawal} />);

      expect(screen.getByText("Savings -")).toBeInTheDocument();
    });
  });

  describe("data display", () => {
    it("should format dates correctly", () => {
      const transaction: RecentTransaction[] = [
        {
          id: "1",
          type: "expense",
          amount: 50000,
          occurredAt: new Date("2024-01-15T10:00:00Z"),
          categoryName: "Food",
        },
      ];

      render(<LatestTransactionsTable transactions={transaction} />);

      expect(screen.getByText("Jan 15, 2024")).toBeInTheDocument();
    });

    it("should format currency correctly", () => {
      const transaction: RecentTransaction[] = [
        {
          id: "1",
          type: "expense",
          amount: 1500000,
          occurredAt: new Date("2024-01-15T10:00:00Z"),
          categoryName: "Food",
        },
      ];

      render(<LatestTransactionsTable transactions={transaction} />);

      // Should format as IDR with space separator (Rp 1.500.000)
      expect(screen.getByText(/-Rp\s1\.500\.000/)).toBeInTheDocument();
    });

    it("should show minus sign for expenses", () => {
      const transaction: RecentTransaction[] = [
        {
          id: "1",
          type: "expense",
          amount: 50000,
          occurredAt: new Date("2024-01-15T10:00:00Z"),
          categoryName: "Food",
        },
      ];

      render(<LatestTransactionsTable transactions={transaction} />);

      expect(screen.getByText(/-Rp\s50\.000/)).toBeInTheDocument();
    });

    it("should not show minus sign for income", () => {
      const transaction: RecentTransaction[] = [
        {
          id: "1",
          type: "income",
          amount: 5000000,
          occurredAt: new Date("2024-01-15T10:00:00Z"),
          categoryName: "Salary",
        },
      ];

      render(<LatestTransactionsTable transactions={transaction} />);

      // Should not have minus sign
      const amountCell = screen.getByText(/Rp\s5\.000\.000/);
      expect(amountCell.textContent).not.toContain("-");
    });

    it("should display category name", () => {
      render(<LatestTransactionsTable transactions={mockTransactions} />);

      expect(screen.getByText("Food")).toBeInTheDocument();
      expect(screen.getByText("Salary")).toBeInTheDocument();
    });

    it("should display Uncategorized when category is missing", () => {
      const transaction: RecentTransaction[] = [
        {
          id: "1",
          type: "expense",
          amount: 50000,
          occurredAt: new Date("2024-01-15T10:00:00Z"),
          categoryName: undefined,
        },
      ];

      render(<LatestTransactionsTable transactions={transaction} />);

      expect(screen.getByText("Uncategorized")).toBeInTheDocument();
    });

    it("should display note when available", () => {
      render(<LatestTransactionsTable transactions={mockTransactions} />);

      expect(screen.getByText("Lunch at restaurant")).toBeInTheDocument();
      expect(screen.getByText("Monthly salary")).toBeInTheDocument();
    });

    it("should display No description when note is missing", () => {
      const transaction: RecentTransaction[] = [
        {
          id: "1",
          type: "expense",
          amount: 50000,
          occurredAt: new Date("2024-01-15T10:00:00Z"),
          categoryName: "Food",
          note: undefined,
        },
      ];

      render(<LatestTransactionsTable transactions={transaction} />);

      expect(screen.getByText("No description")).toBeInTheDocument();
    });
  });

  describe("custom formatting", () => {
    it("should use custom currency formatter when provided", () => {
      const customFormatter = (amount: number) => `$${amount}`;
      const transaction: RecentTransaction[] = [
        {
          id: "1",
          type: "expense",
          amount: 50000,
          occurredAt: new Date("2024-01-15T10:00:00Z"),
          categoryName: "Food",
        },
      ];

      render(
        <LatestTransactionsTable
          transactions={transaction}
          formatCurrency={customFormatter}
        />,
      );

      expect(screen.getByText(/-\$50000/)).toBeInTheDocument();
    });
  });

  describe("sorting and order", () => {
    it("should maintain order of transactions as provided", () => {
      render(<LatestTransactionsTable transactions={mockTransactions} />);

      const rows = screen.getAllByRole("row");
      // Skip header row
      const dataRows = rows.slice(1);

      // First transaction should be the first data row
      expect(dataRows[0]).toHaveTextContent("Food");
      // Second transaction should be the second data row
      expect(dataRows[1]).toHaveTextContent("Salary");
    });
  });
});
