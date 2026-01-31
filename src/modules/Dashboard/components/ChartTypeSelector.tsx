"use client";

import { AreaChart, LineChart } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type ChartType, useChartTypeStore } from "../stores/useChartTypeStore";

interface ChartTypeSelectorProps {
  className?: string;
  disabled?: boolean;
}

export function ChartTypeSelector({
  className,
  disabled = false,
}: ChartTypeSelectorProps) {
  const { chartType, setChartType } = useChartTypeStore();

  const handleSelect = React.useCallback(
    (type: ChartType) => {
      if (!disabled) {
        setChartType(type);
      }
    },
    [disabled, setChartType],
  );

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border bg-muted p-1",
        className,
      )}
      role="group"
      aria-label="Chart type selector"
    >
      <Button
        variant={chartType === "area" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => handleSelect("area")}
        disabled={disabled}
        aria-pressed={chartType === "area"}
        className={cn(
          "h-7 px-2 gap-1.5",
          chartType === "area" && "bg-background shadow-sm",
        )}
      >
        <AreaChart className="h-4 w-4" />
        <span className="text-xs">Area</span>
      </Button>
      <Button
        variant={chartType === "line" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => handleSelect("line")}
        disabled={disabled}
        aria-pressed={chartType === "line"}
        className={cn(
          "h-7 px-2 gap-1.5",
          chartType === "line" && "bg-background shadow-sm",
        )}
      >
        <LineChart className="h-4 w-4" />
        <span className="text-xs">Line</span>
      </Button>
    </div>
  );
}
