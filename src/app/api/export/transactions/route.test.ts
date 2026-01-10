import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the export actions
vi.mock("@/modules/Export/actions", () => ({
  exportTransactionsAsCsv: vi.fn(),
}));

// Mock the database client
vi.mock("@/db/client", () => ({
  getDb: vi.fn(),
  formatPostgresError: vi.fn((error) => error.message || "Database error"),
}));

// Mock the http helpers
vi.mock("@/lib/http", () => ({
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
import { exportTransactionsAsCsv } from "@/modules/Export/actions";

// Helper to create mock NextRequest
function createMockRequest(
  queryParams: Record<string, string> = {},
  url: string = "http://localhost:3000/api/export/transactions"
): NextRequest {
  const urlWithParams = new URL(url);
  Object.entries(queryParams).forEach(([key, value]) => {
    urlWithParams.searchParams.set(key, value);
  });

  return new NextRequest(urlWithParams.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("Export Transactions API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/export/transactions", () => {
    it("should return CSV file with correct headers", async () => {
      const mockCsv =
        "ID,Date,Type,Amount (IDR),Category,Wallet,From Wallet,To Wallet,Savings Bucket,Payee,Note,Deleted\n";

      vi.mocked(exportTransactionsAsCsv).mockResolvedValue(mockCsv);

      const request = createMockRequest();
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe(
        "text/csv; charset=utf-8"
      );
      expect(response.headers.get("Content-Disposition")).toMatch(
        /attachment; filename="sugih-transactions-\d{4}-\d{2}-\d{2}\.csv"/
      );
      expect(response.headers.get("Cache-Control")).toBe(
        "no-cache, no-store, must-revalidate"
      );
    });

    it("should return CSV with transaction data", async () => {
      const mockCsv = `ID,Date,Type,Amount (IDR),Category,Wallet,From Wallet,To Wallet,Savings Bucket,Payee,Note,Deleted
txn_001,2024-01-15T10:00:00.000Z,expense,50000,Food & Dining,Main Wallet,,,,Restaurant,Lunch,No
txn_002,2024-01-14T15:00:00.000Z,income,1000000,,Main Wallet,,,,"ACME Corp",Salary,No`;

      vi.mocked(exportTransactionsAsCsv).mockResolvedValue(mockCsv);

      const request = createMockRequest();
      const response = await GET(request);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(text).toContain("txn_001");
      expect(text).toContain("expense");
      expect(text).toContain("Food & Dining");
      expect(text).toContain("txn_002");
      expect(text).toContain("income");
    });

    it("should pass date range filters to action", async () => {
      const mockCsv = "ID,Date,Type,Amount (IDR),Category,Wallet,From Wallet,To Wallet,Savings Bucket,Payee,Note,Deleted\n";

      vi.mocked(exportTransactionsAsCsv).mockResolvedValue(mockCsv);

      const request = createMockRequest({
        from: "2024-01-01",
        to: "2024-01-31",
      });

      await GET(request);

      expect(exportTransactionsAsCsv).toHaveBeenCalledWith({
        from: "2024-01-01",
        to: "2024-01-31",
      });
    });

    it("should pass includeDeleted filter to action", async () => {
      const mockCsv = "ID,Date,Type,Amount (IDR),Category,Wallet,From Wallet,To Wallet,Savings Bucket,Payee,Note,Deleted\n";

      vi.mocked(exportTransactionsAsCsv).mockResolvedValue(mockCsv);

      const request = createMockRequest({
        includeDeleted: "true",
      });

      await GET(request);

      expect(exportTransactionsAsCsv).toHaveBeenCalledWith({
        includeDeleted: true,
      });
    });

    it("should not include deleted transactions by default", async () => {
      const mockCsv = "ID,Date,Type,Amount (IDR),Category,Wallet,From Wallet,To Wallet,Savings Bucket,Payee,Note,Deleted\n";

      vi.mocked(exportTransactionsAsCsv).mockResolvedValue(mockCsv);

      const request = createMockRequest();

      await GET(request);

      expect(exportTransactionsAsCsv).toHaveBeenCalledWith({});
    });

    it("should return 400 for invalid Zod validation", async () => {
      const zodError = new Error("Validation error");
      (zodError as any).name = "ZodError";
      (zodError as any).errors = [{ path: ["from"], message: "Invalid date" }];

      vi.mocked(exportTransactionsAsCsv).mockRejectedValue(zodError);

      const request = createMockRequest({ from: "invalid-date" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toBe("Invalid export parameters");
    });

    it("should return 500 on database error", async () => {
      vi.mocked(exportTransactionsAsCsv).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toBe("Failed to export transactions");
    });

    it("should handle PostgreSQL-specific errors", async () => {
      const pgError = { code: "42P01", message: "relation does not exist" };
      vi.mocked(exportTransactionsAsCsv).mockRejectedValue(pgError);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toBe("Database error during export");
    });

    it("should return empty CSV when no transactions exist", async () => {
      const mockCsv =
        "ID,Date,Type,Amount (IDR),Category,Wallet,From Wallet,To Wallet,Savings Bucket,Payee,Note,Deleted\n";

      vi.mocked(exportTransactionsAsCsv).mockResolvedValue(mockCsv);

      const request = createMockRequest();
      const response = await GET(request);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(text).toBe(mockCsv);
      // Should only have header row
      expect(text.split("\n").filter((line) => line.trim()).length).toBe(1);
    });

    it("should handle CSV with special characters", async () => {
      const mockCsv = `ID,Date,Type,Amount (IDR),Category,Wallet,From Wallet,To Wallet,Savings Bucket,Payee,Note,Deleted
txn_001,2024-01-15T10:00:00.000Z,expense,50000,Food & Dining,Main Wallet,,,,"Restaurant, Inc","Lunch with ""Bob""",No`;

      vi.mocked(exportTransactionsAsCsv).mockResolvedValue(mockCsv);

      const request = createMockRequest();
      const response = await GET(request);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(text).toContain('"Restaurant, Inc"');
      expect(text).toContain('"Lunch with ""Bob"""');
    });

    it("should handle all transaction types", async () => {
      const mockCsv = `ID,Date,Type,Amount (IDR),Category,Wallet,From Wallet,To Wallet,Savings Bucket,Payee,Note,Deleted
txn_001,2024-01-15T10:00:00.000Z,expense,50000,Food,Main Wallet,,,,,,No
txn_002,2024-01-14T15:00:00.000Z,income,1000000,,Main Wallet,,,,,Salary,No
txn_003,2024-01-13T12:00:00.000Z,transfer,200000,,"",Wallet A,Wallet B,,,Moving funds,No
txn_004,2024-01-12T09:00:00.000Z,savings_contribution,100000,,Main Wallet,,,Emergency Fund,,Saving,No
txn_005,2024-01-11T16:00:00.000Z,savings_withdrawal,50000,,Main Wallet,,,Emergency Fund,,Emergency,No`;

      vi.mocked(exportTransactionsAsCsv).mockResolvedValue(mockCsv);

      const request = createMockRequest();
      const response = await GET(request);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(text).toContain("expense");
      expect(text).toContain("income");
      expect(text).toContain("transfer");
      expect(text).toContain("savings_contribution");
      expect(text).toContain("savings_withdrawal");
    });

    it("should generate filename with current date", async () => {
      const mockCsv = "ID,Date,Type,Amount (IDR),Category,Wallet,From Wallet,To Wallet,Savings Bucket,Payee,Note,Deleted\n";

      vi.mocked(exportTransactionsAsCsv).mockResolvedValue(mockCsv);

      const request = createMockRequest();
      const response = await GET(request);

      const contentDisposition = response.headers.get("Content-Disposition");
      expect(contentDisposition).toMatch(/sugih-transactions-\d{4}-\d{2}-\d{2}\.csv/);
    });
  });
});
