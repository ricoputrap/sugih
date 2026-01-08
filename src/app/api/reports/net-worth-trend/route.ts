import { NextRequest } from "next/server";
import { netWorthTrend } from "@/modules/Report/actions";
import { ok, badRequest } from "@/lib/http";
import { withReportTiming } from "@/lib/logging/route-helpers";

async function handleGet(request: NextRequest) {
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

    // Get net worth trend data
    const data = await netWorthTrend(query);

    return ok(data);
  } catch (error: any) {
    console.error("Net worth trend API error:", error);

    if (error.message?.includes("Invalid") || error.name === "ZodError") {
      return badRequest(error.message || "Invalid query parameters");
    }

    return badRequest("Failed to fetch net worth trend");
  }
}

export const GET = withReportTiming(handleGet, {
  operation: "report.net-worth-trend",
});
