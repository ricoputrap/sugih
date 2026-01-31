import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/modules/Report/actions", () => ({
  spendingTrend: vi.fn(),
}));

vi.mock("@/lib/http", () => ({
  ok: vi.fn((data) => new Response(JSON.stringify(data), { status: 200 })),
  badRequest: vi.fn(
    (message) =>
      new Response(JSON.stringify({ error: { message } }), { status: 400 }),
  ),
}));

import { GET } from "./route";
import { spendingTrend } from "@/modules/Report/actions";

describe("GET /api/reports/spending-trend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return spending trend with default params", async () => {
    const mockData = [
      { period: "2024-01", totalAmount: 1000000, transactionCount: 10 },
    ];
    vi.mocked(spendingTrend).mockResolvedValue(mockData);

    const request = new NextRequest(
      "http://localhost/api/reports/spending-trend",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(spendingTrend).toHaveBeenCalledWith({ granularity: "month" });
  });

  it("should handle custom date range", async () => {
    const mockData = [
      { period: "2024-01-01", totalAmount: 500000, transactionCount: 5 },
    ];
    vi.mocked(spendingTrend).mockResolvedValue(mockData);

    const request = new NextRequest(
      "http://localhost/api/reports/spending-trend?from=2024-01-01&to=2024-12-31&granularity=week",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(spendingTrend).toHaveBeenCalledWith({
      from: new Date("2024-01-01"),
      to: new Date("2024-12-31"),
      granularity: "week",
    });
  });
});
