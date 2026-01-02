import { all } from "@/db/client";
import { ok, serverError } from "@/lib/http";

export async function GET() {
  try {
    // Test DB connection with a simple query
    const result = all<{ value: number }>("SELECT 1 as value");

    if (result && result[0]?.value === 1) {
      return ok({
        status: "ok",
        database: "connected",
        timestamp: new Date().toISOString()
      });
    }

    return serverError("Database check failed");
  } catch (error) {
    console.error("Health check error:", error);
    return serverError("Database connection failed", error);
  }
}
