import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the savings bucket actions
vi.mock("@/modules/SavingsBucket/actions", () => ({
  getSavingsBucketById: vi.fn(),
  updateSavingsBucket: vi.fn(),
  archiveSavingsBucket: vi.fn(),
  restoreSavingsBucket: vi.fn(),
  deleteSavingsBucket: vi.fn(),
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
  getSavingsBucketById,
  updateSavingsBucket,
  archiveSavingsBucket,
  restoreSavingsBucket,
  deleteSavingsBucket,
} from "@/modules/SavingsBucket/actions";

// Helper to create mock NextRequest
function createMockRequest(
  method: string,
  url: string = "http://localhost:3000/api/savings-buckets/test-id",
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

describe("SavingsBuckets [id] API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/savings-buckets/[id]", () => {
    it("should return a savings bucket by ID", async () => {
      const mockBucket = {
        id: "bucket1",
        name: "Emergency Fund",
        description: "For unexpected expenses",
        archived: false,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
      };

      vi.mocked(getSavingsBucketById).mockResolvedValue(mockBucket);

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("bucket1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toEqual(mockBucket);
      expect(getSavingsBucketById).toHaveBeenCalledWith("bucket1");
    });

    it("should return 404 when savings bucket not found", async () => {
      vi.mocked(getSavingsBucketById).mockResolvedValue(null);

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("nonexistent"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(404);
      expect(data.error.message).toBe("Savings bucket not found");
    });

    it("should return 500 on database error", async () => {
      vi.mocked(getSavingsBucketById).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("bucket1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to fetch savings bucket");
    });

    it("should handle PostgreSQL-specific errors", async () => {
      vi.mocked(getSavingsBucketById).mockRejectedValue({
        code: "ECONNREFUSED",
        message: "Connection refused",
      });

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("bucket1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Database error");
    });

    it("should return savings bucket with null description", async () => {
      const mockBucket = {
        id: "bucket1",
        name: "Quick Save",
        description: null,
        archived: false,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
      };

      vi.mocked(getSavingsBucketById).mockResolvedValue(mockBucket);

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("bucket1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.description).toBeNull();
    });

    it("should return archived savings bucket", async () => {
      const mockBucket = {
        id: "bucket1",
        name: "Archived Fund",
        description: "No longer active",
        archived: true,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-02T00:00:00.000Z",
      };

      vi.mocked(getSavingsBucketById).mockResolvedValue(mockBucket);

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("bucket1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.archived).toBe(true);
    });
  });

  describe("PATCH /api/savings-buckets/[id]", () => {
    it("should update a savings bucket name", async () => {
      const updatedBucket = {
        id: "bucket1",
        name: "Updated Fund",
        description: "Original description",
        archived: false,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-02T00:00:00.000Z",
      };

      vi.mocked(updateSavingsBucket).mockResolvedValue(updatedBucket);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/savings-buckets/bucket1",
        { name: "Updated Fund" },
      );
      const response = await PATCH(request, createMockParams("bucket1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.name).toBe("Updated Fund");
      expect(updateSavingsBucket).toHaveBeenCalledWith("bucket1", {
        name: "Updated Fund",
      });
    });

    it("should update a savings bucket description", async () => {
      const updatedBucket = {
        id: "bucket1",
        name: "Emergency Fund",
        description: "Updated description",
        archived: false,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-02T00:00:00.000Z",
      };

      vi.mocked(updateSavingsBucket).mockResolvedValue(updatedBucket);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/savings-buckets/bucket1",
        { description: "Updated description" },
      );
      const response = await PATCH(request, createMockParams("bucket1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.description).toBe("Updated description");
    });

    it("should update archived status", async () => {
      const updatedBucket = {
        id: "bucket1",
        name: "Emergency Fund",
        description: "For emergencies",
        archived: true,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-02T00:00:00.000Z",
      };

      vi.mocked(updateSavingsBucket).mockResolvedValue(updatedBucket);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/savings-buckets/bucket1",
        { archived: true },
      );
      const response = await PATCH(request, createMockParams("bucket1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.archived).toBe(true);
    });

    it("should update multiple fields at once", async () => {
      const updatedBucket = {
        id: "bucket1",
        name: "New Name",
        description: "New description",
        archived: true,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-02T00:00:00.000Z",
      };

      vi.mocked(updateSavingsBucket).mockResolvedValue(updatedBucket);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/savings-buckets/bucket1",
        { name: "New Name", description: "New description", archived: true },
      );
      const response = await PATCH(request, createMockParams("bucket1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.name).toBe("New Name");
      expect(data.description).toBe("New description");
      expect(data.archived).toBe(true);
    });

    it("should return 400 for invalid JSON body", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/savings-buckets/bucket1",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: "invalid json",
        },
      );

      const response = await PATCH(request, createMockParams("bucket1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Invalid JSON body");
    });

    it("should return 404 when savings bucket not found", async () => {
      vi.mocked(updateSavingsBucket).mockRejectedValue(
        new Error("Savings bucket not found"),
      );

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/savings-buckets/nonexistent",
        { name: "Updated" },
      );
      const response = await PATCH(request, createMockParams("nonexistent"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(404);
      expect(data.error.message).toBe("Savings bucket not found");
    });

    it("should return 409 for duplicate name", async () => {
      vi.mocked(updateSavingsBucket).mockRejectedValue(
        new Error("Savings bucket name already exists"),
      );

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/savings-buckets/bucket1",
        { name: "Existing Name" },
      );
      const response = await PATCH(request, createMockParams("bucket1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(409);
      expect(data.error.message).toBe("Savings bucket name already exists");
    });

    it("should return 400 when no updates provided", async () => {
      vi.mocked(updateSavingsBucket).mockRejectedValue(
        new Error("No updates provided"),
      );

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/savings-buckets/bucket1",
        {},
      );
      const response = await PATCH(request, createMockParams("bucket1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("No updates provided");
    });

    it("should return 422 for Zod validation errors", async () => {
      const zodError = new Error("Validation failed");
      zodError.name = "ZodError";
      (zodError as any).status = 422;

      vi.mocked(updateSavingsBucket).mockRejectedValue(zodError);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/savings-buckets/bucket1",
        { name: "" },
      );
      const response = await PATCH(request, createMockParams("bucket1"));
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });

    it("should handle PostgreSQL unique constraint violation", async () => {
      const pgError = {
        code: "23505",
        message: "duplicate key value violates unique constraint",
        detail: "Key (name)=(Existing) already exists.",
      };

      vi.mocked(updateSavingsBucket).mockRejectedValue(pgError);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/savings-buckets/bucket1",
        { name: "Existing" },
      );
      const response = await PATCH(request, createMockParams("bucket1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(409);
      expect(data.error.message).toBe(
        "Savings bucket with this name already exists",
      );
    });

    it("should handle PostgreSQL not-null violation", async () => {
      const pgError = {
        code: "23502",
        message: "null value in column violates not-null constraint",
        column: "name",
      };

      vi.mocked(updateSavingsBucket).mockRejectedValue(pgError);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/savings-buckets/bucket1",
        { name: null },
      );
      const response = await PATCH(request, createMockParams("bucket1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Missing required field: name");
    });

    it("should handle PostgreSQL foreign key violation", async () => {
      const pgError = {
        code: "23503",
        message: "foreign key violation",
        detail: "Key is not present in table",
      };

      vi.mocked(updateSavingsBucket).mockRejectedValue(pgError);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/savings-buckets/bucket1",
        { name: "Test" },
      );
      const response = await PATCH(request, createMockParams("bucket1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toContain("Invalid reference:");
    });

    it("should return 500 for unexpected errors", async () => {
      vi.mocked(updateSavingsBucket).mockRejectedValue(
        new Error("Unexpected error"),
      );

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/savings-buckets/bucket1",
        { name: "Test" },
      );
      const response = await PATCH(request, createMockParams("bucket1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to update savings bucket");
    });

    it("should handle special characters in name update", async () => {
      const updatedBucket = {
        id: "bucket1",
        name: "Travel & Adventure 🌍",
        description: null,
        archived: false,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-02T00:00:00.000Z",
      };

      vi.mocked(updateSavingsBucket).mockResolvedValue(updatedBucket);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/savings-buckets/bucket1",
        { name: "Travel & Adventure 🌍" },
      );
      const response = await PATCH(request, createMockParams("bucket1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.name).toBe("Travel & Adventure 🌍");
    });

    it("should handle clearing description by setting to empty string", async () => {
      const updatedBucket = {
        id: "bucket1",
        name: "Emergency Fund",
        description: "",
        archived: false,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-02T00:00:00.000Z",
      };

      vi.mocked(updateSavingsBucket).mockResolvedValue(updatedBucket);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/savings-buckets/bucket1",
        { description: "" },
      );
      const response = await PATCH(request, createMockParams("bucket1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.description).toBe("");
    });
  });

  describe("DELETE /api/savings-buckets/[id]", () => {
    describe("archive action (default)", () => {
      it("should archive a savings bucket by default", async () => {
        const activeBucket = {
          id: "bucket1",
          name: "Emergency Fund",
          description: "For emergencies",
          archived: false,
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-02T00:00:00.000Z",
        };
        const archivedBucket = {
          ...activeBucket,
          archived: true,
          updated_at: "2024-01-02T00:00:00.000Z",
        };

        vi.mocked(getSavingsBucketById).mockResolvedValue(activeBucket);
        vi.mocked(archiveSavingsBucket).mockResolvedValue(archivedBucket);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/savings-buckets/bucket1",
        );
        const response = await DELETE(request, createMockParams("bucket1"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.message).toBe("Savings bucket archived successfully");
        expect(data.savingsBucket.archived).toBe(true);
        expect(archiveSavingsBucket).toHaveBeenCalledWith("bucket1");
      });

      it("should archive when action=archive is specified", async () => {
        const activeBucket = {
          id: "bucket1",
          name: "Emergency Fund",
          description: "For emergencies",
          archived: false,
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-02T00:00:00.000Z",
        };
        const archivedBucket = {
          ...activeBucket,
          archived: true,
          updated_at: "2024-01-02T00:00:00.000Z",
        };

        vi.mocked(getSavingsBucketById).mockResolvedValue(activeBucket);
        vi.mocked(archiveSavingsBucket).mockResolvedValue(archivedBucket);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/savings-buckets/bucket1?action=archive",
        );
        const response = await DELETE(request, createMockParams("bucket1"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.message).toBe("Savings bucket archived successfully");
      });

      it("should return 404 when savings bucket not found for archiving", async () => {
        vi.mocked(getSavingsBucketById).mockResolvedValue(null);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/savings-buckets/nonexistent",
        );
        const response = await DELETE(request, createMockParams("nonexistent"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(404);
        expect(data.error.message).toBe("Savings bucket not found");
      });

      it("should restore when savings bucket is already archived", async () => {
        const archivedBucket = {
          id: "bucket1",
          name: "Archived Bucket",
          description: "Test",
          archived: true,
          created_at: new Date(),
          updated_at: new Date(),
        };
        const restoredBucket = { ...archivedBucket, archived: false };

        vi.mocked(getSavingsBucketById).mockResolvedValue(archivedBucket);
        vi.mocked(restoreSavingsBucket).mockResolvedValue(restoredBucket);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/savings-buckets/bucket1",
        );
        const response = await DELETE(request, createMockParams("bucket1"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.message).toBe("Savings bucket restored successfully");
        expect(restoreSavingsBucket).toHaveBeenCalledWith("bucket1");
      });
    });

    describe("delete action (hard delete)", () => {
      it("should permanently delete a savings bucket", async () => {
        vi.mocked(deleteSavingsBucket).mockResolvedValue(undefined);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/savings-buckets/bucket1?action=delete",
        );
        const response = await DELETE(request, createMockParams("bucket1"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.message).toBe("Savings bucket deleted successfully");
        expect(deleteSavingsBucket).toHaveBeenCalledWith("bucket1");
      });

      it("should return 404 when savings bucket not found for deletion", async () => {
        vi.mocked(deleteSavingsBucket).mockRejectedValue(
          new Error("Savings bucket not found"),
        );

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/savings-buckets/nonexistent?action=delete",
        );
        const response = await DELETE(request, createMockParams("nonexistent"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(404);
        expect(data.error.message).toBe("Savings bucket not found");
      });

      it("should return 409 when savings bucket has transactions", async () => {
        vi.mocked(deleteSavingsBucket).mockRejectedValue(
          new Error("Cannot delete savings bucket with existing transactions"),
        );

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/savings-buckets/bucket1?action=delete",
        );
        const response = await DELETE(request, createMockParams("bucket1"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(409);
        expect(data.error.message).toBe(
          "Cannot delete savings bucket with existing transactions",
        );
      });

      it("should handle PostgreSQL foreign key violation on delete", async () => {
        const pgError = {
          code: "23503",
          message: "foreign key violation",
          detail: "Key is still referenced from table transactions",
        };

        vi.mocked(deleteSavingsBucket).mockRejectedValue(pgError);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/savings-buckets/bucket1?action=delete",
        );
        const response = await DELETE(request, createMockParams("bucket1"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(409);
        expect(data.error.message).toBe(
          "Cannot delete savings bucket: it is referenced by other records",
        );
      });
    });

    describe("invalid action", () => {
      it("should return 400 for invalid action parameter", async () => {
        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/savings-buckets/bucket1?action=invalid",
        );
        const response = await DELETE(request, createMockParams("bucket1"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(400);
        expect(data.error.message).toBe(
          "Invalid action. Use 'archive' or 'delete'",
        );
      });
    });

    describe("error handling", () => {
      it("should return 422 for Zod validation errors", async () => {
        const zodError = new Error("Invalid ID");
        zodError.name = "ZodError";
        (zodError as any).status = 422;

        // getSavingsBucketById is called first, so mock it to throw the error
        vi.mocked(getSavingsBucketById).mockRejectedValue(zodError);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/savings-buckets/invalid-id",
        );
        const response = await DELETE(request, createMockParams("invalid-id"));
        const { status } = await parseResponse(response);

        expect(status).toBe(422);
      });

      it("should return 500 for unexpected errors", async () => {
        const activeBucket = {
          id: "bucket1",
          name: "Test Bucket",
          description: "Test",
          archived: false,
          created_at: new Date(),
          updated_at: new Date(),
        };

        vi.mocked(getSavingsBucketById).mockResolvedValue(activeBucket);
        vi.mocked(archiveSavingsBucket).mockRejectedValue(
          new Error("Unexpected error"),
        );

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/savings-buckets/bucket1",
        );
        const response = await DELETE(request, createMockParams("bucket1"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(500);
        expect(data.error.message).toBe("Failed to delete savings bucket");
      });

      it("should handle PostgreSQL connection errors", async () => {
        const pgError = {
          code: "ECONNREFUSED",
          message: "Connection refused",
        };

        // getSavingsBucketById throws the PostgreSQL error
        vi.mocked(getSavingsBucketById).mockRejectedValue(pgError);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/savings-buckets/bucket1",
        );
        const response = await DELETE(request, createMockParams("bucket1"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(500);
        expect(data.error.message).toBe("Database error");
      });
    });
  });
});
