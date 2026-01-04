import { NextRequest } from "next/server";
import { categoryBreakdown } from "@/modules/Report/actions";
import { ok, badRequest } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Build query object
    const query: any = {};

    if (from) {
      query.from = new Date(from);
    }

    if (to) {
      query.to = new Date(to);
    }

    // Get category breakdown data
    const data = await categoryBreakdown(query);

    return ok(data);
  } catch (error: any) {
    console.error("Category breakdown API error:", error);

    if (error.message?.includes("Invalid") || error.name === "ZodError") {
      return badRequest(error.message || "Invalid query parameters");
    }

    return badRequest("Failed to fetch category breakdown");
  }
}
