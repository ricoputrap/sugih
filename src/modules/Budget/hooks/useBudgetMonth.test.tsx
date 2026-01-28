import { act, renderHook } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBudgetMonth } from "./useBudgetMonth";

// Mock the months utility
vi.mock("../utils/months", () => ({
  getDefaultMonthKey: () => "2026-01-01",
}));

function createWrapper(initialSearchParams?: Record<string, string>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NuqsTestingAdapter searchParams={initialSearchParams}>
        {children}
      </NuqsTestingAdapter>
    );
  };
}

describe("useBudgetMonth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the default month when no URL param is set", () => {
    const { result } = renderHook(() => useBudgetMonth(), {
      wrapper: createWrapper(),
    });

    const [month] = result.current;
    expect(month).toBe("2026-01-01");
  });

  it("returns the month from URL param when set", () => {
    const { result } = renderHook(() => useBudgetMonth(), {
      wrapper: createWrapper({ month: "2026-03-01" }),
    });

    const [month] = result.current;
    expect(month).toBe("2026-03-01");
  });

  it("updates the month when setMonth is called", async () => {
    const { result } = renderHook(() => useBudgetMonth(), {
      wrapper: createWrapper(),
    });

    const [, setMonth] = result.current;

    await act(async () => {
      await setMonth("2026-06-01");
    });

    const [updatedMonth] = result.current;
    expect(updatedMonth).toBe("2026-06-01");
  });

  it("can set month to null to use default", async () => {
    const { result } = renderHook(() => useBudgetMonth(), {
      wrapper: createWrapper({ month: "2026-05-01" }),
    });

    const [initialMonth, setMonth] = result.current;
    expect(initialMonth).toBe("2026-05-01");

    await act(async () => {
      await setMonth(null);
    });

    const [resetMonth] = result.current;
    expect(resetMonth).toBe("2026-01-01");
  });
});
