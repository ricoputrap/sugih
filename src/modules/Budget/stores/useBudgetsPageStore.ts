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
  isBulkDeleteDialogOpen: boolean;

  // Selection state
  selectedBudget: BudgetWithCategory | null;
  copyResult: CopyResult | null;
  selectedBudgetIds: Set<string>;

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
  setSelectedBudgetIds: (ids: string[]) => void;
  toggleBudgetSelection: (id: string) => void;
  selectAllVisibleBudgets: (ids: string[]) => void;
  clearSelection: () => void;
  openBulkDeleteDialog: () => void;
  closeBulkDeleteDialog: () => void;
  reset: () => void;
}

const initialState = {
  isCreateDialogOpen: false,
  isEditDialogOpen: false,
  copyDialogOpen: false,
  copyResultModalOpen: false,
  isBulkDeleteDialogOpen: false,
  selectedBudget: null,
  copyResult: null,
  selectedBudgetIds: new Set<string>(),
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

  setSelectedBudgetIds: (ids) => set({ selectedBudgetIds: new Set(ids) }),
  toggleBudgetSelection: (id) =>
    set((state) => {
      const newSelection = new Set(state.selectedBudgetIds);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return { selectedBudgetIds: newSelection };
    }),
  selectAllVisibleBudgets: (ids) => set({ selectedBudgetIds: new Set(ids) }),
  clearSelection: () => set({ selectedBudgetIds: new Set() }),

  openBulkDeleteDialog: () => set({ isBulkDeleteDialogOpen: true }),
  closeBulkDeleteDialog: () => set({ isBulkDeleteDialogOpen: false }),

  reset: () => set(initialState),
}));
