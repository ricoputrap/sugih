import { NextRequest } from "next/server";
import {
  listBudgets,
  createBudget,
  getBudgetSummary,
  bulkDeleteBudgets,
} from "@/modules/Budget/actions";
import { ok, badRequest, serverError, conflict, notFound } from "@/lib/http";
import { formatPostgresError } from "@/db/drizzle-client";
import { withRouteLogging } from "@/lib/logging";
import { BudgetCreateSchema } from "@/modules/Budget/schema";
import { ZodError } from "zod";

/**
 * GET /api/budgets
 * List budgets with optional filters
 *
 * Query params:
 * - month: YYYY-MM-01 format (optional)
 * - summary: boolean - DEPRECATED, included automatically when month is provided
 *
 * Response when month is provided (unified response):
 * {
 *   budgets: BudgetWithCategory[],
 *   summary: BudgetSummary
 * }
 *
 * Response when no month is provided:
 * BudgetWithCategory[]
 */
async function handleGet(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const month = url.searchParams.get("month") || undefined;
    const summary = url.searchParams.get("summary") === "true";

    // If month is provided, return unified response with both budgets and summary
    if (month) {
      const budgets = await listBudgets({ month });
      const budgetSummary = await getBudgetSummary(month);
      return ok({
        budgets,
        summary: budgetSummary,
      });
    }

    // Legacy behavior: if summary flag is used without month
    if (summary) {
      return badRequest("Month is required for budget summary");
    }

    // Return all budgets if no month specified
    const budgets = await listBudgets({});
    return ok(budgets);
  } catch (error: any) {
    console.error("Error fetching budgets:", error);

    // Handle validation errors (already formatted as Response)
    if (error instanceof Response) {
      return error;
    }

    // Handle Zod validation errors
    if (error.status === 422) {
      return error;
    }

    // Handle PostgreSQL-specific errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to fetch budgets");
  }
}

export const GET = withRouteLogging(handleGet, {
  operation: "api.budgets.list",
  logQuery: true,
});

/**
 * POST /api/budgets
 * Create a single budget
 *
 * Supports both category budgets and savings bucket budgets.
 * Exactly one of categoryId or savingsBucketId must be provided.
 *
 * Body:
 * {
 *   month: "YYYY-MM-01",
 *   categoryId?: string | null,       // For expense category budgets
 *   savingsBucketId?: string | null,  // For savings bucket budgets
 *   amountIdr: number,
 *   note?: string | null
 * }
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

    // Validate request body
    let validatedBody;
    try {
      validatedBody = BudgetCreateSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        const firstIssue = error.issues[0];
        return badRequest(firstIssue?.message || "Invalid request body");
      }
      throw error;
    }

    const budget = await createBudget(validatedBody);
    return ok(budget);
  } catch (error: any) {
    console.error("Error creating budget:", error);

    // Handle validation errors (already formatted as Response)
    if (error instanceof Response) {
      return error;
    }

    // Handle Zod validation errors
    if (error.status === 422) {
      return error;
    }

    // Handle not found errors (categories or savings buckets)
    if (error instanceof Error && error.message?.includes("not found")) {
      return notFound(error.message);
    }

    // Handle archived category/savings bucket errors
    if (error instanceof Error && error.message?.includes("archived")) {
      return badRequest(error.message);
    }

    // Handle "must specify" errors for target validation
    if (
      error instanceof Error &&
      (error.message?.includes("Cannot specify both") ||
        error.message?.includes("Must specify either"))
    ) {
      return badRequest(error.message);
    }

    // Handle PostgreSQL unique constraint violation
    const errorCode = (error as { code?: string }).code;
    if (errorCode === "23505") {
      return conflict("Budget already exists for this month and target");
    }

    // Handle PostgreSQL foreign key violation
    if (errorCode === "23503") {
      const detail = (error as { detail?: string }).detail;
      return badRequest("Invalid reference: " + detail);
    }

    // Handle PostgreSQL not-null violation
    if (errorCode === "23502") {
      const column = (error as { column?: string }).column;
      return badRequest("Missing required field: " + column);
    }

    // Handle PostgreSQL check constraint violation
    if (errorCode === "23514") {
      const detail = (error as { detail?: string }).detail;
      return badRequest("Invalid data: " + detail);
    }

    // Handle other PostgreSQL errors
    if (errorCode) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to create budget");
  }
}

export const POST = withRouteLogging(handlePost, {
  operation: "api.budgets.create",
  logQuery: false,
  logBodyMetadata: true,
});

/**
 * DELETE /api/budgets
 * Bulk delete multiple budgets
 *
 * Body:
 * - ids: array of budget IDs to delete (max 100)
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
    const result = await bulkDeleteBudgets(ids);

    // If there are failed IDs, return partial failure
    if (result.failedIds.length > 0) {
      // Some budgets could not be deleted (not found)
      return badRequest("Some budgets could not be deleted", {
        code: "VALIDATION_ERROR",
        message: "Some budgets could not be deleted",
        details: {
          deletedCount: result.deletedCount,
          failedIds: result.failedIds,
        },
      });
    }

    // All budgets deleted successfully
    return ok({
      message: "Budgets deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    console.error("Error bulk deleting budgets:", error);

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

    return serverError("Failed to delete budgets");
  }
}

export const DELETE = withRouteLogging(handleDelete, {
  operation: "api.budgets.bulk-delete",
  logQuery: false,
  logBodyMetadata: true,
});
