/**
 * Zustand store for Transactions page UI state
 */

import { create } from "zustand";
import type { Transaction } from "@/modules/Transaction/hooks";

interface TransactionsPageState {
  isAddDialogOpen: boolean;
  isEditDialogOpen: boolean;
  isDeleteDialogOpen: boolean;
  transactionToEdit: Transaction | null;
  selectedTransactionIds: string[];

  openAddDialog: () => void;
  closeAddDialog: () => void;
  openEditDialog: (transaction: Transaction) => void;
  closeEditDialog: () => void;
  openDeleteDialog: () => void;
  closeDeleteDialog: () => void;
  setSelectedTransactionIds: (ids: string[]) => void;
  clearSelection: () => void;
  reset: () => void;
}

export const useTransactionsPageStore = create<TransactionsPageState>(
  (set) => ({
    isAddDialogOpen: false,
    isEditDialogOpen: false,
    isDeleteDialogOpen: false,
    transactionToEdit: null,
    selectedTransactionIds: [],

    openAddDialog: () => set({ isAddDialogOpen: true }),
    closeAddDialog: () => set({ isAddDialogOpen: false }),
    openEditDialog: (transaction) =>
      set({
        isEditDialogOpen: true,
        transactionToEdit: transaction,
      }),
    closeEditDialog: () =>
      set({
        isEditDialogOpen: false,
        transactionToEdit: null,
      }),
    openDeleteDialog: () => set({ isDeleteDialogOpen: true }),
    closeDeleteDialog: () => set({ isDeleteDialogOpen: false }),
    setSelectedTransactionIds: (ids) => set({ selectedTransactionIds: ids }),
    clearSelection: () => set({ selectedTransactionIds: [] }),
    reset: () =>
      set({
        isAddDialogOpen: false,
        isEditDialogOpen: false,
        isDeleteDialogOpen: false,
        transactionToEdit: null,
        selectedTransactionIds: [],
      }),
  }),
);
