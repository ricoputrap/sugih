import { NextRequest } from "next/server";
import { copyBudgets } from "@/modules/Budget/actions";
import { ok, badRequest, notFound, serverError } from "@/lib/http";
import { formatPostgresError } from "@/db/client";
import { withRouteLogging } from "@/lib/logging";
import { z } from "zod";

const CopyBudgetsSchema = z.object({
  fromMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])-01$/, "Invalid month format"),
  toMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])-01$/, "Invalid month format"),
});

/**
 * POST /api/budgets/copy
 * Copy budgets from one month to another
 *
 * Only copies categories that don't already exist in the destination month.
 *
 * Body:
 * {
 *   fromMonth: "YYYY-MM-01",
 *   toMonth: "YYYY-MM-01"
 * }
 *
 * Response:
 * {
 *   created: BudgetWithCategory[],
 *   skipped: Array<{ categoryId: string, categoryName: string }>
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

    // Validate input
    const validation = CopyBudgetsSchema.safeParse(body);
    if (!validation.success) {
      return badRequest("Invalid request data", validation.error.issues);
    }

    const { fromMonth, toMonth } = validation.data;

    // Call copy function
    const result = await copyBudgets(fromMonth, toMonth);

    return ok(result);
  } catch (error: any) {
    console.error("Error copying budgets:", error);

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

    // Handle same month error
    if (error.message?.includes("must be different")) {
      return badRequest(error.message);
    }

    // Handle PostgreSQL-specific errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to copy budgets");
  }
}

export const POST = withRouteLogging(handlePost, {
  operation: "api.budgets.copy",
  logQuery: false,
  logBodyMetadata: true,
});
