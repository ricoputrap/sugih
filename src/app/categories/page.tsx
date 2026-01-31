import { Suspense } from "react";
import { CategoriesPageHeader } from "@/modules/Category/components/CategoriesPageHeader";
import { CategoriesStatsCards } from "@/modules/Category/components/CategoriesStatsCards";
import { CategoriesContent } from "@/modules/Category/components/CategoriesContent";
import { CategoryDialogForm } from "@/modules/Category/components/CategoryDialogForm";
import { CategoriesPageSkeleton } from "@/modules/Category/components/CategoriesPageSkeleton";

export default function CategoriesPage() {
  return (
    <Suspense fallback={<CategoriesPageSkeleton />}>
      <div className="space-y-6">
        {/* Header - self-contained */}
        <CategoriesPageHeader />

        {/* Statistics Cards - self-contained */}
        <CategoriesStatsCards />

        {/* Categories Table - self-contained */}
        <CategoriesContent />

        {/* Dialogs - self-contained */}
        <CategoryDialogForm />
      </div>
    </Suspense>
  );
}
