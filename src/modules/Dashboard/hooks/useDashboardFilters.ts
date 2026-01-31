import { parseAsStringLiteral, useQueryState } from "nuqs";
import { DATE_RANGE_PRESETS, PERIODS } from "../types";

export function useDashboardFilters() {
  const [period, setPeriod] = useQueryState(
    "period",
    parseAsStringLiteral(PERIODS).withDefault("monthly"),
  );

  const [dateRangePreset, setDateRangePreset] = useQueryState(
    "dateRangePreset",
    parseAsStringLiteral(DATE_RANGE_PRESETS).withDefault("last_3_months"),
  );

  return {
    period,
    setPeriod,
    dateRangePreset,
    setDateRangePreset,
  };
}
