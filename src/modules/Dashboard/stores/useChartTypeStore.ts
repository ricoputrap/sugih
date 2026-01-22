import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ChartType = "area" | "line";

interface ChartTypeState {
  chartType: ChartType;
  setChartType: (chartType: ChartType) => void;
}

export const useChartTypeStore = create<ChartTypeState>()(
  persist(
    (set) => ({
      chartType: "area",
      setChartType: (chartType) => set({ chartType }),
    }),
    {
      name: "chart-type-storage",
    },
  ),
);
