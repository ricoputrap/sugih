"use client";

import { useState, useEffect } from "react";
import { Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TransactionTable } from "@/modules/Transaction/components/TransactionTable";
import { AddTransactionDialog } from "@/modules/Transaction/components/AddTransactionDialog";
import { toast } from "sonner";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [wallets, setWallets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [savingsBuckets, setSavingsBuckets] = useState<any[]>([]);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [walletFilter, setWalletFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();

      if (typeFilter !== "all") {
        params.append("type", typeFilter);
      }
      if (walletFilter !== "all") {
        params.append("walletId", walletFilter);
      }
      if (categoryFilter !== "all") {
        params.append("categoryId", categoryFilter);
      }
      if (fromDate) {
        params.append("from", new Date(fromDate).toISOString());
      }
      if (toDate) {
        params.append("to", new Date(toDate).toISOString());
      }

      const queryString = params.toString();
      const url = `/api/transactions${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = await response.json();
      setTransactions(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load transactions");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch reference data
  const fetchReferenceData = async () => {
    try {
      const [walletsRes, categoriesRes, bucketsRes] = await Promise.all([
        fetch("/api/wallets"),
        fetch("/api/categories"),
        fetch("/api/savings-buckets"),
      ]);

      if (walletsRes.ok) {
        const walletsData = await walletsRes.json();
        setWallets(walletsData.filter((w: any) => !w.archived));
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.filter((c: any) => !c.archived));
      }

      if (bucketsRes.ok) {
        const bucketsData = await bucketsRes.json();
        setSavingsBuckets(bucketsData.filter((b: any) => !b.archived));
      }
    } catch (error) {
      console.error("Failed to fetch reference data:", error);
    }
  };

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [typeFilter, walletFilter, categoryFilter, fromDate, toDate]);

  // Handle delete transaction
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete transaction");
      }

      toast.success("Transaction deleted successfully");
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete transaction");
    }
  };

  // Calculate statistics
  const stats = {
    total: transactions.length,
    expenses: transactions.filter((t) => t.type === "expense").length,
    income: transactions.filter((t) => t.type === "income").length,
    totalExpenseAmount: transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.display_amount_idr, 0),
    totalIncomeAmount: transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.display_amount_idr, 0),
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
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">
            Manage your financial transactions
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      {/* Statistics Cards */}
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
                stats.totalIncomeAmount - stats.totalExpenseAmount
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter transactions by type, wallet, category, or date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="type-filter">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger id="type-filter">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="savings_contribution">
                    Savings Contribution
                  </SelectItem>
                  <SelectItem value="savings_withdrawal">
                    Savings Withdrawal
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallet-filter">Wallet</Label>
              <Select value={walletFilter} onValueChange={setWalletFilter}>
                <SelectTrigger id="wallet-filter">
                  <SelectValue placeholder="All wallets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Wallets</SelectItem>
                  {wallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      {wallet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-filter">Category</Label>
              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}
              >
                <SelectTrigger id="category-filter">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="from-date">From Date</Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="to-date">To Date</Label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          {(typeFilter !== "all" ||
            walletFilter !== "all" ||
            categoryFilter !== "all" ||
            fromDate ||
            toDate) && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTypeFilter("all");
                  setWalletFilter("all");
                  setCategoryFilter("all");
                  setFromDate("");
                  setToDate("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {isLoading
              ? "Loading transactions..."
              : `Showing ${transactions.length} transaction${transactions.length !== 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionTable
            transactions={transactions}
            isLoading={isLoading}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      {/* Add Transaction Dialog */}
      <AddTransactionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={() => {
          toast.success("Transaction created successfully");
          fetchTransactions();
        }}
        wallets={wallets}
        categories={categories}
        savingsBuckets={savingsBuckets}
      />
    </div>
  );
}
