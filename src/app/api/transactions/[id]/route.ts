import { NextRequest } from "next/server";
import {
  getTransactionById,
  deleteTransaction,
  restoreTransaction,
  permanentlyDeleteTransaction,
} from "@/modules/Transaction/actions";
import { ok, badRequest, notFound, serverError, conflict } from "@/lib/http";
import { formatPostgresError } from "@/db/client";

/**
 * GET /api/transactions/[id]
 * Get a transaction by ID
 */
export async function GET(
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
    console.error("Error fetching transaction:", error);

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

/**
 * DELETE /api/transactions/[id]
 * Delete a transaction
 *
 * Query params:
 * - action: "soft" (default), "restore", or "permanent"
 */
export async function DELETE(
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
      return badRequest("Invalid action. Use 'soft', 'restore', or 'permanent'");
    }
  } catch (error: any) {
    console.error("Error deleting transaction:", error);

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
