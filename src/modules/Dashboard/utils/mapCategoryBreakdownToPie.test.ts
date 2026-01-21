/**
 * Unit Tests: mapCategoryBreakdownToPie
 *
 * Tests for the category breakdown to pie chart data mapper utility.
 */

import { describe, expect, it } from "vitest";
import {
  mapCategoryBreakdownToPie,
  generateChartConfigFromBreakdown,
} from "./mapCategoryBreakdownToPie";
import type { CategoryBreakdownData } from "../schema";

describe("mapCategoryBreakdownToPie", () => {
  it("should convert category breakdown data to pie chart format", () => {
    const input: CategoryBreakdownData[] = [
      { categoryId: "1", categoryName: "Food", amount: 500000, percentage: 50 },
      {
        categoryId: "2",
        categoryName: "Transport",
        amount: 300000,
        percentage: 30,
      },
      {
        categoryId: "3",
        categoryName: "Entertainment",
        amount: 200000,
        percentage: 20,
      },
    ];

    const result = mapCategoryBreakdownToPie(input);

    expect(result).toEqual([
      { name: "food", amount: 500000, fill: "var(--color-food)" },
      { name: "transport", amount: 300000, fill: "var(--color-transport)" },
      {
        name: "entertainment",
        amount: 200000,
        fill: "var(--color-entertainment)",
      },
    ]);
  });

  it("should return empty array for undefined input", () => {
    const result = mapCategoryBreakdownToPie(undefined);
    expect(result).toEqual([]);
  });

  it("should return empty array for null input", () => {
    const result = mapCategoryBreakdownToPie(null);
    expect(result).toEqual([]);
  });

  it("should return empty array for empty array input", () => {
    const result = mapCategoryBreakdownToPie([]);
    expect(result).toEqual([]);
  });

  it("should filter out categories with zero amounts", () => {
    const input: CategoryBreakdownData[] = [
      { categoryId: "1", categoryName: "Food", amount: 500000, percentage: 100 },
      { categoryId: "2", categoryName: "Transport", amount: 0, percentage: 0 },
    ];

    const result = mapCategoryBreakdownToPie(input);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "food",
      amount: 500000,
      fill: "var(--color-food)",
    });
  });

  it("should handle category names with spaces", () => {
    const input: CategoryBreakdownData[] = [
      {
        categoryId: "1",
        categoryName: "Online Shopping",
        amount: 100000,
        percentage: 100,
      },
    ];

    const result = mapCategoryBreakdownToPie(input);

    expect(result[0]).toEqual({
      name: "online-shopping",
      amount: 100000,
      fill: "var(--color-online-shopping)",
    });
  });

  it("should handle category names with multiple spaces", () => {
    const input: CategoryBreakdownData[] = [
      {
        categoryId: "1",
        categoryName: "Food   And   Drinks",
        amount: 100000,
        percentage: 100,
      },
    ];

    const result = mapCategoryBreakdownToPie(input);

    expect(result[0].name).toBe("food-and-drinks");
  });

  it("should convert category names to lowercase", () => {
    const input: CategoryBreakdownData[] = [
      {
        categoryId: "1",
        categoryName: "GROCERIES",
        amount: 100000,
        percentage: 100,
      },
    ];

    const result = mapCategoryBreakdownToPie(input);

    expect(result[0].name).toBe("groceries");
  });
});

describe("generateChartConfigFromBreakdown", () => {
  it("should generate chart config from category breakdown data", () => {
    const input: CategoryBreakdownData[] = [
      { categoryId: "1", categoryName: "Food", amount: 500000, percentage: 50 },
      {
        categoryId: "2",
        categoryName: "Transport",
        amount: 300000,
        percentage: 30,
      },
    ];

    const result = generateChartConfigFromBreakdown(input);

    expect(result).toEqual({
      amount: { label: "Amount" },
      food: { label: "Food", color: "var(--chart-1)" },
      transport: { label: "Transport", color: "var(--chart-2)" },
    });
  });

  it("should return base config for undefined input", () => {
    const result = generateChartConfigFromBreakdown(undefined);
    expect(result).toEqual({ amount: { label: "Amount" } });
  });

  it("should return base config for null input", () => {
    const result = generateChartConfigFromBreakdown(null);
    expect(result).toEqual({ amount: { label: "Amount" } });
  });

  it("should return base config for empty array input", () => {
    const result = generateChartConfigFromBreakdown([]);
    expect(result).toEqual({ amount: { label: "Amount" } });
  });

  it("should cycle through chart colors when more than 5 categories", () => {
    const input: CategoryBreakdownData[] = [
      { categoryId: "1", categoryName: "Cat1", amount: 100, percentage: 16.67 },
      { categoryId: "2", categoryName: "Cat2", amount: 100, percentage: 16.67 },
      { categoryId: "3", categoryName: "Cat3", amount: 100, percentage: 16.67 },
      { categoryId: "4", categoryName: "Cat4", amount: 100, percentage: 16.67 },
      { categoryId: "5", categoryName: "Cat5", amount: 100, percentage: 16.67 },
      { categoryId: "6", categoryName: "Cat6", amount: 100, percentage: 16.67 },
    ];

    const result = generateChartConfigFromBreakdown(input);

    // 6th category should cycle back to first color
    expect(result["cat6"]).toEqual({
      label: "Cat6",
      color: "var(--chart-1)",
    });
  });

  it("should handle category names with spaces in config keys", () => {
    const input: CategoryBreakdownData[] = [
      {
        categoryId: "1",
        categoryName: "Online Shopping",
        amount: 100000,
        percentage: 100,
      },
    ];

    const result = generateChartConfigFromBreakdown(input);

    expect(result["online-shopping"]).toEqual({
      label: "Online Shopping",
      color: "var(--chart-1)",
    });
  });
});
