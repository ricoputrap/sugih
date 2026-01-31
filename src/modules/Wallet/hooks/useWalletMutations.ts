import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { WalletCreateInput, WalletUpdateInput, Wallet } from "../schema";
import { walletKeys } from "../utils/queryKeys";

/**
 * Hook providing all wallet mutations with automatic cache invalidation.
 * Returns create, update, archive, restore, and delete mutations.
 */
export function useWalletMutations() {
  const queryClient = useQueryClient();

  const invalidateWallets = () => {
    queryClient.invalidateQueries({ queryKey: walletKeys.all });
  };

  const createWallet = useMutation({
    mutationFn: async (values: WalletCreateInput): Promise<Wallet> => {
      const response = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to create wallet");
      }

      return response.json();
    },
    onSuccess: invalidateWallets,
  });

  const updateWallet = useMutation({
    mutationFn: async (
      values: WalletUpdateInput & { id: string },
    ): Promise<Wallet> => {
      const { id, ...data } = values;
      const response = await fetch(`/api/wallets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to update wallet");
      }

      return response.json();
    },
    onSuccess: invalidateWallets,
  });

  const archiveWallet = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/wallets/${id}?action=archive`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to archive wallet");
      }
    },
    onSuccess: invalidateWallets,
  });

  const restoreWallet = useMutation({
    mutationFn: async (id: string): Promise<Wallet> => {
      const response = await fetch(`/api/wallets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to restore wallet");
      }

      return response.json();
    },
    onSuccess: invalidateWallets,
  });

  const deleteWallet = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/wallets/${id}?action=delete`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to delete wallet");
      }
    },
    onSuccess: invalidateWallets,
  });

  return {
    createWallet,
    updateWallet,
    archiveWallet,
    restoreWallet,
    deleteWallet,
  };
}
