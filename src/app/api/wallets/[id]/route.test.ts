import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the wallet actions
vi.mock("@/modules/Wallet/actions", () => ({
  getWalletById: vi.fn(),
  updateWallet: vi.fn(),
  archiveWallet: vi.fn(),
  deleteWallet: vi.fn(),
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
      new Response(JSON.stringify({ error: { message, issues } }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      }),
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
  getWalletById,
  updateWallet,
  archiveWallet,
  deleteWallet,
} from "@/modules/Wallet/actions";

// Helper to create mock NextRequest
function createMockRequest(
  method: string,
  url: string = "http://localhost:3000/api/wallets/test-id",
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
  return { params: Promise.resolve({ id }) };
}

// Helper to parse response
async function parseResponse(response: Response): Promise<{
  status: number;
  data: any;
}> {
  const data = await response.json();
  return {
    status: response.status,
    data,
  };
}

describe("Wallet [id] API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/wallets/[id]", () => {
    it("should return wallet when found", async () => {
      const mockWallet = {
        id: "test-id",
        name: "Test Wallet",
        type: "bank",
        currency: "IDR",
        archived: false,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01"),
      };

      vi.mocked(getWalletById).mockResolvedValue(mockWallet);

      const request = createMockRequest("GET");
      const response = await GET(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.id).toBe("test-id");
      expect(data.name).toBe("Test Wallet");
      expect(getWalletById).toHaveBeenCalledWith("test-id");
    });

    it("should return 404 when wallet not found", async () => {
      vi.mocked(getWalletById).mockResolvedValue(null);

      const request = createMockRequest("GET");
      const response = await GET(request, createParams("nonexistent-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(404);
      expect(data.error.message).toBe("Wallet not found");
    });

    it("should return wallet with all fields", async () => {
      const mockWallet = {
        id: "full-wallet-id",
        name: "Full Wallet",
        type: "ewallet",
        currency: "USD",
        archived: true,
        created_at: new Date("2024-01-01T10:00:00.000Z"),
        updated_at: new Date("2024-01-15T15:30:00.000Z"),
      };

      vi.mocked(getWalletById).mockResolvedValue(mockWallet);

      const request = createMockRequest("GET");
      const response = await GET(request, createParams("full-wallet-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toHaveProperty("id", "full-wallet-id");
      expect(data).toHaveProperty("name", "Full Wallet");
      expect(data).toHaveProperty("type", "ewallet");
      expect(data).toHaveProperty("currency", "USD");
      expect(data).toHaveProperty("archived", true);
      expect(data).toHaveProperty("created_at");
      expect(data).toHaveProperty("updated_at");
    });

    it("should return 500 on database error", async () => {
      vi.mocked(getWalletById).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = createMockRequest("GET");
      const response = await GET(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to fetch wallet");
    });

    it("should handle PostgreSQL-specific errors", async () => {
      const pgError = new Error("Connection timeout");
      (pgError as any).code = "ETIMEDOUT";

      vi.mocked(getWalletById).mockRejectedValue(pgError);

      const request = createMockRequest("GET");
      const response = await GET(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Database error");
    });
  });

  describe("PATCH /api/wallets/[id]", () => {
    it("should update wallet name", async () => {
      const updatedWallet = {
        id: "test-id",
        name: "Updated Name",
        type: "bank",
        currency: "IDR",
        archived: false,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-15"),
      };

      vi.mocked(updateWallet).mockResolvedValue(updatedWallet);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/wallets/test-id",
        { name: "Updated Name" },
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.name).toBe("Updated Name");
      expect(updateWallet).toHaveBeenCalledWith("test-id", {
        name: "Updated Name",
      });
    });

    it("should update wallet type", async () => {
      const updatedWallet = {
        id: "test-id",
        name: "Test Wallet",
        type: "ewallet",
        currency: "IDR",
        archived: false,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-15"),
      };

      vi.mocked(updateWallet).mockResolvedValue(updatedWallet);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/wallets/test-id",
        { type: "ewallet" },
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.type).toBe("ewallet");
    });

    it("should update wallet archived status", async () => {
      const updatedWallet = {
        id: "test-id",
        name: "Test Wallet",
        type: "bank",
        currency: "IDR",
        archived: true,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-15"),
      };

      vi.mocked(updateWallet).mockResolvedValue(updatedWallet);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/wallets/test-id",
        { archived: true },
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.archived).toBe(true);
    });

    it("should update multiple fields at once", async () => {
      const updatedWallet = {
        id: "test-id",
        name: "New Name",
        type: "cash",
        currency: "IDR",
        archived: true,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-15"),
      };

      vi.mocked(updateWallet).mockResolvedValue(updatedWallet);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/wallets/test-id",
        { name: "New Name", type: "cash", archived: true },
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.name).toBe("New Name");
      expect(data.type).toBe("cash");
      expect(data.archived).toBe(true);
    });

    it("should return 400 for invalid JSON body", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/wallets/test-id",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: "invalid json{",
        },
      );

      const response = await PATCH(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Invalid JSON body");
    });

    it("should return 404 when wallet not found", async () => {
      const error = new Error("Wallet not found");
      vi.mocked(updateWallet).mockRejectedValue(error);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/wallets/nonexistent-id",
        { name: "New Name" },
      );
      const response = await PATCH(request, createParams("nonexistent-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(404);
      expect(data.error.message).toBe("Wallet not found");
    });

    it("should return 409 for duplicate name", async () => {
      const error = new Error("Wallet name already exists");
      vi.mocked(updateWallet).mockRejectedValue(error);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/wallets/test-id",
        { name: "Existing Name" },
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(409);
      expect(data.error.message).toBe("Wallet name already exists");
    });

    it("should return 400 for no updates provided", async () => {
      const error = new Error("No updates provided");
      vi.mocked(updateWallet).mockRejectedValue(error);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/wallets/test-id",
        {},
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("No updates provided");
    });

    it("should handle PostgreSQL unique constraint violation", async () => {
      const pgError = new Error(
        "duplicate key value violates unique constraint",
      );
      (pgError as any).code = "23505";

      vi.mocked(updateWallet).mockRejectedValue(pgError);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/wallets/test-id",
        { name: "Duplicate Name" },
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(409);
      expect(data.error.message).toBe("Wallet with this name already exists");
    });

    it("should handle PostgreSQL not-null violation", async () => {
      const pgError = new Error(
        "null value in column violates not-null constraint",
      );
      (pgError as any).code = "23502";
      (pgError as any).column = "name";

      vi.mocked(updateWallet).mockRejectedValue(pgError);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/wallets/test-id",
        { name: null },
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toContain("Missing required field");
    });

    it("should return 422 for validation errors", async () => {
      const validationResponse = new Response(
        JSON.stringify({
          error: {
            message: "Validation failed",
            issues: [{ field: "type", message: "Invalid wallet type" }],
          },
        }),
        { status: 422 },
      );

      vi.mocked(updateWallet).mockRejectedValue(validationResponse);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/wallets/test-id",
        { type: "invalid" },
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });

    it("should return 500 for unexpected errors", async () => {
      vi.mocked(updateWallet).mockRejectedValue(new Error("Unexpected error"));

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/wallets/test-id",
        { name: "Test" },
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to update wallet");
    });
  });

  describe("DELETE /api/wallets/[id]", () => {
    describe("Archive (soft delete)", () => {
      it("should archive wallet by default", async () => {
        const archivedWallet = {
          id: "test-id",
          name: "Test Wallet",
          type: "bank",
          currency: "IDR",
          archived: true,
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-15"),
        };

        vi.mocked(archiveWallet).mockResolvedValue(archivedWallet);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/wallets/test-id",
        );
        const response = await DELETE(request, createParams("test-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.message).toBe("Wallet archived successfully");
        expect(data.wallet.archived).toBe(true);
        expect(archiveWallet).toHaveBeenCalledWith("test-id");
      });

      it("should archive wallet with explicit action parameter", async () => {
        const archivedWallet = {
          id: "test-id",
          name: "Test Wallet",
          type: "bank",
          currency: "IDR",
          archived: true,
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-15"),
        };

        vi.mocked(archiveWallet).mockResolvedValue(archivedWallet);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/wallets/test-id?action=archive",
        );
        const response = await DELETE(request, createParams("test-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.message).toBe("Wallet archived successfully");
        expect(archiveWallet).toHaveBeenCalledWith("test-id");
      });

      it("should return 404 when archiving nonexistent wallet", async () => {
        const error = new Error("Wallet not found");
        vi.mocked(archiveWallet).mockRejectedValue(error);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/wallets/nonexistent-id",
        );
        const response = await DELETE(request, createParams("nonexistent-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(404);
        expect(data.error.message).toBe("Wallet not found");
      });

      it("should return 409 when wallet already archived", async () => {
        const error = new Error("Wallet is already archived");
        vi.mocked(archiveWallet).mockRejectedValue(error);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/wallets/test-id",
        );
        const response = await DELETE(request, createParams("test-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(409);
        expect(data.error.message).toBe("Wallet is already archived");
      });
    });

    describe("Hard delete", () => {
      it("should permanently delete wallet", async () => {
        vi.mocked(deleteWallet).mockResolvedValue(undefined);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/wallets/test-id?action=delete",
        );
        const response = await DELETE(request, createParams("test-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.message).toBe("Wallet deleted successfully");
        expect(deleteWallet).toHaveBeenCalledWith("test-id");
      });

      it("should return 404 when deleting nonexistent wallet", async () => {
        const error = new Error("Wallet not found");
        vi.mocked(deleteWallet).mockRejectedValue(error);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/wallets/nonexistent-id?action=delete",
        );
        const response = await DELETE(request, createParams("nonexistent-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(404);
        expect(data.error.message).toBe("Wallet not found");
      });

      it("should return 409 when wallet has transactions", async () => {
        const error = new Error(
          "Cannot delete wallet with existing transactions",
        );
        vi.mocked(deleteWallet).mockRejectedValue(error);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/wallets/test-id?action=delete",
        );
        const response = await DELETE(request, createParams("test-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(409);
        expect(data.error.message).toBe(
          "Cannot delete wallet with existing transactions",
        );
      });

      it("should handle PostgreSQL foreign key violation", async () => {
        const pgError = new Error("foreign key violation");
        (pgError as any).code = "23503";

        vi.mocked(deleteWallet).mockRejectedValue(pgError);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/wallets/test-id?action=delete",
        );
        const response = await DELETE(request, createParams("test-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(409);
        expect(data.error.message).toContain("Cannot delete wallet");
      });
    });

    describe("Invalid action", () => {
      it("should return 400 for invalid action parameter", async () => {
        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/wallets/test-id?action=invalid",
        );
        const response = await DELETE(request, createParams("test-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(400);
        expect(data.error.message).toBe(
          "Invalid action. Use 'archive' or 'delete'",
        );
      });
    });

    describe("Error handling", () => {
      it("should return 422 for validation errors", async () => {
        const validationResponse = new Response(
          JSON.stringify({
            error: {
              message: "Invalid wallet ID",
            },
          }),
          { status: 422 },
        );

        vi.mocked(archiveWallet).mockRejectedValue(validationResponse);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/wallets/invalid-id",
        );
        const response = await DELETE(request, createParams("invalid-id"));
        const { status } = await parseResponse(response);

        expect(status).toBe(422);
      });

      it("should return 500 for unexpected errors", async () => {
        vi.mocked(archiveWallet).mockRejectedValue(
          new Error("Unexpected error"),
        );

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/wallets/test-id",
        );
        const response = await DELETE(request, createParams("test-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(500);
        expect(data.error.message).toBe("Failed to delete wallet");
      });

      it("should handle PostgreSQL connection errors", async () => {
        const pgError = new Error("Connection refused");
        (pgError as any).code = "ECONNREFUSED";

        vi.mocked(archiveWallet).mockRejectedValue(pgError);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/wallets/test-id",
        );
        const response = await DELETE(request, createParams("test-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(500);
        expect(data.error.message).toBe("Database error");
      });
    });
  });

  describe("Response Format", () => {
    it("should return proper Content-Type header", async () => {
      const mockWallet = {
        id: "test-id",
        name: "Test Wallet",
        type: "bank",
        currency: "IDR",
        archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(getWalletById).mockResolvedValue(mockWallet);

      const request = createMockRequest("GET");
      const response = await GET(request, createParams("test-id"));

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should return consistent error format", async () => {
      vi.mocked(getWalletById).mockResolvedValue(null);

      const request = createMockRequest("GET");
      const response = await GET(request, createParams("test-id"));
      const { data } = await parseResponse(response);

      expect(data).toHaveProperty("error");
      expect(data.error).toHaveProperty("message");
    });
  });

  describe("Edge Cases", () => {
    it("should handle wallet ID with special characters", async () => {
      const mockWallet = {
        id: "wallet_123-abc",
        name: "Test Wallet",
        type: "bank",
        currency: "IDR",
        archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(getWalletById).mockResolvedValue(mockWallet);

      const request = createMockRequest("GET");
      const response = await GET(request, createParams("wallet_123-abc"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.id).toBe("wallet_123-abc");
    });

    it("should handle UUID format wallet ID", async () => {
      const uuidId = "550e8400-e29b-41d4-a716-446655440000";
      const mockWallet = {
        id: uuidId,
        name: "Test Wallet",
        type: "bank",
        currency: "IDR",
        archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(getWalletById).mockResolvedValue(mockWallet);

      const request = createMockRequest("GET");
      const response = await GET(request, createParams(uuidId));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.id).toBe(uuidId);
    });

    it("should handle nanoid format wallet ID", async () => {
      const nanoidId = "V1StGXR8_Z5jdHi6B-myT";
      const mockWallet = {
        id: nanoidId,
        name: "Test Wallet",
        type: "bank",
        currency: "IDR",
        archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(getWalletById).mockResolvedValue(mockWallet);

      const request = createMockRequest("GET");
      const response = await GET(request, createParams(nanoidId));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.id).toBe(nanoidId);
    });

    it("should handle updating wallet with unicode name", async () => {
      const updatedWallet = {
        id: "test-id",
        name: "銀行口座 💰",
        type: "bank",
        currency: "IDR",
        archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(updateWallet).mockResolvedValue(updatedWallet);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/wallets/test-id",
        { name: "銀行口座 💰" },
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.name).toBe("銀行口座 💰");
    });

    it("should handle empty string update values", async () => {
      const validationResponse = new Response(
        JSON.stringify({
          error: {
            message: "Validation failed",
            issues: [{ field: "name", message: "Name is required" }],
          },
        }),
        { status: 422 },
      );

      vi.mocked(updateWallet).mockRejectedValue(validationResponse);

      const request = createMockRequest(
        "PATCH",
        "http://localhost:3000/api/wallets/test-id",
        { name: "" },
      );
      const response = await PATCH(request, createParams("test-id"));
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });
  });

  describe("Wallet Types via PATCH", () => {
    it.each(["cash", "bank", "ewallet", "other"] as const)(
      "should update wallet to type: %s",
      async (walletType) => {
        const updatedWallet = {
          id: "test-id",
          name: "Test Wallet",
          type: walletType,
          currency: "IDR",
          archived: false,
          created_at: new Date(),
          updated_at: new Date(),
        };

        vi.mocked(updateWallet).mockResolvedValue(updatedWallet);

        const request = createMockRequest(
          "PATCH",
          "http://localhost:3000/api/wallets/test-id",
          { type: walletType },
        );
        const response = await PATCH(request, createParams("test-id"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.type).toBe(walletType);
      },
    );
  });

  describe("Concurrent Operations", () => {
    it("should handle multiple GET requests", async () => {
      const mockWallet = {
        id: "test-id",
        name: "Test Wallet",
        type: "bank",
        currency: "IDR",
        archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(getWalletById).mockResolvedValue(mockWallet);

      const requests = Array.from({ length: 5 }, () =>
        GET(createMockRequest("GET"), createParams("test-id")),
      );

      const responses = await Promise.all(requests);

      for (const response of responses) {
        const { status } = await parseResponse(response);
        expect(status).toBe(200);
      }

      expect(getWalletById).toHaveBeenCalledTimes(5);
    });
  });
});
