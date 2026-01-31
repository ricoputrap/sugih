"use client";

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BudgetDialogForm } from "./BudgetDialogForm";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock dependencies
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock the hooks and stores
const mockCloseCreateDialog = vi.fn();
const mockCloseEditDialog = vi.fn();
const mockCreateBudgetMutateAsync = vi.fn();
const mockUpdateBudgetMutateAsync = vi.fn();

vi.mock("@/modules/Budget/hooks", () => ({
  useBudgetMonth: () => ["2026-01-01", vi.fn()],
  useBudgetMutations: () => ({
    createBudget: {
      mutateAsync: mockCreateBudgetMutateAsync,
      isPending: false,
    },
    updateBudget: {
      mutateAsync: mockUpdateBudgetMutateAsync,
      isPending: false,
    },
  }),
}));

let mockStoreState = {
  isCreateDialogOpen: true,
  isEditDialogOpen: false,
  selectedBudget: null as any,
};

vi.mock("@/modules/Budget/stores", () => ({
  useBudgetsPageStore: () => ({
    ...mockStoreState,
    closeCreateDialog: mockCloseCreateDialog,
    closeEditDialog: mockCloseEditDialog,
  }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockCategories = [
  { id: "cat1", name: "Food", type: "expense", archived: false },
  { id: "cat2", name: "Transport", type: "expense", archived: false },
];

const mockSavingsBuckets = [
  {
    id: "bucket1",
    name: "Emergency Fund",
    description: "For emergencies",
    archived: false,
  },
  {
    id: "bucket2",
    name: "Child School",
    description: "Child education",
    archived: false,
  },
];

// Create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("BudgetDialogForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    mockStoreState = {
      isCreateDialogOpen: true,
      isEditDialogOpen: false,
      selectedBudget: null,
    };
    // Mock fetch to return different data based on URL
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/categories") {
        return Promise.resolve({
          ok: true,
          json: async () => mockCategories,
        });
      }
      if (url === "/api/savings-buckets") {
        return Promise.resolve({
          ok: true,
          json: async () => mockSavingsBuckets,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });
  });

  describe("Expense-Only Category Filtering", () => {
    it("should fetch categories with type field", async () => {
      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId("budget-form-category")).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/categories");
      expect(mockFetch).toHaveBeenCalledWith("/api/savings-buckets");
    });

    it("should only display expense categories in the selector", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/categories") {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { id: "exp1", name: "Food", type: "expense", archived: false },
              {
                id: "exp2",
                name: "Transport",
                type: "expense",
                archived: false,
              },
              { id: "inc1", name: "Salary", type: "income", archived: false },
              { id: "inc2", name: "Bonus", type: "income", archived: false },
            ],
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockSavingsBuckets,
        });
      });

      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId("budget-form-category")).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/categories");
    });

    it("should not display income categories in the selector", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/categories") {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { id: "inc1", name: "Salary", type: "income", archived: false },
              {
                id: "inc2",
                name: "Freelance",
                type: "income",
                archived: false,
              },
            ],
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockSavingsBuckets,
        });
      });

      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId("budget-form-category")).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/categories");
    });

    it("should filter out both archived and income categories", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/categories") {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { id: "exp1", name: "Food", type: "expense", archived: false },
              {
                id: "exp2",
                name: "Old Expense",
                type: "expense",
                archived: true,
              },
              { id: "inc1", name: "Salary", type: "income", archived: false },
              {
                id: "inc2",
                name: "Old Income",
                type: "income",
                archived: true,
              },
            ],
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockSavingsBuckets,
        });
      });

      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId("budget-form-category")).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/categories");
    });

    it("should filter out archived expense categories", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/categories") {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { id: "exp1", name: "Food", type: "expense", archived: true },
              {
                id: "exp2",
                name: "Transport",
                type: "expense",
                archived: false,
              },
              { id: "inc1", name: "Salary", type: "income", archived: false },
            ],
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockSavingsBuckets,
        });
      });

      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId("budget-form-category")).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/categories");
    });
  });

  describe("Note Field Rendering", () => {
    it("should render note textarea field in create mode", async () => {
      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId("budget-form-note")).toBeInTheDocument();
      });

      const noteField = screen.getByTestId("budget-form-note");
      expect(noteField).toHaveAttribute(
        "placeholder",
        "Add a note to describe this budget allocation...",
      );
      expect(noteField).toHaveAttribute("maxLength", "500");
      expect(noteField).toHaveAttribute("rows", "3");
    });

    it("should render note textarea field in edit mode", async () => {
      mockStoreState = {
        isCreateDialogOpen: false,
        isEditDialogOpen: true,
        selectedBudget: {
          id: "budget1",
          month: "2024-01-01",
          category_id: "cat1",
          category_name: "Food",
          amount_idr: 1000000,
          note: "Test note",
        },
      };

      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId("budget-form-note")).toBeInTheDocument();
      });

      const noteField = screen.getByTestId("budget-form-note");
      expect(noteField).toHaveValue("Test note");
    });

    it("should display character counter", async () => {
      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("0/500")).toBeInTheDocument();
      });
    });

    it("should update character counter as user types", async () => {
      const user = userEvent.setup();

      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId("budget-form-note")).toBeInTheDocument();
      });

      const noteField = screen.getByTestId("budget-form-note");
      await user.type(noteField, "Test note content");

      await waitFor(() => {
        expect(screen.getByText("17/500")).toBeInTheDocument();
      });
    });
  });

  describe("Note Field Validation", () => {
    it("should accept notes up to 500 characters", async () => {
      const user = userEvent.setup();

      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId("budget-form-note")).toBeInTheDocument();
      });

      const noteField = screen.getByTestId("budget-form-note");
      const validNote = "a".repeat(500);
      await user.type(noteField, validNote);

      await waitFor(() => {
        expect(screen.getByText("500/500")).toBeInTheDocument();
      });
    });

    it("should prevent typing beyond 500 characters due to maxLength attribute", async () => {
      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId("budget-form-note")).toBeInTheDocument();
      });

      const noteField = screen.getByTestId("budget-form-note");
      expect(noteField).toHaveAttribute("maxLength", "500");
    });

    it("should accept empty note (optional field)", async () => {
      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId("budget-form-note")).toBeInTheDocument();
      });

      const noteField = screen.getByTestId("budget-form-note");
      expect(noteField).toHaveValue("");
    });
  });

  describe("Note Field Display", () => {
    it("should show Note label with Optional indicator", async () => {
      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Note \(Optional\)/i)).toBeInTheDocument();
      });
    });
  });

  describe("Savings Bucket Selection", () => {
    it("should render target type radio buttons in create mode", async () => {
      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Budget For")).toBeInTheDocument();
        expect(screen.getByText("Expense Category")).toBeInTheDocument();
        expect(screen.getByText("Savings Bucket")).toBeInTheDocument();
      });
    });

    it("should default to category selection in create mode", async () => {
      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId("budget-form-category")).toBeInTheDocument();
      });

      expect(
        screen.queryByTestId("budget-form-savings-bucket"),
      ).not.toBeInTheDocument();
    });

    it("should show savings bucket selector when savings bucket target is selected", async () => {
      const user = userEvent.setup();

      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Savings Bucket")).toBeInTheDocument();
      });

      const savingsBucketRadio = screen.getByLabelText(/Savings Bucket/i);
      await user.click(savingsBucketRadio);

      await waitFor(() => {
        expect(
          screen.getByTestId("budget-form-savings-bucket"),
        ).toBeInTheDocument();
      });

      expect(
        screen.queryByTestId("budget-form-category"),
      ).not.toBeInTheDocument();
    });

    it("should fetch savings buckets when dialog opens", async () => {
      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/savings-buckets");
      });
    });

    it("should filter out archived savings buckets", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/savings-buckets") {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { id: "bucket1", name: "Active Bucket", archived: false },
              { id: "bucket2", name: "Archived Bucket", archived: true },
            ],
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockCategories,
        });
      });

      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/savings-buckets");
      });
    });

    it("should display savings bucket name in edit mode for savings bucket budget", async () => {
      mockStoreState = {
        isCreateDialogOpen: false,
        isEditDialogOpen: true,
        selectedBudget: {
          id: "budget1",
          month: "2024-01-01",
          category_id: null,
          savings_bucket_id: "bucket1",
          category_name: null,
          savings_bucket_name: "Emergency Fund",
          amount_idr: 1000000,
          note: null,
          target_type: "savings_bucket" as const,
        },
      };

      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Savings Bucket")).toBeInTheDocument();
        expect(screen.getByText("Emergency Fund")).toBeInTheDocument();
      });
    });

    it("should not show target type radio buttons in edit mode", async () => {
      mockStoreState = {
        isCreateDialogOpen: false,
        isEditDialogOpen: true,
        selectedBudget: {
          id: "budget1",
          month: "2024-01-01",
          category_id: "cat1",
          savings_bucket_id: null,
          category_name: "Food",
          savings_bucket_name: null,
          amount_idr: 1000000,
          note: null,
          target_type: "category" as const,
        },
      };

      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Edit Budget")).toBeInTheDocument();
      });

      expect(screen.queryByText("Budget For")).not.toBeInTheDocument();
    });
  });

  describe("Dialog State", () => {
    it("should not render when dialog is closed", () => {
      mockStoreState = {
        isCreateDialogOpen: false,
        isEditDialogOpen: false,
        selectedBudget: null,
      };

      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      expect(screen.queryByText("Create New Budget")).not.toBeInTheDocument();
      expect(screen.queryByText("Edit Budget")).not.toBeInTheDocument();
    });

    it("should render create dialog when isCreateDialogOpen is true", async () => {
      mockStoreState = {
        isCreateDialogOpen: true,
        isEditDialogOpen: false,
        selectedBudget: null,
      };

      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Create New Budget")).toBeInTheDocument();
      });
    });

    it("should render edit dialog when isEditDialogOpen is true", async () => {
      mockStoreState = {
        isCreateDialogOpen: false,
        isEditDialogOpen: true,
        selectedBudget: {
          id: "budget1",
          month: "2024-01-01",
          category_id: "cat1",
          category_name: "Food",
          amount_idr: 1000000,
          note: null,
        },
      };

      render(<BudgetDialogForm />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Edit Budget")).toBeInTheDocument();
      });
    });
  });
});
