"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategoriesData } from "@/modules/Category/hooks";

export function CategoriesStatsCards() {
  const { data: categories, isLoading } = useCategoriesData();

  if (isLoading || !categories) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const activeCategories = categories.filter((c) => !c.archived);
  const archivedCategories = categories.filter((c) => c.archived);
  const incomeCategories = activeCategories.filter((c) => c.type === "income");
  const expenseCategories = activeCategories.filter(
    (c) => c.type === "expense",
  );

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Income Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {incomeCategories.length}
          </div>
          <p className="text-xs text-muted-foreground">
            For earnings & revenue
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Expense Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {expenseCategories.length}
          </div>
          <p className="text-xs text-muted-foreground">For spending & costs</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Active Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeCategories.length}</div>
          <p className="text-xs text-muted-foreground">Available for use</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Archived Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{archivedCategories.length}</div>
          <p className="text-xs text-muted-foreground">Hidden from forms</p>
        </CardContent>
      </Card>
    </div>
  );
}
