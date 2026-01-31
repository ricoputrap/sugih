/**
 * TanStack Query key factory for Wallet module
 * Provides consistent query keys for caching and invalidation
 */

export const walletKeys = {
  /** Base key for all wallet-related queries */
  all: ["wallets"] as const,

  /** Key for fetching all wallets with balances */
  list: () => [...walletKeys.all, "list"] as const,
};
