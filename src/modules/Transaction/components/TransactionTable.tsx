"use client";

import { useMemo } from "react";
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
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import type { RowSelectionState } from "@tanstack/react-table";

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

  // Bridge selectedIds string[] <-> RowSelectionState
  const rowSelection = useMemo(() => {
    const state: RowSelectionState = {};
    if (externalSelectedIds) {
      for (const id of externalSelectedIds) {
        state[id] = true;
      }
    }
    return state;
  }, [externalSelectedIds]);

  const handleRowSelectionChange = (newState: RowSelectionState) => {
    const newIds = Object.keys(newState).filter(k => newState[k]);
    if (onSelectionChange) {
      onSelectionChange(newIds);
    }
  };

  const columns: ColumnDef<Transaction>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <button
          onClick={() => table.toggleAllPageRowsSelected()}
          className="flex items-center justify-center"
          title="Select all"
        >
          <input
            type="checkbox"
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? "indeterminate"
                  : false
            }
            onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
            className="cursor-pointer"
            aria-label="Select all transactions"
          />
        </button>
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(!!e.target.checked)}
          className="cursor-pointer"
          aria-label={`Select transaction ${row.original.id}`}
        />
      ),
      size: 50,
    },
    {
      accessorKey: "occurred_at",
      header: "Date",
      cell: ({ row }) => (
        <span className="font-medium">
          {formatDate(row.getValue("occurred_at"))}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as Transaction["type"];
        return (
          <Badge variant={typeColors[type] as any}>
            {typeLabels[type]}
          </Badge>
        );
      },
    },
    {
      accessorKey: "display_account",
      header: "Account",
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate">
          {row.getValue("display_account") as string}
        </span>
      ),
    },
    {
      accessorKey: "category_name",
      header: "Category",
      cell: ({ row }) => (
        <span className="max-w-[150px] truncate">
          {(row.getValue("category_name") as string | null) || "-"}
        </span>
      ),
    },
    {
      accessorKey: "display_amount_idr",
      header: "Amount",
      cell: ({ row }) => {
        const amount = row.getValue("display_amount_idr") as number;
        const type = row.original.type;
        return (
          <div className="text-right font-medium">
            <span
              className={
                type === "expense"
                  ? "text-red-600 dark:text-red-400"
                  : type === "income"
                    ? "text-green-600 dark:text-green-400"
                    : ""
              }
            >
              {type === "expense" && "-"}
              {type === "income" && "+"}
              {formatCurrency(amount)}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "note",
      header: "Note",
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate">
          {(row.getValue("note") as string | null) || "-"}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const transaction = row.original;
        return (
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
        );
      },
    },
  ];

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
    <DataTable
      columns={columns}
      data={transactions}
      rowSelection={rowSelection}
      onRowSelectionChange={handleRowSelectionChange}
      getRowId={(row) => row.id}
      initialSorting={[{ id: "occurred_at", desc: true }]}
    />
  );
}
