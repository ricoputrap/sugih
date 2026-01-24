"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowDownIcon, ArrowUpIcon, ArrowRightIcon, PiggyBank } from "lucide-react";
import type { RecentTransaction } from "../schema";

/**
 * Props for LatestTransactionsTable component
 */
export interface LatestTransactionsTableProps {
  /** Array of recent transactions (max 5) */
  transactions?: RecentTransaction[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Currency formatter function */
  formatCurrency?: (amount: number) => string;
}

/**
 * Default currency formatter for IDR
 */
const defaultFormatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Get transaction type badge variant and icon
 */
function getTransactionTypeInfo(
  type: RecentTransaction["type"],
): {
  variant: "default" | "secondary" | "destructive" | "outline";
  label: string;
  icon: React.ReactNode;
  colorClass: string;
} {
  switch (type) {
    case "income":
      return {
        variant: "default",
        label: "Income",
        icon: <ArrowDownIcon className="h-3 w-3" />,
        colorClass: "text-green-600",
      };
    case "expense":
      return {
        variant: "destructive",
        label: "Expense",
        icon: <ArrowUpIcon className="h-3 w-3" />,
        colorClass: "text-red-600",
      };
    case "transfer":
      return {
        variant: "secondary",
        label: "Transfer",
        icon: <ArrowRightIcon className="h-3 w-3" />,
        colorClass: "text-blue-600",
      };
    case "savings_contribution":
      return {
        variant: "outline",
        label: "Savings +",
        icon: <PiggyBank className="h-3 w-3" />,
        colorClass: "text-purple-600",
      };
    case "savings_withdrawal":
      return {
        variant: "outline",
        label: "Savings -",
        icon: <PiggyBank className="h-3 w-3" />,
        colorClass: "text-orange-600",
      };
    default:
      return {
        variant: "secondary",
        label: "Unknown",
        icon: null,
        colorClass: "text-gray-600",
      };
  }
}

/**
 * LatestTransactionsTable Component
 *
 * Displays the latest 5 transactions in a table format.
 *
 * Features:
 * - Shows date, amount, type, category, and description
 * - Colored badges for transaction types
 * - Formatted dates and currency
 * - Empty state handling
 * - Loading state
 */
export function LatestTransactionsTable({
  transactions = [],
  isLoading = false,
  formatCurrency = defaultFormatCurrency,
}: LatestTransactionsTableProps) {
  // Limit to 5 transactions
  const limitedTransactions = React.useMemo(
    () => transactions.slice(0, 5),
    [transactions],
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Latest Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">Loading transactions...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (limitedTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Latest Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">No transactions yet</p>
              <p className="text-xs mt-1">
                Start recording your financial activities
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Latest Transactions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="max-w-[200px]">Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {limitedTransactions.map((transaction) => {
              const typeInfo = getTransactionTypeInfo(transaction.type);
              const isExpense = transaction.type === "expense";

              return (
                <TableRow key={transaction.id}>
                  {/* Date */}
                  <TableCell className="text-sm tabular-nums">
                    {format(new Date(transaction.occurredAt), "MMM dd, yyyy")}
                  </TableCell>

                  {/* Type Badge */}
                  <TableCell>
                    <Badge variant={typeInfo.variant} className="gap-1">
                      {typeInfo.icon}
                      <span className="text-xs">{typeInfo.label}</span>
                    </Badge>
                  </TableCell>

                  {/* Category */}
                  <TableCell className="text-sm">
                    {transaction.categoryName || (
                      <span className="text-muted-foreground italic">
                        Uncategorized
                      </span>
                    )}
                  </TableCell>

                  {/* Description/Note */}
                  <TableCell className="text-sm max-w-[200px] truncate">
                    {transaction.note || (
                      <span className="text-muted-foreground italic">
                        No description
                      </span>
                    )}
                  </TableCell>

                  {/* Amount */}
                  <TableCell
                    className={`text-right font-medium tabular-nums ${typeInfo.colorClass}`}
                  >
                    {isExpense && "-"}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
