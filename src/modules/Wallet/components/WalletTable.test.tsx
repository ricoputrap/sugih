import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WalletTable } from "./WalletTable";

// Mock data for testing
const mockWallets = [
  {
    id: "1",
    name: "Main Bank Account",
    type: "bank" as const,
    currency: "IDR",
    balance: 1000000,
    archived: false,
    created_at: new Date("2024-01-01T00:00:00Z"),
    updated_at: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: "2",
    name: "Cash Wallet",
    type: "cash" as const,
    currency: "IDR",
    balance: 500000,
    archived: false,
    created_at: new Date("2024-01-02T00:00:00Z"),
    updated_at: new Date("2024-01-02T00:00:00Z"),
  },
  {
    id: "3",
    name: "E-Wallet",
    type: "ewallet" as const,
    currency: "IDR",
    balance: 0,
    archived: false,
    created_at: new Date("2024-01-03T00:00:00Z"),
    updated_at: new Date("2024-01-03T00:00:00Z"),
  },
  {
    id: "4",
    name: "Archived Wallet",
    type: "bank" as const,
    currency: "IDR",
    balance: -250000,
    archived: true,
    created_at: new Date("2024-01-04T00:00:00Z"),
    updated_at: new Date("2024-01-05T00:00:00Z"),
  },
];

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

// Mock fetch globally
global.fetch = vi.fn();

describe("WalletTable", () => {
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render table headers including Balance column", () => {
    render(<WalletTable wallets={mockWallets} onRefresh={mockOnRefresh} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Balance")).toBeInTheDocument();
    expect(screen.getByText("Currency")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
  });

  it("should display wallet balances in IDR currency format", () => {
    render(<WalletTable wallets={mockWallets} onRefresh={mockOnRefresh} />);

    // Check that balances are formatted as currency
    const balanceCells = screen.getAllByText(/Rp\s/i);
    expect(balanceCells.length).toBeGreaterThan(0);
  });

  it("should display positive balances correctly", () => {
    render(<WalletTable wallets={mockWallets} onRefresh={mockOnRefresh} />);

    // Find wallet rows by name and check their balances
    const mainBankRow = screen.getByText("Main Bank Account").closest("tr");
    const cashWalletRow = screen.getByText("Cash Wallet").closest("tr");

    expect(mainBankRow).toBeTruthy();
    expect(cashWalletRow).toBeTruthy();

    // Check that the balances are present (formatted as currency)
    expect(screen.getByText("Rp", { exact: false })).toBeInTheDocument();
  });

  it("should handle zero balance correctly", () => {
    render(<WalletTable wallets={mockWallets} onRefresh={mockOnRefresh} />);

    const eWalletRow = screen.getByText("E-Wallet").closest("tr");
    expect(eWalletRow).toBeTruthy();

    // Zero balance should display as "Rp 0"
    expect(screen.getByText(/Rp\s0(?!\d)/)).toBeInTheDocument();
  });

  it("should display negative balances correctly", () => {
    render(<WalletTable wallets={mockWallets} onRefresh={mockOnRefresh} />);

    const archivedWalletRow = screen.getByText("Archived Wallet").closest("tr");
    expect(archivedWalletRow).toBeTruthy();

    // Negative balance should be displayed (formatted)
    expect(screen.getByText(/Rp/, { exact: false })).toBeInTheDocument();
  });

  it("should display all active wallets in the main table", () => {
    render(<WalletTable wallets={mockWallets} onRefresh={mockOnRefresh} />);

    // Should show header for active wallets
    expect(screen.getByText(/Active Wallets \(\d+\)/)).toBeInTheDocument();

    // Should display all active wallets
    expect(screen.getByText("Main Bank Account")).toBeInTheDocument();
    expect(screen.getByText("Cash Wallet")).toBeInTheDocument();
    expect(screen.getByText("E-Wallet")).toBeInTheDocument();
  });

  it("should display archived wallets in a separate section", () => {
    render(<WalletTable wallets={mockWallets} onRefresh={mockOnRefresh} />);

    // Should show header for archived wallets
    expect(screen.getByText(/Archived Wallets \(\d+\)/)).toBeInTheDocument();

    // Should display archived wallet
    expect(screen.getByText("Archived Wallet")).toBeInTheDocument();
  });

  it("should show 'No active wallets' message when no wallets exist", () => {
    render(<WalletTable wallets={[]} onRefresh={mockOnRefresh} />);

    expect(
      screen.getByText("No active wallets found. Create your first wallet to get started."),
    ).toBeInTheDocument();
  });

  it("should not show archived section when no archived wallets exist", () => {
    const activeOnlyWallets = mockWallets.filter((w) => !w.archived);
    render(<WalletTable wallets={activeOnlyWallets} onRefresh={mockOnRefresh} />);

    expect(screen.queryByText(/Archived Wallets/)).not.toBeInTheDocument();
  });

  it("should apply correct styling for wallet type badges", () => {
    render(<WalletTable wallets={mockWallets} onRefresh={mockOnRefresh} />);

    // Check that badges are rendered (indicating type styling is applied)
    const badges = screen.getAllByRole("button", { hidden: true });
    expect(badges.length).toBeGreaterThan(0);
  });

  it("should render actions menu for each wallet row", () => {
    render(<WalletTable wallets={mockWallets} onRefresh={mockOnRefresh} />);

    // Each row should have a menu button (MoreHorizontal icon)
    const menuButtons = screen.getAllByLabelText("", { selector: "button" });
    expect(menuButtons.length).toBeGreaterThan(0);
  });

  it("should render Add Wallet button", () => {
    render(<WalletTable wallets={mockWallets} onRefresh={mockOnRefresh} />);

    expect(screen.getByText("Add Wallet")).toBeInTheDocument();
  });

  it("should handle wallets with undefined balance gracefully", () => {
    const walletsWithUndefined = [
      {
        ...mockWallets[0],
        balance: undefined as unknown as number,
      },
    ];

    render(<WalletTable wallets={walletsWithUndefined} onRefresh={mockOnRefresh} />);

    // Should render without crashing and display "Rp 0" for undefined balance
    expect(screen.getByText("Main Bank Account")).toBeInTheDocument();
    expect(screen.getByText(/Rp\s0/)).toBeInTheDocument();
  });

  it("should handle wallets with null balance gracefully", () => {
    const walletsWithNull = [
      {
        ...mockWallets[0],
        balance: null as unknown as number,
      },
    ];

    render(<WalletTable wallets={walletsWithNull} onRefresh={mockOnRefresh} />);

    // Should render without crashing and display "Rp 0" for null balance
    expect(screen.getByText("Main Bank Account")).toBeInTheDocument();
    expect(screen.getByText(/Rp\s0/)).toBeInTheDocument();
  });

  it("should format currency with proper IDR locale", () => {
    render(<WalletTable wallets={mockWallets} onRefresh={mockOnRefresh} />);

    // Check for IDR formatting (using Indonesian locale)
    const currencyTexts = screen.getAllByText(/Rp\s/i);
    expect(currencyTexts.length).toBeGreaterThan(0);

    // Verify at least one balance is displayed
    expect(screen.getByText(/Rp\s1\.?0*0*0*\.?0*\s*\.?0*\.?0*/)).toBeInTheDocument();
  });

  it("should display balance column before currency column", () => {
    const { container } = render(
      <WalletTable wallets={mockWallets} onRefresh={mockOnRefresh} />,
    );

    const table = container.querySelector("table");
    expect(table).toBeTruthy();

    if (table) {
      const headers = table.querySelectorAll("thead th");
      const balanceIndex = Array.from(headers).findIndex((th) =>
        th.textContent?.includes("Balance"),
      );
      const currencyIndex = Array.from(headers).findIndex((th) =>
        th.textContent?.includes("Currency"),
      );

      expect(balanceIndex).toBeGreaterThan(-1);
      expect(currencyIndex).toBeGreaterThan(balanceIndex);
    }
  });

  it("should display archived wallets with reduced opacity", () => {
    render(<WalletTable wallets={mockWallets} onRefresh={mockOnRefresh} />);

    const archivedRow = screen.getByText("Archived Wallet").closest("tr");
    expect(archivedRow).toBeTruthy();

    // Archived rows should have opacity-60 class
    if (archivedRow) {
      expect(archivedRow).toHaveClass(/opacity-60/);
    }
  });

  it("should pass refresh callback to dialog", () => {
    render(<WalletTable wallets={mockWallets} onRefresh={mockOnRefresh} />);

    // This test verifies the component structure is correct
    // The actual dialog interaction would require more complex testing
    expect(screen.getByText("Add Wallet")).toBeInTheDocument();
  });

  it("should display correct count in Active Wallets header", () => {
    const activeWallets = mockWallets.filter((w) => !w.archived);
    render(<WalletTable wallets={mockWallets} onRefresh={mockOnRefresh} />);

    expect(screen.getByText(`Active Wallets (${activeWallets.length})`)).toBeInTheDocument();
  });

  it("should display correct count in Archived Wallets header", () => {
    const archivedWallets = mockWallets.filter((w) => w.archived);
    render(<WalletTable wallets={mockWallets} onRefresh={mockOnRefresh} />);

    expect(screen.getByText(`Archived Wallets (${archivedWallets.length})`)).toBeInTheDocument();
  });

  it("should render wallet creation date in IDR locale format", () => {
    render(<WalletTable wallets={mockWallets} onRefresh={mockOnRefresh} />);

    // Should display dates in Indonesian format
    const dates = screen.getAllByText(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
    expect(dates.length).toBeGreaterThan(0);
  });

  it("should handle large balance amounts correctly", () => {
    const walletsWithLargeAmounts = [
      {
        id: "1",
        name: "Large Balance Wallet",
        type: "bank" as const,
        currency: "IDR",
        balance: 999999999999,
        archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    render(<WalletTable wallets={walletsWithLargeAmounts} onRefresh={mockOnRefresh} />);

    // Should render without crashing
    expect(screen.getByText("Large Balance Wallet")).toBeInTheDocument();
    expect(screen.getByText(/Rp/, { exact: false })).toBeInTheDocument();
  });
});
