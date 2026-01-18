import { NextRequest } from "next/server";
import { createExpense } from "@/modules/Transaction/actions";
import { ok, badRequest, serverError, conflict, notFound } from "@/lib/http";
import { formatPostgresError } from "@/db/drizzle-client";
import { ExpenseCreateSchema } from "@/db/schema";
import { withRouteLogging } from "@/lib/logging";

/**
 * POST /api/transactions/expense
 * Create a new expense transaction
 *
 * Body:
 * - occurredAt: ISO date string (required)
 * - walletId: string (required)
 * - categoryId: string (required)
 * - amountIdr: number (required, positive integer)
 * - note: string (optional)
 * - idempotencyKey: string (optional)
 */
async function handlePost(request: NextRequest) {
  try {
    // Parse request body
    let body: typeof ExpenseCreateSchema;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const transaction = await createExpense(body);

    return ok(transaction);
  } catch (error: any) {
    // Handle validation errors (already formatted as Response)
    if (error instanceof Response) {
      return error;
    }

    // Handle Zod validation errors
    if (error.status === 422) {
      return error;
    }

    // Handle not found errors (wallet or category not found)
    if (error.message?.includes("not found")) {
      return notFound(error.message);
    }

    // Handle archived resource errors
    if (error.message?.includes("archived")) {
      return badRequest(error.message);
    }

    // Handle PostgreSQL unique constraint violation (idempotency key)
    if (error.code === "23505") {
      return conflict(
        "Expense transaction with this idempotency key already exists",
      );
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

    return serverError("Failed to create expense transaction");
  }
}

export const POST = withRouteLogging(handlePost, {
  operation: "api.transactions.expense.create",
  logQuery: false,
  logBodyMetadata: true,
});
