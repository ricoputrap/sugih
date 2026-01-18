import { all } from "@/db/drizzle-client";
import { ok, serverError } from "@/lib/http";
import { withRouteLogging } from "@/lib/logging";

async function handleGet() {
  try {
    // Test DB connection with a simple query
    const result = await all<{ value: number }>("SELECT 1 as value");

    if (result && result[0]?.value === 1) {
      return ok({
        status: "ok",
        database: "connected",
        timestamp: new Date().toISOString(),
      });
    }

    return serverError("Database check failed");
  } catch (error) {
    console.error("Health check error:", error);
    return serverError("Database connection failed", error);
  }
}

export const GET = withRouteLogging(handleGet, {
  operation: "api.health.check",
  logQuery: false,
  successLevel: "debug", // Keep health checks quiet
});
