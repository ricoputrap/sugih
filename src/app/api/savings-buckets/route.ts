import { NextRequest } from "next/server";
import {
  listSavingsBuckets,
  createSavingsBucket,
  bulkDeleteSavingsBuckets,
} from "@/modules/SavingsBucket/actions";
import { ok, badRequest, serverError, conflict } from "@/lib/http";
import { formatPostgresError } from "@/db/drizzle-client";
import { withRouteLogging } from "@/lib/logging";

/**
 * GET /api/savings-buckets
 * List all savings buckets
 */
async function handleGet(request: NextRequest) {
  try {
    const savingsBuckets = await listSavingsBuckets();
    return ok(savingsBuckets);
  } catch (error: any) {
    console.error("Error fetching savings buckets:", error);

    // Handle PostgreSQL-specific errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to fetch savings buckets");
  }
}

export const GET = withRouteLogging(handleGet, {
  operation: "api.savings-buckets.list",
  logQuery: true,
});

/**
 * POST /api/savings-buckets
 * Create a new savings bucket
 */
async function handlePost(request: NextRequest) {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const savingsBucket = await createSavingsBucket(body);
    return ok(savingsBucket);
  } catch (error: any) {
    console.error("Error creating savings bucket:", error);

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
      return badRequest(error.message);
    }

    // Handle duplicate name error
    if (error.message?.includes("already exists")) {
      return conflict(error.message);
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

    // Handle PostgreSQL check constraint violation
    if (error.code === "23514") {
      return badRequest("Invalid data: " + error.detail);
    }

    // Handle other PostgreSQL errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to create savings bucket");
  }
}

export const POST = withRouteLogging(handlePost, {
  operation: "api.savings-buckets.create",
  logQuery: false,
  logBodyMetadata: true,
});

/**
 * DELETE /api/savings-buckets
 * Bulk delete multiple savings buckets
 *
 * Body:
 * - ids: array of savings bucket IDs to delete (max 100)
 *
 * Returns:
 * - Success: { message, deletedCount }
 * - Partial failure: { error: { code, message, details: { deletedCount, failedIds } } }
 */
async function handleDelete(request: NextRequest) {
  try {
    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { ids } = body;

    if (!ids) {
      return badRequest("Missing required field: ids");
    }

    if (!Array.isArray(ids)) {
      return badRequest("Field 'ids' must be an array");
    }

    // Call the bulk delete action
    const result = await bulkDeleteSavingsBuckets(ids);

    // If there are failed IDs, return partial failure
    if (result.failedIds.length > 0) {
      // Some buckets could not be deleted (either not found or already deleted)
      return badRequest("Some savings buckets could not be deleted", {
        code: "VALIDATION_ERROR",
        message: "Some savings buckets could not be deleted",
        details: {
          deletedCount: result.deletedCount,
          failedIds: result.failedIds,
        },
      });
    }

    // All buckets deleted successfully
    return ok({
      message: "Savings buckets deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    console.error("Error bulk deleting savings buckets:", error);

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
      return badRequest(error.message);
    }

    // Handle PostgreSQL-specific errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to delete savings buckets");
  }
}

export const DELETE = withRouteLogging(handleDelete, {
  operation: "api.savings-buckets.bulk-delete",
  logQuery: false,
  logBodyMetadata: true,
});
