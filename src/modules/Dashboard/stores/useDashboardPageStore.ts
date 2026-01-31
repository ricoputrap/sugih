import { create } from "zustand";
import type { ChartVariant, DateRangePreset, InsightTab } from "../types";

interface DashboardPageState {
  chartVariant: ChartVariant;
  selectedInsightTab: InsightTab;
  categoryType: "expense" | "income";
  categoryDateRange: DateRangePreset;

  setChartVariant: (variant: ChartVariant) => void;
  setSelectedInsightTab: (tab: InsightTab) => void;
  setCategoryType: (type: "expense" | "income") => void;
  setCategoryDateRange: (range: DateRangePreset) => void;
  reset: () => void;
}

const initialState = {
  chartVariant: "line" as ChartVariant,
  selectedInsightTab: "netWorth" as InsightTab,
  categoryType: "expense" as "expense" | "income",
  categoryDateRange: "this_month" as DateRangePreset,
};

export const useDashboardPageStore = create<DashboardPageState>((set) => ({
  ...initialState,

  setChartVariant: (variant) => set({ chartVariant: variant }),
  setSelectedInsightTab: (tab) => set({ selectedInsightTab: tab }),
  setCategoryType: (type) => set({ categoryType: type }),
  setCategoryDateRange: (range) => set({ categoryDateRange: range }),

  reset: () => set(initialState),
}));
