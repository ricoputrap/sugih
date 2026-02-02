import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the budget actions
vi.mock("@/modules/Budget/actions", () => ({
  listBudgets: vi.fn(),
  createBudget: vi.fn(),
  getBudgetById: vi.fn(),
  getBudgetSummary: vi.fn(),
  updateBudget: vi.fn(),
  deleteBudget: vi.fn(),
  bulkDeleteBudgets: vi.fn(),
  copyBudgets: vi.fn(),
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

import { GET, POST, DELETE } from "./route";

import {
  listBudgets,
  createBudget,
  getBudgetSummary,
  bulkDeleteBudgets,
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

    it("should return unified response with budgets and summary when month is provided", async () => {
      vi.mocked(listBudgets).mockResolvedValue([mockBudget1, mockBudget2]);
      vi.mocked(getBudgetSummary).mockResolvedValue(mockBudgetSummary);

      const request = createMockRequest(
        "GET",
        "http://localhost:3000/api/budgets?month=2024-01-01",
      );
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toEqual({
        budgets: [mockBudget1, mockBudget2],
        summary: mockBudgetSummary,
      });
      expect(listBudgets).toHaveBeenCalledWith({ month: "2024-01-01" });
      expect(getBudgetSummary).toHaveBeenCalledWith("2024-01-01");
    });

    it("should return budget summary when summary=true (legacy behavior)", async () => {
      vi.mocked(listBudgets).mockResolvedValue([mockBudget1, mockBudget2]);
      vi.mocked(getBudgetSummary).mockResolvedValue(mockBudgetSummary);

      const request = createMockRequest(
        "GET",
        "http://localhost:3000/api/budgets?month=2024-01-01&summary=true",
      );
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toEqual({
        budgets: [mockBudget1, mockBudget2],
        summary: mockBudgetSummary,
      });
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
    it("should create a budget", async () => {
      vi.mocked(createBudget).mockResolvedValue(mockBudget1);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          categoryId: "dQRS5HxkBo1FiMjh2LKmb",
          amountIdr: 500000,
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toEqual(mockBudget1);
      expect(createBudget).toHaveBeenCalledWith({
        month: "2024-01-01",
        categoryId: "dQRS5HxkBo1FiMjh2LKmb",
        amountIdr: 500000,
      });
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

      vi.mocked(createBudget).mockRejectedValue(validationError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          categoryId: "cat1",
          amountIdr: 500000,
        },
      );

      const response = await POST(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });

    it("should return 404 when categories not found", async () => {
      vi.mocked(createBudget).mockRejectedValue(
        new Error("Category not found or archived"),
      );

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          categoryId: "cat999",
          amountIdr: 500000,
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(404);
      expect(data.error.message).toBe("Category not found or archived");
      expect(createBudget).toHaveBeenCalled();
    });

    it("should return 400 for archived categories", async () => {
      vi.mocked(createBudget).mockRejectedValue(
        new Error("Category is archived"),
      );

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          categoryId: "cat1",
          amountIdr: 500000,
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Category is archived");
      expect(createBudget).toHaveBeenCalled();
    });

    it("should return 409 for budget already existing", async () => {
      vi.mocked(createBudget).mockRejectedValue({
        code: "23505",
        message: "duplicate key value violates unique constraint",
        detail: "Key (month, category_id)=(2024-01-01, cat1) already exists.",
      });

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          categoryId: "cat1",
          amountIdr: 500000,
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(409);
      expect(data.error.message).toBe(
        "Budget already exists for this month and target",
      );
      expect(createBudget).toHaveBeenCalled();
    });

    it("should handle PostgreSQL unique constraint violation", async () => {
      const pgError = {
        code: "23505",
        message: "duplicate key value violates unique constraint",
        detail: "Key (month, category_id)=(2024-01-01, cat2) already exists.",
      };

      vi.mocked(createBudget).mockRejectedValue(pgError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          categoryId: "cat2",
          amountIdr: 600000,
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(409);
      expect(data.error.message).toBe(
        "Budget already exists for this month and target",
      );
    });

    it("should handle PostgreSQL foreign key violation", async () => {
      vi.mocked(createBudget).mockRejectedValue({
        code: "23503",
        message: "foreign key violation",
        detail:
          "Key (category_id)=(invalid) is not present in table categories",
      });

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          categoryId: "invalid",
          amountIdr: 500000,
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toContain("Invalid reference:");
      expect(createBudget).toHaveBeenCalled();
    });

    it("should handle PostgreSQL not-null violation", async () => {
      const pgError = {
        code: "23502",
        message: "null value in column violates not-null constraint",
        column: "amount_idr",
      };

      vi.mocked(createBudget).mockRejectedValue(pgError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          categoryId: "cat1",
          amountIdr: 500000,
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toContain("Missing required field");
    });

    it("should handle PostgreSQL check constraint violation", async () => {
      const pgError = {
        code: "23514",
        message: "check constraint violation",
        detail: "Amounts must be positive",
      };

      vi.mocked(createBudget).mockRejectedValue(pgError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          categoryId: "cat1",
          amountIdr: 500000,
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toContain("Invalid data");
    });

    it("should return 500 for unexpected errors", async () => {
      vi.mocked(createBudget).mockRejectedValue(new Error("Unexpected error"));

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          categoryId: "cat1",
          amountIdr: 500000,
        },
      );

      const response = await POST(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(500);
      expect(createBudget).toHaveBeenCalled();
    });

    it("should handle other PostgreSQL errors gracefully", async () => {
      const pgError = {
        code: "42P01",
        message: "relation does not exist",
      };

      vi.mocked(createBudget).mockRejectedValue(pgError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          categoryId: "cat3",
          amountIdr: 500000,
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

      vi.mocked(createBudget).mockResolvedValue(largeBudget);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          categoryId: "cat1",
          amountIdr: 999999999999,
        },
      );

      const response = await POST(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(200);
    });

    it("should create budget with note field", async () => {
      const mockBudgetWithNote = {
        ...mockBudget1,
        note: "Apartment only",
      };
      vi.mocked(createBudget).mockResolvedValue(mockBudgetWithNote);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          categoryId: "dQRS5HxkBo1FiMjh2LKmb",
          amountIdr: 500000,
          note: "Apartment only",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.note).toBe("Apartment only");
      expect(createBudget).toHaveBeenCalledWith({
        month: "2024-01-01",
        categoryId: "dQRS5HxkBo1FiMjh2LKmb",
        amountIdr: 500000,
        note: "Apartment only",
      });
    });

    it("should create budget without note (null)", async () => {
      const mockBudgetNoNote = {
        ...mockBudget1,
        note: null,
      };
      vi.mocked(createBudget).mockResolvedValue(mockBudgetNoNote);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          categoryId: "dQRS5HxkBo1FiMjh2LKmb",
          amountIdr: 500000,
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.note).toBeNull();
    });

    it("should handle empty string note", async () => {
      const mockBudgetEmptyNote = {
        ...mockBudget1,
        note: null,
      };
      vi.mocked(createBudget).mockResolvedValue(mockBudgetEmptyNote);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/budgets",
        {
          month: "2024-01-01",
          categoryId: "dQRS5HxkBo1FiMjh2LKmb",
          amountIdr: 500000,
          note: "",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.note).toBeNull();
    });
  });

  describe("DELETE /api/budgets", () => {
    it("should successfully delete multiple budgets", async () => {
      vi.mocked(bulkDeleteBudgets).mockResolvedValue({
        deletedCount: 2,
        failedIds: [],
      });

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/budgets",
        {
          ids: ["budget1", "budget2"],
        },
      );

      const response = await DELETE(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.message).toBe("Budgets deleted successfully");
      expect(data.deletedCount).toBe(2);
      expect(bulkDeleteBudgets).toHaveBeenCalledWith(["budget1", "budget2"]);
    });

    it("should return 400 when ids field is missing", async () => {
      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/budgets",
        {},
      );

      const response = await DELETE(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Missing required field: ids");
    });

    it("should return 400 when ids is not an array", async () => {
      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/budgets",
        {
          ids: "budget1",
        },
      );

      const response = await DELETE(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Field 'ids' must be an array");
    });

    it("should return 400 for invalid JSON body", async () => {
      const request = new NextRequest("http://localhost:3000/api/budgets", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: "invalid json",
      });

      const response = await DELETE(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Invalid JSON body");
    });

    it("should return 400 when some budgets could not be deleted", async () => {
      vi.mocked(bulkDeleteBudgets).mockResolvedValue({
        deletedCount: 1,
        failedIds: ["budget999"],
      });

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/budgets",
        {
          ids: ["budget1", "budget999"],
        },
      );

      const response = await DELETE(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Some budgets could not be deleted");
      expect(data.error.issues.code).toBe("VALIDATION_ERROR");
      expect(data.error.issues.details.deletedCount).toBe(1);
      expect(data.error.issues.details.failedIds).toContain("budget999");
    });

    it("should handle large batch deletions", async () => {
      const ids = Array.from({ length: 50 }, (_, i) => `budget${i}`);

      vi.mocked(bulkDeleteBudgets).mockResolvedValue({
        deletedCount: 50,
        failedIds: [],
      });

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/budgets",
        {
          ids,
        },
      );

      const response = await DELETE(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.deletedCount).toBe(50);
      expect(bulkDeleteBudgets).toHaveBeenCalledWith(ids);
    });

    it("should return 422 for validation errors", async () => {
      const validationError = new Error("Invalid budget IDs");
      validationError.name = "ZodError";
      (validationError as any).status = 422;

      vi.mocked(bulkDeleteBudgets).mockRejectedValue(validationError);

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/budgets",
        {
          ids: ["budget1"],
        },
      );

      const response = await DELETE(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(bulkDeleteBudgets).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/budgets",
        {
          ids: ["budget1"],
        },
      );

      const response = await DELETE(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to delete budgets");
    });

    it("should handle PostgreSQL errors", async () => {
      vi.mocked(bulkDeleteBudgets).mockRejectedValue({
        code: "ECONNREFUSED",
        message: "Connection refused",
      });

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/budgets",
        {
          ids: ["budget1"],
        },
      );

      const response = await DELETE(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Database error");
    });

    it("should handle partial success with multiple not found ids", async () => {
      vi.mocked(bulkDeleteBudgets).mockResolvedValue({
        deletedCount: 1,
        failedIds: ["budget999", "budget888"],
      });

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/budgets",
        {
          ids: ["budget1", "budget999", "budget888"],
        },
      );

      const response = await DELETE(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.issues.details.deletedCount).toBe(1);
      expect(data.error.issues.details.failedIds).toEqual(["budget999", "budget888"]);
    });

    it("should delete single budget successfully", async () => {
      vi.mocked(bulkDeleteBudgets).mockResolvedValue({
        deletedCount: 1,
        failedIds: [],
      });

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/budgets",
        {
          ids: ["budget1"],
        },
      );

      const response = await DELETE(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.deletedCount).toBe(1);
    });
  });
});
