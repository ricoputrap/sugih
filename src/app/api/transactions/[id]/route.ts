import { NextRequest } from "next/server";
import {
  getTransactionById,
  deleteTransaction,
  restoreTransaction,
  permanentlyDeleteTransaction,
  updateExpense,
  updateIncome,
  updateTransfer,
  updateSavingsContribution,
  updateSavingsWithdrawal,
} from "@/modules/Transaction/actions";
import {
  ok,
  badRequest,
  notFound,
  serverError,
  conflict,
  unprocessableEntity,
} from "@/lib/http";
import { formatPostgresError } from "@/db/drizzle-client";
import { withRouteLogging } from "@/lib/logging";

/**
 * GET /api/transactions/[id]
 * Get a transaction by ID
 */
async function handleGet(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const transaction = await getTransactionById(id);

    if (!transaction) {
      return notFound("Transaction not found");
    }

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

    // Handle PostgreSQL-specific errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to fetch transaction");
  }
}

export const GET = withRouteLogging(handleGet, {
  operation: "api.transactions.get",
  logQuery: false,
  logRouteParams: true,
});

/**
 * DELETE /api/transactions/[id]
 * Delete a transaction
 *
 * Query params:
 * - action: "soft" (default), "restore", or "permanent"
 */
async function handleDelete(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Check the action type
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "soft";

    if (action === "soft") {
      // Soft delete - mark as deleted
      await deleteTransaction(id);
      return ok({ message: "Transaction deleted successfully" });
    } else if (action === "restore") {
      // Restore a soft-deleted transaction
      const transaction = await restoreTransaction(id);
      return ok({ message: "Transaction restored successfully", transaction });
    } else if (action === "permanent") {
      // Permanently delete transaction and postings
      await permanentlyDeleteTransaction(id);
      return ok({ message: "Transaction permanently deleted" });
    } else {
      return badRequest(
        "Invalid action. Use 'soft', 'restore', or 'permanent'",
      );
    }
  } catch (error: any) {
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

    // Handle already deleted error
    if (error.message?.includes("already deleted")) {
      return conflict(error.message);
    }

    // Handle not deleted error (for restore)
    if (error.message?.includes("not deleted")) {
      return conflict(error.message);
    }

    // Handle PostgreSQL foreign key violation
    if (error.code === "23503") {
      return conflict(
        "Cannot delete transaction: it is referenced by other records",
      );
    }

    // Handle other PostgreSQL errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to delete transaction");
  }
}

export const DELETE = withRouteLogging(handleDelete, {
  operation: "api.transactions.delete",
  logQuery: true, // Log action query param
  logRouteParams: true,
});

/**
 * PUT /api/transactions/[id]
 * Update a transaction
 *
 * The transaction type cannot be changed.
 * Routes to appropriate update action based on existing transaction type.
 */
async function handlePut(
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

    // Reject any attempt to change transaction type
    if (body.type !== undefined) {
      return badRequest(
        "Transaction type cannot be changed. Remove the 'type' field from your request.",
      );
    }

    // Get existing transaction to determine type
    const existing = await getTransactionById(id);
    if (!existing) {
      return notFound("Transaction not found");
    }

    // Check if transaction is deleted
    if (existing.deleted_at) {
      return conflict("Cannot update a deleted transaction");
    }

    // Route to appropriate update action based on type
    let updated;
    switch (existing.type) {
      case "expense":
        updated = await updateExpense(id, body);
        break;
      case "income":
        updated = await updateIncome(id, body);
        break;
      case "transfer":
        updated = await updateTransfer(id, body);
        break;
      case "savings_contribution":
        updated = await updateSavingsContribution(id, body);
        break;
      case "savings_withdrawal":
        updated = await updateSavingsWithdrawal(id, body);
        break;
      default:
        return badRequest(`Unknown transaction type: ${existing.type}`);
    }

    return ok(updated);
  } catch (error: any) {
    // Handle validation errors (already formatted as Response)
    if (error instanceof Response) {
      return error;
    }

    // Handle Zod validation errors
    if (error.status === 422) {
      return error;
    }

    // Handle wallet/bucket validation errors (check before "not found" since it contains "not found")
    if (error.message?.includes("archived")) {
      return unprocessableEntity(error.message);
    }

    // Handle not found errors from update actions (transaction not found)
    if (error.message?.includes("not found")) {
      return notFound(error.message);
    }

    // Handle type mismatch errors
    if (error.message?.includes("is not a")) {
      return badRequest(error.message);
    }

    // Handle deleted transaction errors
    if (error.message?.includes("deleted")) {
      return conflict(error.message);
    }

    // Handle different wallet validation for transfers
    if (error.message?.includes("must be different")) {
      return unprocessableEntity(error.message);
    }

    // Handle PostgreSQL-specific errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    console.error("Error updating transaction:", error);
    return serverError("Failed to update transaction");
  }
}

export const PUT = withRouteLogging(handlePut, {
  operation: "api.transactions.update",
  logBodyMetadata: true,
  logRouteParams: true,
});
