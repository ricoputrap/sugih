import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the budget actions
vi.mock("@/modules/Budget/actions", () => ({
  listBudgets: vi.fn(),
  upsertBudgets: vi.fn(),
  getBudgetSummary: vi.fn(),
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

import { GET, POST } from "./route";

import {
  listBudgets,
  upsertBudgets,
  getBudgetSummary,
} from "@/modules/Budget/actions";

// Helper to create mock NextRequest
function createMockRequest(
  method: string,
  url: string = "http://localhost:3000/api/budgets",
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
const mockBudget1 = {
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
  month: "2024-01-01",
  category_id: "cat2",
  amount_idr: 200000,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  category_name: "Transportation",
};

const mockBudgetSummary = {
  month: "2024-01-01",
  totalBudget: 700000,
  totalSpent: 350000,
  remaining: 350000,
  items: [
    {
      categoryId: "cat1",
      categoryName: "Food & Dining",
      budgetAmount: 500000,
      spentAmount: 250000,
      remaining: 250000,
      percentUsed: 50,
    },
    {
      categoryId: "cat2",
      categoryName: "Transportation",
      budgetAmount: 200000,
      spentAmount: 100000,
      remaining: 100000,
      percentUsed: 50,
    },
  ],
};

describe("Budgets API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/budgets", () => {
    it("should return a list of budgets", async () => {
      const mockBudgets = [mockBudget1, mockBudget2];

      vi.mocked(listBudgets).mockResolvedValue(mockBudgets);

      const request = createMockRequest("GET");
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toEqual(mockBudgets);
      expect(listBudgets).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when no budgets exist", async () => {
      vi.mocked(listBudgets).mockResolvedValue([]);

      const request = createMockRequest("GET");
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toEqual([]);
    });

    it("should filter budgets by month", async () => {
      vi.mocked(listBudgets).mockResolvedValue([mockBudget1, mockBudget2]);

      const request = createMockRequest(
        "GET",
        "http://localhost:3000/api/budgets?month=2024-01-01",
      );
      const response = await GET(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(listBudgets).toHaveBeenCalledWith({ month: "2024-01-01" });
    });

    it("should return budget summary when summary=true", async () => {
      vi.mocked(getBudgetSummary).mockResolvedValue(mockBudgetSummary);

      const request = createMockRequest(
        "GET",
        "http://localhost:3000/api/budgets?month=2024-01-01&summary=true",
      );
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toEqual(mockBudgetSummary);
      expect(getBudgetSummary).toHaveBeenCalledWith("2024-01-01");
    });

    it("should return 400 when summary=true but month is missing", async () => {
      const request = createMockRequest(
        "GET",
        "http://localhost:3000/api/budgets?summary=true",
      );
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Month is required for budget summary");
    });

    it("should return 500 on database error", async () => {
      vi.mocked(listBudgets).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = createMockRequest("GET");
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to fetch budgets");
    });

    it("should handle PostgreSQL-specific errors", async () => {
      vi.mocked(listBudgets).mockRejectedValue({
        code: "ECONNREFUSED",
        message: "Connection refused",
      });

      const request = createMockRequest("GET");
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Database error");
    });

    it("should return 422 for validation errors", async () => {
      const validationError = new Error("Invalid query");
      validationError.name = "ZodError";
      (validationError as any).status = 422;

      vi.mocked(listBudgets).mockRejectedValue(validationError);

      const request = createMockRequest("GET");
      const response = await GET(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });

    it("should return budgets with category names", async () => {
      vi.mocked(listBudgets).mockResolvedValue([mockBudget1]);

      const request = createMockRequest("GET");
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data[0].category_name).toBe("Food & Dining");
    });
  });

  describe("POST /api/budgets", () => {
    it("should create/update budgets for a month", async () => {
      const mockResult = [mockBudget1, mockBudget2];
      vi.mocked(upsertBudgets).mockResolvedValue(mockResult);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          items: [
            { categoryId: "cat1", amountIdr: 500000 },
            { categoryId: "cat2", amountIdr: 200000 },
          ],
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toEqual(mockResult);
      expect(upsertBudgets).toHaveBeenCalledWith({
        month: "2024-01-01",
        items: [
          { categoryId: "cat1", amountIdr: 500000 },
          { categoryId: "cat2", amountIdr: 200000 },
        ],
      });
    });

    it("should handle single budget item", async () => {
      vi.mocked(upsertBudgets).mockResolvedValue([mockBudget1]);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          items: [{ categoryId: "cat1", amountIdr: 500000 }],
        },
      );

      const response = await POST(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(200);
    });

    it("should return 400 for invalid JSON body", async () => {
      const request = new NextRequest("http://localhost:3000/api/budgets", {
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
      const validationError = new Error("Invalid budget data");
      validationError.name = "ZodError";
      (validationError as any).status = 422;

      vi.mocked(upsertBudgets).mockRejectedValue(validationError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "invalid-month",
          items: [],
        },
      );

      const response = await POST(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });

    it("should return 404 when categories not found", async () => {
      vi.mocked(upsertBudgets).mockRejectedValue(
        new Error("Categories not found or archived: cat999"),
      );

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          items: [{ categoryId: "cat999", amountIdr: 500000 }],
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(404);
      expect(data.error.message).toContain("not found");
    });

    it("should return 400 for archived categories", async () => {
      vi.mocked(upsertBudgets).mockRejectedValue(
        new Error("Category is archived"),
      );

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          items: [{ categoryId: "cat1", amountIdr: 500000 }],
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toContain("archived");
    });

    it("should return 400 for duplicate category IDs", async () => {
      vi.mocked(upsertBudgets).mockRejectedValue(
        new Error("Duplicate category IDs in budget items"),
      );

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          items: [
            { categoryId: "cat1", amountIdr: 500000 },
            { categoryId: "cat1", amountIdr: 300000 },
          ],
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toContain("Duplicate category");
    });

    it("should handle PostgreSQL unique constraint violation", async () => {
      const pgError = {
        code: "23505",
        message: "duplicate key value violates unique constraint",
        detail: "Key (month, category_id)=(2024-01-01, cat1) already exists.",
      };

      vi.mocked(upsertBudgets).mockRejectedValue(pgError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          items: [{ categoryId: "cat1", amountIdr: 500000 }],
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(409);
      expect(data.error.message).toBe(
        "Budget already exists for this month and category",
      );
    });

    it("should handle PostgreSQL foreign key violation", async () => {
      const pgError = {
        code: "23503",
        message: "foreign key violation",
        detail: "Key (category_id)=(invalid) is not present in table categories",
      };

      vi.mocked(upsertBudgets).mockRejectedValue(pgError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          items: [{ categoryId: "invalid", amountIdr: 500000 }],
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toContain("Invalid category reference:");
    });

    it("should handle PostgreSQL not-null violation", async () => {
      const pgError = {
        code: "23502",
        message: "null value in column violates not-null constraint",
        column: "amount_idr",
      };

      vi.mocked(upsertBudgets).mockRejectedValue(pgError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          items: [{ categoryId: "cat1" }],
        },
      );

      const response = await POST(request);
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

      vi.mocked(upsertBudgets).mockRejectedValue(pgError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          items: [{ categoryId: "cat1", amountIdr: -500000 }],
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Invalid data: Amount must be positive");
    });

    it("should return 500 for unexpected errors", async () => {
      vi.mocked(upsertBudgets).mockRejectedValue(new Error("Unexpected error"));

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          items: [{ categoryId: "cat1", amountIdr: 500000 }],
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to upsert budgets");
    });

    it("should handle other PostgreSQL errors gracefully", async () => {
      const pgError = {
        code: "42P01",
        message: "relation does not exist",
      };

      vi.mocked(upsertBudgets).mockRejectedValue(pgError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          items: [{ categoryId: "cat1", amountIdr: 500000 }],
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Database error");
    });

    it("should handle large budget amounts", async () => {
      const largeBudget = {
        ...mockBudget1,
        amount_idr: 999999999999,
      };

      vi.mocked(upsertBudgets).mockResolvedValue([largeBudget]);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          items: [{ categoryId: "cat1", amountIdr: 999999999999 }],
        },
      );

      const response = await POST(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(200);
    });

    it("should handle multiple budget items", async () => {
      const mockBudgets = [
        mockBudget1,
        mockBudget2,
        {
          id: "budget3",
          month: "2024-01-01",
          category_id: "cat3",
          amount_idr: 300000,
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
          category_name: "Entertainment",
        },
      ];

      vi.mocked(upsertBudgets).mockResolvedValue(mockBudgets);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          items: [
            { categoryId: "cat1", amountIdr: 500000 },
            { categoryId: "cat2", amountIdr: 200000 },
            { categoryId: "cat3", amountIdr: 300000 },
          ],
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toHaveLength(3);
    });
  });
});
