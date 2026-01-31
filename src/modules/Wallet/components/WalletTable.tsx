"use client";

import type { Wallet } from "@/modules/Wallet/schema";
import type { WalletWithBalance } from "@/modules/Wallet/hooks";
import { useWalletMutations } from "@/modules/Wallet/hooks";
import { useWalletsPageStore } from "@/modules/Wallet/stores";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Pencil,
  Archive,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

interface WalletTableProps {
  wallets: WalletWithBalance[];
  isLoading?: boolean;
}

export function WalletTable({ wallets, isLoading = false }: WalletTableProps) {
  const { openEditDialog } = useWalletsPageStore();
  const { archiveWallet, restoreWallet, deleteWallet } = useWalletMutations();

  const handleArchive = async (wallet: Wallet) => {
    try {
      await archiveWallet.mutateAsync(wallet.id);
      toast.success(`Wallet "${wallet.name}" archived successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to archive wallet");
    }
  };

  const handleRestore = async (wallet: Wallet) => {
    try {
      await restoreWallet.mutateAsync(wallet.id);
      toast.success(`Wallet "${wallet.name}" restored successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to restore wallet");
    }
  };

  const handleDelete = async (wallet: Wallet) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete "${wallet.name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await deleteWallet.mutateAsync(wallet.id);
      toast.success(`Wallet "${wallet.name}" deleted successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete wallet");
    }
  };

  const getWalletTypeColor = (type: string) => {
    switch (type) {
      case "cash":
        return "bg-green-100 text-green-800";
      case "bank":
        return "bg-blue-100 text-blue-800";
      case "ewallet":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 w-full animate-pulse rounded bg-gray-200" />
        ))}
      </div>
    );
  }

  const activeWallets = wallets.filter((wallet) => !wallet.archived);
  const archivedWallets = wallets.filter((wallet) => wallet.archived);

  return (
    <div className="space-y-6">
      {/* Active Wallets */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">
          Active Wallets ({activeWallets.length})
        </h3>

        {activeWallets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No active wallets found. Create your first wallet to get started.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeWallets.map((wallet) => (
                  <TableRow key={wallet.id}>
                    <TableCell className="font-medium">{wallet.name}</TableCell>
                    <TableCell>
                      <Badge className={getWalletTypeColor(wallet.type)}>
                        {wallet.type.charAt(0).toUpperCase() +
                          wallet.type.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(wallet.balance || 0)}
                    </TableCell>
                    <TableCell>{wallet.currency}</TableCell>
                    <TableCell>
                      {wallet.created_at
                        ? new Date(wallet.created_at).toLocaleDateString(
                            "id-ID",
                          )
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(wallet)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleArchive(wallet)}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(wallet)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Archived Wallets */}
      {archivedWallets.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">
            Archived Wallets ({archivedWallets.length})
          </h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Archived</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedWallets.map((wallet) => (
                  <TableRow key={wallet.id} className="opacity-60">
                    <TableCell className="font-medium">{wallet.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{wallet.type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(wallet.balance || 0)}
                    </TableCell>
                    <TableCell>{wallet.currency}</TableCell>
                    <TableCell>
                      {wallet.updated_at
                        ? new Date(wallet.updated_at).toLocaleDateString(
                            "id-ID",
                          )
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleRestore(wallet)}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Restore
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(wallet)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
