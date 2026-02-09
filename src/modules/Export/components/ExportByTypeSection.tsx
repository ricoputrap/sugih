"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, Tags, PiggyBank, Receipt, PieChart } from "lucide-react";
import { ExportCard } from "./ExportCard";
import { useExportStats } from "../hooks";

export function ExportByTypeSection() {
  const { data: stats, isLoading } = useExportStats();

  if (isLoading) {
    return (
      <section>
        <h3 className="text-lg font-semibold mb-4">Export by Type</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <h3 className="text-lg font-semibold mb-4">Export by Type</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ExportCard
          title="Transactions"
          description="Export all transactions with dates, amounts, categories, and notes. Includes expense, income, transfers, and savings movements."
          icon={<Receipt className="h-5 w-5" />}
          endpoint="/api/export/transactions"
          filename="sugih_transactions"
          fileExtension="csv"
          recordCount={stats?.transactions}
        />

        <ExportCard
          title="Wallets"
          description="Export all wallets including bank accounts, cash, and e-wallets with current balances."
          icon={<Wallet className="h-5 w-5" />}
          endpoint="/api/export/wallets"
          filename="sugih_wallets"
          fileExtension="csv"
          recordCount={stats?.wallets}
        />

        <ExportCard
          title="Categories"
          description="Export all expense and income categories including archived ones."
          icon={<Tags className="h-5 w-5" />}
          endpoint="/api/export/categories"
          filename="sugih_categories"
          fileExtension="csv"
          recordCount={stats?.categories}
        />

        <ExportCard
          title="Savings Buckets"
          description="Export savings buckets with descriptions and current balances."
          icon={<PiggyBank className="h-5 w-5" />}
          endpoint="/api/export/savings-buckets"
          filename="sugih_savings_buckets"
          fileExtension="csv"
          recordCount={stats?.savingsBuckets}
        />

        <ExportCard
          title="Budgets"
          description="Export monthly budgets by category with allocated amounts."
          icon={<PieChart className="h-5 w-5" />}
          endpoint="/api/export/budgets"
          filename="sugih_budgets"
          fileExtension="csv"
          recordCount={stats?.budgets}
        />
      </div>
    </section>
  );
}
