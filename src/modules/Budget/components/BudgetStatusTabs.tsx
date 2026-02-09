"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BudgetStatusTabsProps {
  status: "active" | "archived";
  onStatusChange: (status: "active" | "archived") => void;
  activeCount?: number;
  archivedCount?: number;
  disabled?: boolean;
}

export function BudgetStatusTabs({
  status,
  onStatusChange,
  activeCount,
  archivedCount,
  disabled = false,
}: BudgetStatusTabsProps) {
  return (
    <Tabs
      value={status}
      onValueChange={(value) => onStatusChange(value as "active" | "archived")}
    >
      <TabsList>
        <TabsTrigger value="active" disabled={disabled}>
          Active {activeCount !== undefined && `(${activeCount})`}
        </TabsTrigger>
        <TabsTrigger value="archived" disabled={disabled}>
          Archived {archivedCount !== undefined && `(${archivedCount})`}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
