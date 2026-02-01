/**
 * NUQS hooks for transaction filter URL parameters
 */

import { useQueryState } from "nuqs";

export function useTransactionFilters() {
  const [typeFilter, setTypeFilter] = useQueryState("type", {
    defaultValue: "all",
  });
  const [walletFilter, setWalletFilter] = useQueryState("wallet", {
    defaultValue: "all",
  });
  const [categoryFilter, setCategoryFilter] = useQueryState("category", {
    defaultValue: "all",
  });
  const [fromDate, setFromDate] = useQueryState("from", {
    defaultValue: "",
  });
  const [toDate, setToDate] = useQueryState("to", {
    defaultValue: "",
  });

  const clearFilters = () => {
    setTypeFilter("all");
    setWalletFilter("all");
    setCategoryFilter("all");
    setFromDate("");
    setToDate("");
  };

  const hasActiveFilters =
    typeFilter !== "all" ||
    walletFilter !== "all" ||
    categoryFilter !== "all" ||
    fromDate ||
    toDate;

  return {
    typeFilter,
    setTypeFilter,
    walletFilter,
    setWalletFilter,
    categoryFilter,
    setCategoryFilter,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    clearFilters,
    hasActiveFilters,
  };
}
