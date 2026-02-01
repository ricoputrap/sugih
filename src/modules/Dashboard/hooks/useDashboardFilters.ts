import { useQueryState, parseAsStringLiteral } from "nuqs";

const periodOptions = ["daily", "weekly", "monthly"] as const;
const dateRangePresetOptions = [
  "last_7_days",
  "last_30_days",
  "last_3_months",
  "last_6_months",
  "last_year",
  "this_month",
  "this_year",
] as const;

export function useDashboardFilters() {
  const [period, setPeriod] = useQueryState(
    "period",
    parseAsStringLiteral(periodOptions).withDefault("monthly"),
  );

  const [dateRangePreset, setDateRangePreset] = useQueryState(
    "dateRangePreset",
    parseAsStringLiteral(dateRangePresetOptions).withDefault("last_3_months"),
  );

  return {
    period,
    setPeriod,
    dateRangePreset,
    setDateRangePreset,
  };
}
