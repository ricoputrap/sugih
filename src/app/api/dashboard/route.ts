import { NextRequest } from "next/server";
import {
  getDashboardData,
  getDashboardSummary,
  getSpendingTrendChartData,
  getNetWorthTrendChartData,
  getCategoryBreakdownData,
  getCategorySpendingTrendChartData,
  getRecentTransactions,
} from "@/modules/Dashboard/actions";
import { ok, badRequest } from "@/lib/http";
import { withReportTiming } from "@/lib/logging/route-helpers";

/**
 * Dashboard API Route
 *
 * Provides aggregated dashboard data for the client-side dashboard.
 * This API route runs on the server and safely handles database operations
 * without exposing database dependencies to the client.
 */

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const categoryPeriod = searchParams.get("categoryPeriod");
    const categoryDateRangePreset = searchParams.get("categoryDateRangePreset");

    // Build query object
    const query: any = {};

    if (from) {
      query.from = new Date(from);
    }

    if (to) {
      query.to = new Date(to);
    }

    // Category chart specific filters
    if (categoryPeriod) {
      query.granularity = categoryPeriod;
    }

    if (categoryDateRangePreset) {
      query.dateRangePreset = categoryDateRangePreset;
    }

    // Determine what data to fetch based on query params
    const action = searchParams.get("action");
    const limit = searchParams.get("limit");

    switch (action) {
      case "summary":
        const summary = await getDashboardSummary(query);
        return ok({ data: summary });

      case "spending-trend":
        const spendingTrend = await getSpendingTrendChartData(query);
        return ok({ data: spendingTrend });

      case "net-worth-trend":
        const netWorthTrend = await getNetWorthTrendChartData(query);
        return ok({ data: netWorthTrend });

      case "category-breakdown":
        const categoryBreakdown = await getCategoryBreakdownData(query);
        return ok({ data: categoryBreakdown });

      case "recent-transactions":
        const recentTransactions = await getRecentTransactions(
          limit ? parseInt(limit) : 10,
        );
        return ok({ data: recentTransactions });

      case "category-spending-trend":
        const categorySpendingTrend =
          await getCategorySpendingTrendChartData(query);
        return ok({ data: categorySpendingTrend });

      default:
        // Default: fetch all dashboard data
        const dashboardData = await getDashboardData(query);
        return ok({ data: dashboardData });
    }
  } catch (error: any) {
    console.error("Dashboard API error:", error);

    if (error.message?.includes("Invalid") || error.name === "ZodError") {
      return badRequest(error.message || "Invalid query parameters");
    }

    return badRequest("Failed to fetch dashboard data");
  }
}

export const GET = withReportTiming(handleGet, {
  operation: "dashboard",
});
