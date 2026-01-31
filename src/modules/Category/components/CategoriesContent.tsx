"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryTable } from "./CategoryTable";
import { useCategoriesData } from "@/modules/Category/hooks";
import { useCategoryMutations } from "@/modules/Category/hooks";
import { useCategoriesPageStore } from "@/modules/Category/stores";

export function CategoriesContent() {
  const { data: categories, isLoading } = useCategoriesData();
  const { archiveCategory, deleteCategory } = useCategoryMutations();
  const { openEditDialog } = useCategoriesPageStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Categories</CardTitle>
        <CardDescription>
          A list of all your income and expense categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CategoryTable
          categories={categories ?? []}
          onArchive={async (id: string) => {
            await archiveCategory.mutateAsync(id);
          }}
          onDelete={async (id: string) => {
            await deleteCategory.mutateAsync(id);
          }}
          onEdit={openEditDialog}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
}
