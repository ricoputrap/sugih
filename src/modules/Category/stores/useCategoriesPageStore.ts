import { create } from "zustand";
import type { Category } from "../schema";

/**
 * UI state for the Categories page
 */
interface CategoriesPageState {
  isCreateDialogOpen: boolean;
  isEditDialogOpen: boolean;
  selectedCategory: Category | null;

  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openEditDialog: (category: Category) => void;
  closeEditDialog: () => void;
  reset: () => void;
}

const initialState = {
  isCreateDialogOpen: false,
  isEditDialogOpen: false,
  selectedCategory: null,
};

/**
 * Zustand store for Categories page UI state.
 * Manages dialogs and selections.
 */
export const useCategoriesPageStore = create<CategoriesPageState>((set) => ({
  ...initialState,

  openCreateDialog: () => set({ isCreateDialogOpen: true }),
  closeCreateDialog: () => set({ isCreateDialogOpen: false }),

  openEditDialog: (category) =>
    set({ selectedCategory: category, isEditDialogOpen: true }),
  closeEditDialog: () =>
    set({ selectedCategory: null, isEditDialogOpen: false }),

  reset: () => set(initialState),
}));
