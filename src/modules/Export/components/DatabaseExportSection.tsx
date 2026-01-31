"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DatabaseExportCard } from "./DatabaseExportCard";
import { useExportStats } from "../hooks";

export function DatabaseExportSection() {
  const { data: stats, isLoading } = useExportStats();

  const totalRecords = stats
    ? stats.wallets +
      stats.categories +
      stats.savingsBuckets +
      stats.transactions +
      stats.postings +
      stats.budgets
    : 0;

  if (isLoading) {
    return (
      <section>
        <h3 className="text-lg font-semibold mb-4">Full Database Backup</h3>
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
      </section>
    );
  }

  return (
    <section>
      <h3 className="text-lg font-semibold mb-4">Full Database Backup</h3>
      <DatabaseExportCard totalRecords={totalRecords} />
    </section>
  );
}
