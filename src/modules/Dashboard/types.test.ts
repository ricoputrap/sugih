/**
 * Dashboard Revamp Types Tests
 *
 * Unit tests for type guards, constants, and label mappings.
 * Ensures exhaustive coverage of all enum values.
 */

import { describe, expect, it } from "vitest";
import {
  CHART_VARIANT_LABELS,
  CHART_VARIANTS,
  type ChartVariant,
  DATE_RANGE_PRESET_LABELS,
  DATE_RANGE_PRESETS,
  type DateRangePreset,
  INSIGHT_TAB_LABELS,
  INSIGHT_TABS,
  type InsightTab,
  isChartVariant,
  isDateRangePreset,
  isInsightTab,
  isPeriod,
  PERIOD_LABELS,
  PERIODS,
  type Period,
} from "./types";

describe("Dashboard Revamp Types", () => {
  describe("Constants", () => {
    it("should have all insight tabs defined", () => {
      expect(INSIGHT_TABS).toEqual([
        "netWorth",
        "spending",
        "income",
        "savings",
      ]);
      expect(INSIGHT_TABS).toHaveLength(4);
    });

    it("should have all periods defined", () => {
      expect(PERIODS).toEqual(["daily", "weekly", "monthly"]);
      expect(PERIODS).toHaveLength(3);
    });

    it("should have all date range presets defined", () => {
      expect(DATE_RANGE_PRESETS).toEqual([
        "last_week",
        "this_month",
        "last_month",
        "last_3_months",
        "last_6_months",
        "this_year",
        "last_year",
        "all",
      ]);
      expect(DATE_RANGE_PRESETS).toHaveLength(8);
    });

    it("should have all chart variants defined", () => {
      expect(CHART_VARIANTS).toEqual(["line", "area"]);
      expect(CHART_VARIANTS).toHaveLength(2);
    });
  });

  describe("INSIGHT_TAB_LABELS", () => {
    it("should have labels for all insight tabs", () => {
      for (const tab of INSIGHT_TABS) {
        expect(INSIGHT_TAB_LABELS[tab]).toBeDefined();
        expect(typeof INSIGHT_TAB_LABELS[tab]).toBe("string");
        expect(INSIGHT_TAB_LABELS[tab].length).toBeGreaterThan(0);
      }
    });

    it("should have exactly 4 labels matching insight tabs count", () => {
      expect(Object.keys(INSIGHT_TAB_LABELS)).toHaveLength(INSIGHT_TABS.length);
    });

    it("should have specific expected labels", () => {
      expect(INSIGHT_TAB_LABELS.netWorth).toBe("Net Worth Growth");
      expect(INSIGHT_TAB_LABELS.spending).toBe("Spending Trends");
      expect(INSIGHT_TAB_LABELS.income).toBe("Income Trends");
      expect(INSIGHT_TAB_LABELS.savings).toBe("Savings Trends");
    });
  });

  describe("PERIOD_LABELS", () => {
    it("should have labels for all periods", () => {
      for (const period of PERIODS) {
        expect(PERIOD_LABELS[period]).toBeDefined();
        expect(typeof PERIOD_LABELS[period]).toBe("string");
        expect(PERIOD_LABELS[period].length).toBeGreaterThan(0);
      }
    });

    it("should have exactly 3 labels matching periods count", () => {
      expect(Object.keys(PERIOD_LABELS)).toHaveLength(PERIODS.length);
    });

    it("should have specific expected labels", () => {
      expect(PERIOD_LABELS.daily).toBe("Daily");
      expect(PERIOD_LABELS.weekly).toBe("Weekly");
      expect(PERIOD_LABELS.monthly).toBe("Monthly");
    });
  });

  describe("DATE_RANGE_PRESET_LABELS", () => {
    it("should have labels for all date range presets", () => {
      for (const preset of DATE_RANGE_PRESETS) {
        expect(DATE_RANGE_PRESET_LABELS[preset]).toBeDefined();
        expect(typeof DATE_RANGE_PRESET_LABELS[preset]).toBe("string");
        expect(DATE_RANGE_PRESET_LABELS[preset].length).toBeGreaterThan(0);
      }
    });

    it("should have exactly 8 labels matching date range presets count", () => {
      expect(Object.keys(DATE_RANGE_PRESET_LABELS)).toHaveLength(
        DATE_RANGE_PRESETS.length,
      );
    });

    it("should have specific expected labels", () => {
      expect(DATE_RANGE_PRESET_LABELS.last_week).toBe("Last Week");
      expect(DATE_RANGE_PRESET_LABELS.this_month).toBe("This Month");
      expect(DATE_RANGE_PRESET_LABELS.last_month).toBe("Last Month");
      expect(DATE_RANGE_PRESET_LABELS.last_3_months).toBe("Last 3 Months");
      expect(DATE_RANGE_PRESET_LABELS.last_6_months).toBe("Last 6 Months");
      expect(DATE_RANGE_PRESET_LABELS.this_year).toBe("This Year");
      expect(DATE_RANGE_PRESET_LABELS.last_year).toBe("Last Year");
      expect(DATE_RANGE_PRESET_LABELS.all).toBe("All Time");
    });
  });

  describe("CHART_VARIANT_LABELS", () => {
    it("should have labels for all chart variants", () => {
      for (const variant of CHART_VARIANTS) {
        expect(CHART_VARIANT_LABELS[variant]).toBeDefined();
        expect(typeof CHART_VARIANT_LABELS[variant]).toBe("string");
        expect(CHART_VARIANT_LABELS[variant].length).toBeGreaterThan(0);
      }
    });

    it("should have exactly 2 labels matching chart variants count", () => {
      expect(Object.keys(CHART_VARIANT_LABELS)).toHaveLength(
        CHART_VARIANTS.length,
      );
    });

    it("should have specific expected labels", () => {
      expect(CHART_VARIANT_LABELS.line).toBe("Line");
      expect(CHART_VARIANT_LABELS.area).toBe("Area");
    });
  });

  describe("isInsightTab type guard", () => {
    it("should return true for valid insight tabs", () => {
      expect(isInsightTab("netWorth")).toBe(true);
      expect(isInsightTab("spending")).toBe(true);
      expect(isInsightTab("income")).toBe(true);
      expect(isInsightTab("savings")).toBe(true);
    });

    it("should return false for invalid values", () => {
      expect(isInsightTab("invalid")).toBe(false);
      expect(isInsightTab("")).toBe(false);
      expect(isInsightTab(null)).toBe(false);
      expect(isInsightTab(undefined)).toBe(false);
      expect(isInsightTab(123)).toBe(false);
      expect(isInsightTab({})).toBe(false);
      expect(isInsightTab([])).toBe(false);
      expect(isInsightTab(true)).toBe(false);
    });

    it("should handle all valid insight tabs from constant", () => {
      for (const tab of INSIGHT_TABS) {
        expect(isInsightTab(tab)).toBe(true);
      }
    });
  });

  describe("isPeriod type guard", () => {
    it("should return true for valid periods", () => {
      expect(isPeriod("daily")).toBe(true);
      expect(isPeriod("weekly")).toBe(true);
      expect(isPeriod("monthly")).toBe(true);
    });

    it("should return false for invalid values", () => {
      expect(isPeriod("invalid")).toBe(false);
      expect(isPeriod("yearly")).toBe(false);
      expect(isPeriod("")).toBe(false);
      expect(isPeriod(null)).toBe(false);
      expect(isPeriod(undefined)).toBe(false);
      expect(isPeriod(123)).toBe(false);
      expect(isPeriod({})).toBe(false);
      expect(isPeriod([])).toBe(false);
    });

    it("should handle all valid periods from constant", () => {
      for (const period of PERIODS) {
        expect(isPeriod(period)).toBe(true);
      }
    });
  });

  describe("isDateRangePreset type guard", () => {
    it("should return true for valid date range presets", () => {
      expect(isDateRangePreset("last_week")).toBe(true);
      expect(isDateRangePreset("this_month")).toBe(true);
      expect(isDateRangePreset("last_month")).toBe(true);
      expect(isDateRangePreset("last_3_months")).toBe(true);
      expect(isDateRangePreset("last_6_months")).toBe(true);
      expect(isDateRangePreset("this_year")).toBe(true);
      expect(isDateRangePreset("last_year")).toBe(true);
      expect(isDateRangePreset("all")).toBe(true);
    });

    it("should return false for invalid values", () => {
      expect(isDateRangePreset("invalid")).toBe(false);
      expect(isDateRangePreset("nextMonth")).toBe(false);
      expect(isDateRangePreset("")).toBe(false);
      expect(isDateRangePreset(null)).toBe(false);
      expect(isDateRangePreset(undefined)).toBe(false);
      expect(isDateRangePreset(123)).toBe(false);
      expect(isDateRangePreset({})).toBe(false);
    });

    it("should handle all valid presets from constant", () => {
      for (const preset of DATE_RANGE_PRESETS) {
        expect(isDateRangePreset(preset)).toBe(true);
      }
    });
  });

  describe("isChartVariant type guard", () => {
    it("should return true for valid chart variants", () => {
      expect(isChartVariant("line")).toBe(true);
      expect(isChartVariant("area")).toBe(true);
    });

    it("should return false for invalid values", () => {
      expect(isChartVariant("bar")).toBe(false);
      expect(isChartVariant("pie")).toBe(false);
      expect(isChartVariant("")).toBe(false);
      expect(isChartVariant(null)).toBe(false);
      expect(isChartVariant(undefined)).toBe(false);
      expect(isChartVariant(123)).toBe(false);
      expect(isChartVariant({})).toBe(false);
    });

    it("should handle all valid variants from constant", () => {
      for (const variant of CHART_VARIANTS) {
        expect(isChartVariant(variant)).toBe(true);
      }
    });
  });

  describe("Exhaustiveness checks", () => {
    it("should ensure all insight tabs have corresponding labels", () => {
      const tabsSet = new Set(INSIGHT_TABS);
      const labelsSet = new Set(
        Object.keys(INSIGHT_TAB_LABELS) as InsightTab[],
      );

      expect(tabsSet.size).toBe(labelsSet.size);
      for (const tab of INSIGHT_TABS) {
        expect(labelsSet.has(tab)).toBe(true);
      }
    });

    it("should ensure all periods have corresponding labels", () => {
      const periodsSet = new Set(PERIODS);
      const labelsSet = new Set(Object.keys(PERIOD_LABELS) as Period[]);

      expect(periodsSet.size).toBe(labelsSet.size);
      for (const period of PERIODS) {
        expect(labelsSet.has(period)).toBe(true);
      }
    });

    it("should ensure all date range presets have corresponding labels", () => {
      const presetsSet = new Set(DATE_RANGE_PRESETS);
      const labelsSet = new Set(
        Object.keys(DATE_RANGE_PRESET_LABELS) as DateRangePreset[],
      );

      expect(presetsSet.size).toBe(labelsSet.size);
      for (const preset of DATE_RANGE_PRESETS) {
        expect(labelsSet.has(preset)).toBe(true);
      }
    });

    it("should ensure all chart variants have corresponding labels", () => {
      const variantsSet = new Set(CHART_VARIANTS);
      const labelsSet = new Set(
        Object.keys(CHART_VARIANT_LABELS) as ChartVariant[],
      );

      expect(variantsSet.size).toBe(labelsSet.size);
      for (const variant of CHART_VARIANTS) {
        expect(labelsSet.has(variant)).toBe(true);
      }
    });
  });
});
