import { beforeEach, describe, expect, it } from "vitest";
import { useBudgetsPageStore } from "./useBudgetsPageStore";

const mockBudget = {
  id: "budget-1",
  month: "2026-01-01",
  category_id: "cat-1",
  savings_bucket_id: null,
  amount_idr: 1000000,
  note: null,
  created_at: new Date(),
  updated_at: new Date(),
  category_name: "Food",
  savings_bucket_name: null,
  target_type: "category" as const,
};

const mockCopyResult = {
  created: [mockBudget],
  skipped: [
    {
      categoryId: "cat-2",
      savingsBucketId: null,
      targetName: "Transport",
    },
  ],
  fromMonth: "2026-01-01",
  toMonth: "2026-02-01",
};

describe("useBudgetsPageStore", () => {
  beforeEach(() => {
    useBudgetsPageStore.getState().reset();
  });

  describe("initial state", () => {
    it("has all dialogs closed by default", () => {
      const state = useBudgetsPageStore.getState();

      expect(state.isCreateDialogOpen).toBe(false);
      expect(state.isEditDialogOpen).toBe(false);
      expect(state.copyDialogOpen).toBe(false);
      expect(state.copyResultModalOpen).toBe(false);
    });

    it("has no selections by default", () => {
      const state = useBudgetsPageStore.getState();

      expect(state.selectedBudget).toBeNull();
      expect(state.copyResult).toBeNull();
    });
  });

  describe("create dialog", () => {
    it("opens create dialog", () => {
      useBudgetsPageStore.getState().openCreateDialog();

      expect(useBudgetsPageStore.getState().isCreateDialogOpen).toBe(true);
    });

    it("closes create dialog", () => {
      useBudgetsPageStore.getState().openCreateDialog();
      useBudgetsPageStore.getState().closeCreateDialog();

      expect(useBudgetsPageStore.getState().isCreateDialogOpen).toBe(false);
    });
  });

  describe("edit dialog", () => {
    it("opens edit dialog with selected budget", () => {
      useBudgetsPageStore.getState().openEditDialog(mockBudget);

      const state = useBudgetsPageStore.getState();
      expect(state.isEditDialogOpen).toBe(true);
      expect(state.selectedBudget).toEqual(mockBudget);
    });

    it("closes edit dialog and clears selected budget", () => {
      useBudgetsPageStore.getState().openEditDialog(mockBudget);
      useBudgetsPageStore.getState().closeEditDialog();

      const state = useBudgetsPageStore.getState();
      expect(state.isEditDialogOpen).toBe(false);
      expect(state.selectedBudget).toBeNull();
    });
  });

  describe("copy dialog", () => {
    it("opens copy dialog", () => {
      useBudgetsPageStore.getState().openCopyDialog();

      expect(useBudgetsPageStore.getState().copyDialogOpen).toBe(true);
    });

    it("closes copy dialog", () => {
      useBudgetsPageStore.getState().openCopyDialog();
      useBudgetsPageStore.getState().closeCopyDialog();

      expect(useBudgetsPageStore.getState().copyDialogOpen).toBe(false);
    });
  });

  describe("copy result modal", () => {
    it("sets copy result", () => {
      useBudgetsPageStore.getState().setCopyResult(mockCopyResult);

      expect(useBudgetsPageStore.getState().copyResult).toEqual(mockCopyResult);
    });

    it("opens copy result modal", () => {
      useBudgetsPageStore.getState().openCopyResultModal();

      expect(useBudgetsPageStore.getState().copyResultModalOpen).toBe(true);
    });

    it("closes copy result modal and clears copy result", () => {
      useBudgetsPageStore.getState().setCopyResult(mockCopyResult);
      useBudgetsPageStore.getState().openCopyResultModal();
      useBudgetsPageStore.getState().closeCopyResultModal();

      const state = useBudgetsPageStore.getState();
      expect(state.copyResultModalOpen).toBe(false);
      expect(state.copyResult).toBeNull();
    });
  });

  describe("reset", () => {
    it("resets all state to initial values", () => {
      // Set some state
      useBudgetsPageStore.getState().openCreateDialog();
      useBudgetsPageStore.getState().openEditDialog(mockBudget);
      useBudgetsPageStore.getState().openCopyDialog();
      useBudgetsPageStore.getState().setCopyResult(mockCopyResult);
      useBudgetsPageStore.getState().openCopyResultModal();

      // Reset
      useBudgetsPageStore.getState().reset();

      const state = useBudgetsPageStore.getState();
      expect(state.isCreateDialogOpen).toBe(false);
      expect(state.isEditDialogOpen).toBe(false);
      expect(state.copyDialogOpen).toBe(false);
      expect(state.copyResultModalOpen).toBe(false);
      expect(state.selectedBudget).toBeNull();
      expect(state.copyResult).toBeNull();
    });
  });
});
