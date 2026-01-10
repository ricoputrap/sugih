/**
 * Export Savings Buckets API Route
 *
 * GET /api/export/savings-buckets
 *
 * Exports savings buckets as CSV file for download.
 * Includes balance calculated from postings.
 *
 * Query Parameters:
 * - includeArchived: boolean (optional, default: true) - Include archived buckets
 */

import { NextRequest } from "next/server";
import { exportSavingsBucketsAsCsv } from "@/modules/Export/actions";
import { badRequest, serverError } from "@/lib/http";
import { withRouteLogging } from "@/lib/logging";
import { formatPostgresError } from "@/db/client";

/**
 * Handle GET request for savings buckets CSV export
 */
async function handleGet(request: NextRequest): Promise<Response> {
  try {
    const url = new URL(request.url);

    // Parse query parameters
    // Zod will coerce these to proper types
    const options: Record<string, unknown> = {};

    const includeArchivedParam = url.searchParams.get("includeArchived");
    if (includeArchivedParam)
      options.includeArchived = includeArchivedParam === "true";

    // Generate CSV
    const csv = await exportSavingsBucketsAsCsv(options);

    // Generate filename with current date
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const filename = `sugih-savings-buckets-${dateStr}.csv`;

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
    console.error("Error exporting savings buckets:", error);

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

    return serverError("Failed to export savings buckets");
  }
}

export const GET = withRouteLogging(handleGet, {
  operation: "api.export.savings-buckets",
  logQuery: true,
});
