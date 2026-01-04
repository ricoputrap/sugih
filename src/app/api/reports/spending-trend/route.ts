import { NextRequest } from "next/server";
import { spendingTrend } from "@/modules/Report/actions";
import { ok, badRequest } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const granularity = searchParams.get("granularity") || "month";

    // Build query object
    const query: any = { granularity };

    if (from) {
      query.from = new Date(from);
    }

    if (to) {
      query.to = new Date(to);
    }

    // Get spending trend data
    const data = await spendingTrend(query);

    return ok(data);
  } catch (error: any) {
    console.error("Spending trend API error:", error);

    if (error.message?.includes("Invalid") || error.name === "ZodError") {
      return badRequest(error.message || "Invalid query parameters");
    }

    return badRequest("Failed to fetch spending trend");
  }
}
