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
import { Download, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export interface ExportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  endpoint: string;
  filename: string;
  fileExtension: "csv" | "json" | "sql";
  queryParams?: Record<string, string | boolean | undefined>;
  recordCount?: number;
}

export function ExportCard({
  title,
  description,
  icon,
  endpoint,
  filename,
  fileExtension,
  queryParams = {},
  recordCount,
}: ExportCardProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setStatus("idle");
    setErrorMessage(null);

    try {
      // Build query string from params
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.set(key, String(value));
        }
      });

      const url = params.toString()
        ? `${endpoint}?${params.toString()}`
        : endpoint;

      const response = await fetch(url, {
        method: "GET",
      });

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
      const fullFilename = `${filename}_${timestamp}.${fileExtension}`;

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
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              {recordCount !== undefined && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {recordCount.toLocaleString()} record
                  {recordCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase bg-muted px-2 py-1 rounded">
            {fileExtension}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-4">{description}</CardDescription>
        <Button
          onClick={handleExport}
          disabled={isExporting || recordCount === 0}
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
              Export {fileExtension.toUpperCase()}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
