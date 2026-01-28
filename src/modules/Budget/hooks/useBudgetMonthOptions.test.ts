import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBudgetMonthOptions } from "./useBudgetMonthOptions";

// Mock the months utility to have predictable test results
vi.mock("../utils/months", () => ({
  generateMonthOptions: vi.fn(() => [
    { value: "2025-07-01", label: "July 2025" },
    { value: "2025-08-01", label: "August 2025" },
    { value: "2025-09-01", label: "September 2025" },
    { value: "2025-10-01", label: "October 2025" },
    { value: "2025-11-01", label: "November 2025" },
    { value: "2025-12-01", label: "December 2025" },
    { value: "2026-01-01", label: "January 2026" },
    { value: "2026-02-01", label: "February 2026" },
    { value: "2026-03-01", label: "March 2026" },
    { value: "2026-04-01", label: "April 2026" },
    { value: "2026-05-01", label: "May 2026" },
    { value: "2026-06-01", label: "June 2026" },
    { value: "2026-07-01", label: "July 2026" },
    { value: "2026-08-01", label: "August 2026" },
    { value: "2026-09-01", label: "September 2026" },
    { value: "2026-10-01", label: "October 2026" },
    { value: "2026-11-01", label: "November 2026" },
    { value: "2026-12-01", label: "December 2026" },
  ]),
}));

describe("useBudgetMonthOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns an array of month options", () => {
    const { result } = renderHook(() => useBudgetMonthOptions());

    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current.length).toBe(18);
  });

  it("each option has value and label properties", () => {
    const { result } = renderHook(() => useBudgetMonthOptions());

    result.current.forEach((option) => {
      expect(option).toHaveProperty("value");
      expect(option).toHaveProperty("label");
      expect(typeof option.value).toBe("string");
      expect(typeof option.label).toBe("string");
    });
  });

  it("values are in YYYY-MM-01 format", () => {
    const { result } = renderHook(() => useBudgetMonthOptions());

    result.current.forEach((option) => {
      expect(option.value).toMatch(/^\d{4}-\d{2}-01$/);
    });
  });

  it("returns the same reference on re-render (memoized)", () => {
    const { result, rerender } = renderHook(() => useBudgetMonthOptions());

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
  });
});
