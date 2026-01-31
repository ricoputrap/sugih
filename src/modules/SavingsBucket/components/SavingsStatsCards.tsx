"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSavingsBucketsData } from "@/modules/SavingsBucket/hooks";

export function SavingsStatsCards() {
  const { data: buckets, isLoading } = useSavingsBucketsData();

  if (isLoading || !buckets) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const activeBuckets = buckets.filter((b) => !b.archived);
  const archivedBuckets = buckets.filter((b) => b.archived);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Active Buckets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeBuckets.length}</div>
          <p className="text-xs text-muted-foreground">
            Available for contributions
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Archived Buckets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{archivedBuckets.length}</div>
          <p className="text-xs text-muted-foreground">Hidden from forms</p>
        </CardContent>
      </Card>
    </div>
  );
}
