"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCategoriesPageStore } from "@/modules/Category/stores";

export function CategoriesPageHeader() {
  const { openCreateDialog } = useCategoriesPageStore();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground">
          Manage your income and expense categories to organize transactions
        </p>
      </div>
      <Button onClick={openCreateDialog}>
        <Plus className="mr-2 h-4 w-4" />
        Add Category
      </Button>
    </div>
  );
}
