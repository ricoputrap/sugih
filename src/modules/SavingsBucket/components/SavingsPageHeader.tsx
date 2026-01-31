"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSavingsPageStore } from "@/modules/SavingsBucket/stores";

export function SavingsPageHeader() {
  const { openCreateDialog, selectedBucketIds, openDeleteDialog } =
    useSavingsPageStore();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Savings Buckets</h1>
        <p className="text-muted-foreground">
          Manage your savings goals and allocate funds for specific purposes
        </p>
      </div>
      <div className="flex gap-2">
        {selectedBucketIds.length > 0 && (
          <Button variant="destructive" onClick={openDeleteDialog}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected ({selectedBucketIds.length})
          </Button>
        )}
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Bucket
        </Button>
      </div>
    </div>
  );
}
