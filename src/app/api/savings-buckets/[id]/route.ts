import { NextRequest } from "next/server";
import {
  getSavingsBucketById,
  updateSavingsBucket,
  archiveSavingsBucket,
  restoreSavingsBucket,
  deleteSavingsBucket,
} from "@/modules/SavingsBucket/actions";
import { ok, badRequest, notFound, serverError, conflict } from "@/lib/http";
import { formatPostgresError } from "@/db/drizzle-client";
import { withRouteLogging } from "@/lib/logging";

/**
 * GET /api/savings-buckets/[id]
 * Get a savings bucket by ID
 */
async function handleGet(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const savingsBucket = await getSavingsBucketById(id);

    if (!savingsBucket) {
      return notFound("Savings bucket not found");
    }

    return ok(savingsBucket);
  } catch (error: any) {
    console.error("Error fetching savings bucket:", error);

    // Handle PostgreSQL-specific errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to fetch savings bucket");
  }
}

export const GET = withRouteLogging(handleGet, {
  operation: "api.savings-buckets.get",
  logQuery: false,
  logRouteParams: true,
});

/**
 * PATCH /api/savings-buckets/[id]
 * Update a savings bucket
 */
async function handlePatch(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const savingsBucket = await updateSavingsBucket(id, body);
    return ok(savingsBucket);
  } catch (error: any) {
    console.error("Error updating savings bucket:", error);

    // Handle validation errors (already formatted as Response)
    if (error instanceof Response) {
      return error;
    }

    // Handle Zod validation errors
    if (error.status === 422) {
      return error;
    }

    // Handle not found error
    if (error.message?.includes("not found")) {
      return notFound(error.message);
    }

    // Handle duplicate name error
    if (error.message?.includes("already exists")) {
      return conflict(error.message);
    }

    // Handle no updates provided
    if (error.message?.includes("No updates provided")) {
      return badRequest(error.message);
    }

    // Handle PostgreSQL unique constraint violation
    if (error.code === "23505") {
      return conflict("Savings bucket with this name already exists");
    }

    // Handle PostgreSQL foreign key violation
    if (error.code === "23503") {
      return badRequest("Invalid reference: " + error.detail);
    }

    // Handle PostgreSQL not-null violation
    if (error.code === "23502") {
      return badRequest("Missing required field: " + error.column);
    }

    // Handle other PostgreSQL errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to update savings bucket");
  }
}

export const PATCH = withRouteLogging(handlePatch, {
  operation: "api.savings-buckets.update",
  logQuery: false,
  logRouteParams: true,
  logBodyMetadata: true,
});

/**
 * DELETE /api/savings-buckets/[id]
 * Delete or archive a savings bucket
 *
 * Query params:
 * - action: "archive" (default) or "delete"
 */
async function handleDelete(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Check if this is a soft delete (archive) or hard delete
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "archive";

    if (action === "archive") {
      // Check if already archived - toggle to restore
      const existingBucket = await getSavingsBucketById(id);
      if (!existingBucket) {
        return notFound("Savings bucket not found");
      }

      if (existingBucket.archived) {
        // Already archived - restore it
        const savingsBucket = await restoreSavingsBucket(id);
        return ok({
          message: "Savings bucket restored successfully",
          savingsBucket,
        });
      } else {
        // Not archived - archive it
        const savingsBucket = await archiveSavingsBucket(id);
        return ok({
          message: "Savings bucket archived successfully",
          savingsBucket,
        });
      }
    } else if (action === "delete") {
      // Hard delete - permanently delete the savings bucket
      await deleteSavingsBucket(id);
      return ok({ message: "Savings bucket deleted successfully" });
    } else {
      return badRequest("Invalid action. Use 'archive' or 'delete'");
    }
  } catch (error: any) {
    console.error("Error deleting savings bucket:", error);

    // Handle validation errors (already formatted as Response)
    if (error instanceof Response) {
      return error;
    }

    // Handle Zod validation errors
    if (error.status === 422) {
      return error;
    }

    // Handle not found error
    if (error.message?.includes("not found")) {
      return notFound(error.message);
    }

    // Handle already archived error
    if (error.message?.includes("already archived")) {
      return conflict(error.message);
    }

    // Handle cannot delete with transactions
    if (error.message?.includes("transactions")) {
      return conflict(error.message);
    }

    // Handle PostgreSQL foreign key violation (can't delete due to references)
    if (error.code === "23503") {
      return conflict(
        "Cannot delete savings bucket: it is referenced by other records",
      );
    }

    // Handle other PostgreSQL errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to delete savings bucket");
  }
}

export const DELETE = withRouteLogging(handleDelete, {
  operation: "api.savings-buckets.delete",
  logQuery: true,
  logRouteParams: true,
});
