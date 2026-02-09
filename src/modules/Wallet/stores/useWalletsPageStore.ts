import { create } from "zustand";
import type { WalletWithBalance } from "../hooks/useWalletsData";

/**
 * UI state for the Wallets page
 */
interface WalletsPageState {
  isCreateDialogOpen: boolean;
  isEditDialogOpen: boolean;
  selectedWallet: WalletWithBalance | null;

  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openEditDialog: (wallet: WalletWithBalance) => void;
  closeEditDialog: () => void;
  reset: () => void;
}

const initialState = {
  isCreateDialogOpen: false,
  isEditDialogOpen: false,
  selectedWallet: null,
};

/**
 * Zustand store for Wallets page UI state.
 * Manages dialogs and selections.
 */
export const useWalletsPageStore = create<WalletsPageState>((set) => ({
  ...initialState,

  openCreateDialog: () => set({ isCreateDialogOpen: true }),
  closeCreateDialog: () => set({ isCreateDialogOpen: false }),

  openEditDialog: (wallet) =>
    set({ selectedWallet: wallet, isEditDialogOpen: true }),
  closeEditDialog: () => set({ selectedWallet: null, isEditDialogOpen: false }),

  reset: () => set(initialState),
}));
