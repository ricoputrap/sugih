import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBudgetsData } from "./useBudgetsData";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const mockBudgetsResponse = {
  budgets: [
    {
      id: "budget-1",
      month: "2026-01-01",
      category_id: "cat-1",
      savings_bucket_id: null,
      amount_idr: 1000000,
      note: null,
      created_at: new Date(),
      updated_at: new Date(),
      category_name: "Food",
      savings_bucket_name: null,
      target_type: "category" as const,
    },
  ],
  summary: {
    totalBudget: 1000000,
    totalSpent: 500000,
    remaining: 500000,
    items: [
      {
        categoryId: "cat-1",
        savingsBucketId: null,
        targetName: "Food",
        targetType: "category" as const,
        budgetAmount: 1000000,
        spentAmount: 500000,
        remaining: 500000,
        percentUsed: 50,
      },
    ],
  },
};

describe("useBudgetsData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fetches budgets data for a month", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockBudgetsResponse),
    });

    const { result } = renderHook(() => useBudgetsData("2026-01-01"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockBudgetsResponse);
    expect(mockFetch).toHaveBeenCalledWith("/api/budgets?month=2026-01-01");
  });

  it("handles fetch error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useBudgetsData("2026-01-01"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Failed to fetch budgets");
  });

  it("does not fetch when month is empty", () => {
    const { result } = renderHook(() => useBudgetsData(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("includes budgets and summary in the response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockBudgetsResponse),
    });

    const { result } = renderHook(() => useBudgetsData("2026-01-01"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.budgets).toHaveLength(1);
    expect(result.current.data?.summary).toBeDefined();
    expect(result.current.data?.summary.totalBudget).toBe(1000000);
  });
});
