import { Suspense } from "react";
import {
  TransactionsPageHeader,
  TransactionsStatsCards,
  TransactionsFilters,
  TransactionsContent,
  TransactionBulkDeleteDialog,
  AddTransactionDialog,
  EditTransactionDialog,
} from "@/modules/Transaction/components";
import { TransactionsPageSkeleton } from "@/modules/Transaction/components/TransactionsPageSkeleton";

export default function TransactionsPage() {
  return (
    <Suspense fallback={<TransactionsPageSkeleton />}>
      <div className="container mx-auto py-8 space-y-6">
        {/* Header - self-contained */}
        <TransactionsPageHeader />

        {/* Stats Cards - self-contained */}
        <TransactionsStatsCards />

        {/* Filters - self-contained */}
        <TransactionsFilters />

        {/* Main Content - self-contained */}
        <TransactionsContent />

        {/* Dialogs - self-contained */}
        <TransactionBulkDeleteDialog />
        <AddTransactionDialog />
        <EditTransactionDialog />
      </div>
    </Suspense>
  );
}
