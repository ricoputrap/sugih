/**
 * Export Budgets API Route
 *
 * GET /api/export/budgets
 *
 * Exports budgets as CSV file for download.
 * Supports filtering by month range.
 *
 * Query Parameters:
 * - from: YYYY-MM (optional) - Start month filter
 * - to: YYYY-MM (optional) - End month filter
 */

import { NextRequest } from "next/server";
import { exportBudgetsAsCsv } from "@/modules/Export/actions";
import { badRequest, serverError } from "@/lib/http";
import { withRouteLogging } from "@/lib/logging";
import { formatPostgresError } from "@/db/drizzle-client";

/**
 * Handle GET request for budgets CSV export
 */
async function handleGet(request: NextRequest): Promise<Response> {
  try {
    const url = new URL(request.url);

    // Parse query parameters
    const options = {
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
    };

    // Generate CSV
    const csv = await exportBudgetsAsCsv(options);

    // Generate filename with current date
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const filename = `sugih-budgets-${dateStr}.csv`;

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
    console.error("Error exporting budgets:", error);

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

    return serverError("Failed to export budgets");
  }
}

export const GET = withRouteLogging(handleGet, {
  operation: "api.export.budgets",
  logQuery: true,
});
