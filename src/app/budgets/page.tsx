import { Suspense } from "react";
import { BudgetDetailsCard } from "@/modules/Budget/components/BudgetDetailsCard";
import { BudgetDialogForm } from "@/modules/Budget/components/BudgetDialogForm";
import { BudgetsPageHeader } from "@/modules/Budget/components/BudgetsPageHeader";
import { BudgetsPageSkeleton } from "@/modules/Budget/components/BudgetsPageSkeleton";
import { CopyBudgetDialog } from "@/modules/Budget/components/CopyBudgetDialog";
import { CopyResultModal } from "@/modules/Budget/components/CopyResultModal";
import { BudgetBulkDeleteDialog } from "@/modules/Budget/components/BudgetBulkDeleteDialog";
import { BudgetArchiveDialog } from "@/modules/Budget/components/BudgetArchiveDialog";
import { BudgetBulkArchiveDialog } from "@/modules/Budget/components/BudgetBulkArchiveDialog";

export default function BudgetsPage() {
  return (
    <Suspense fallback={<BudgetsPageSkeleton />}>
      <div className="space-y-6">
        {/* Header - self-contained */}
        <BudgetsPageHeader />

        {/* Budget Details Card - self-contained */}
        <BudgetDetailsCard />

        {/* Dialogs - self-contained */}
        <BudgetDialogForm />
        <CopyBudgetDialog />
        <CopyResultModal />
        <BudgetBulkDeleteDialog />
        <BudgetArchiveDialog />
        <BudgetBulkArchiveDialog />
      </div>
    </Suspense>
  );
}
