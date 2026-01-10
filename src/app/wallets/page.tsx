"use client";

import { useState, useEffect } from "react";
import { Wallet } from "@/modules/Wallet/schema";
import { WalletTable } from "@/modules/Wallet/components/WalletTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// Extended wallet type with balance from API calculation
type WalletWithBalance = Wallet & { balance: number };

export default function WalletsPage() {
  const [wallets, setWallets] = useState<WalletWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallets = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/wallets");

      if (!response.ok) {
        throw new Error("Failed to fetch wallets");
      }

      const data = await response.json();
      setWallets(data);
    } catch (error: any) {
      console.error("Error fetching wallets:", error);
      setError(error.message || "Failed to load wallets");
      toast.error("Failed to load wallets");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const handleRefresh = () => {
    fetchWallets();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Wallets</h2>
          <p className="text-muted-foreground">
            Manage your wallets and financial accounts
          </p>
        </div>

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

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Wallets</h2>
          <p className="text-muted-foreground">
            Manage your wallets and financial accounts
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">{error}</p>
              <button
                onClick={fetchWallets}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Try Again
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeWallets = wallets.filter((w) => !w.archived);
  const archivedWallets = wallets.filter((w) => w.archived);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Wallets</h2>
        <p className="text-muted-foreground">
          Manage your wallets and financial accounts
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
              }).format(
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
            <CardTitle className="text-sm font-medium">
              Active Wallets
            </CardTitle>
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

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Wallets</CardTitle>
          <CardDescription>
            Create, edit, and organize your wallets. Archived wallets can be
            restored later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WalletTable wallets={wallets} onRefresh={handleRefresh} />
        </CardContent>
      </Card>
    </div>
  );
}
