"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ExportCard,
  ExportStats,
  DatabaseExportCard,
  type ExportStatsData,
} from "@/modules/Export/components";
import {
  Wallet,
  Tags,
  PiggyBank,
  Receipt,
  PieChart,
  Download,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ExportPage() {
  const [stats, setStats] = useState<ExportStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/export", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setStats(result.stats);
    } catch (err: unknown) {
      console.error("Failed to fetch export stats:", err);
      const message =
        err instanceof Error ? err.message : "Failed to load export statistics";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Calculate total records for database export
  const totalRecords = stats
    ? stats.wallets +
      stats.categories +
      stats.savingsBuckets +
      stats.transactions +
      stats.postings +
      stats.budgets
    : 0;

  // Error state
  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Export Data</h2>
          <p className="text-muted-foreground">
            Download your financial data in various formats
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error Loading Export Options
            </CardTitle>
            <CardDescription>
              There was an error loading your export options.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={fetchStats}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Export Data</h2>
          <p className="text-muted-foreground">
            Download your financial data in various formats for backup or
            analysis
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Download className="h-4 w-4" />
          <span>All exports are instant downloads</span>
        </div>
      </div>

      {/* Statistics Overview */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Data Overview</h3>
        <ExportStats stats={stats} isLoading={isLoading} />
      </section>

      {/* Individual Exports */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Export by Type</h3>
        {isLoading ? (
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
        ) : (
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
        )}
      </section>

      {/* Full Database Backup */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Full Database Backup</h3>
        {isLoading ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-4" />
              <div className="grid gap-4 sm:grid-cols-2 mb-4">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ) : (
          <DatabaseExportCard totalRecords={totalRecords} />
        )}
      </section>

      {/* Information Section */}
      <section>
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">About Exports</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>CSV Files:</strong> Compatible with Excel, Google Sheets,
              and other spreadsheet applications. Best for data analysis and
              reporting.
            </p>
            <p>
              <strong>JSON Backup:</strong> Complete data export in a portable
              format. Ideal for backing up your data or migrating to another
              system.
            </p>
            <p>
              <strong>SQL Backup:</strong> Database dump with INSERT statements.
              Use this to restore your data to a PostgreSQL database.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
