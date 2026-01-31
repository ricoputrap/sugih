import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function BudgetsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-9 w-32 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-5 w-64 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
        </CardHeader>
        <CardContent>
          <div className="h-48 animate-pulse rounded bg-gray-200" />
        </CardContent>
      </Card>
    </div>
  );
}
