"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  Database,
} from "lucide-react";

interface DatabaseExportCardProps {
  totalRecords: number;
}

type ExportFormat = "json" | "sql";

const TABLE_OPTIONS = [
  { value: "all", label: "All Tables" },
  { value: "wallets", label: "Wallets" },
  { value: "categories", label: "Categories" },
  { value: "savings_buckets", label: "Savings Buckets" },
  { value: "transaction_events", label: "Transactions" },
  { value: "postings", label: "Postings" },
  { value: "budgets", label: "Budgets" },
] as const;

export function DatabaseExportCard({ totalRecords }: DatabaseExportCardProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [format, setFormat] = useState<ExportFormat>("json");
  const [selectedTable, setSelectedTable] = useState<string>("all");

  const handleExport = async () => {
    setIsExporting(true);
    setStatus("idle");
    setErrorMessage(null);

    try {
      const params = new URLSearchParams();
      params.set("format", format);

      if (selectedTable !== "all") {
        params.set("tables", selectedTable);
      }

      const response = await fetch(
        `/api/export/database?${params.toString()}`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Export failed: ${response.statusText}`,
        );
      }

      // Get the blob from response
      const blob = await response.blob();

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0];
      const tableSuffix = selectedTable !== "all" ? `_${selectedTable}` : "";
      const fullFilename = `sugih_backup${tableSuffix}_${timestamp}.${format}`;

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fullFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (error: any) {
      console.error("Export error:", error);
      setStatus("error");
      setErrorMessage(error.message || "Export failed");
      setTimeout(() => {
        setStatus("idle");
        setErrorMessage(null);
      }, 5000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Full Database Backup</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalRecords.toLocaleString()} total records
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-4">
          Export your entire database or selected tables. Choose JSON for data
          portability or SQL for database restoration.
        </CardDescription>

        <div className="grid gap-4 sm:grid-cols-2 mb-4">
          <div className="space-y-2">
            <Label htmlFor="format">Export Format</Label>
            <Select
              value={format}
              onValueChange={(val) => setFormat(val as ExportFormat)}
            >
              <SelectTrigger id="format" className="w-full">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  <span className="flex items-center gap-2">
                    <span className="font-medium">JSON</span>
                    <span className="text-muted-foreground">- Data backup</span>
                  </span>
                </SelectItem>
                <SelectItem value="sql">
                  <span className="flex items-center gap-2">
                    <span className="font-medium">SQL</span>
                    <span className="text-muted-foreground">
                      - Database restore
                    </span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tables">Tables</Label>
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger id="tables" className="w-full">
                <SelectValue placeholder="Select tables" />
              </SelectTrigger>
              <SelectContent>
                {TABLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleExport}
          disabled={isExporting || totalRecords === 0}
          variant={status === "success" ? "outline" : "default"}
          className="w-full"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : status === "success" ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
              Downloaded!
            </>
          ) : status === "error" ? (
            <>
              <AlertCircle className="mr-2 h-4 w-4 text-destructive" />
              {errorMessage || "Failed"}
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export {format.toUpperCase()}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
