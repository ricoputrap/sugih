import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBudgetMutations } from "./useBudgetMutations";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return {
    wrapper: function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    },
    queryClient,
  };
}

const mockBudget = {
  id: "budget-1",
  month: "2026-01-01",
  category_id: "cat-1",
  savings_bucket_id: null,
  amount_idr: 1000000,
  note: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  category_name: "Food",
  savings_bucket_name: null,
  target_type: "category" as const,
};

describe("useBudgetMutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createBudget", () => {
    it("creates a budget and invalidates cache", async () => {
      const { wrapper, queryClient } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBudget),
      });

      const { result } = renderHook(() => useBudgetMutations(), { wrapper });

      await act(async () => {
        await result.current.createBudget.mutateAsync({
          month: "2026-01-01",
          categoryId: "cat-1",
          amountIdr: 1000000,
        });
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: "2026-01-01",
          categoryId: "cat-1",
          savingsBucketId: undefined,
          amountIdr: 1000000,
          note: undefined,
        }),
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["budgets", "month", "2026-01-01"],
      });
    });

    it("throws error on create failure", async () => {
      const { wrapper } = createWrapper();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Budget already exists" }),
      });

      const { result } = renderHook(() => useBudgetMutations(), { wrapper });

      await expect(
        result.current.createBudget.mutateAsync({
          month: "2026-01-01",
          categoryId: "cat-1",
          amountIdr: 1000000,
        }),
      ).rejects.toThrow("Budget already exists");
    });
  });

  describe("updateBudget", () => {
    it("updates a budget and invalidates cache", async () => {
      const { wrapper, queryClient } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...mockBudget, amount_idr: 2000000 }),
      });

      const { result } = renderHook(() => useBudgetMutations(), { wrapper });

      await act(async () => {
        await result.current.updateBudget.mutateAsync({
          id: "budget-1",
          month: "2026-01-01",
          amountIdr: 2000000,
          note: "Updated note",
        });
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/budgets/budget-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountIdr: 2000000,
          note: "Updated note",
        }),
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["budgets", "month", "2026-01-01"],
      });
    });
  });

  describe("deleteBudget", () => {
    it("deletes a budget and invalidates cache", async () => {
      const { wrapper, queryClient } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: "Budget deleted" }),
      });

      const { result } = renderHook(() => useBudgetMutations(), { wrapper });

      await act(async () => {
        await result.current.deleteBudget.mutateAsync({
          id: "budget-1",
          month: "2026-01-01",
        });
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/budgets/budget-1", {
        method: "DELETE",
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["budgets", "month", "2026-01-01"],
      });
    });
  });

  describe("copyBudgets", () => {
    it("copies budgets and invalidates both months", async () => {
      const { wrapper, queryClient } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            created: [mockBudget],
            skipped: [],
          }),
      });

      const { result } = renderHook(() => useBudgetMutations(), { wrapper });

      await act(async () => {
        await result.current.copyBudgets.mutateAsync({
          fromMonth: "2026-01-01",
          toMonth: "2026-02-01",
        });
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/budgets/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromMonth: "2026-01-01",
          toMonth: "2026-02-01",
        }),
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["budgets", "month", "2026-01-01"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["budgets", "month", "2026-02-01"],
      });
    });

    it("returns created and skipped budgets", async () => {
      const { wrapper } = createWrapper();

      const copyResult = {
        created: [mockBudget],
        skipped: [
          {
            categoryId: "cat-2",
            savingsBucketId: null,
            targetName: "Transport",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(copyResult),
      });

      const { result } = renderHook(() => useBudgetMutations(), { wrapper });

      let response: typeof copyResult | undefined;
      await act(async () => {
        response = await result.current.copyBudgets.mutateAsync({
          fromMonth: "2026-01-01",
          toMonth: "2026-02-01",
        });
      });

      expect(response).toEqual(copyResult);
    });
  });
});
