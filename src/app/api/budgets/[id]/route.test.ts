import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the budget actions
vi.mock("@/modules/Budget/actions", () => ({
  getBudgetById: vi.fn(),
  updateBudget: vi.fn(),
  deleteBudget: vi.fn(),
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

import { GET, PATCH, DELETE } from "./route";

import {
  getBudgetById,
  updateBudget,
  deleteBudget,
} from "@/modules/Budget/actions";

// Helper to create mock NextRequest
function createMockRequest(
  method: string,
  url: string = "http://localhost:3000/api/budgets/budget1",
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

// Helper to create mock params
function createMockParams(id: string): { params: Promise<{ id: string }> } {
  return {
    params: Promise.resolve({ id }),
  };
}

// Helper to parse response
async function parseResponse(response: Response): Promise<{
  status: number;
  data: any;
}> {
  let data: any;

  if (response.json && typeof response.json === "function") {
    data = await response.json();
  } else {
    data = (response as any).body || {};
  }

  return {
    status: response.status,
    data,
  };
}

// Mock budget data
const mockBudget = {
  id: "budget1",
  month: "2024-01-01",
  category_id: "cat1",
  amount_idr: 500000,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  category_name: "Food & Dining",
};

const mockBudget2 = {
  id: "budget2",
  month: "2024-02-01",
  category_id: "cat2",
  amount_idr: 200000,
  created_at: "2024-02-01T00:00:00.000Z",
  updated_at: "2024-02-01T00:00:00.000Z",
  category_name: "Transportation",
};

describe("Budgets [id] API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/budgets/[id]", () => {
    it("should return a budget by ID", async () => {
      vi.mocked(getBudgetById).mockResolvedValue(mockBudget);

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toEqual(mockBudget);
      expect(getBudgetById).toHaveBeenCalledWith("budget1");
    });

    it("should return budget with category name", async () => {
      vi.mocked(getBudgetById).mockResolvedValue(mockBudget);

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.category_name).toBe("Food & Dining");
    });

    it("should return 404 when budget not found", async () => {
      vi.mocked(getBudgetById).mockResolvedValue(null);

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("nonexistent"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(404);
      expect(data.error.message).toBe("Budget not found");
    });

    it("should return 500 on database error", async () => {
      vi.mocked(getBudgetById).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to fetch budget");
    });

    it("should handle PostgreSQL-specific errors", async () => {
      vi.mocked(getBudgetById).mockRejectedValue({
        code: "ECONNREFUSED",
        message: "Connection refused",
      });

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Database error");
    });

    it("should return 422 for validation errors", async () => {
      const validationError = new Error("Invalid budget ID");
      validationError.name = "ZodError";
      (validationError as any).status = 422;

      vi.mocked(getBudgetById).mockRejectedValue(validationError);

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("invalid"));
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });

    it("should return budget with large amount", async () => {
      const largeBudget = {
        ...mockBudget,
        amount_idr: 999999999999,
      };

      vi.mocked(getBudgetById).mockResolvedValue(largeBudget);

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.amount_idr).toBe(999999999999);
    });
  });

  describe("PATCH /api/budgets/[id]", () => {
    it("should update a budget amount", async () => {
      const updatedBudget = {
        ...mockBudget,
        amount_idr: 600000,
        updated_at: "2024-01-02T00:00:00.000Z",
      };

      vi.mocked(updateBudget).mockResolvedValue(updatedBudget);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/budgets/budget1",
        { amountIdr: 600000 },
      );
      const response = await PATCH(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.amount_idr).toBe(600000);
      expect(updateBudget).toHaveBeenCalledWith("budget1", 600000);
    });

    it("should return 400 for invalid JSON body", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/budgets/budget1",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: "invalid json",
        },
      );

      const response = await PATCH(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Invalid JSON body");
    });

    it("should return 400 when amountIdr is missing", async () => {
      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/budgets/budget1",
        {},
      );
      const response = await PATCH(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("amountIdr is required");
    });

    it("should return 400 for non-positive amountIdr", async () => {
      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/budgets/budget1",
        { amountIdr: 0 },
      );
      const response = await PATCH(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("amountIdr must be a positive integer");
    });

    it("should return 400 for negative amountIdr", async () => {
      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/budgets/budget1",
        { amountIdr: -100000 },
      );
      const response = await PATCH(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("amountIdr must be a positive integer");
    });

    it("should return 400 for non-integer amountIdr", async () => {
      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/budgets/budget1",
        { amountIdr: 500000.5 },
      );
      const response = await PATCH(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("amountIdr must be a positive integer");
    });

    it("should return 404 when budget not found", async () => {
      vi.mocked(updateBudget).mockRejectedValue(
        new Error("Budget not found"),
      );

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/budgets/nonexistent",
        { amountIdr: 600000 },
      );
      const response = await PATCH(request, createMockParams("nonexistent"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(404);
      expect(data.error.message).toBe("Budget not found");
    });

    it("should return 422 for Zod validation errors", async () => {
      const zodError = new Error("Validation failed");
      zodError.name = "ZodError";
      (zodError as any).status = 422;

      vi.mocked(updateBudget).mockRejectedValue(zodError);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/budgets/budget1",
        { amountIdr: 600000 },
      );
      const response = await PATCH(request, createMockParams("budget1"));
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });

    it("should handle PostgreSQL unique constraint violation", async () => {
      const pgError = {
        code: "23505",
        message: "duplicate key value violates unique constraint",
        detail: "Key already exists.",
      };

      vi.mocked(updateBudget).mockRejectedValue(pgError);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/budgets/budget1",
        { amountIdr: 600000 },
      );
      const response = await PATCH(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(409);
      expect(data.error.message).toBe("Budget conflict");
    });

    it("should handle PostgreSQL foreign key violation", async () => {
      const pgError = {
        code: "23503",
        message: "foreign key violation",
        detail: "Key is not present in table",
      };

      vi.mocked(updateBudget).mockRejectedValue(pgError);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/budgets/budget1",
        { amountIdr: 600000 },
      );
      const response = await PATCH(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toContain("Invalid reference:");
    });

    it("should handle PostgreSQL not-null violation", async () => {
      const pgError = {
        code: "23502",
        message: "null value in column violates not-null constraint",
        column: "amount_idr",
      };

      vi.mocked(updateBudget).mockRejectedValue(pgError);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/budgets/budget1",
        { amountIdr: 600000 },
      );
      const response = await PATCH(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Missing required field: amount_idr");
    });

    it("should handle PostgreSQL check constraint violation", async () => {
      const pgError = {
        code: "23514",
        message: "check constraint violation",
        detail: "Amount must be positive",
      };

      vi.mocked(updateBudget).mockRejectedValue(pgError);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/budgets/budget1",
        { amountIdr: 600000 },
      );
      const response = await PATCH(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Invalid data: Amount must be positive");
    });

    it("should return 500 for unexpected errors", async () => {
      vi.mocked(updateBudget).mockRejectedValue(new Error("Unexpected error"));

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/budgets/budget1",
        { amountIdr: 600000 },
      );
      const response = await PATCH(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to update budget");
    });

    it("should handle other PostgreSQL errors gracefully", async () => {
      const pgError = {
        code: "42P01",
        message: "relation does not exist",
      };

      vi.mocked(updateBudget).mockRejectedValue(pgError);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/budgets/budget1",
        { amountIdr: 600000 },
      );
      const response = await PATCH(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Database error");
    });

    it("should update budget with large amount", async () => {
      const updatedBudget = {
        ...mockBudget,
        amount_idr: 999999999999,
      };

      vi.mocked(updateBudget).mockResolvedValue(updatedBudget);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/budgets/budget1",
        { amountIdr: 999999999999 },
      );
      const response = await PATCH(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.amount_idr).toBe(999999999999);
    });

    it("should handle positive integer error from action", async () => {
      vi.mocked(updateBudget).mockRejectedValue(
        new Error("Budget amount must be a positive integer"),
      );

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/budgets/budget1",
        { amountIdr: 600000 },
      );
      const response = await PATCH(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe(
        "Budget amount must be a positive integer",
      );
    });
  });

  describe("DELETE /api/budgets/[id]", () => {
    it("should delete a budget", async () => {
      vi.mocked(deleteBudget).mockResolvedValue(undefined);

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/budgets/budget1",
      );
      const response = await DELETE(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.message).toBe("Budget deleted successfully");
      expect(deleteBudget).toHaveBeenCalledWith("budget1");
    });

    it("should return 404 when budget not found", async () => {
      vi.mocked(deleteBudget).mockRejectedValue(
        new Error("Budget not found"),
      );

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/budgets/nonexistent",
      );
      const response = await DELETE(request, createMockParams("nonexistent"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(404);
      expect(data.error.message).toBe("Budget not found");
    });

    it("should return 422 for Zod validation errors", async () => {
      const zodError = new Error("Invalid ID");
      zodError.name = "ZodError";
      (zodError as any).status = 422;

      vi.mocked(deleteBudget).mockRejectedValue(zodError);

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/budgets/invalid-id",
      );
      const response = await DELETE(request, createMockParams("invalid-id"));
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });

    it("should handle PostgreSQL foreign key violation on delete", async () => {
      const pgError = {
        code: "23503",
        message: "foreign key violation",
        detail: "Key is still referenced from another table",
      };

      vi.mocked(deleteBudget).mockRejectedValue(pgError);

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/budgets/budget1",
      );
      const response = await DELETE(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(409);
      expect(data.error.message).toBe(
        "Cannot delete budget: it is referenced by other records",
      );
    });

    it("should return 500 for unexpected errors", async () => {
      vi.mocked(deleteBudget).mockRejectedValue(new Error("Unexpected error"));

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/budgets/budget1",
      );
      const response = await DELETE(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to delete budget");
    });

    it("should handle PostgreSQL connection errors", async () => {
      const pgError = {
        code: "ECONNREFUSED",
        message: "Connection refused",
      };

      vi.mocked(deleteBudget).mockRejectedValue(pgError);

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/budgets/budget1",
      );
      const response = await DELETE(request, createMockParams("budget1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Database error");
    });

    it("should handle Response object errors", async () => {
      const responseError = new Response(
        JSON.stringify({ error: { message: "Custom error" } }),
        { status: 400 },
      );

      vi.mocked(deleteBudget).mockRejectedValue(responseError);

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/budgets/budget1",
      );
      const response = await DELETE(request, createMockParams("budget1"));

      expect(response).toBe(responseError);
    });
  });
});
