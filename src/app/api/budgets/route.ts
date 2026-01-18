import { NextRequest } from "next/server";
import {
  listBudgets,
  upsertBudgets,
  getBudgetSummary,
} from "@/modules/Budget/actions";
import { ok, badRequest, serverError, conflict, notFound } from "@/lib/http";
import { formatPostgresError } from "@/db/drizzle-client";
import { withRouteLogging } from "@/lib/logging";

/**
 * GET /api/budgets
 * List budgets with optional filters
 *
 * Query params:
 * - month: YYYY-MM-01 format (optional)
 * - summary: boolean - if true, returns budget vs actual summary (requires month)
 */
async function handleGet(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const month = url.searchParams.get("month") || undefined;
    const summary = url.searchParams.get("summary") === "true";

    if (summary) {
      if (!month) {
        return badRequest("Month is required for budget summary");
      }
      const budgetSummary = await getBudgetSummary(month);
      return ok(budgetSummary);
    }

    const query = { month };
    const budgets = await listBudgets(query);
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
 * Body:
 * {
 *   month: "YYYY-MM-01",
 *   categoryId: string,
 *   amountIdr: number
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

    const budgets = await upsertBudgets(body);
    return ok(budgets);
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

    // Handle not found errors (categories)
    if (error.message?.includes("not found")) {
      return notFound(error.message);
    }

    // Handle archived category errors
    if (error.message?.includes("archived")) {
      return badRequest(error.message);
    }

    // Handle duplicate category IDs in budget items
    if (error.message?.includes("Duplicate category IDs in budget items")) {
      return badRequest(error.message);
    }

    // Handle PostgreSQL unique constraint violation
    if (error.code === "23505") {
      return conflict("Budget already exists for this month and category");
    }

    // Handle PostgreSQL foreign key violation
    if (error.code === "23503") {
      return badRequest("Invalid category reference: " + error.detail);
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

    return serverError("Failed to upsert budgets");
  }
}

export const POST = withRouteLogging(handlePost, {
  operation: "api.budgets.create",
  logQuery: false,
  logBodyMetadata: true,
});
