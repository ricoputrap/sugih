import { NextRequest } from "next/server";
import {
  updateWallet,
  archiveWallet,
  deleteWallet,
  getWalletById,
} from "@/modules/Wallet/actions";
import { ok, badRequest, notFound, serverError, conflict } from "@/lib/http";
import { formatPostgresError } from "@/db/client";

/**
 * GET /api/wallets/[id]
 * Get a wallet by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const wallet = await getWalletById(id);

    if (!wallet) {
      return notFound("Wallet not found");
    }

    return ok(wallet);
  } catch (error: any) {
    console.error("Error fetching wallet:", error);

    // Handle PostgreSQL-specific errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to fetch wallet");
  }
}

/**
 * PATCH /api/wallets/[id]
 * Update a wallet
 */
export async function PATCH(
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

    const wallet = await updateWallet(id, body);
    return ok(wallet);
  } catch (error: any) {
    console.error("Error updating wallet:", error);

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
      return conflict("Wallet with this name already exists");
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

    return serverError("Failed to update wallet");
  }
}

/**
 * DELETE /api/wallets/[id]
 * Delete or archive a wallet
 *
 * Query params:
 * - action: "archive" (default) or "delete"
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Check if this is a soft delete (archive) or hard delete
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "archive";

    if (action === "archive") {
      // Soft delete - archive the wallet
      const wallet = await archiveWallet(id);
      return ok({ message: "Wallet archived successfully", wallet });
    } else if (action === "delete") {
      // Hard delete - permanently delete the wallet
      await deleteWallet(id);
      return ok({ message: "Wallet deleted successfully" });
    } else {
      return badRequest("Invalid action. Use 'archive' or 'delete'");
    }
  } catch (error: any) {
    console.error("Error deleting wallet:", error);

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
        "Cannot delete wallet: it is referenced by other records",
      );
    }

    // Handle other PostgreSQL errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to delete wallet");
  }
}
