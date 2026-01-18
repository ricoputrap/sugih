import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the export actions
vi.mock("@/modules/Export/actions", () => ({
  exportDatabaseAsJson: vi.fn(),
  exportDatabaseAsSql: vi.fn(),
  getExportStats: vi.fn(),
}));

// Mock the database client
vi.mock("@/db/drizzle-client", () => ({
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
import {
  exportDatabaseAsJson,
  exportDatabaseAsSql,
  getExportStats,
} from "@/modules/Export/actions";

// Helper to create mock NextRequest
function createMockRequest(
  queryParams: Record<string, string> = {},
  url: string = "http://localhost:3000/api/export/database"
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

describe("Export Database API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/export/database", () => {
    describe("JSON format (default)", () => {
      it("should return JSON file with correct headers", async () => {
        const mockBackup = {
          _metadata: [
            {
              exportedAt: "2024-01-15T10:00:00.000Z",
              format: "json",
              tables: ["wallets", "categories"],
              version: "1.0.0",
            },
          ],
          wallets: [{ id: "wal_001", name: "Main Wallet" }],
          categories: [{ id: "cat_001", name: "Food" }],
        };

        vi.mocked(exportDatabaseAsJson).mockResolvedValue(mockBackup);

        const request = createMockRequest();
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe(
          "application/json; charset=utf-8"
        );
        expect(response.headers.get("Content-Disposition")).toMatch(
          /attachment; filename="sugih-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json"/
        );
        expect(response.headers.get("Cache-Control")).toBe(
          "no-cache, no-store, must-revalidate"
        );
      });

      it("should return JSON backup with all tables", async () => {
        const mockBackup = {
          _metadata: [
            {
              exportedAt: "2024-01-15T10:00:00.000Z",
              format: "json",
              tables: [
                "wallets",
                "categories",
                "savings_buckets",
                "transaction_events",
                "postings",
                "budgets",
              ],
              version: "1.0.0",
            },
          ],
          wallets: [{ id: "wal_001", name: "Main Wallet" }],
          categories: [{ id: "cat_001", name: "Food" }],
          savings_buckets: [],
          transaction_events: [],
          postings: [],
          budgets: [],
        };

        vi.mocked(exportDatabaseAsJson).mockResolvedValue(mockBackup);

        const request = createMockRequest({ format: "json" });
        const response = await GET(request);
        const data = JSON.parse(await response.text());

        expect(response.status).toBe(200);
        expect(data._metadata).toBeDefined();
        expect(data.wallets).toBeDefined();
        expect(data.categories).toBeDefined();
        expect(data.savings_buckets).toBeDefined();
        expect(data.transaction_events).toBeDefined();
        expect(data.postings).toBeDefined();
        expect(data.budgets).toBeDefined();
      });

      it("should export specific tables when specified", async () => {
        const mockBackup = {
          _metadata: [
            {
              exportedAt: "2024-01-15T10:00:00.000Z",
              format: "json",
              tables: ["wallets", "categories"],
              version: "1.0.0",
            },
          ],
          wallets: [{ id: "wal_001", name: "Main Wallet" }],
          categories: [{ id: "cat_001", name: "Food" }],
        };

        vi.mocked(exportDatabaseAsJson).mockResolvedValue(mockBackup);

        const request = createMockRequest({
          tables: "wallets,categories",
        });

        await GET(request);

        expect(exportDatabaseAsJson).toHaveBeenCalledWith({
          format: "json",
          tables: ["wallets", "categories"],
        });
      });
    });

    describe("SQL format", () => {
      it("should return SQL file with correct headers", async () => {
        const mockSql = `-- Sugih Database Backup
-- Exported at: 2024-01-15T10:00:00.000Z
-- Tables: wallets, categories

INSERT INTO wallets (id, name) VALUES ('wal_001', 'Main Wallet');`;

        vi.mocked(exportDatabaseAsSql).mockResolvedValue(mockSql);

        const request = createMockRequest({ format: "sql" });
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe(
          "application/sql; charset=utf-8"
        );
        expect(response.headers.get("Content-Disposition")).toMatch(
          /attachment; filename="sugih-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.sql"/
        );
      });

      it("should return SQL with INSERT statements", async () => {
        const mockSql = `-- Sugih Database Backup
-- Exported at: 2024-01-15T10:00:00.000Z
-- Tables: wallets

SET session_replication_role = 'replica';

-- Table: wallets
INSERT INTO wallets (id, name, type) VALUES ('wal_001', 'Main Wallet', 'checking');
INSERT INTO wallets (id, name, type) VALUES ('wal_002', 'Cash', 'cash');

SET session_replication_role = 'origin';`;

        vi.mocked(exportDatabaseAsSql).mockResolvedValue(mockSql);

        const request = createMockRequest({ format: "sql" });
        const response = await GET(request);
        const text = await response.text();

        expect(response.status).toBe(200);
        expect(text).toContain("INSERT INTO wallets");
        expect(text).toContain("SET session_replication_role");
      });

      it("should export specific tables as SQL when specified", async () => {
        const mockSql = "-- SQL backup";
        vi.mocked(exportDatabaseAsSql).mockResolvedValue(mockSql);

        const request = createMockRequest({
          format: "sql",
          tables: "transaction_events,postings",
        });

        await GET(request);

        expect(exportDatabaseAsSql).toHaveBeenCalledWith({
          format: "sql",
          tables: ["transaction_events", "postings"],
        });
      });
    });

    describe("Stats only mode", () => {
      it("should return only stats when stats=true", async () => {
        const mockStats = {
          wallets: 5,
          categories: 10,
          savingsBuckets: 3,
          transactions: 100,
          postings: 250,
          budgets: 12,
        };

        vi.mocked(getExportStats).mockResolvedValue(mockStats);

        const request = createMockRequest({ stats: "true" });
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.stats).toEqual(mockStats);
        expect(exportDatabaseAsJson).not.toHaveBeenCalled();
        expect(exportDatabaseAsSql).not.toHaveBeenCalled();
      });
    });

    describe("Error handling", () => {
      it("should return 400 for invalid format", async () => {
        const request = createMockRequest({ format: "xml" });
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error.message).toBe('Invalid format. Must be "json" or "sql"');
      });

      it("should return 400 for invalid table name", async () => {
        const request = createMockRequest({ tables: "invalid_table" });
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error.message).toContain("Invalid table name");
      });

      it("should return 500 on database error", async () => {
        vi.mocked(exportDatabaseAsJson).mockRejectedValue(
          new Error("Database connection failed")
        );

        const request = createMockRequest();
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error.message).toBe("Failed to export database");
      });

      it("should handle PostgreSQL-specific errors", async () => {
        const pgError = { code: "42P01", message: "relation does not exist" };
        vi.mocked(exportDatabaseAsJson).mockRejectedValue(pgError);

        const request = createMockRequest();
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error.message).toBe("Database error during export");
      });

      it("should return 400 for Zod validation errors", async () => {
        const zodError = new Error("Validation error");
        (zodError as any).name = "ZodError";
        (zodError as any).errors = [{ path: ["format"], message: "Invalid" }];

        vi.mocked(exportDatabaseAsJson).mockRejectedValue(zodError);

        const request = createMockRequest();
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error.message).toBe("Invalid export parameters");
      });
    });

    describe("Filename generation", () => {
      it("should generate filename with date and time for JSON", async () => {
        const mockBackup = { _metadata: [], wallets: [] };
        vi.mocked(exportDatabaseAsJson).mockResolvedValue(mockBackup);

        const request = createMockRequest({ format: "json" });
        const response = await GET(request);

        const contentDisposition = response.headers.get("Content-Disposition");
        expect(contentDisposition).toMatch(
          /sugih-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json/
        );
      });

      it("should generate filename with date and time for SQL", async () => {
        const mockSql = "-- SQL backup";
        vi.mocked(exportDatabaseAsSql).mockResolvedValue(mockSql);

        const request = createMockRequest({ format: "sql" });
        const response = await GET(request);

        const contentDisposition = response.headers.get("Content-Disposition");
        expect(contentDisposition).toMatch(
          /sugih-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.sql/
        );
      });
    });

    describe("Empty database", () => {
      it("should handle empty database gracefully for JSON", async () => {
        const mockBackup = {
          _metadata: [
            {
              exportedAt: "2024-01-15T10:00:00.000Z",
              format: "json",
              tables: ["wallets", "categories"],
              version: "1.0.0",
            },
          ],
          wallets: [],
          categories: [],
          savings_buckets: [],
          transaction_events: [],
          postings: [],
          budgets: [],
        };

        vi.mocked(exportDatabaseAsJson).mockResolvedValue(mockBackup);

        const request = createMockRequest();
        const response = await GET(request);
        const data = JSON.parse(await response.text());

        expect(response.status).toBe(200);
        expect(data.wallets).toEqual([]);
        expect(data.categories).toEqual([]);
      });

      it("should handle empty database gracefully for SQL", async () => {
        const mockSql = `-- Sugih Database Backup
-- Exported at: 2024-01-15T10:00:00.000Z
-- Tables: wallets, categories

SET session_replication_role = 'replica';

-- Table: wallets
-- No data in wallets

-- Table: categories
-- No data in categories

SET session_replication_role = 'origin';`;

        vi.mocked(exportDatabaseAsSql).mockResolvedValue(mockSql);

        const request = createMockRequest({ format: "sql" });
        const response = await GET(request);
        const text = await response.text();

        expect(response.status).toBe(200);
        expect(text).toContain("-- No data in wallets");
      });
    });

    describe("Valid table names", () => {
      const validTables = [
        "wallets",
        "categories",
        "savings_buckets",
        "transaction_events",
        "postings",
        "budgets",
      ];

      it.each(validTables)("should accept valid table: %s", async (table) => {
        const mockBackup = { _metadata: [], [table]: [] };
        vi.mocked(exportDatabaseAsJson).mockResolvedValue(mockBackup);

        const request = createMockRequest({ tables: table });
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(exportDatabaseAsJson).toHaveBeenCalledWith({
          format: "json",
          tables: [table],
        });
      });

      it("should accept multiple valid tables", async () => {
        const mockBackup = { _metadata: [], wallets: [], categories: [] };
        vi.mocked(exportDatabaseAsJson).mockResolvedValue(mockBackup);

        const request = createMockRequest({
          tables: "wallets,categories,budgets",
        });

        await GET(request);

        expect(exportDatabaseAsJson).toHaveBeenCalledWith({
          format: "json",
          tables: ["wallets", "categories", "budgets"],
        });
      });
    });
  });
});
