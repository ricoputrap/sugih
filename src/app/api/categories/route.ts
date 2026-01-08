import { NextRequest } from "next/server";
import { listCategories, createCategory } from "@/modules/Category/actions";
import {
  ok,
  badRequest,
  serverError,
  conflict,
  unprocessableEntity,
} from "@/lib/http";
import { formatPostgresError } from "@/db/client";
import { withRouteLogging } from "@/lib/logging";

/**
 * GET /api/categories
 * List all categories
 */
async function handleGet(request: NextRequest) {
  try {
    const categories = await listCategories();
    return ok(categories);
  } catch (error: any) {
    console.error("Error fetching categories:", error);

    // Handle PostgreSQL-specific errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to fetch categories");
  }
}

export const GET = withRouteLogging(handleGet, {
  operation: "api.categories.list",
  logQuery: true,
});

/**
 * POST /api/categories
 * Create a new category
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

    const category = await createCategory(body);
    return ok(category);
  } catch (error: any) {
    console.error("Error creating category:", error);

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

    return serverError("Failed to create category");
  }
}

export const POST = withRouteLogging(handlePost, {
  operation: "api.categories.create",
  logQuery: false,
  logBodyMetadata: true,
});
