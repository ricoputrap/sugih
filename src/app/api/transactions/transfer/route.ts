import { NextRequest } from "next/server";
import { createTransfer } from "@/modules/Transaction/actions";
import { ok, badRequest, serverError, conflict, notFound } from "@/lib/http";
import { formatPostgresError } from "@/db/client";

/**
 * POST /api/transactions/transfer
 * Create a new transfer transaction
 *
 * Body:
 * - occurredAt: ISO date string (required)
 * - fromWalletId: string (required)
 * - toWalletId: string (required)
 * - amountIdr: number (required, positive integer)
 * - note: string (optional)
 * - idempotencyKey: string (optional)
 *
 * Notes:
 * - fromWalletId and toWalletId must be different
 * - Both wallets must exist and not be archived
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    // Validate that from and to wallet IDs are different
    if (body.fromWalletId === body.toWalletId) {
      return badRequest("Source and destination wallets must be different");
    }

    // Create the transfer transaction
    const transaction = await createTransfer(body);

    return ok(transaction);
  } catch (error: any) {
    console.error("Error creating transfer transaction:", error);

    // Handle validation errors (already formatted as Response)
    if (error instanceof Response) {
      return error;
    }

    // Handle Zod validation errors
    if (error.status === "422") {
      return error;
    }

    // Handle not found errors (wallets not found)
    if (error.message?.includes("not found")) {
      return notFound(error.message);
    }

    // Handle archived resource errors
    if (error.message?.includes("archived")) {
      return badRequest(error.message);
    }

    // Handle invalid wallet transfer errors
    if (error.message?.includes("must be different")) {
      return badRequest(error.message);
    }

    // Handle PostgreSQL unique constraint violation (idempotency key)
    if (error.code === "23505") {
      return conflict("Transfer transaction with this idempotency key already exists");
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

    return serverError("Failed to create transfer transaction");
  }
}
