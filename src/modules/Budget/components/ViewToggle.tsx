"use client";

import { LayoutList, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BudgetViewMode } from "../types";

interface ViewToggleProps {
  value: BudgetViewMode;
  onChange: (mode: BudgetViewMode) => void;
  disabled?: boolean;
}

/**
 * ViewToggle Component
 * Provides a toggle between List View and Grid View for budget display
 * Uses button group pattern for accessibility
 */
export function ViewToggle({
  value,
  onChange,
  disabled = false,
}: ViewToggleProps) {
  return (
    <div
      className="flex items-center gap-1 rounded-md border bg-background p-1"
      role="group"
      aria-label="Budget view mode toggle"
    >
      <Button
        variant={value === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("list")}
        disabled={disabled}
        className="h-8 w-8 p-0"
        aria-pressed={value === "list"}
        aria-label="List view"
        title="List View"
      >
        <LayoutList className="h-4 w-4" />
      </Button>
      <Button
        variant={value === "grid" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("grid")}
        disabled={disabled}
        className="h-8 w-8 p-0"
        aria-pressed={value === "grid"}
        aria-label="Grid view"
        title="Grid View"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  );
}
