import { useQuery } from "@tanstack/react-query";
import type { Wallet } from "../schema";
import { walletKeys } from "../utils/queryKeys";

/** Extended wallet type with balance from API calculation */
export type WalletWithBalance = Wallet & { balance: number };

/**
 * Fetch all wallets with balances
 */
async function fetchWallets(): Promise<WalletWithBalance[]> {
  const response = await fetch("/api/wallets");
  if (!response.ok) {
    throw new Error("Failed to fetch wallets");
  }
  return response.json();
}

/**
 * Hook to fetch wallets with balances using TanStack Query.
 * Provides automatic caching, refetching, and error handling.
 */
export function useWalletsData() {
  return useQuery({
    queryKey: walletKeys.list(),
    queryFn: fetchWallets,
  });
}
