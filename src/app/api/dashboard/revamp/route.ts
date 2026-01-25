import { NextRequest } from "next/server";
import { getDashboardRevampSummary } from "@/modules/Dashboard/actions";
import { ok, badRequest } from "@/lib/http";
import { withReportTiming } from "@/lib/logging/route-helpers";

/**
 * Dashboard Revamp API Route
 *
 * Provides revamped dashboard data including:
 * - KPI cards with growth metrics
 * - Latest transactions
 * - Category breakdowns
 * - Time-series data for insights
 */

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const period = searchParams.get("period");
    const dateRangePreset = searchParams.get("dateRangePreset");
    const insightTab = searchParams.get("insightTab");

    // Build query object
    const query: any = {};

    if (from) {
      query.from = new Date(from);
    }

    if (to) {
      query.to = new Date(to);
    }

    if (period && ["day", "week", "month"].includes(period)) {
      query.period = period as "day" | "week" | "month";
    }

    if (dateRangePreset) {
      query.dateRangePreset = dateRangePreset;
    }

    if (insightTab) {
      query.insightTab = insightTab;
    }

    // Fetch revamp summary data
    const summaryData = await getDashboardRevampSummary(query);

    return ok({ data: summaryData });
  } catch (error: any) {
    console.error("Dashboard Revamp API error:", error);

    if (error.message?.includes("Invalid") || error.name === "ZodError") {
      return badRequest(error.message || "Invalid query parameters");
    }

    return badRequest("Failed to fetch dashboard revamp data");
  }
}

export const GET = withReportTiming(handleGet, {
  operation: "dashboard-revamp",
});
