import { NextRequest } from "next/server";
import { listWallets, createWallet } from "@/modules/Wallet/actions";
import {
  ok,
  created,
  badRequest,
  serverError,
  conflict,
  unprocessableEntity,
} from "@/lib/http";
import { formatPostgresError } from "@/db/drizzle-client";
import { withRouteLogging } from "@/lib/logging";

/**
 * GET /api/wallets
 * List all wallets
 */
async function handleGet() {
  try {
    const wallets = await listWallets();
    return ok(wallets);
  } catch (error: any) {
    console.error("Error fetching wallets:", error);

    // Handle PostgreSQL-specific errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      return serverError("Database error", formattedError);
    }

    return serverError("Failed to fetch wallets");
  }
}

export const GET = withRouteLogging(handleGet, {
  operation: "api.wallets.list",
  logQuery: true,
});

/**
 * POST /api/wallets
 * Create a new wallet
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

    const wallet = await createWallet(body);
    return created(wallet);
  } catch (error: any) {
    console.error("Error creating wallet:", error);

    // Handle validation errors (already formatted as Response)
    if (error instanceof Response) {
      return error;
    }

    // Handle Zod validation errors
    if (error.status === 422) {
      return error;
    }

    // Handle duplicate name error
    if (error.message?.includes("already exists")) {
      return conflict(error.message);
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

    // Handle PostgreSQL check constraint violation
    if (error.code === "23514") {
      return badRequest("Validation failed: " + error.detail);
    }

    // Handle other PostgreSQL errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to create wallet");
  }
}

export const POST = withRouteLogging(handlePost, {
  operation: "api.wallets.create",
  logQuery: false,
  logBodyMetadata: true,
});
