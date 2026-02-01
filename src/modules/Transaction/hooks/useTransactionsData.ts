/**
 * React Query hook for fetching transactions
 */

import { useQuery } from "@tanstack/react-query";
import { transactionKeys } from "@/modules/Transaction/utils/queryKeys";

interface TransactionsFilters {
  type?: string;
  walletId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
}

export interface Transaction {
  id: string;
  occurred_at: string | Date;
  type:
    | "expense"
    | "income"
    | "transfer"
    | "savings_contribution"
    | "savings_withdrawal";
  note: string | null;
  payee: string | null;
  category_id: string | null;
  category_name?: string | null;
  deleted_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
  idempotency_key: string | null;
  display_amount_idr: number;
  display_account: string;
  postings: any[];
}

export function useTransactionsData(filters: TransactionsFilters = {}) {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.type && filters.type !== "all") {
        params.append("type", filters.type);
      }
      if (filters.walletId && filters.walletId !== "all") {
        params.append("walletId", filters.walletId);
      }
      if (filters.categoryId && filters.categoryId !== "all") {
        params.append("categoryId", filters.categoryId);
      }
      if (filters.from) {
        params.append("from", new Date(filters.from).toISOString());
      }
      if (filters.to) {
        params.append("to", new Date(filters.to).toISOString());
      }

      const queryString = params.toString();
      const url = `/api/transactions${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      return response.json() as Promise<Transaction[]>;
    },
  });
}
