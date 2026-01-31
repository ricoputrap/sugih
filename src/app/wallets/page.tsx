import { Suspense } from "react";
import { WalletsPageHeader } from "@/modules/Wallet/components/WalletsPageHeader";
import { WalletsSummaryCards } from "@/modules/Wallet/components/WalletsSummaryCards";
import { WalletsContent } from "@/modules/Wallet/components/WalletsContent";
import { WalletDialogForm } from "@/modules/Wallet/components/WalletDialogForm";
import { WalletsPageSkeleton } from "@/modules/Wallet/components/WalletsPageSkeleton";

export default function WalletsPage() {
  return (
    <Suspense fallback={<WalletsPageSkeleton />}>
      <div className="space-y-6">
        {/* Header - self-contained */}
        <WalletsPageHeader />

        {/* Summary Cards - self-contained */}
        <WalletsSummaryCards />

        {/* Main Content - self-contained */}
        <WalletsContent />

        {/* Dialog - self-contained */}
        <WalletDialogForm />
      </div>
    </Suspense>
  );
}
