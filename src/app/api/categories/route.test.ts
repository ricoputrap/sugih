import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the category actions
vi.mock("@/modules/Category/actions", () => ({
  listCategories: vi.fn(),
  createCategory: vi.fn(),
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

import { GET, POST } from "./route";

import { listCategories, createCategory } from "@/modules/Category/actions";

// Helper to create mock NextRequest
function createMockRequest(
  method: string,
  url: string = "http://localhost:3000/api/categories",
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
async function parseResponse(response: Response): Promise<{
  status: number;
  data: any;
}> {
  let data: any;

  // Handle both real Response objects and mocked ones
  if (response.json && typeof response.json === "function") {
    data = await response.json();
  } else {
    // For mocked responses, try to extract the data from the mock
    data = (response as any).body || {};
  }

  return {
    status: response.status,
    data,
  };
}

describe("Categories API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/categories", () => {
    it("should return a list of categories", async () => {
      const mockCategories = [
        {
          id: "cat1",
          name: "Food & Dining",
          archived: false,
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "cat2",
          name: "Transportation",
          archived: false,
          created_at: "2024-01-02T00:00:00.000Z",
          updated_at: "2024-01-02T00:00:00.000Z",
        },
      ];

      vi.mocked(listCategories).mockResolvedValue(mockCategories);

      const request = createMockRequest("GET");
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toEqual(mockCategories);
      expect(listCategories).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when no categories exist", async () => {
      vi.mocked(listCategories).mockResolvedValue([]);

      const request = createMockRequest("GET");
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toEqual([]);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(listCategories).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = createMockRequest("GET");
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to fetch categories");
    });

    it("should handle PostgreSQL-specific errors", async () => {
      vi.mocked(listCategories).mockRejectedValue({
        code: "ECONNREFUSED",
        message: "Connection refused",
      });

      const request = createMockRequest("GET");
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Database error");
    });
  });

  describe("POST /api/categories", () => {
    it("should create a new category", async () => {
      const newCategory = {
        id: "new-cat-id",
        name: "Entertainment",
        archived: false,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01"),
      };

      vi.mocked(createCategory).mockResolvedValue(newCategory);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/categories",
        {
          name: "Entertainment",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.name).toBe("Entertainment");
      expect(createCategory).toHaveBeenCalledWith({
        name: "Entertainment",
      });
    });

    it("should return 400 for invalid JSON body", async () => {
      const request = new NextRequest("http://localhost:3000/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "invalid json",
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Invalid JSON body");
    });

    it("should return 422 for validation errors", async () => {
      const validationError = new Error("Invalid category data");
      validationError.name = "ZodError";
      validationError.status = 422;

      vi.mocked(createCategory).mockRejectedValue(validationError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/categories",
        {
          name: "",
        },
      );

      const response = await POST(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });

    it("should return 409 for duplicate category name", async () => {
      vi.mocked(createCategory).mockRejectedValue(
        new Error("Category name already exists"),
      );

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/categories",
        {
          name: "Food",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(409);
      expect(data.error.message).toBe("Category name already exists");
    });

    it("should handle PostgreSQL unique constraint violation", async () => {
      const pgError = {
        code: "23505",
        message: "duplicate key value violates unique constraint",
        detail: "Key (name)=(Food) already exists.",
      };

      vi.mocked(createCategory).mockRejectedValue(pgError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/categories",
        {
          name: "Food",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(409);
      expect(data.error.message).toBe("Category with this name already exists");
    });

    it("should handle PostgreSQL not-null violation", async () => {
      const pgError = {
        code: "23502",
        message: "null value in column violates not-null constraint",
        column: "name",
      };

      vi.mocked(createCategory).mockRejectedValue(pgError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/categories",
        {},
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Missing required field: name");
    });

    it("should return 422 for Zod validation errors", async () => {
      const zodError = new Error("Validation failed");
      zodError.name = "ZodError";
      zodError.status = 422;

      vi.mocked(createCategory).mockRejectedValue(zodError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/categories",
        {
          name: "",
        },
      );

      const response = await POST(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });

    it("should return 500 for unexpected errors", async () => {
      vi.mocked(createCategory).mockRejectedValue(
        new Error("Unexpected error"),
      );

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/categories",
        {
          name: "Test",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to create category");
    });

    it("should handle PostgreSQL check constraint violation", async () => {
      const pgError = {
        code: "23514",
        message: "check constraint violation",
        detail: "Invalid category data",
      };

      vi.mocked(createCategory).mockRejectedValue(pgError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/categories",
        {
          name: "Test",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Invalid data: Invalid category data");
    });

    it("should handle long category names", async () => {
      const longName = "a".repeat(255);
      const newCategory = {
        id: "new-cat-id",
        name: longName,
        archived: false,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01"),
      };

      vi.mocked(createCategory).mockResolvedValue(newCategory);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/categories",
        {
          name: longName,
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.name).toBe(longName);
    });

    it("should handle empty category name", async () => {
      // Set up mock to reject empty category names
      const validationError = new Error("Validation failed");
      validationError.name = "ZodError";
      validationError.status = 422;

      vi.mocked(createCategory).mockRejectedValue(validationError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/categories",
        {
          name: "",
        },
      );

      const response = await POST(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });

    it("should handle special characters in category name", async () => {
      const newCategory = {
        id: "new-cat-id",
        name: "Food & Dining 🚀",
        archived: false,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01"),
      };

      vi.mocked(createCategory).mockResolvedValue(newCategory);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/categories",
        {
          name: "Food & Dining 🚀",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.name).toBe("Food & Dining 🚀");
    });

    it("should accept category with type field (expense)", async () => {
      const newCategory = {
        id: "new-cat-id",
        name: "Groceries",
        type: "expense" as const,
        archived: false,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01"),
      };

      vi.mocked(createCategory).mockResolvedValue(newCategory);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/categories",
        {
          name: "Groceries",
          type: "expense",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.name).toBe("Groceries");
      expect(data.type).toBe("expense");
    });

    it("should accept category with type field (income)", async () => {
      const newCategory = {
        id: "new-cat-id",
        name: "Salary",
        type: "income" as const,
        archived: false,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01"),
      };

      vi.mocked(createCategory).mockResolvedValue(newCategory);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/categories",
        {
          name: "Salary",
          type: "income",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.name).toBe("Salary");
      expect(data.type).toBe("income");
    });
  });
});
