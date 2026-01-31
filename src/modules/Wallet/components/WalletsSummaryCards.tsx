"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWalletsData } from "@/modules/Wallet/hooks";

export function WalletsSummaryCards() {
  const { data: wallets, isLoading } = useWalletsData();

  if (isLoading || !wallets) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const activeWallets = wallets.filter((w) => !w.archived);
  const archivedWallets = wallets.filter((w) => w.archived);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(
              activeWallets.reduce(
                (sum, wallet) => sum + (wallet.balance || 0),
                0,
              ),
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Across all active wallets
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Wallets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeWallets.length}</div>
          <p className="text-xs text-muted-foreground">
            {archivedWallets.length > 0 &&
              `${archivedWallets.length} archived`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Bank Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {activeWallets.filter((w) => w.type === "bank").length}
          </div>
          <p className="text-xs text-muted-foreground">
            Active bank accounts
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cash Wallets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {activeWallets.filter((w) => w.type === "cash").length}
          </div>
          <p className="text-xs text-muted-foreground">
            Physical cash on hand
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">E-Wallets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {activeWallets.filter((w) => w.type === "ewallet").length}
          </div>
          <p className="text-xs text-muted-foreground">
            Digital payment platforms
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
