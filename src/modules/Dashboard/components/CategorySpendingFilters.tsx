"use client";

import { Calendar, CalendarDays } from "lucide-react";
import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PeriodGranularity = "day" | "week" | "month";
export type DateRangePreset =
  | "last_week"
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "this_year"
  | "last_year"
  | "all";

interface CategorySpendingFiltersProps {
  period: PeriodGranularity;
  dateRangePreset: DateRangePreset;
  onPeriodChange: (period: PeriodGranularity) => void;
  onDateRangePresetChange: (preset: DateRangePreset) => void;
  isLoading?: boolean;
}

export function CategorySpendingFilters({
  period,
  dateRangePreset,
  onPeriodChange,
  onDateRangePresetChange,
  isLoading = false,
}: CategorySpendingFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Period Selector */}
      <Select
        value={period}
        onValueChange={(value) => onPeriodChange(value as PeriodGranularity)}
        disabled={isLoading}
      >
        <SelectTrigger
          className="w-[140px]"
          aria-label="Select period granularity"
        >
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="day">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <span>Daily</span>
            </div>
          </SelectItem>
          <SelectItem value="week">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <span>Weekly</span>
            </div>
          </SelectItem>
          <SelectItem value="month">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <span>Monthly</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Date Range Preset Selector */}
      <Select
        value={dateRangePreset}
        onValueChange={(value) =>
          onDateRangePresetChange(value as DateRangePreset)
        }
        disabled={isLoading}
      >
        <SelectTrigger
          className="w-[160px]"
          aria-label="Select date range preset"
        >
          <Calendar className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="last_week">Last Week</SelectItem>
          <SelectItem value="this_month">This Month</SelectItem>
          <SelectItem value="last_month">Last Month</SelectItem>
          <SelectItem value="last_3_months">Last 3 Months</SelectItem>
          <SelectItem value="last_6_months">Last 6 Months</SelectItem>
          <SelectItem value="this_year">This Year</SelectItem>
          <SelectItem value="last_year">Last Year</SelectItem>
          <SelectItem value="all">All Time</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

// Helper function to calculate date range from preset
export function getDateRangeFromPreset(preset: DateRangePreset): {
  from: Date;
  to: Date;
} {
  const now = new Date();
  const to = new Date(now);

  let from: Date;

  switch (preset) {
    case "last_week":
      from = new Date(now);
      from.setDate(from.getDate() - 7);
      break;
    case "this_month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "last_month":
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to.setDate(0); // Last day of previous month
      break;
    case "last_3_months":
      from = new Date(now);
      from.setMonth(from.getMonth() - 3);
      break;
    case "last_6_months":
      from = new Date(now);
      from.setMonth(from.getMonth() - 6);
      break;
    case "this_year":
      from = new Date(now.getFullYear(), 0, 1);
      break;
    case "last_year":
      from = new Date(now.getFullYear() - 1, 0, 1);
      to.setMonth(0);
      to.setDate(0);
      break;
    case "all":
    default:
      from = new Date(2020, 0, 1); // Arbitrary start for "all time"
      break;
  }

  return { from, to };
}
