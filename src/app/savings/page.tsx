import { Suspense } from "react";
import { SavingsPageHeader } from "@/modules/SavingsBucket/components/SavingsPageHeader";
import { SavingsStatsCards } from "@/modules/SavingsBucket/components/SavingsStatsCards";
import { SavingsContent } from "@/modules/SavingsBucket/components/SavingsContent";
import { SavingsBucketDialogForm } from "@/modules/SavingsBucket/components/SavingsBucketDialogForm";
import { SavingsBulkDeleteDialog } from "@/modules/SavingsBucket/components/SavingsBulkDeleteDialog";
import { SavingsPageSkeleton } from "@/modules/SavingsBucket/components/SavingsPageSkeleton";

export default function SavingsPage() {
  return (
    <Suspense fallback={<SavingsPageSkeleton />}>
      <div className="space-y-6">
        {/* Header - self-contained */}
        <SavingsPageHeader />

        {/* Statistics Cards - self-contained */}
        <SavingsStatsCards />

        {/* Savings Buckets Table - self-contained */}
        <SavingsContent />

        {/* Dialogs - self-contained */}
        <SavingsBucketDialogForm />
        <SavingsBulkDeleteDialog />
      </div>
    </Suspense>
  );
}
