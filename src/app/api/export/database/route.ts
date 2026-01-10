/**
 * Export Database API Route
 *
 * GET /api/export/database
 *
 * Exports the full database as JSON or SQL format for backup.
 * Supports selecting specific tables to export.
 *
 * Query Parameters:
 * - format: "json" | "sql" (default: "json") - Export format
 * - tables: comma-separated list of table names (optional) - Specific tables to export
 *   Valid tables: wallets, categories, savings_buckets, transaction_events, postings, budgets
 */

import { NextRequest } from "next/server";
import {
  exportDatabaseAsJson,
  exportDatabaseAsSql,
  getExportStats,
} from "@/modules/Export/actions";
import { ok, badRequest, serverError } from "@/lib/http";
import { withRouteLogging } from "@/lib/logging";
import { formatPostgresError } from "@/db/client";

const VALID_TABLES = [
  "wallets",
  "categories",
  "savings_buckets",
  "transaction_events",
  "postings",
  "budgets",
] as const;

type ValidTable = (typeof VALID_TABLES)[number];

/**
 * Handle GET request for database export
 */
async function handleGet(request: NextRequest): Promise<Response> {
  try {
    const url = new URL(request.url);

    // Parse query parameters
    const format = url.searchParams.get("format") || "json";
    const tablesParam = url.searchParams.get("tables");
    const statsOnly = url.searchParams.get("stats") === "true";

    // Return stats only if requested
    if (statsOnly) {
      const stats = await getExportStats();
      return ok({
        success: true,
        stats,
      });
    }

    // Validate format
    if (format !== "json" && format !== "sql") {
      return badRequest('Invalid format. Must be "json" or "sql"');
    }

    // Parse and validate tables
    let tables: ValidTable[] | undefined;
    if (tablesParam) {
      const requestedTables = tablesParam.split(",").map((t) => t.trim());

      // Validate each table name
      for (const table of requestedTables) {
        if (!VALID_TABLES.includes(table as ValidTable)) {
          return badRequest(
            `Invalid table name: ${table}. Valid tables are: ${VALID_TABLES.join(", ")}`
          );
        }
      }

      tables = requestedTables as ValidTable[];
    }

    // Generate filename with current date
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toISOString().split("T")[1].slice(0, 8).replace(/:/g, "-");

    if (format === "json") {
      // Export as JSON
      const backup = await exportDatabaseAsJson({ format: "json", tables });
      const json = JSON.stringify(backup, null, 2);
      const filename = `sugih-backup-${dateStr}-${timeStr}.json`;

      return new Response(json, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    } else {
      // Export as SQL
      const sql = await exportDatabaseAsSql({ format: "sql", tables });
      const filename = `sugih-backup-${dateStr}-${timeStr}.sql`;

      return new Response(sql, {
        status: 200,
        headers: {
          "Content-Type": "application/sql; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }
  } catch (error: any) {
    console.error("Error exporting database:", error);

    // Handle Zod validation errors
    if (error.name === "ZodError") {
      return badRequest("Invalid export parameters", error.errors);
    }

    // Handle PostgreSQL-specific errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error during export");
    }

    return serverError("Failed to export database");
  }
}

export const GET = withRouteLogging(handleGet, {
  operation: "api.export.database",
  logQuery: true,
});
