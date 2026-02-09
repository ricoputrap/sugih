/**
 * React Query hook for fetching reference data (wallets, categories, savings buckets)
 */

import { useQuery } from "@tanstack/react-query";
import { transactionKeys } from "@/modules/Transaction/utils/queryKeys";

export interface Wallet {
  id: string;
  name: string;
  archived: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  archived: boolean;
}

export interface SavingsBucket {
  id: string;
  name: string;
  archived: boolean;
}

export interface ReferenceData {
  wallets: Wallet[];
  categories: Category[];
  savingsBuckets: SavingsBucket[];
}

export function useTransactionReferenceData() {
  return useQuery({
    queryKey: transactionKeys.referenceData(),
    queryFn: async (): Promise<ReferenceData> => {
      const [walletsRes, categoriesRes, bucketsRes] = await Promise.all([
        fetch("/api/wallets"),
        fetch("/api/categories"),
        fetch("/api/savings-buckets"),
      ]);

      const wallets = (walletsRes.ok ? await walletsRes.json() : []).filter(
        (w: Wallet) => !w.archived,
      );
      const categories = (
        categoriesRes.ok ? await categoriesRes.json() : []
      ).filter((c: Category) => !c.archived);
      const savingsBuckets = (
        bucketsRes.ok ? await bucketsRes.json() : []
      ).filter((b: SavingsBucket) => !b.archived);

      return { wallets, categories, savingsBuckets };
    },
  });
}
