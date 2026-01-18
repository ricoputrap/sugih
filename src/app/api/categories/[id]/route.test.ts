import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the category actions
vi.mock("@/modules/Category/actions", () => ({
  getCategoryById: vi.fn(),
  updateCategory: vi.fn(),
  archiveCategory: vi.fn(),
  deleteCategory: vi.fn(),
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

import { GET, PATCH, DELETE } from "./route";

import {
  getCategoryById,
  updateCategory,
  archiveCategory,
  deleteCategory,
} from "@/modules/Category/actions";

// Helper to create mock NextRequest
function createMockRequest(
  method: string,
  url: string = "http://localhost:3000/api/categories/test-id",
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

// Helper to create params
function createParams(id: string): { params: Promise<{ id: string }> } {
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

describe("Category [id] API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/categories/[id]", () => {
    it("should return a category by ID", async () => {
      const mockCategory = {
        id: "test-id",
        name: "Food & Dining",
        archived: false,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01"),
      };

      vi.mocked(getCategoryById).mockResolvedValue(mockCategory);

      const request = createMockRequest("GET");
      const response = await GET(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.name).toBe("Food & Dining");
      expect(getCategoryById).toHaveBeenCalledWith("test-id");
    });

    it("should return 404 when category not found", async () => {
      vi.mocked(getCategoryById).mockResolvedValue(null);

      const request = createMockRequest("GET");
      const response = await GET(request, createParams("non-existent-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(404);
      expect(data.error.message).toBe("Category not found");
    });

    it("should return 500 on database error", async () => {
      vi.mocked(getCategoryById).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = createMockRequest("GET");
      const response = await GET(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to fetch category");
    });

    it("should handle PostgreSQL-specific errors", async () => {
      vi.mocked(getCategoryById).mockRejectedValue({
        code: "ETIMEDOUT",
        message: "Connection timeout",
      });

      const request = createMockRequest("GET");
      const response = await GET(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Database error");
    });

    it("should handle archived categories", async () => {
      const archivedCategory = {
        id: "test-id",
        name: "Old Category",
        archived: true,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01"),
      };

      vi.mocked(getCategoryById).mockResolvedValue(archivedCategory);

      const request = createMockRequest("GET");
      const response = await GET(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.archived).toBe(true);
    });

    it("should handle special characters in category name", async () => {
      const categoryWithSpecialChars = {
        id: "test-id",
        name: "Food & Dining 🚀",
        archived: false,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01"),
      };

      vi.mocked(getCategoryById).mockResolvedValue(categoryWithSpecialChars);

      const request = createMockRequest("GET");
      const response = await GET(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.name).toBe("Food & Dining 🚀");
    });
  });

  describe("PATCH /api/categories/[id]", () => {
    it("should update category name", async () => {
      const updatedCategory = {
        id: "test-id",
        name: "Updated Category",
        archived: false,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-15"),
      };

      vi.mocked(updateCategory).mockResolvedValue(updatedCategory);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/categories/test-id",
        { name: "Updated Category" },
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.name).toBe("Updated Category");
      expect(updateCategory).toHaveBeenCalledWith("test-id", {
        name: "Updated Category",
      });
    });

    it("should update category archived status", async () => {
      const updatedCategory = {
        id: "test-id",
        name: "Test Category",
        archived: true,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-15"),
      };

      vi.mocked(updateCategory).mockResolvedValue(updatedCategory);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/categories/test-id",
        { archived: true },
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.archived).toBe(true);
    });

    it("should update both name and archived status", async () => {
      const updatedCategory = {
        id: "test-id",
        name: "Renamed & Archived",
        archived: true,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-15"),
      };

      vi.mocked(updateCategory).mockResolvedValue(updatedCategory);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/categories/test-id",
        { name: "Renamed & Archived", archived: true },
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.name).toBe("Renamed & Archived");
      expect(data.archived).toBe(true);
    });

    it("should return 400 for invalid JSON body", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/categories/test-id",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: "invalid json",
        },
      );

      const response = await PATCH(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Invalid JSON body");
    });

    it("should return 404 when category not found", async () => {
      vi.mocked(updateCategory).mockRejectedValue(
        new Error("Category not found"),
      );

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/categories/non-existent-id",
        { name: "New Name" },
      );
      const response = await PATCH(request, createParams("non-existent-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(404);
      expect(data.error.message).toBe("Category not found");
    });

    it("should return 409 for duplicate category name", async () => {
      vi.mocked(updateCategory).mockRejectedValue(
        new Error("Category name already exists"),
      );

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/categories/test-id",
        { name: "Duplicate Name" },
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(409);
      expect(data.error.message).toBe("Category name already exists");
    });

    it("should return 400 for no updates provided", async () => {
      vi.mocked(updateCategory).mockRejectedValue(
        new Error("No updates provided"),
      );

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/categories/test-id",
        {},
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("No updates provided");
    });

    it("should return 422 for validation errors", async () => {
      const validationError = new Error("Invalid category update data");
      validationError.name = "ZodError";
      validationError.status = 422;

      vi.mocked(updateCategory).mockRejectedValue(validationError);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/categories/test-id",
        { name: "" },
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });

    it("should handle PostgreSQL unique constraint violation", async () => {
      const pgError = {
        code: "23505",
        message: "duplicate key value violates unique constraint",
        detail: "Key (name)=(Food) already exists.",
      };

      vi.mocked(updateCategory).mockRejectedValue(pgError);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/categories/test-id",
        { name: "Food" },
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(409);
      expect(data.error.message).toBe("Category with this name already exists");
    });

    it("should handle PostgreSQL foreign key violation", async () => {
      const pgError = {
        code: "23503",
        message: "foreign key violation",
        detail: "Key (id) is still referenced from table transactions",
      };

      vi.mocked(updateCategory).mockRejectedValue(pgError);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/categories/test-id",
        { name: "New Name" },
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe(
        "Invalid reference: Key (id) is still referenced from table transactions",
      );
    });

    it("should handle PostgreSQL not-null violation", async () => {
      const pgError = {
        code: "23502",
        message: "null value in column violates not-null constraint",
        column: "name",
      };

      vi.mocked(updateCategory).mockRejectedValue(pgError);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/categories/test-id",
        { name: "New Name" },
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Missing required field: name");
    });

    it("should handle long category names", async () => {
      const longName = "a".repeat(255);
      const updatedCategory = {
        id: "test-id",
        name: longName,
        archived: false,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-15"),
      };

      vi.mocked(updateCategory).mockResolvedValue(updatedCategory);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/categories/test-id",
        { name: longName },
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.name).toBe(longName);
    });

    it("should handle empty string update values", async () => {
      // Set up mock to reject empty string update values
      const validationError = new Error("Validation failed");
      validationError.name = "ZodError";
      validationError.status = 422;

      vi.mocked(updateCategory).mockRejectedValue(validationError);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/categories/test-id",
        { name: "" },
      );

      const response = await PATCH(request, createParams("test-id"));
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });
  });

  describe("DELETE /api/categories/[id]", () => {
    describe("Archive (soft delete)", () => {
      it("should archive a category", async () => {
        const archivedCategory = {
          id: "test-id",
          name: "Test Category",
          archived: true,
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-15"),
        };

        vi.mocked(archiveCategory).mockResolvedValue(archivedCategory);

        const request = createMockRequest("DELETE");
        const response = await DELETE(request, createParams("test-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.message).toBe("Category archived successfully");
        expect(data.category.archived).toBe(true);
        expect(archiveCategory).toHaveBeenCalledWith("test-id");
      });

      it("should return 404 when category not found", async () => {
        vi.mocked(archiveCategory).mockRejectedValue(
          new Error("Category not found"),
        );

        const request = createMockRequest("DELETE");
        const response = await DELETE(request, createParams("non-existent-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(404);
        expect(data.error.message).toBe("Category not found");
      });

      it("should return 409 when category already archived", async () => {
        vi.mocked(archiveCategory).mockRejectedValue(
          new Error("Category is already archived"),
        );

        const request = createMockRequest("DELETE");
        const response = await DELETE(request, createParams("test-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(409);
        expect(data.error.message).toBe("Category is already archived");
      });

      it("should return 422 for validation errors", async () => {
        const validationError = new Error("Invalid category ID");
        validationError.name = "ZodError";
        validationError.status = 422;

        vi.mocked(archiveCategory).mockRejectedValue(validationError);

        const request = createMockRequest("DELETE");
        const response = await DELETE(request, createParams("invalid-id"));
        const { status } = await parseResponse(response);

        expect(status).toBe(422);
      });
    });

    describe("Hard delete", () => {
      it("should permanently delete a category", async () => {
        vi.mocked(deleteCategory).mockResolvedValue(undefined);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/categories/test-id?action=delete",
        );
        const response = await DELETE(request, createParams("test-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.message).toBe("Category deleted successfully");
        expect(deleteCategory).toHaveBeenCalledWith("test-id");
      });

      it("should return 404 when category not found", async () => {
        vi.mocked(deleteCategory).mockRejectedValue(
          new Error("Category not found"),
        );

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/categories/non-existent-id?action=delete",
        );
        const response = await DELETE(request, createParams("non-existent-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(404);
        expect(data.error.message).toBe("Category not found");
      });

      it("should return 409 when category has transactions", async () => {
        vi.mocked(deleteCategory).mockRejectedValue(
          new Error("Cannot delete category with existing transactions"),
        );

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/categories/test-id?action=delete",
        );
        const response = await DELETE(request, createParams("test-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(409);
        expect(data.error.message).toBe(
          "Cannot delete category with existing transactions",
        );
      });

      it("should handle PostgreSQL foreign key violation", async () => {
        const pgError = {
          code: "23503",
          message: "foreign key violation",
          detail: "Key (id) is still referenced from table transactions",
        };

        vi.mocked(deleteCategory).mockRejectedValue(pgError);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/categories/test-id?action=delete",
        );
        const response = await DELETE(request, createParams("test-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(409);
        expect(data.error.message).toBe(
          "Cannot delete category: it is referenced by other records",
        );
      });
    });

    describe("Error handling", () => {
      it("should return 400 for invalid action parameter", async () => {
        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/categories/test-id?action=invalid",
        );
        const response = await DELETE(request, createParams("test-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(400);
        expect(data.error.message).toBe(
          "Invalid action. Use 'archive' or 'delete'",
        );
      });

      it("should return 500 for unexpected errors", async () => {
        vi.mocked(archiveCategory).mockRejectedValue(
          new Error("Unexpected error"),
        );

        const request = createMockRequest("DELETE");
        const response = await DELETE(request, createParams("test-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(500);
        expect(data.error.message).toBe("Failed to delete category");
      });

      it("should handle PostgreSQL connection errors", async () => {
        vi.mocked(archiveCategory).mockRejectedValue({
          code: "ECONNREFUSED",
          message: "Connection refused",
        });

        const request = createMockRequest("DELETE");
        const response = await DELETE(request, createParams("test-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(500);
        expect(data.error.message).toBe("Database error");
      });
    });

    describe("Edge cases", () => {
      it("should handle categories with long names", async () => {
        const longName = "a".repeat(255);
        const categoryWithLongName = {
          id: "test-id",
          name: longName,
          archived: true,
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-15"),
        };

        vi.mocked(archiveCategory).mockResolvedValue(categoryWithLongName);

        const request = createMockRequest("DELETE");
        const response = await DELETE(request, createParams("test-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.category.name).toBe(longName);
      });

      it("should handle categories with special characters", async () => {
        const categoryWithSpecialChars = {
          id: "test-id",
          name: "Food & Dining 🚀",
          archived: true,
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-15"),
        };

        vi.mocked(archiveCategory).mockResolvedValue(categoryWithSpecialChars);

        const request = createMockRequest("DELETE");
        const response = await DELETE(request, createParams("test-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.category.name).toBe("Food & Dining 🚀");
      });

      it("should default to archive action when no action specified", async () => {
        const archivedCategory = {
          id: "test-id",
          name: "Test Category",
          archived: true,
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-15"),
        };

        vi.mocked(archiveCategory).mockResolvedValue(archivedCategory);

        const request = createMockRequest("DELETE");
        const response = await DELETE(request, createParams("test-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.message).toBe("Category archived successfully");
        expect(archiveCategory).toHaveBeenCalledWith("test-id");
      });
    });
  });
});
