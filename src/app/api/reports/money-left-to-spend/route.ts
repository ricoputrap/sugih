import { NextRequest } from "next/server";
import { moneyLeftToSpend } from "@/modules/Report/actions";
import { ok, badRequest } from "@/lib/http";
import { withReportTiming } from "@/lib/logging/route-helpers";

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const month = searchParams.get("month");

    // Build query object
    const query: any = {};

    if (month) {
      query.month = month;
    } else {
      // Default to current month if not specified
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      query.month = currentMonth;
    }

    // Get money left to spend data
    const data = await moneyLeftToSpend(query);

    return ok(data);
  } catch (error: any) {
    console.error("Money left to spend API error:", error);

    if (error.message?.includes("Invalid") || error.name === "ZodError") {
      return badRequest(error.message || "Invalid query parameters");
    }

    return badRequest("Failed to fetch money left to spend");
  }
}

export const GET = withReportTiming(handleGet, {
  operation: "report.money-left-to-spend",
});
