import { act, renderHook } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  });

  it("returns 'list' as default when no URL param", () => {
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

  it("updates view to grid when setView is called", async () => {
    const { result } = renderHook(() => useBudgetView(), {
      wrapper: createWrapper(),
    });

    const [, setView] = result.current;
    await act(async () => {
      await setView("grid");
    });

    const [updatedView] = result.current;
    expect(updatedView).toBe("grid");
  });

  it("updates view from grid to list", async () => {
    const { result } = renderHook(() => useBudgetView(), {
      wrapper: createWrapper({ view: "grid" }),
    });

    const [, setView] = result.current;
    await act(async () => {
      await setView("list");
    });

    const [updatedView] = result.current;
    expect(updatedView).toBe("list");
  });

  it("handles setting the same view value idempotently", async () => {
    const { result } = renderHook(() => useBudgetView(), {
      wrapper: createWrapper({ view: "list" }),
    });

    const [, setView] = result.current;

    // Should not error when setting same value
    await act(async () => {
      await setView("list");
    });

    const [updatedView] = result.current;
    expect(updatedView).toBe("list");
  });
});
