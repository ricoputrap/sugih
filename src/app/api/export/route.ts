/**
 * Export API Route - Main Index
 *
 * GET /api/export
 *
 * Returns available export options and links to specific export endpoints.
 * Also provides export statistics for the current database.
 */

import { NextRequest } from "next/server";
import { getExportStats } from "@/modules/Export/actions";
import { ok, serverError } from "@/lib/http";
import { withRouteLogging } from "@/lib/logging";
import { formatPostgresError } from "@/db/client";

/**
 * Handle GET request for export options
 */
async function handleGet(request: NextRequest): Promise<Response> {
  try {
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Get export statistics
    const stats = await getExportStats();

    return ok({
      success: true,
      message: "Sugih Export API - Available export options",
      stats,
      exports: {
        transactions: {
          description: "Export all transactions as CSV",
          endpoint: `${baseUrl}/api/export/transactions`,
          method: "GET",
          queryParams: {
            from: "ISO date string (optional) - Start date filter",
            to: "ISO date string (optional) - End date filter",
            includeDeleted:
              "boolean (optional, default: false) - Include soft-deleted transactions",
          },
          contentType: "text/csv",
        },
        database: {
          description: "Export full database backup",
          endpoint: `${baseUrl}/api/export/database`,
          method: "GET",
          queryParams: {
            format: '"json" | "sql" (default: "json") - Export format',
            tables:
              "comma-separated list (optional) - Specific tables to export",
            stats: "boolean (optional) - Return only stats without data",
          },
          validTables: [
            "wallets",
            "categories",
            "savings_buckets",
            "transaction_events",
            "postings",
            "budgets",
          ],
          contentType: "application/json or application/sql",
        },
        wallets: {
          description: "Export wallets as CSV",
          endpoint: `${baseUrl}/api/export/wallets`,
          method: "GET",
          queryParams: {
            includeArchived:
              "boolean (optional, default: true) - Include archived wallets",
          },
          contentType: "text/csv",
        },
        categories: {
          description: "Export categories as CSV",
          endpoint: `${baseUrl}/api/export/categories`,
          method: "GET",
          queryParams: {
            includeArchived:
              "boolean (optional, default: true) - Include archived categories",
          },
          contentType: "text/csv",
        },
        savingsBuckets: {
          description: "Export savings buckets as CSV",
          endpoint: `${baseUrl}/api/export/savings-buckets`,
          method: "GET",
          queryParams: {
            includeArchived:
              "boolean (optional, default: true) - Include archived buckets",
          },
          contentType: "text/csv",
        },
        budgets: {
          description: "Export budgets as CSV",
          endpoint: `${baseUrl}/api/export/budgets`,
          method: "GET",
          queryParams: {
            from: "YYYY-MM (optional) - Start month filter",
            to: "YYYY-MM (optional) - End month filter",
          },
          contentType: "text/csv",
        },
      },
    });
  } catch (error: any) {
    console.error("Error getting export options:", error);

    // Handle PostgreSQL-specific errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to get export options");
  }
}

export const GET = withRouteLogging(handleGet, {
  operation: "api.export.index",
  logQuery: false,
});
