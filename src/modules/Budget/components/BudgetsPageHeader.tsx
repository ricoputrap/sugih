"use client";

import { Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBudgetMonth, useBudgetsData } from "@/modules/Budget/hooks";
import { useBudgetsPageStore } from "@/modules/Budget/stores";

export function BudgetsPageHeader() {
  const [month] = useBudgetMonth();
  const { isLoading } = useBudgetsData(month);
  const { openCopyDialog, openCreateDialog } = useBudgetsPageStore();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
        <p className="text-muted-foreground">
          Set monthly budgets and track your spending against them
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={openCopyDialog}
          disabled={isLoading}
          data-testid="copy-budgets"
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy Budgets
        </Button>
        <Button onClick={openCreateDialog} disabled={isLoading}>
          <Plus className="mr-2 h-4 w-4" />
          Add Budget
        </Button>
      </div>
    </div>
  );
}
