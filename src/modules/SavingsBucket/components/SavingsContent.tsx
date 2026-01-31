"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SavingsBucketTable } from "./SavingsBucketTable";
import { useSavingsBucketsData, useSavingsBucketMutations } from "@/modules/SavingsBucket/hooks";
import { useSavingsPageStore } from "@/modules/SavingsBucket/stores";

export function SavingsContent() {
  const { data: buckets, isLoading } = useSavingsBucketsData();
  const { archiveBucket, deleteBucket } = useSavingsBucketMutations();
  const { openEditDialog, selectedBucketIds, setSelectedBucketIds } = useSavingsPageStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Savings Buckets</CardTitle>
        <CardDescription>
          A list of all your savings buckets for goal-based saving
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SavingsBucketTable
          buckets={buckets ?? []}
          onArchive={async (id: string) => {
            await archiveBucket.mutateAsync(id);
          }}
          onDelete={async (id: string) => {
            await deleteBucket.mutateAsync(id);
          }}
          onEdit={openEditDialog}
          selectedIds={selectedBucketIds}
          onSelectionChange={setSelectedBucketIds}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
}
