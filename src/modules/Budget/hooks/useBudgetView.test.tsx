import { act, renderHook } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBudgetView } from "./useBudgetView";

function createWrapper(initialSearchParams?: Record<string, string>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NuqsTestingAdapter searchParams={initialSearchParams}>
        {children}
      </NuqsTestingAdapter>
    );
  };
}

describe("useBudgetView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns 'list' as default when no URL param or localStorage", () => {
    const { result } = renderHook(() => useBudgetView(), {
      wrapper: createWrapper(),
    });

    const [view] = result.current;
    expect(view).toBe("list");
  });

  it("returns value from URL param when set", () => {
    const { result } = renderHook(() => useBudgetView(), {
      wrapper: createWrapper({ view: "grid" }),
    });

    const [view] = result.current;
    expect(view).toBe("grid");
  });

  it("uses localStorage value when no URL param", () => {
    localStorage.setItem("budgetViewMode", "grid");

    const { result } = renderHook(() => useBudgetView(), {
      wrapper: createWrapper(),
    });

    const [view] = result.current;
    expect(view).toBe("grid");
  });

  it("URL param takes precedence over localStorage", () => {
    localStorage.setItem("budgetViewMode", "grid");

    const { result } = renderHook(() => useBudgetView(), {
      wrapper: createWrapper({ view: "list" }),
    });

    const [view] = result.current;
    expect(view).toBe("list");
  });

  it("updates view and localStorage when setView is called", async () => {
    const { result } = renderHook(() => useBudgetView(), {
      wrapper: createWrapper(),
    });

    const [, setView] = result.current;

    await act(async () => {
      await setView("grid");
    });

    const [updatedView] = result.current;
    expect(updatedView).toBe("grid");
    expect(localStorage.getItem("budgetViewMode")).toBe("grid");
  });

  it("falls back to 'list' for invalid localStorage value", () => {
    localStorage.setItem("budgetViewMode", "invalid");

    const { result } = renderHook(() => useBudgetView(), {
      wrapper: createWrapper(),
    });

    const [view] = result.current;
    expect(view).toBe("list");
  });
});
