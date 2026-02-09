"use client";

import { Download } from "lucide-react";

export function ExportPageHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Export Data</h2>
        <p className="text-muted-foreground">
          Download your financial data in various formats for backup or analysis
        </p>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Download className="h-4 w-4" />
        <span>All exports are instant downloads</span>
      </div>
    </div>
  );
}
