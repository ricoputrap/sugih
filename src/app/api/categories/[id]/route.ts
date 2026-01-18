import { NextRequest } from "next/server";
import {
  getCategoryById,
  updateCategory,
  archiveCategory,
  deleteCategory,
} from "@/modules/Category/actions";
import { ok, badRequest, notFound, serverError, conflict } from "@/lib/http";
import { formatPostgresError } from "@/db/drizzle-client";
import { withRouteLogging } from "@/lib/logging";

/**
 * GET /api/categories/[id]
 * Get a category by ID
 */
async function handleGet(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const category = await getCategoryById(id);

    if (!category) {
      return notFound("Category not found");
    }

    return ok(category);
  } catch (error: any) {
    console.error("Error fetching category:", error);

    // Handle PostgreSQL-specific errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to fetch category");
  }
}

export const GET = withRouteLogging(handleGet, {
  operation: "api.categories.get",
  logQuery: false,
  logRouteParams: true,
});

/**
 * PATCH /api/categories/[id]
 * Update a category
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

    const category = await updateCategory(id, body);
    return ok(category);
  } catch (error: any) {
    console.error("Error updating category:", error);

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
      return conflict("Category with this name already exists");
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

    return serverError("Failed to update category");
  }
}

export const PATCH = withRouteLogging(handlePatch, {
  operation: "api.categories.update",
  logQuery: false,
  logRouteParams: true,
  logBodyMetadata: true,
});

/**
 * DELETE /api/categories/[id]
 * Delete or archive a category
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
      // Soft delete - archive the category
      const category = await archiveCategory(id);
      return ok({ message: "Category archived successfully", category });
    } else if (action === "delete") {
      // Hard delete - permanently delete the category
      await deleteCategory(id);
      return ok({ message: "Category deleted successfully" });
    } else {
      return badRequest("Invalid action. Use 'archive' or 'delete'");
    }
  } catch (error: any) {
    console.error("Error deleting category:", error);

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
        "Cannot delete category: it is referenced by other records",
      );
    }

    // Handle other PostgreSQL errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to delete category");
  }
}

export const DELETE = withRouteLogging(handleDelete, {
  operation: "api.categories.delete",
  logQuery: true, // Log action query param
  logRouteParams: true,
});
