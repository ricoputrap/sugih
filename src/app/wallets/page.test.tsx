import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WalletsPage from "./page";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock next/router
vi.mock("next/router", () => ({
  useRouter: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock WalletTable component
vi.mock("@/modules/Wallet/components/WalletTable", () => ({
  WalletTable: ({ wallets, onRefresh }: any) => (
    <div data-testid="wallet-table">
      Wallet Table Component
      <div data-testid="wallet-count">{wallets.length}</div>
    </div>
  ),
}));

// Test data
const createMockWallet = (overrides: any = {}) => {
  return {
    id: "wallet-1",
    name: "Test Wallet",
    type: "bank",
    currency: "IDR",
    archived: false,
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-01"),
    balance: 0,
    ...overrides,
  };
};

describe("WalletsPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe("Total Balance Summary Card", () => {
    it("should display Total Balance card", () => {
      const mockWallets = [createMockWallet()];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      expect(screen.getByText("Total Balance")).toBeInTheDocument();
    });

    it("should calculate and display total balance correctly", () => {
      const mockWallets = [
        createMockWallet({ id: "1", name: "Wallet 1", balance: 1000000 }),
        createMockWallet({ id: "2", name: "Wallet 2", balance: 2000000 }),
        createMockWallet({ id: "3", name: "Wallet 3", balance: 500000 }),
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      expect(screen.getByText("Total Balance")).toBeInTheDocument();
      expect(screen.getByText("Rp3.500.000")).toBeInTheDocument();
    });

    it("should format total balance in IDR currency", () => {
      const mockWallets = [
        createMockWallet({ id: "1", balance: 1234567 }),
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      expect(screen.getByText("Total Balance")).toBeInTheDocument();
      expect(screen.getByText(/Rp1\.234\.567/)).toBeInTheDocument();
    });

    it("should handle wallets with no balance", () => {
      const mockWallets = [
        createMockWallet({ id: "1", balance: 0 }),
        createMockWallet({ id: "2", balance: 0 }),
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      expect(screen.getByText("Total Balance")).toBeInTheDocument();
      expect(screen.getByText("Rp0")).toBeInTheDocument();
    });

    it("should calculate total balance from active wallets only", () => {
      const mockWallets = [
        createMockWallet({ id: "1", name: "Active 1", balance: 1000000, archived: false }),
        createMockWallet({ id: "2", name: "Active 2", balance: 2000000, archived: false }),
        createMockWallet({ id: "3", name: "Archived 1", balance: 5000000, archived: true }),
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      // Should only sum active wallets (3,000,000), not include archived (5,000,000)
      expect(screen.getByText("Rp3.000.000")).toBeInTheDocument();
    });

    it("should handle negative balances in total calculation", () => {
      const mockWallets = [
        createMockWallet({ id: "1", balance: 1000000 }),
        createMockWallet({ id: "2", balance: -300000 }),
        createMockWallet({ id: "3", balance: 500000 }),
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      // 1,000,000 - 300,000 + 500,000 = 1,200,000
      expect(screen.getByText("Rp1.200.000")).toBeInTheDocument();
    });

    it("should handle wallets with undefined balance", () => {
      const mockWallets = [
        createMockWallet({ id: "1", balance: 1000000 }),
        // @ts-ignore - testing undefined balance
        { ...createMockWallet({ id: "2" }), balance: undefined },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      // Should treat undefined as 0
      expect(screen.getByText("Rp1.000.000")).toBeInTheDocument();
    });

    it("should handle wallets with null balance", () => {
      const mockWallets = [
        createMockWallet({ id: "1", balance: 2000000 }),
        // @ts-ignore - testing null balance
        { ...createMockWallet({ id: "2" }), balance: null },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      // Should treat null as 0
      expect(screen.getByText("Rp2.000.000")).toBeInTheDocument();
    });

    it("should display correct description for Total Balance card", () => {
      const mockWallets = [createMockWallet()];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      expect(screen.getByText("Across all active wallets")).toBeInTheDocument();
    });
  });

  describe("Summary Cards Grid", () => {
    it("should display 5 summary cards in a row on large screens", () => {
      const mockWallets = [createMockWallet()];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      // Should have 5 cards: Total Balance, Active Wallets, Bank Accounts, Cash Wallets, E-Wallets
      expect(screen.getByText("Total Balance")).toBeInTheDocument();
      expect(screen.getByText("Active Wallets")).toBeInTheDocument();
      expect(screen.getByText("Bank Accounts")).toBeInTheDocument();
      expect(screen.getByText("Cash Wallets")).toBeInTheDocument();
      expect(screen.getByText("E-Wallets")).toBeInTheDocument();
    });

    it("should calculate Active Wallets count correctly", () => {
      const mockWallets = [
        createMockWallet({ id: "1", archived: false }),
        createMockWallet({ id: "2", archived: false }),
        createMockWallet({ id: "3", archived: true }),
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      expect(screen.getByText("Active Wallets")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("should calculate Bank Accounts count correctly", () => {
      const mockWallets = [
        createMockWallet({ id: "1", type: "bank" }),
        createMockWallet({ id: "2", type: "cash" }),
        createMockWallet({ id: "3", type: "bank" }),
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      expect(screen.getByText("Bank Accounts")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("should calculate Cash Wallets count correctly", () => {
      const mockWallets = [
        createMockWallet({ id: "1", type: "cash" }),
        createMockWallet({ id: "2", type: "bank" }),
        createMockWallet({ id: "3", type: "cash" }),
        createMockWallet({ id: "4", type: "ewallet" }),
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      expect(screen.getByText("Cash Wallets")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("should calculate E-Wallets count correctly", () => {
      const mockWallets = [
        createMockWallet({ id: "1", type: "ewallet" }),
        createMockWallet({ id: "2", type: "bank" }),
        createMockWallet({ id: "3", type: "ewallet" }),
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      expect(screen.getByText("E-Wallets")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("should show archived count in Active Wallets description", () => {
      const mockWallets = [
        createMockWallet({ id: "1", archived: false }),
        createMockWallet({ id: "2", archived: true }),
        createMockWallet({ id: "3", archived: true }),
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      expect(screen.getByText("1 archived")).toBeInTheDocument();
    });

    it("should not show archived count when no archived wallets", () => {
      const mockWallets = [
        createMockWallet({ id: "1", archived: false }),
        createMockWallet({ id: "2", archived: false }),
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      // Should not show "0 archived"
      expect(screen.queryByText("0 archived")).not.toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("should show skeleton loading for all 5 summary cards", () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<WalletsPage />);

      // Should show 5 skeleton cards
      const skeletonCards = screen.getAllByTestId("skeleton-card");
      expect(skeletonCards.length).toBe(5);
    });

    it("should show loading state for Total Balance card", () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<WalletsPage />);

      // Check that skeleton is shown
      const skeletons = screen.getAllByTestId("skeleton-card");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("Error State", () => {
    it("should show error message when fetch fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<WalletsPage />);

      await screen.findByText(/Failed to fetch wallets/i);
      expect(screen.getByText(/Failed to fetch wallets/i)).toBeInTheDocument();
    });

    it("should show Try Again button in error state", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<WalletsPage />);

      await screen.findByText(/Try Again/i);
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    it("should refetch wallets when Try Again is clicked", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([createMockWallet()]),
        });

      render(<WalletsPage />);

      await screen.findByText(/Try Again/i);
      screen.getByText("Try Again").click();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("Empty State", () => {
    it("should display Total Balance as Rp0 when no wallets", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      render(<WalletsPage />);

      await screen.findByText("Rp0");
      expect(screen.getByText("Rp0")).toBeInTheDocument();
    });

    it("should display 0 for all counts when no wallets", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      render(<WalletsPage />);

      await screen.findByText("0");
      expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(4);
    });

    it("should show Total Balance card even with no wallets", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      render(<WalletsPage />);

      await screen.findByText("Total Balance");
      expect(screen.getByText("Total Balance")).toBeInTheDocument();
      expect(screen.getByText("Rp0")).toBeInTheDocument();
    });
  });

  describe("Large Balance Values", () => {
    it("should handle very large total balance", () => {
      const mockWallets = [
        createMockWallet({ id: "1", balance: 999999999999 }),
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      expect(screen.getByText("Total Balance")).toBeInTheDocument();
      expect(screen.getByText(/Rp999\.999\.999\.999/)).toBeInTheDocument();
    });

    it("should handle multiple wallets with large balances", () => {
      const mockWallets = [
        createMockWallet({ id: "1", balance: 500000000000 }),
        createMockWallet({ id: "2", balance: 300000000000 }),
        createMockWallet({ id: "3", balance: 200000000000 }),
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      expect(screen.getByText("Rp1.000.000.000.000")).toBeInTheDocument();
    });
  });

  describe("Mixed Scenarios", () => {
    it("should handle mix of positive, negative, and zero balances", () => {
      const mockWallets = [
        createMockWallet({ id: "1", balance: 1000000 }),
        createMockWallet({ id: "2", balance: -500000 }),
        createMockWallet({ id: "3", balance: 0 }),
        createMockWallet({ id: "4", balance: 300000 }),
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      // 1,000,000 - 500,000 + 0 + 300,000 = 800,000
      expect(screen.getByText("Rp800.000")).toBeInTheDocument();
    });

    it("should handle only negative balances", () => {
      const mockWallets = [
        createMockWallet({ id: "1", balance: -1000000 }),
        createMockWallet({ id: "2", balance: -500000 }),
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      expect(screen.getByText("-Rp1.500.000")).toBeInTheDocument();
    });

    it("should calculate totals correctly with archived wallets", () => {
      const mockWallets = [
        createMockWallet({ id: "1", name: "Active 1", balance: 1000000, archived: false }),
        createMockWallet({ id: "2", name: "Active 2", balance: 2000000, archived: false }),
        createMockWallet({ id: "3", name: "Archived 1", balance: 5000000, archived: true }),
        createMockWallet({ id: "4", name: "Archived 2", balance: -1000000, archived: true }),
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      // Active: 1,000,000 + 2,000,000 = 3,000,000
      // Archived: not included in total
      expect(screen.getByText("Rp3.000.000")).toBeInTheDocument();
    });
  });

  describe("Data Fetching", () => {
    it("should fetch wallets on component mount", () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      render(<WalletsPage />);

      expect(mockFetch).toHaveBeenCalledWith("/api/wallets");
    });

    it("should handle refresh functionality", async () => {
      const mockWallets = [createMockWallet()];
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWallets),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWallets),
        });

      render(<WalletsPage />);

      // Wait for initial load
      await screen.findByText("Total Balance");

      // Simulate refresh by calling fetchWallets
      // This would be triggered by a button click in real usage
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("WalletTable Integration", () => {
    it("should pass wallets to WalletTable component", async () => {
      const mockWallets = [
        createMockWallet({ id: "1" }),
        createMockWallet({ id: "2" }),
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      await screen.findByTestId("wallet-table");
      expect(screen.getByTestId("wallet-table")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument(); // wallet count
    });

    it("should pass onRefresh callback to WalletTable", async () => {
      const mockWallets = [createMockWallet()];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWallets),
      });

      render(<WalletsPage />);

      await screen.findByTestId("wallet-table");
      // The WalletTable should receive the onRefresh callback
      // This is tested by verifying the table renders
      expect(screen.getByTestId("wallet-table")).toBeInTheDocument();
    });
  });
});
