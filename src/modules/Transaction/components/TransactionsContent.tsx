/**
 * Wrapper component for transaction table with data loading and selection handling
 */

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TransactionTable } from "./TransactionTable";
import {
  useTransactionsData,
  useTransactionMutations,
  useTransactionFilters,
} from "@/modules/Transaction/hooks";
import { useTransactionsPageStore } from "@/modules/Transaction/stores";
import { toast } from "sonner";

export function TransactionsContent() {
  const filters = useTransactionFilters();
  const { data: transactions = [], isLoading } = useTransactionsData({
    type: filters.typeFilter,
    walletId: filters.walletFilter,
    categoryId: filters.categoryFilter,
    from: filters.fromDate,
    to: filters.toDate,
  });

  const { selectedTransactionIds, setSelectedTransactionIds, openEditDialog } =
    useTransactionsPageStore();
  const { deleteTransaction } = useTransactionMutations();

  const handleEdit = (transaction: any) => {
    openEditDialog(transaction);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    try {
      await deleteTransaction.mutateAsync(id);
      toast.success("Transaction deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete transaction");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>
          {isLoading
            ? "Loading transactions..."
            : `Showing ${transactions.length} transaction${
                transactions.length !== 1 ? "s" : ""
              }`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TransactionTable
          transactions={transactions}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          selectedIds={selectedTransactionIds}
          onSelectionChange={setSelectedTransactionIds}
        />
      </CardContent>
    </Card>
  );
}
