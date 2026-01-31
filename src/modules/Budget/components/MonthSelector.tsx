"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MonthSelectorProps {
  month: string;
  onMonthChange: (month: string) => void;
  monthOptions: Array<{ value: string; label: string }>;
  isLoading?: boolean;
  navigation: {
    canGoToPrevious: boolean;
    canGoToNext: boolean;
    previousMonth: string | null;
    nextMonth: string | null;
  };
}

export function MonthSelector({
  month,
  onMonthChange,
  monthOptions,
  isLoading = false,
  navigation,
}: MonthSelectorProps) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <span className="text-sm font-medium text-muted-foreground">Month:</span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (navigation.previousMonth) {
              onMonthChange(navigation.previousMonth);
            }
          }}
          disabled={isLoading || !navigation.canGoToPrevious}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Select value={month} onValueChange={onMonthChange}>
          <SelectTrigger
            className="w-full sm:w-48"
            data-testid="month-select"
            aria-label="Select month"
          >
            <SelectValue placeholder="Select a month" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (navigation.nextMonth) {
              onMonthChange(navigation.nextMonth);
            }
          }}
          disabled={isLoading || !navigation.canGoToNext}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
