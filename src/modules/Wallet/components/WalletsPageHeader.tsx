"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWalletsPageStore } from "@/modules/Wallet/stores";

export function WalletsPageHeader() {
  const { openCreateDialog } = useWalletsPageStore();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Wallets</h2>
        <p className="text-muted-foreground">
          Manage your wallets and financial accounts
        </p>
      </div>
      <Button onClick={openCreateDialog}>
        <Plus className="mr-2 h-4 w-4" />
        Add Wallet
      </Button>
    </div>
  );
}
