"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MonthOption {
  value: string; // "YYYY-MM-01" format
  label: string; // "January 2026" format
  budgetCount?: number; // For source dropdown
}

interface CopyBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCopy: (fromMonth: string, toMonth: string) => Promise<void>;
  defaultDestinationMonth?: string;
  isLoading?: boolean;
}

export function CopyBudgetDialog({
  open,
  onOpenChange,
  onCopy,
  defaultDestinationMonth,
  isLoading = false,
}: CopyBudgetDialogProps) {
  const [sourceMonth, setSourceMonth] = useState<string>("");
  const [destinationMonth, setDestinationMonth] = useState<string>("");
  const [sourceMonths, setSourceMonths] = useState<MonthOption[]>([]);
  const [destinationMonths, setDestinationMonths] = useState<MonthOption[]>([]);
  const [loadingMonths, setLoadingMonths] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [error, setError] = useState<string>("");

  // Generate future months for destination (current + 12 next months)
  const generateDestinationMonths = useCallback(() => {
    const options: MonthOption[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Generate current month + 11 next months
    for (let i = 0; i <= 11; i++) {
      const date = new Date(currentYear, currentMonth + i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const monthValue = `${year}-${month}-01`;
      const monthDisplay = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      options.push({
        value: monthValue,
        label: monthDisplay,
      });
    }

    return options;
  }, []);

  // Fetch months with existing budgets for source dropdown
  const fetchSourceMonths = useCallback(async () => {
    try {
      setLoadingMonths(true);
      setError("");

      const response = await fetch("/api/budgets/months");
      if (!response.ok) {
        throw new Error("Failed to fetch available months");
      }

      const data = await response.json();
      setSourceMonths(data);

      // Pre-select previous month as source if available
      if (data.length > 0) {
        const now = new Date();
        const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousYear = previousDate.getFullYear();
        const previousMonthNum = String(previousDate.getMonth() + 1).padStart(
          2,
          "0",
        );
        const previousMonthValue = `${previousYear}-${previousMonthNum}-01`;

        // Check if previous month is in the available months
        const hasPreviousMonth = data.some(
          (m: MonthOption) => m.value === previousMonthValue,
        );
        if (hasPreviousMonth) {
          setSourceMonth(previousMonthValue);
        } else {
          // Otherwise, select the first available month
          setSourceMonth(data[0].value);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load available months",
      );
      setSourceMonths([]);
    } finally {
      setLoadingMonths(false);
    }
  }, []);

  // Initialize dialog when opened
  useEffect(() => {
    if (open) {
      fetchSourceMonths();
      const destMonths = generateDestinationMonths();
      setDestinationMonths(destMonths);

      // Pre-select destination month
      if (defaultDestinationMonth) {
        setDestinationMonth(defaultDestinationMonth);
      } else if (destMonths.length > 0) {
        setDestinationMonth(destMonths[0].value);
      }
    } else {
      // Reset state when dialog closes
      setSourceMonth("");
      setDestinationMonth("");
      setError("");
    }
  }, [
    open,
    defaultDestinationMonth,
    fetchSourceMonths,
    generateDestinationMonths,
  ]);

  // Handle copy
  const handleCopy = async () => {
    if (!sourceMonth || !destinationMonth) {
      setError("Please select both source and destination months");
      return;
    }

    if (sourceMonth === destinationMonth) {
      setError("Source and destination months must be different");
      return;
    }

    try {
      setIsCopying(true);
      setError("");
      await onCopy(sourceMonth, destinationMonth);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to copy budgets");
    } finally {
      setIsCopying(false);
    }
  };

  const isDisabled =
    !sourceMonth ||
    !destinationMonth ||
    sourceMonth === destinationMonth ||
    isLoading ||
    isCopying ||
    loadingMonths;
  const isSourceDestinationSame = sourceMonth === destinationMonth;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Copy Budgets</DialogTitle>
          <DialogDescription>
            Select a source month with existing budgets and a destination month
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Source Month */}
          <div className="space-y-2">
            <Label htmlFor="source-month">Copy From</Label>
            <Select value={sourceMonth} onValueChange={setSourceMonth}>
              <SelectTrigger
                id="source-month"
                disabled={loadingMonths}
                data-testid="source-month-select"
              >
                <SelectValue placeholder="Select source month" />
              </SelectTrigger>
              <SelectContent>
                {loadingMonths ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    Loading months...
                  </div>
                ) : sourceMonths.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No months with budgets found
                  </div>
                ) : (
                  sourceMonths.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                      {month.budgetCount ? ` (${month.budgetCount})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Destination Month */}
          <div className="space-y-2">
            <Label htmlFor="destination-month">Copy To</Label>
            <Select
              value={destinationMonth}
              onValueChange={setDestinationMonth}
            >
              <SelectTrigger
                id="destination-month"
                data-testid="destination-month-select"
              >
                <SelectValue placeholder="Select destination month" />
              </SelectTrigger>
              <SelectContent>
                {destinationMonths.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Validation Warning */}
          {isSourceDestinationSame && (
            <div className="flex gap-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-600">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Source and destination months must be different</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCopying}
          >
            Cancel
          </Button>
          <Button onClick={handleCopy} disabled={isDisabled}>
            {isCopying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isCopying ? "Copying..." : "Copy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
