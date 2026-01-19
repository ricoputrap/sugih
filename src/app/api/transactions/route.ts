import { NextRequest } from "next/server";
import {
  listTransactions,
  createExpense,
  createIncome,
  createTransfer,
  createSavingsContribution,
  createSavingsWithdrawal,
  bulkDeleteTransactions,
} from "@/modules/Transaction/actions";
import { ok, badRequest, serverError, conflict, notFound } from "@/lib/http";
import { formatPostgresError } from "@/db/drizzle-client";
import { withRouteLogging } from "@/lib/logging";

/**
 * GET /api/transactions
 * List transactions with optional filters
 *
 * Query params:
 * - from: ISO date string (optional)
 * - to: ISO date string (optional)
 * - type: expense | income | transfer | savings_contribution | savings_withdrawal (optional)
 * - walletId: string (optional)
 * - categoryId: string (optional)
 * - limit: number (default 50, max 100)
 * - offset: number (default 0)
 */
async function handleGet(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const query = {
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
      type: url.searchParams.get("type") || undefined,
      walletId: url.searchParams.get("walletId") || undefined,
      categoryId: url.searchParams.get("categoryId") || undefined,
      limit: url.searchParams.get("limit") || undefined,
      offset: url.searchParams.get("offset") || undefined,
    };

    const transactions = await listTransactions(query);
    return ok(transactions);
  } catch (error: any) {
    console.error("Error fetching transactions:", error);

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

    return serverError("Failed to fetch transactions");
  }
}

export const GET = withRouteLogging(handleGet, {
  operation: "api.transactions.list",
  logQuery: true,
});

/**
 * POST /api/transactions
 * Create a new transaction (DEPRECATED - Use specific endpoints)
 *
 * NOTE: This endpoint is maintained for backward compatibility.
 * For new implementations, please use the specific endpoints:
 * - POST /api/transactions/expense
 * - POST /api/transactions/income
 * - POST /api/transactions/transfer
 * - POST /api/transactions/savings/contribute
 * - POST /api/transactions/savings/withdraw
 *
 * Body must include "type" field to determine transaction type:
 * - expense: requires walletId, categoryId, amountIdr, occurredAt
 * - income: requires walletId, amountIdr, occurredAt
 * - transfer: requires fromWalletId, toWalletId, amountIdr, occurredAt
 * - savings_contribution: requires walletId, bucketId, amountIdr, occurredAt
 * - savings_withdrawal: requires walletId, bucketId, amountIdr, occurredAt
 */
export async function POST(request: NextRequest) {
  try {
    // Log deprecation warning
    console.warn(
      "DEPRECATED: POST /api/transactions is deprecated. Please use specific endpoints: /api/transactions/expense, /api/transactions/income, /api/transactions/transfer, /api/transactions/savings/contribute, or /api/transactions/savings/withdraw",
    );

    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { type, ...data } = body;

    if (!type) {
      return badRequest("Transaction type is required");
    }

    let transaction;

    switch (type) {
      case "expense":
        transaction = await createExpense(data);
        break;
      case "income":
        transaction = await createIncome(data);
        break;
      case "transfer":
        transaction = await createTransfer(data);
        break;
      case "savings_contribution":
        transaction = await createSavingsContribution(data);
        break;
      case "savings_withdrawal":
        transaction = await createSavingsWithdrawal(data);
        break;
      default:
        return badRequest(
          `Invalid transaction type: ${type}. Valid types are: expense, income, transfer, savings_contribution, savings_withdrawal`,
        );
    }

    return ok(transaction);
  } catch (error: any) {
    console.error("Error creating transaction:", error);

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

    // Handle archived resource errors
    if (error.message?.includes("archived")) {
      return badRequest(error.message);
    }

    // Handle PostgreSQL unique constraint violation (idempotency key)
    if (error.code === "23505") {
      return conflict("Transaction with this idempotency key already exists");
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

    return serverError("Failed to create transaction");
  }
}

/**
 * DELETE /api/transactions
 * Bulk delete multiple transactions
 *
 * Body:
 * - ids: array of transaction IDs to delete (max 100)
 *
 * Returns:
 * - Success: { message, deletedCount }
 * - Partial failure: { error: { code, message, details: { deletedCount, failedIds } } }
 */
export async function DELETE(request: NextRequest) {
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
    const result = await bulkDeleteTransactions(ids);

    // If there are failed IDs, return partial failure
    if (result.failedIds.length > 0) {
      // Some transactions could not be deleted (either not found or already deleted)
      return badRequest("Some transactions could not be deleted", {
        code: "VALIDATION_ERROR",
        message: "Some transactions could not be deleted",
        details: {
          deletedCount: result.deletedCount,
          failedIds: result.failedIds,
        },
      });
    }

    // All transactions deleted successfully
    return ok({
      message: "Transactions deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    console.error("Error bulk deleting transactions:", error);

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

    return serverError("Failed to delete transactions");
  }
}
