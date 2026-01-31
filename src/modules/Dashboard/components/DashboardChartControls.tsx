/**
 * Dashboard Chart Controls Component
 *
 * Provides UI controls for filtering chart data:
 * - Period selector (Daily/Weekly/Monthly)
 * - Date range preset selector (Last week, This month, etc.)
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DATE_RANGE_PRESET_LABELS,
  DATE_RANGE_PRESETS,
  type DateRangePreset,
  PERIOD_LABELS,
  PERIODS,
  type Period,
} from "../types";

export interface DashboardChartControlsProps {
  /**
   * Currently selected period
   */
  period: Period;

  /**
   * Currently selected date range preset
   */
  dateRangePreset: DateRangePreset;

  /**
   * Callback when period changes
   */
  onPeriodChange: (period: Period) => void;

  /**
   * Callback when date range preset changes
   */
  onDateRangePresetChange: (preset: DateRangePreset) => void;

  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * Dashboard Chart Controls
 *
 * Displays two dropdowns for selecting period granularity and date range
 */
export function DashboardChartControls({
  period,
  dateRangePreset,
  onPeriodChange,
  onDateRangePresetChange,
  className = "",
}: DashboardChartControlsProps) {
  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 ${className}`}
      data-testid="dashboard-chart-controls"
    >
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="period-selector"
          className="text-sm font-medium text-muted-foreground whitespace-nowrap"
        >
          Period:
        </label>
        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger
            id="period-selector"
            className="w-[140px]"
            data-testid="period-selector"
          >
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p} value={p} data-testid={`period-option-${p}`}>
                {PERIOD_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Range Preset Selector */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="date-range-selector"
          className="text-sm font-medium text-muted-foreground whitespace-nowrap"
        >
          Range:
        </label>
        <Select value={dateRangePreset} onValueChange={onDateRangePresetChange}>
          <SelectTrigger
            id="date-range-selector"
            className="w-[180px]"
            data-testid="date-range-selector"
          >
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_PRESETS.map((preset) => (
              <SelectItem
                key={preset}
                value={preset}
                data-testid={`date-range-option-${preset}`}
              >
                {DATE_RANGE_PRESET_LABELS[preset]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
