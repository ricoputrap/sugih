import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the savings bucket actions
vi.mock("@/modules/SavingsBucket/actions", () => ({
  listSavingsBuckets: vi.fn(),
  createSavingsBucket: vi.fn(),
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

import { listSavingsBuckets, createSavingsBucket } from "@/modules/SavingsBucket/actions";

// Helper to create mock NextRequest
function createMockRequest(
  method: string,
  url: string = "http://localhost:3000/api/savings-buckets",
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

describe("SavingsBuckets API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/savings-buckets", () => {
    it("should return a list of savings buckets", async () => {
      const mockSavingsBuckets = [
        {
          id: "bucket1",
          name: "Emergency Fund",
          description: "For unexpected expenses",
          archived: false,
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "bucket2",
          name: "Vacation",
          description: "Summer trip savings",
          archived: false,
          created_at: "2024-01-02T00:00:00.000Z",
          updated_at: "2024-01-02T00:00:00.000Z",
        },
      ];

      vi.mocked(listSavingsBuckets).mockResolvedValue(mockSavingsBuckets);

      const request = createMockRequest("GET");
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toEqual(mockSavingsBuckets);
      expect(listSavingsBuckets).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when no savings buckets exist", async () => {
      vi.mocked(listSavingsBuckets).mockResolvedValue([]);

      const request = createMockRequest("GET");
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toEqual([]);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(listSavingsBuckets).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = createMockRequest("GET");
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to fetch savings buckets");
    });

    it("should handle PostgreSQL-specific errors", async () => {
      vi.mocked(listSavingsBuckets).mockRejectedValue({
        code: "ECONNREFUSED",
        message: "Connection refused",
      });

      const request = createMockRequest("GET");
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Database error");
    });

    it("should return savings buckets with null description", async () => {
      const mockBuckets = [
        {
          id: "bucket1",
          name: "Quick Save",
          description: null,
          archived: false,
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
      ];

      vi.mocked(listSavingsBuckets).mockResolvedValue(mockBuckets);

      const request = createMockRequest("GET");
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data[0].description).toBeNull();
    });

    it("should return both archived and active savings buckets", async () => {
      const mockBuckets = [
        {
          id: "bucket1",
          name: "Active Fund",
          description: null,
          archived: false,
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "bucket2",
          name: "Archived Fund",
          description: null,
          archived: true,
          created_at: "2024-01-02T00:00:00.000Z",
          updated_at: "2024-01-02T00:00:00.000Z",
        },
      ];

      vi.mocked(listSavingsBuckets).mockResolvedValue(mockBuckets);

      const request = createMockRequest("GET");
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].archived).toBe(false);
      expect(data[1].archived).toBe(true);
    });
  });

  describe("POST /api/savings-buckets", () => {
    it("should create a new savings bucket", async () => {
      const newBucket = {
        id: "new-bucket-id",
        name: "New Car Fund",
        description: "Saving for a new car",
        archived: false,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01"),
      };

      vi.mocked(createSavingsBucket).mockResolvedValue(newBucket);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/savings-buckets",
        {
          name: "New Car Fund",
          description: "Saving for a new car",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.name).toBe("New Car Fund");
      expect(data.description).toBe("Saving for a new car");
      expect(createSavingsBucket).toHaveBeenCalledWith({
        name: "New Car Fund",
        description: "Saving for a new car",
      });
    });

    it("should create a savings bucket without description", async () => {
      const newBucket = {
        id: "new-bucket-id",
        name: "Simple Savings",
        description: null,
        archived: false,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01"),
      };

      vi.mocked(createSavingsBucket).mockResolvedValue(newBucket);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/savings-buckets",
        {
          name: "Simple Savings",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.name).toBe("Simple Savings");
      expect(data.description).toBeNull();
    });

    it("should return 400 for invalid JSON body", async () => {
      const request = new NextRequest("http://localhost:3000/api/savings-buckets", {
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
      const validationError = new Error("Invalid savings bucket data");
      validationError.name = "ZodError";
      (validationError as any).status = 422;

      vi.mocked(createSavingsBucket).mockRejectedValue(validationError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/savings-buckets",
        {
          name: "",
        },
      );

      const response = await POST(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });

    it("should return 409 for duplicate savings bucket name", async () => {
      vi.mocked(createSavingsBucket).mockRejectedValue(
        new Error("Savings bucket name already exists"),
      );

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/savings-buckets",
        {
          name: "Emergency Fund",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(409);
      expect(data.error.message).toBe("Savings bucket name already exists");
    });

    it("should handle PostgreSQL unique constraint violation", async () => {
      const pgError = {
        code: "23505",
        message: "duplicate key value violates unique constraint",
        detail: "Key (name)=(Emergency Fund) already exists.",
      };

      vi.mocked(createSavingsBucket).mockRejectedValue(pgError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/savings-buckets",
        {
          name: "Emergency Fund",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(409);
      expect(data.error.message).toBe("Savings bucket with this name already exists");
    });

    it("should handle PostgreSQL not-null violation", async () => {
      const pgError = {
        code: "23502",
        message: "null value in column violates not-null constraint",
        column: "name",
      };

      vi.mocked(createSavingsBucket).mockRejectedValue(pgError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/savings-buckets",
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
      (zodError as any).status = 422;

      vi.mocked(createSavingsBucket).mockRejectedValue(zodError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/savings-buckets",
        {
          name: "",
        },
      );

      const response = await POST(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });

    it("should return 500 for unexpected errors", async () => {
      vi.mocked(createSavingsBucket).mockRejectedValue(
        new Error("Unexpected error"),
      );

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/savings-buckets",
        {
          name: "Test Bucket",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to create savings bucket");
    });

    it("should handle PostgreSQL check constraint violation", async () => {
      const pgError = {
        code: "23514",
        message: "check constraint violation",
        detail: "Invalid savings bucket data",
      };

      vi.mocked(createSavingsBucket).mockRejectedValue(pgError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/savings-buckets",
        {
          name: "Test",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Invalid data: Invalid savings bucket data");
    });

    it("should handle PostgreSQL foreign key violation", async () => {
      const pgError = {
        code: "23503",
        message: "foreign key violation",
        detail: "Key (wallet_id)=(123) is not present in table wallets",
      };

      vi.mocked(createSavingsBucket).mockRejectedValue(pgError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/savings-buckets",
        {
          name: "Test Bucket",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toContain("Invalid reference:");
    });

    it("should handle long savings bucket names", async () => {
      const longName = "a".repeat(255);
      const newBucket = {
        id: "new-bucket-id",
        name: longName,
        description: null,
        archived: false,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01"),
      };

      vi.mocked(createSavingsBucket).mockResolvedValue(newBucket);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/savings-buckets",
        {
          name: longName,
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.name).toBe(longName);
    });

    it("should handle empty savings bucket name", async () => {
      // Set up mock to reject empty bucket names
      const validationError = new Error("Validation failed");
      validationError.name = "ZodError";
      (validationError as any).status = 422;

      vi.mocked(createSavingsBucket).mockRejectedValue(validationError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/savings-buckets",
        {
          name: "",
        },
      );

      const response = await POST(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });

    it("should handle special characters in savings bucket name", async () => {
      const newBucket = {
        id: "new-bucket-id",
        name: "Travel & Adventure 🌍",
        description: "For world exploration",
        archived: false,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01"),
      };

      vi.mocked(createSavingsBucket).mockResolvedValue(newBucket);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/savings-buckets",
        {
          name: "Travel & Adventure 🌍",
          description: "For world exploration",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.name).toBe("Travel & Adventure 🌍");
    });

    it("should handle long description", async () => {
      const longDescription = "A very long description. ".repeat(50);
      const newBucket = {
        id: "new-bucket-id",
        name: "Long Desc Bucket",
        description: longDescription,
        archived: false,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01"),
      };

      vi.mocked(createSavingsBucket).mockResolvedValue(newBucket);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/savings-buckets",
        {
          name: "Long Desc Bucket",
          description: longDescription,
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.description).toBe(longDescription);
    });

    it("should handle other PostgreSQL errors gracefully", async () => {
      const pgError = {
        code: "42P01",
        message: "relation does not exist",
      };

      vi.mocked(createSavingsBucket).mockRejectedValue(pgError);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/savings-buckets",
        {
          name: "Test",
        },
      );

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Database error");
    });
  });
});
