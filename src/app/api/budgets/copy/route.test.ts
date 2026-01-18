import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the budget actions
vi.mock("@/modules/Budget/actions", () => ({
  copyBudgets: vi.fn(),
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
      }),
  ),
  created: vi.fn(
    (data) =>
      new Response(JSON.stringify(data), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
  ),
  badRequest: vi.fn(
    (message, issues) =>
      new Response(JSON.stringify({ error: { message, issues } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
  ),
  notFound: vi.fn(
    (message) =>
      new Response(JSON.stringify({ error: { message } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
  ),
  conflict: vi.fn(
    (message) =>
      new Response(JSON.stringify({ error: { message } }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }),
  ),
  unprocessableEntity: vi.fn(
    (message, issues) =>
      ({
        status: 422,
        statusText: "",
        headers: { "content-type": "application/json" },
        body: { error: { message, issues } },
        bodyUsed: false,
        ok: false,
        redirected: false,
        type: "default",
        url: "",
        json: () => Promise.resolve({ error: { message, issues } }),
      }) as any,
  ),
  serverError: vi.fn(
    (message, details) =>
      new Response(JSON.stringify({ error: { message, details } }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
  ),
}));

import { POST } from "./route";

import { copyBudgets } from "@/modules/Budget/actions";

// Helper to create mock NextRequest
function createMockRequest(
  method: string,
  url: string = "http://localhost:3000/api/budgets/copy",
  body?: unknown,
): NextRequest {
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(url, init);
}

// Helper to parse response
async function parseResponse(response: Response) {
  const data = await response.json();
  return { status: response.status, data };
}

describe("POST /api/budgets/copy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Success Cases", () => {
    it("should copy all budgets to empty month", async () => {
      const mockCreated = [
        {
          id: "budget1",
          month: "2024-02-01",
          category_id: "cat1",
          amount_idr: 1000000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          category_name: "Food",
        },
        {
          id: "budget2",
          month: "2024-02-01",
          category_id: "cat2",
          amount_idr: 2000000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          category_name: "Transport",
        },
      ];

      vi.mocked(copyBudgets).mockResolvedValue({
        created: mockCreated,
        skipped: [],
      });

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets/copy",
        {
          fromMonth: "2024-01-01",
          toMonth: "2024-02-01",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.created).toHaveLength(2);
      expect(data.skipped).toHaveLength(0);
      expect(copyBudgets).toHaveBeenCalledWith("2024-01-01", "2024-02-01");
    });

    it("should copy only missing budgets when some exist", async () => {
      const mockCreated = [
        {
          id: "budget1",
          month: "2024-02-01",
          category_id: "cat1",
          amount_idr: 1000000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          category_name: "Food",
        },
      ];

      vi.mocked(copyBudgets).mockResolvedValue({
        created: mockCreated,
        skipped: [
          { categoryId: "cat2", categoryName: "Transport" },
        ],
      });

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets/copy",
        {
          fromMonth: "2024-01-01",
          toMonth: "2024-02-01",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.created).toHaveLength(1);
      expect(data.skipped).toHaveLength(1);
      expect(data.skipped[0].categoryId).toBe("cat2");
    });

    it("should return empty arrays when all budgets already exist", async () => {
      vi.mocked(copyBudgets).mockResolvedValue({
        created: [],
        skipped: [
          { categoryId: "cat1", categoryName: "Food" },
          { categoryId: "cat2", categoryName: "Transport" },
        ],
      });

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets/copy",
        {
          fromMonth: "2024-01-01",
          toMonth: "2024-02-01",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.created).toHaveLength(0);
      expect(data.skipped).toHaveLength(2);
    });
  });

  describe("Validation Errors", () => {
    it("should return 400 for invalid JSON body", async () => {
      const init: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "invalid json",
      };
      const request = new NextRequest(
        "http://localhost:3000/api/budgets/copy",
        init,
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Invalid JSON body");
    });

    it("should return 400 for missing fromMonth", async () => {
      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets/copy",
        {
          toMonth: "2024-02-01",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.issues).toBeDefined();
    });

    it("should return 400 for missing toMonth", async () => {
      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets/copy",
        {
          fromMonth: "2024-01-01",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.issues).toBeDefined();
    });

    it("should return 400 for invalid fromMonth format", async () => {
      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets/copy",
        {
          fromMonth: "invalid-date",
          toMonth: "2024-02-01",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Invalid request data");
    });

    it("should return 400 for invalid toMonth format", async () => {
      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets/copy",
        {
          fromMonth: "2024-01-01",
          toMonth: "13-2024-01",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Invalid request data");
    });

    it("should return 400 for month not ending in -01", async () => {
      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets/copy",
        {
          fromMonth: "2024-01-15",
          toMonth: "2024-02-01",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.issues).toBeDefined();
    });

    it("should return 400 for same source and destination month", async () => {
      vi.mocked(copyBudgets).mockRejectedValue(
        new Error("Source and destination months must be different"),
      );

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets/copy",
        {
          fromMonth: "2024-01-01",
          toMonth: "2024-01-01",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe(
        "Source and destination months must be different",
      );
    });
  });

  describe("Business Logic Errors", () => {
    it("should return error when no budgets found in source month", async () => {
      vi.mocked(copyBudgets).mockRejectedValue(
        new Error("No budgets found for source month"),
      );

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets/copy",
        {
          fromMonth: "2024-01-01",
          toMonth: "2024-02-01",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to copy budgets");
    });
  });

  describe("PostgreSQL Errors", () => {
    it("should handle PostgreSQL connection errors", async () => {
      const pgError = {
        code: "ECONNREFUSED",
        message: "Connection refused",
      };

      vi.mocked(copyBudgets).mockRejectedValue(pgError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets/copy",
        {
          fromMonth: "2024-01-01",
          toMonth: "2024-02-01",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Database error");
    });
  });

  describe("Unexpected Errors", () => {
    it("should return 500 for unexpected errors", async () => {
      vi.mocked(copyBudgets).mockRejectedValue(new Error("Unexpected error"));

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets/copy",
        {
          fromMonth: "2024-01-01",
          toMonth: "2024-02-01",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to copy budgets");
    });
  });
});
