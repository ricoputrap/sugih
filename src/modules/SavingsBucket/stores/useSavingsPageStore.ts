import { create } from "zustand";
import type { SavingsBucket } from "../schema";

/**
 * UI state for the Savings page
 */
interface SavingsPageState {
  isCreateDialogOpen: boolean;
  isEditDialogOpen: boolean;
  isDeleteDialogOpen: boolean;
  selectedBucket: SavingsBucket | null;
  selectedBucketIds: string[];

  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openEditDialog: (bucket: SavingsBucket) => void;
  closeEditDialog: () => void;
  openDeleteDialog: () => void;
  closeDeleteDialog: () => void;
  setSelectedBucketIds: (ids: string[]) => void;
  clearSelection: () => void;
  reset: () => void;
}

const initialState = {
  isCreateDialogOpen: false,
  isEditDialogOpen: false,
  isDeleteDialogOpen: false,
  selectedBucket: null,
  selectedBucketIds: [],
};

/**
 * Zustand store for Savings page UI state.
 * Manages dialogs, selections, and bulk delete state.
 */
export const useSavingsPageStore = create<SavingsPageState>((set) => ({
  ...initialState,

  openCreateDialog: () => set({ isCreateDialogOpen: true }),
  closeCreateDialog: () => set({ isCreateDialogOpen: false }),

  openEditDialog: (bucket) =>
    set({ selectedBucket: bucket, isEditDialogOpen: true }),
  closeEditDialog: () =>
    set({ selectedBucket: null, isEditDialogOpen: false }),

  openDeleteDialog: () => set({ isDeleteDialogOpen: true }),
  closeDeleteDialog: () => set({ isDeleteDialogOpen: false }),

  setSelectedBucketIds: (ids) => set({ selectedBucketIds: ids }),
  clearSelection: () => set({ selectedBucketIds: [] }),

  reset: () => set(initialState),
}));
