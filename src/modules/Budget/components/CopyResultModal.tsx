"use client";

import { CheckCircle2, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CopyResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  created: Array<{
    category_name?: string;
    amount_idr: number;
  }>;
  skipped: Array<{
    categoryId: string;
    categoryName: string;
  }>;
  fromMonth?: string;
  toMonth?: string;
}

export function CopyResultModal({
  open,
  onOpenChange,
  created,
  skipped,
  fromMonth,
  toMonth,
}: CopyResultModalProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatMonth = (monthStr?: string) => {
    if (!monthStr) return "";
    try {
      const date = new Date(monthStr);
      return date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } catch {
      return monthStr;
    }
  };

  const fromMonthDisplay = formatMonth(fromMonth);
  const toMonthDisplay = formatMonth(toMonth);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Copy Results</DialogTitle>
          <DialogDescription>
            {fromMonthDisplay && toMonthDisplay
              ? `Copied from ${fromMonthDisplay} to ${toMonthDisplay}`
              : "Summary of budgets copied"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Created budgets */}
          {created.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-medium text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Created ({created.length})</span>
              </div>
              <div className="space-y-1 pl-6">
                {created.map((budget) => (
                  <div
                    key={`${budget.id}-created`}
                    className="text-sm flex justify-between items-center"
                  >
                    <span className="text-muted-foreground">
                      {budget.category_name || "Unknown"}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(budget.amount_idr)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skipped budgets */}
          {skipped.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-medium text-blue-600">
                <Info className="h-4 w-4" />
                <span>Already Exist ({skipped.length})</span>
              </div>
              <div className="space-y-1 pl-6">
                {skipped.map((budget) => (
                  <div
                    key={`${budget.categoryId}-skipped`}
                    className="text-sm text-muted-foreground"
                  >
                    {budget.categoryName || "Unknown"}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {created.length === 0 && skipped.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No budgets were copied
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
