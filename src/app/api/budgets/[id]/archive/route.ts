import { NextRequest } from "next/server";
import { archiveBudget, restoreBudget } from "@/modules/Budget/actions";
import { ok, badRequest, serverError, notFound } from "@/lib/http";
import { formatPostgresError } from "@/db/drizzle-client";
import { withRouteLogging } from "@/lib/logging";

/**
 * PATCH /api/budgets/[id]/archive
 * Archive a single budget
 */
async function handlePatch(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Parse request body to determine action (archive or restore)
    let body: any = {};
    try {
      if (request.headers.get("content-type")?.includes("application/json")) {
        body = await request.json();
      }
    } catch {
      // If no body, default to archive action
    }

    const action = body.action || "archive"; // Default to archive
    const archived = action === "archive";

    let result;
    if (archived) {
      result = await archiveBudget(id);
    } else {
      result = await restoreBudget(id);
    }

    return ok(result);
  } catch (error: any) {
    console.error("Error archiving budget:", error);

    // Handle validation errors (already formatted as Response)
    if (error instanceof Response) {
      return error;
    }

    // Handle Zod validation errors
    if (error.status === 422) {
      return error;
    }

    // Handle not found errors
    if (error.message?.includes("not found")) {
      return notFound(error.message);
    }

    // Handle PostgreSQL-specific errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to archive budget");
  }
}

export const PATCH = withRouteLogging(handlePatch, {
  operation: "api.budgets.archive",
  logQuery: false,
  logBodyMetadata: true,
});
