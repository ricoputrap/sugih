import { NextRequest } from "next/server";
import {
  getBudgetById,
  updateBudget,
  deleteBudget,
} from "@/modules/Budget/actions";
import { ok, badRequest, notFound, serverError, conflict } from "@/lib/http";
import { formatPostgresError } from "@/db/client";

/**
 * GET /api/budgets/[id]
 * Get a budget by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const budget = await getBudgetById(id);

    if (!budget) {
      return notFound("Budget not found");
    }

    return ok(budget);
  } catch (error: any) {
    console.error("Error fetching budget:", error);

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

    return serverError("Failed to fetch budget");
  }
}

/**
 * PATCH /api/budgets/[id]
 * Update a budget amount
 *
 * Body:
 * {
 *   amountIdr: number (positive integer)
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { amountIdr } = body;

    if (amountIdr === undefined) {
      return badRequest("amountIdr is required");
    }

    if (!Number.isInteger(amountIdr) || amountIdr <= 0) {
      return badRequest("amountIdr must be a positive integer");
    }

    const budget = await updateBudget(id, amountIdr);
    return ok(budget);
  } catch (error: any) {
    console.error("Error updating budget:", error);

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

    // Handle invalid amount error
    if (error.message?.includes("positive integer")) {
      return badRequest(error.message);
    }

    // Handle PostgreSQL unique constraint violation
    if (error.code === "23505") {
      return conflict("Budget conflict");
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

    return serverError("Failed to update budget");
  }
}

/**
 * DELETE /api/budgets/[id]
 * Delete a budget
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    await deleteBudget(id);
    return ok({ message: "Budget deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting budget:", error);

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

    // Handle PostgreSQL foreign key violation
    if (error.code === "23503") {
      return conflict("Cannot delete budget: it is referenced by other records");
    }

    // Handle other PostgreSQL errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to delete budget");
  }
}
