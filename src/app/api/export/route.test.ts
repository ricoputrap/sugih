import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the export actions
vi.mock("@/modules/Export/actions", () => ({
  getExportStats: vi.fn(),
}));

// Mock the database client
vi.mock("@/db/client", () => ({
  getDb: vi.fn(),
  formatPostgresError: vi.fn((error) => error.message || "Database error"),
}));

// Mock the http helpers
vi.mock("@/lib/http", () => ({
  ok: vi.fn(
    (data) =>
      new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
  ),
  badRequest: vi.fn(
    (message, issues) =>
      new Response(JSON.stringify({ error: { message, issues } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
  ),
  serverError: vi.fn(
    (message, details) =>
      new Response(JSON.stringify({ error: { message, details } }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
  ),
}));

// Mock the logging helper
vi.mock("@/lib/logging", () => ({
  withRouteLogging: vi.fn((handler) => handler),
}));

import { GET } from "./route";
import { getExportStats } from "@/modules/Export/actions";

// Helper to create mock NextRequest
function createMockRequest(
  url: string = "http://localhost:3000/api/export"
): NextRequest {
  return new NextRequest(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
}

// Helper to parse response
async function parseResponse(response: Response): Promise<{
  status: number;
  data: any;
}> {
  const data = await response.json();
  return {
    status: response.status,
    data,
  };
}

describe("Export API Route - Index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/export", () => {
    it("should return export options and stats", async () => {
      const mockStats = {
        wallets: 5,
        categories: 10,
        savingsBuckets: 3,
        transactions: 100,
        postings: 250,
        budgets: 12,
      };

      vi.mocked(getExportStats).mockResolvedValue(mockStats);

      const request = createMockRequest();
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Sugih Export API - Available export options");
      expect(data.stats).toEqual(mockStats);
      expect(data.exports).toBeDefined();
      expect(data.exports.transactions).toBeDefined();
      expect(data.exports.database).toBeDefined();
      expect(data.exports.wallets).toBeDefined();
      expect(data.exports.categories).toBeDefined();
      expect(data.exports.savingsBuckets).toBeDefined();
      expect(data.exports.budgets).toBeDefined();
    });

    it("should include correct endpoint information for transactions", async () => {
      const mockStats = {
        wallets: 0,
        categories: 0,
        savingsBuckets: 0,
        transactions: 0,
        postings: 0,
        budgets: 0,
      };

      vi.mocked(getExportStats).mockResolvedValue(mockStats);

      const request = createMockRequest();
      const response = await GET(request);
      const { data } = await parseResponse(response);

      expect(data.exports.transactions.method).toBe("GET");
      expect(data.exports.transactions.contentType).toBe("text/csv");
      expect(data.exports.transactions.queryParams).toBeDefined();
      expect(data.exports.transactions.queryParams.from).toBeDefined();
      expect(data.exports.transactions.queryParams.to).toBeDefined();
      expect(data.exports.transactions.queryParams.includeDeleted).toBeDefined();
    });

    it("should include correct endpoint information for database backup", async () => {
      const mockStats = {
        wallets: 0,
        categories: 0,
        savingsBuckets: 0,
        transactions: 0,
        postings: 0,
        budgets: 0,
      };

      vi.mocked(getExportStats).mockResolvedValue(mockStats);

      const request = createMockRequest();
      const response = await GET(request);
      const { data } = await parseResponse(response);

      expect(data.exports.database.method).toBe("GET");
      expect(data.exports.database.queryParams.format).toBeDefined();
      expect(data.exports.database.queryParams.tables).toBeDefined();
      expect(data.exports.database.validTables).toContain("wallets");
      expect(data.exports.database.validTables).toContain("categories");
      expect(data.exports.database.validTables).toContain("savings_buckets");
      expect(data.exports.database.validTables).toContain("transaction_events");
      expect(data.exports.database.validTables).toContain("postings");
      expect(data.exports.database.validTables).toContain("budgets");
    });

    it("should return 500 on database error", async () => {
      vi.mocked(getExportStats).mockRejectedValue(new Error("Database error"));

      const request = createMockRequest();
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to get export options");
    });

    it("should handle PostgreSQL-specific errors", async () => {
      const pgError = { code: "42P01", message: "relation does not exist" };
      vi.mocked(getExportStats).mockRejectedValue(pgError);

      const request = createMockRequest();
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Database error");
    });

    it("should return zero stats when database is empty", async () => {
      const mockStats = {
        wallets: 0,
        categories: 0,
        savingsBuckets: 0,
        transactions: 0,
        postings: 0,
        budgets: 0,
      };

      vi.mocked(getExportStats).mockResolvedValue(mockStats);

      const request = createMockRequest();
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.stats.wallets).toBe(0);
      expect(data.stats.categories).toBe(0);
      expect(data.stats.savingsBuckets).toBe(0);
      expect(data.stats.transactions).toBe(0);
      expect(data.stats.postings).toBe(0);
      expect(data.stats.budgets).toBe(0);
    });

    it("should return proper Content-Type header", async () => {
      const mockStats = {
        wallets: 0,
        categories: 0,
        savingsBuckets: 0,
        transactions: 0,
        postings: 0,
        budgets: 0,
      };

      vi.mocked(getExportStats).mockResolvedValue(mockStats);

      const request = createMockRequest();
      const response = await GET(request);

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });
  });
});
