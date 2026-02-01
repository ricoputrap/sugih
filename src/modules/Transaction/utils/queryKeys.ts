/**
 * React Query query key factory for transactions
 */

export const transactionKeys = {
  all: ["transactions"] as const,
  list: (filters?: {
    type?: string;
    walletId?: string;
    categoryId?: string;
    from?: string;
    to?: string;
  }) => [...transactionKeys.all, "list", filters] as const,
  referenceData: () => [...transactionKeys.all, "reference-data"] as const,
};
