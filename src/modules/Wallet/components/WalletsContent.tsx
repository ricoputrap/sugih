"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WalletTable } from "./WalletTable";
import { useWalletsData } from "@/modules/Wallet/hooks";

export function WalletsContent() {
  const { data: wallets, isLoading } = useWalletsData();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Wallets</CardTitle>
        <CardDescription>
          Create, edit, and organize your wallets. Archived wallets can be
          restored later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <WalletTable wallets={wallets ?? []} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
}
