"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

interface Posting {
  id: string;
  event_id: string;
  wallet_id: string | null;
  savings_bucket_id: string | null;
  amount_idr: number;
  created_at: string | Date;
}

interface Transaction {
  id: string;
  occurred_at: string | Date;
  type:
    | "expense"
    | "income"
    | "transfer"
    | "savings_contribution"
    | "savings_withdrawal";
  note: string | null;
  payee: string | null;
  category_id: string | null;
  category_name?: string | null;
  deleted_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
  idempotency_key: string | null;
  display_amount_idr: number;
  display_account: string;
  postings: Posting[];
}

interface TransactionTableProps {
  transactions: Transaction[];
  isLoading?: boolean;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

const typeColors: Record<Transaction["type"], string> = {
  expense: "destructive",
  income: "default",
  transfer: "secondary",
  savings_contribution: "outline",
  savings_withdrawal: "outline",
};

const typeLabels: Record<Transaction["type"], string> = {
  expense: "Expense",
  income: "Income",
  transfer: "Transfer",
  savings_contribution: "Save",
  savings_withdrawal: "Withdraw",
};

export function TransactionTable({
  transactions,
  isLoading,
  onEdit,
  onDelete,
  onBulkDelete,
  selectedIds: externalSelectedIds,
  onSelectionChange,
}: TransactionTableProps) {
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);

  // Use external selection state if provided, otherwise use internal
  const selectedIds = externalSelectedIds || internalSelectedIds;
  const setSelectedIds = (ids: string[]) => {
    if (onSelectionChange) {
      onSelectionChange(ids);
    } else {
      setInternalSelectedIds(ids);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return format(new Date(date), "dd MMM yyyy, HH:mm");
  };

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort(
      (a, b) =>
        new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
    );
  }, [transactions]);

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds([...transactions.map((t) => t.id)]);
    } else {
      setSelectedIds([]);
    }
  };

  // Handle individual checkbox
  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    }
  };

  // Check if all rows are selected
  const areAllSelected =
    transactions.length > 0 && selectedIds.length === transactions.length;

  // Check if some rows are selected
  const areSomeSelected =
    selectedIds.length > 0 && selectedIds.length < transactions.length;

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedIds.length > 0 && onBulkDelete) {
      onBulkDelete(selectedIds);
      setSelectedIds([]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">
          Loading transactions...
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">No transactions found.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Create your first transaction to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={areSomeSelected ? "indeterminate" : areAllSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all transactions"
              />
            </TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Note</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTransactions.map((transaction) => (
            <TableRow
              key={transaction.id}
              data-selected={selectedIds.includes(transaction.id)}
              className={
                selectedIds.includes(transaction.id) ? "bg-muted/50" : ""
              }
            >
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(transaction.id)}
                  onCheckedChange={(checked) =>
                    handleSelectOne(transaction.id, checked as boolean)
                  }
                  aria-label={`Select transaction ${transaction.id}`}
                />
              </TableCell>
              <TableCell className="font-medium">
                {formatDate(transaction.occurred_at)}
              </TableCell>
              <TableCell>
                <Badge variant={typeColors[transaction.type] as any}>
                  {typeLabels[transaction.type]}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {transaction.display_account}
              </TableCell>
              <TableCell className="max-w-[150px] truncate">
                {transaction.category_name || "-"}
              </TableCell>
              <TableCell className="text-right font-medium">
                <span
                  className={
                    transaction.type === "expense"
                      ? "text-red-600 dark:text-red-400"
                      : transaction.type === "income"
                        ? "text-green-600 dark:text-green-400"
                        : ""
                  }
                >
                  {transaction.type === "expense" && "-"}
                  {transaction.type === "income" && "+"}
                  {formatCurrency(transaction.display_amount_idr)}
                </span>
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {transaction.note || "-"}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit?.(transaction)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete?.(transaction.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
