/**
 * Transaction statistics cards showing counts and amounts
 */

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTransactionsData } from "@/modules/Transaction/hooks";
import { useTransactionFilters } from "@/modules/Transaction/hooks";

export function TransactionsStatsCards() {
  const filters = useTransactionFilters();
  const { data: transactions = [] } = useTransactionsData({
    type: filters.typeFilter,
    walletId: filters.walletFilter,
    categoryId: filters.categoryFilter,
    from: filters.fromDate,
    to: filters.toDate,
  });

  const stats = {
    total: transactions.length,
    expenses: transactions.filter((t) => t.type === "expense").length,
    income: transactions.filter((t) => t.type === "income").length,
    totalExpenseAmount: transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.display_amount_idr || 0), 0),
    totalIncomeAmount: transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.display_amount_idr || 0), 0),
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Transactions</CardDescription>
          <CardTitle className="text-3xl">{stats.total}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Expenses</CardDescription>
          <CardTitle className="text-3xl text-red-600">
            {stats.expenses}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(stats.totalExpenseAmount)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Income</CardDescription>
          <CardTitle className="text-3xl text-green-600">
            {stats.income}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(stats.totalIncomeAmount)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Net Amount</CardDescription>
          <CardTitle
            className={`text-3xl ${
              stats.totalIncomeAmount - stats.totalExpenseAmount >= 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {formatCurrency(
              stats.totalIncomeAmount - stats.totalExpenseAmount,
            )}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
