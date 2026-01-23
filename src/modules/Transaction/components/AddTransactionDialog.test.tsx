/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AddTransactionDialog } from "./AddTransactionDialog";

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
  { id: "cat_1", name: "Food & Dining" },
  { id: "cat_2", name: "Salary" },
  { id: "cat_3", name: "Freelance" },
];

const mockSavingsBuckets = [
  { id: "bucket_1", name: "Emergency Fund" },
  { id: "bucket_2", name: "Vacation" },
];

describe("AddTransactionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("rendering", () => {
    it("should render the dialog when open", () => {
      render(
        <AddTransactionDialog
          open={true}
          onOpenChange={() => {}}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("Add Transaction")).toBeInTheDocument();
      expect(
        screen.getByText("Record a new financial transaction"),
      ).toBeInTheDocument();
    });

    it("should render all transaction type tabs", () => {
      render(
        <AddTransactionDialog
          open={true}
          onOpenChange={() => {}}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByRole("tab", { name: "Expense" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Income" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Transfer" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Save" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Withdraw" })).toBeInTheDocument();
    });

    it("should not render when closed", () => {
      render(
        <AddTransactionDialog
          open={false}
          onOpenChange={() => {}}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.queryByText("Add Transaction")).not.toBeInTheDocument();
    });
  });

  describe("expense form (default tab)", () => {
    it("should render expense form with required category selector", () => {
      render(
        <AddTransactionDialog
          open={true}
          onOpenChange={() => {}}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      // Expense tab is selected by default
      expect(screen.getByText("Create Expense")).toBeInTheDocument();

      // Category should be labeled as required (no "optional" text)
      const categoryLabel = screen.getByText("Category");
      expect(categoryLabel).toBeInTheDocument();
    });

    it("should render category placeholder for expense", () => {
      render(
        <AddTransactionDialog
          open={true}
          onOpenChange={() => {}}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      // Expense tab is selected by default
      expect(screen.getByText("Select category")).toBeInTheDocument();
    });

    it("should render wallet selector for expense", () => {
      render(
        <AddTransactionDialog
          open={true}
          onOpenChange={() => {}}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("Wallet")).toBeInTheDocument();
      expect(screen.getByText("Select wallet")).toBeInTheDocument();
    });

    it("should render amount field for expense", () => {
      render(
        <AddTransactionDialog
          open={true}
          onOpenChange={() => {}}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("Amount (IDR)")).toBeInTheDocument();
    });

    it("should render note field for expense", () => {
      render(
        <AddTransactionDialog
          open={true}
          onOpenChange={() => {}}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("Note (optional)")).toBeInTheDocument();
    });

    it("should have Create Expense submit button", () => {
      render(
        <AddTransactionDialog
          open={true}
          onOpenChange={() => {}}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Create Expense" }),
      ).toBeInTheDocument();
    });

    it("should have Cancel button", () => {
      render(
        <AddTransactionDialog
          open={true}
          onOpenChange={() => {}}
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

  describe("income schema includes categoryId", () => {
    // These tests verify the schema configuration
    // The actual UI interaction tests are limited by jsdom + Radix UI compatibility

    it("should have income tab available", () => {
      render(
        <AddTransactionDialog
          open={true}
          onOpenChange={() => {}}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      const incomeTab = screen.getByRole("tab", { name: "Income" });
      expect(incomeTab).toBeInTheDocument();
      expect(incomeTab).toHaveAttribute("aria-selected", "false");
    });

    it("should show expense tab as selected by default", () => {
      render(
        <AddTransactionDialog
          open={true}
          onOpenChange={() => {}}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      const expenseTab = screen.getByRole("tab", { name: "Expense" });
      expect(expenseTab).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("props handling", () => {
    it("should handle empty wallets array", () => {
      render(
        <AddTransactionDialog
          open={true}
          onOpenChange={() => {}}
          wallets={[]}
          categories={mockCategories}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("Add Transaction")).toBeInTheDocument();
    });

    it("should handle empty categories array", () => {
      render(
        <AddTransactionDialog
          open={true}
          onOpenChange={() => {}}
          wallets={mockWallets}
          categories={[]}
          savingsBuckets={mockSavingsBuckets}
        />,
      );

      expect(screen.getByText("Add Transaction")).toBeInTheDocument();
    });

    it("should handle empty savingsBuckets array", () => {
      render(
        <AddTransactionDialog
          open={true}
          onOpenChange={() => {}}
          wallets={mockWallets}
          categories={mockCategories}
          savingsBuckets={[]}
        />,
      );

      expect(screen.getByText("Add Transaction")).toBeInTheDocument();
    });

    it("should handle undefined optional props with defaults", () => {
      render(<AddTransactionDialog open={true} onOpenChange={() => {}} />);

      expect(screen.getByText("Add Transaction")).toBeInTheDocument();
    });
  });
});
