import { create } from "zustand";
import type { BudgetWithCategory } from "../types";

/**
 * Result of copying budgets - used for the result modal
 */
export interface CopyResult {
  created: BudgetWithCategory[];
  skipped: Array<{
    categoryId: string | null;
    savingsBucketId: string | null;
    targetName: string;
  }>;
  fromMonth?: string;
  toMonth?: string;
}

/**
 * UI state for the Budgets page
 */
interface BudgetsPageState {
  // Dialog states
  isCreateDialogOpen: boolean;
  isEditDialogOpen: boolean;
  copyDialogOpen: boolean;
  copyResultModalOpen: boolean;

  // Selection state
  selectedBudget: BudgetWithCategory | null;
  copyResult: CopyResult | null;

  // Actions
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openEditDialog: (budget: BudgetWithCategory) => void;
  closeEditDialog: () => void;
  openCopyDialog: () => void;
  closeCopyDialog: () => void;
  setCopyResult: (result: CopyResult | null) => void;
  openCopyResultModal: () => void;
  closeCopyResultModal: () => void;
  reset: () => void;
}

const initialState = {
  isCreateDialogOpen: false,
  isEditDialogOpen: false,
  copyDialogOpen: false,
  copyResultModalOpen: false,
  selectedBudget: null,
  copyResult: null,
};

/**
 * Zustand store for Budgets page UI state.
 * Manages dialogs, selections, and copy results.
 */
export const useBudgetsPageStore = create<BudgetsPageState>((set) => ({
  ...initialState,

  openCreateDialog: () => set({ isCreateDialogOpen: true }),
  closeCreateDialog: () => set({ isCreateDialogOpen: false }),

  openEditDialog: (budget) =>
    set({ selectedBudget: budget, isEditDialogOpen: true }),
  closeEditDialog: () => set({ selectedBudget: null, isEditDialogOpen: false }),

  openCopyDialog: () => set({ copyDialogOpen: true }),
  closeCopyDialog: () => set({ copyDialogOpen: false }),

  setCopyResult: (result) => set({ copyResult: result }),
  openCopyResultModal: () => set({ copyResultModalOpen: true }),
  closeCopyResultModal: () =>
    set({ copyResultModalOpen: false, copyResult: null }),

  reset: () => set(initialState),
}));
