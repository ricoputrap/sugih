import { describe, expect, it } from "vitest";
import { budgetKeys } from "./queryKeys";

describe("budgetKeys", () => {
  describe("all", () => {
    it("returns the base query key", () => {
      expect(budgetKeys.all).toEqual(["budgets"]);
    });
  });

  describe("month", () => {
    it("returns query key for a specific month", () => {
      expect(budgetKeys.month("2026-01-01")).toEqual([
        "budgets",
        "month",
        "2026-01-01",
      ]);
    });

    it("includes different months as different keys", () => {
      const jan = budgetKeys.month("2026-01-01");
      const feb = budgetKeys.month("2026-02-01");

      expect(jan).not.toEqual(feb);
      expect(jan[2]).toBe("2026-01-01");
      expect(feb[2]).toBe("2026-02-01");
    });
  });

  describe("monthsWithBudgets", () => {
    it("returns query key for months with budgets", () => {
      expect(budgetKeys.monthsWithBudgets()).toEqual([
        "budgets",
        "months-with-budgets",
      ]);
    });
  });

  describe("key hierarchy", () => {
    it("all keys share the same base prefix", () => {
      const monthKey = budgetKeys.month("2026-01-01");
      const monthsKey = budgetKeys.monthsWithBudgets();

      expect(monthKey[0]).toBe(budgetKeys.all[0]);
      expect(monthsKey[0]).toBe(budgetKeys.all[0]);
    });
  });
});
