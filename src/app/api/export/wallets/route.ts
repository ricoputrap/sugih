/**
 * Export Wallets API Route
 *
 * GET /api/export/wallets
 *
 * Exports wallets as CSV file for download.
 * Includes current balance calculated from postings.
 *
 * Query Parameters:
 * - includeArchived: boolean (optional, default: true) - Include archived wallets
 */

import { NextRequest } from "next/server";
import { exportWalletsAsCsv } from "@/modules/Export/actions";
import { badRequest, serverError } from "@/lib/http";
import { withRouteLogging } from "@/lib/logging";
import { formatPostgresError } from "@/db/client";

/**
 * Handle GET request for wallet CSV export
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
    const csv = await exportWalletsAsCsv(options);

    // Generate filename with current date
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const filename = `sugih-wallets-${dateStr}.csv`;

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
    console.error("Error exporting wallets:", error);

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

    return serverError("Failed to export wallets");
  }
}

export const GET = withRouteLogging(handleGet, {
  operation: "api.export.wallets",
  logQuery: true,
});
