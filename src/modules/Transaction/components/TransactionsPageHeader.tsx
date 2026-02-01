/**
 * Transactions page header with title and action buttons
 */

"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTransactionsPageStore } from "@/modules/Transaction/stores";

export function TransactionsPageHeader() {
  const {
    isAddDialogOpen,
    selectedTransactionIds,
    openAddDialog,
    openDeleteDialog,
  } = useTransactionsPageStore();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">Transactions</h1>
        <p className="text-muted-foreground">
          Manage your financial transactions
        </p>
      </div>
      <div className="flex items-center gap-2">
        {selectedTransactionIds.length > 0 && (
          <Button
            variant="destructive"
            onClick={openDeleteDialog}
            disabled={isAddDialogOpen}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected ({selectedTransactionIds.length})
          </Button>
        )}
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </div>
    </div>
  );
}
