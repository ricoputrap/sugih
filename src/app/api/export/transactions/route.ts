/**
 * Export Transactions API Route
 *
 * GET /api/export/transactions
 *
 * Exports transactions as CSV file for download.
 * Supports filtering by date range and including deleted transactions.
 *
 * Query Parameters:
 * - from: ISO date string (optional) - Start date filter
 * - to: ISO date string (optional) - End date filter
 * - includeDeleted: boolean (optional, default: false) - Include soft-deleted transactions
 */

import { NextRequest } from "next/server";
import { exportTransactionsAsCsv } from "@/modules/Export/actions";
import { badRequest, serverError } from "@/lib/http";
import { withRouteLogging } from "@/lib/logging";
import { formatPostgresError } from "@/db/drizzle-client";

/**
 * Handle GET request for transaction CSV export
 */
async function handleGet(request: NextRequest): Promise<Response> {
  try {
    const url = new URL(request.url);

    // Parse query parameters
    // Zod will coerce these to proper types
    const options: Record<string, unknown> = {};

    const fromParam = url.searchParams.get("from");
    if (fromParam) options.from = fromParam;

    const toParam = url.searchParams.get("to");
    if (toParam) options.to = toParam;

    const includeDeletedParam = url.searchParams.get("includeDeleted");
    if (includeDeletedParam)
      options.includeDeleted = includeDeletedParam === "true";

    // Generate CSV
    const csv = await exportTransactionsAsCsv(options);

    // Generate filename with current date
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const filename = `sugih-transactions-${dateStr}.csv`;

    // Return CSV as downloadable file
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error: any) {
    console.error("Error exporting transactions:", error);

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

    return serverError("Failed to export transactions");
  }
}

export const GET = withRouteLogging(handleGet, {
  operation: "api.export.transactions",
  logQuery: true,
});
