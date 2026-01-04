import { NextRequest } from "next/server";
import {
  listSavingsBuckets,
  createSavingsBucket,
} from "@/modules/SavingsBucket/actions";
import { ok, badRequest, serverError, conflict } from "@/lib/http";
import { formatPostgresError } from "@/db/client";

/**
 * GET /api/savings-buckets
 * List all savings buckets
 */
export async function GET(request: NextRequest) {
  try {
    const savingsBuckets = await listSavingsBuckets();
    return ok(savingsBuckets);
  } catch (error: any) {
    console.error("Error fetching savings buckets:", error);

    // Handle PostgreSQL-specific errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to fetch savings buckets");
  }
}

/**
 * POST /api/savings-buckets
 * Create a new savings bucket
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const savingsBucket = await createSavingsBucket(body);
    return ok(savingsBucket);
  } catch (error: any) {
    console.error("Error creating savings bucket:", error);

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
      return badRequest(error.message);
    }

    // Handle duplicate name error
    if (error.message?.includes("already exists")) {
      return conflict(error.message);
    }

    // Handle PostgreSQL unique constraint violation
    if (error.code === "23505") {
      return conflict("Savings bucket with this name already exists");
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

    return serverError("Failed to create savings bucket");
  }
}
