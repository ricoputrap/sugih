"use client";

import * as React from "react";
import { AreaChart, LineChart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChartVariant } from "../types";

export interface ChartVariantToggleProps {
  /** Current chart variant */
  value: ChartVariant;
  /** Callback when variant changes */
  onChange: (variant: ChartVariant) => void;
  /** Whether the toggle is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * ChartVariantToggle Component
 *
 * A toggle button group for switching between line and area chart variants.
 * Used within the Dashboard Insights section to control chart visualization.
 */
export function ChartVariantToggle({
  value,
  onChange,
  disabled = false,
  className,
  testId = "chart-variant-toggle",
}: ChartVariantToggleProps) {
  const handleSelect = React.useCallback(
    (variant: ChartVariant) => {
      if (!disabled && variant !== value) {
        onChange(variant);
      }
    },
    [disabled, onChange, value],
  );

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border bg-muted p-1",
        className,
      )}
      role="group"
      aria-label="Chart variant selector"
      data-testid={testId}
    >
      <Button
        variant={value === "line" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => handleSelect("line")}
        disabled={disabled}
        aria-pressed={value === "line"}
        data-testid={`${testId}-line`}
        className={cn(
          "h-7 px-2 gap-1.5",
          value === "line" && "bg-background shadow-sm",
        )}
      >
        <LineChart className="h-4 w-4" />
        <span className="text-xs">Line</span>
      </Button>
      <Button
        variant={value === "area" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => handleSelect("area")}
        disabled={disabled}
        aria-pressed={value === "area"}
        data-testid={`${testId}-area`}
        className={cn(
          "h-7 px-2 gap-1.5",
          value === "area" && "bg-background shadow-sm",
        )}
      >
        <AreaChart className="h-4 w-4" />
        <span className="text-xs">Area</span>
      </Button>
    </div>
  );
}
