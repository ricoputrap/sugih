import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the wallet actions
vi.mock("@/modules/Wallet/actions", () => ({
  listWallets: vi.fn(),
  createWallet: vi.fn(),
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

import { GET, POST } from "./route";

import { listWallets, createWallet } from "@/modules/Wallet/actions";

// Helper to create mock NextRequest
function createMockRequest(
  method: string,
  body?: unknown,
  url: string = "http://localhost:3000/api/wallets",
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
  const data = await response.json();
  return {
    status: response.status,
    data,
  };
}

describe("Wallets API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/wallets", () => {
    it("should return empty array when no wallets exist", async () => {
      vi.mocked(listWallets).mockResolvedValue([]);

      const response = await GET();
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toEqual([]);
      expect(listWallets).toHaveBeenCalledTimes(1);
    });

    it("should return all wallets", async () => {
      const mockWallets = [
        {
          id: "wallet-1",
          name: "Main Bank",
          type: "bank",
          currency: "IDR",
          archived: false,
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-01"),
        },
        {
          id: "wallet-2",
          name: "Cash",
          type: "cash",
          currency: "IDR",
          archived: false,
          created_at: new Date("2024-01-02"),
          updated_at: new Date("2024-01-02"),
        },
      ];

      vi.mocked(listWallets).mockResolvedValue(mockWallets);

      const response = await GET();
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe("Main Bank");
      expect(data[1].name).toBe("Cash");
    });

    it("should return wallets ordered by name", async () => {
      const mockWallets = [
        {
          id: "wallet-1",
          name: "Alpha Wallet",
          type: "bank",
          currency: "IDR",
          archived: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: "wallet-2",
          name: "Beta Wallet",
          type: "ewallet",
          currency: "IDR",
          archived: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: "wallet-3",
          name: "Gamma Wallet",
          type: "cash",
          currency: "IDR",
          archived: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      vi.mocked(listWallets).mockResolvedValue(mockWallets);

      const response = await GET();
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data[0].name).toBe("Alpha Wallet");
      expect(data[1].name).toBe("Beta Wallet");
      expect(data[2].name).toBe("Gamma Wallet");
    });

    it("should include archived wallets in response", async () => {
      const mockWallets = [
        {
          id: "wallet-1",
          name: "Active Wallet",
          type: "bank",
          currency: "IDR",
          archived: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: "wallet-2",
          name: "Archived Wallet",
          type: "bank",
          currency: "IDR",
          archived: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      vi.mocked(listWallets).mockResolvedValue(mockWallets);

      const response = await GET();
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data.find((w: any) => w.archived)).toBeDefined();
    });

    it("should return 500 on database error", async () => {
      vi.mocked(listWallets).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const response = await GET();
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to fetch wallets");
    });

    it("should handle PostgreSQL-specific errors", async () => {
      const pgError = new Error("Connection refused");
      (pgError as any).code = "ECONNREFUSED";

      vi.mocked(listWallets).mockRejectedValue(pgError);

      const response = await GET();
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Database error");
    });
  });

  describe("POST /api/wallets", () => {
    it("should create a new wallet with valid data", async () => {
      const newWallet = {
        id: "new-wallet-id",
        name: "New Bank Account",
        type: "bank",
        currency: "IDR",
        archived: false,
        created_at: new Date("2024-01-15"),
        updated_at: new Date("2024-01-15"),
      };

      vi.mocked(createWallet).mockResolvedValue(newWallet);

      const request = createMockRequest("POST", {
        name: "New Bank Account",
        type: "bank",
        currency: "IDR",
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(201);
      expect(data.name).toBe("New Bank Account");
      expect(data.type).toBe("bank");
      expect(createWallet).toHaveBeenCalledWith({
        name: "New Bank Account",
        type: "bank",
        currency: "IDR",
      });
    });

    it("should create wallet with default type when not provided", async () => {
      const newWallet = {
        id: "new-wallet-id",
        name: "Default Type Wallet",
        type: "bank",
        currency: "IDR",
        archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(createWallet).mockResolvedValue(newWallet);

      const request = createMockRequest("POST", {
        name: "Default Type Wallet",
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(201);
      expect(data.type).toBe("bank");
    });

    it("should create wallet with cash type", async () => {
      const newWallet = {
        id: "cash-wallet-id",
        name: "Cash Wallet",
        type: "cash",
        currency: "IDR",
        archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(createWallet).mockResolvedValue(newWallet);

      const request = createMockRequest("POST", {
        name: "Cash Wallet",
        type: "cash",
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(201);
      expect(data.type).toBe("cash");
    });

    it("should create wallet with ewallet type", async () => {
      const newWallet = {
        id: "ewallet-id",
        name: "GoPay",
        type: "ewallet",
        currency: "IDR",
        archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(createWallet).mockResolvedValue(newWallet);

      const request = createMockRequest("POST", {
        name: "GoPay",
        type: "ewallet",
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(201);
      expect(data.type).toBe("ewallet");
    });

    it("should return 400 for invalid JSON body", async () => {
      const request = new NextRequest("http://localhost:3000/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json{",
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Invalid JSON body");
    });

    it("should return 409 for duplicate wallet name", async () => {
      const error = new Error("Wallet name already exists");
      vi.mocked(createWallet).mockRejectedValue(error);

      const request = createMockRequest("POST", {
        name: "Existing Wallet",
        type: "bank",
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(409);
      expect(data.error.message).toBe("Wallet name already exists");
    });

    it("should handle PostgreSQL unique constraint violation", async () => {
      const pgError = new Error(
        "duplicate key value violates unique constraint",
      );
      (pgError as any).code = "23505";

      vi.mocked(createWallet).mockRejectedValue(pgError);

      const request = createMockRequest("POST", {
        name: "Duplicate Wallet",
        type: "bank",
      });

      const response = await POST(request);
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

      vi.mocked(createWallet).mockRejectedValue(pgError);

      const request = createMockRequest("POST", {
        type: "bank",
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toContain("Missing required field");
    });

    it("should return 422 for validation errors", async () => {
      const validationResponse = new Response(
        JSON.stringify({
          error: {
            message: "Validation failed",
            issues: [{ field: "name", message: "Name is required" }],
          },
        }),
        { status: 422 },
      );

      vi.mocked(createWallet).mockRejectedValue(validationResponse);

      const request = createMockRequest("POST", {
        name: "",
      });

      const response = await POST(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });

    it("should return 500 for unexpected errors", async () => {
      vi.mocked(createWallet).mockRejectedValue(new Error("Unexpected error"));

      const request = createMockRequest("POST", {
        name: "Test Wallet",
        type: "bank",
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to create wallet");
    });

    it("should handle PostgreSQL check constraint violation", async () => {
      const pgError = new Error("check constraint violation");
      (pgError as any).code = "23514";
      (pgError as any).detail = "Invalid wallet type";

      vi.mocked(createWallet).mockRejectedValue(pgError);

      const request = createMockRequest("POST", {
        name: "Test Wallet",
        type: "invalid",
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toContain("Validation failed");
    });

    it("should handle PostgreSQL foreign key violation", async () => {
      const pgError = new Error("foreign key violation");
      (pgError as any).code = "23503";
      (pgError as any).detail = "Key (currency_id)=(invalid) is not present";

      vi.mocked(createWallet).mockRejectedValue(pgError);

      const request = createMockRequest("POST", {
        name: "Test Wallet",
        type: "bank",
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toContain("Invalid reference");
    });
  });

  describe("Response Format", () => {
    it("should return proper Content-Type header", async () => {
      vi.mocked(listWallets).mockResolvedValue([]);

      const response = await GET();

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should return wallet with all required fields", async () => {
      const mockWallet = {
        id: "test-id",
        name: "Test Wallet",
        type: "bank",
        currency: "IDR",
        archived: false,
        created_at: new Date("2024-01-01T00:00:00.000Z"),
        updated_at: new Date("2024-01-01T00:00:00.000Z"),
      };

      vi.mocked(listWallets).mockResolvedValue([mockWallet]);

      const response = await GET();
      const { data } = await parseResponse(response);

      expect(data[0]).toHaveProperty("id");
      expect(data[0]).toHaveProperty("name");
      expect(data[0]).toHaveProperty("type");
      expect(data[0]).toHaveProperty("currency");
      expect(data[0]).toHaveProperty("archived");
      expect(data[0]).toHaveProperty("created_at");
      expect(data[0]).toHaveProperty("updated_at");
    });

    it("should return error in consistent format", async () => {
      vi.mocked(listWallets).mockRejectedValue(new Error("Test error"));

      const response = await GET();
      const { data } = await parseResponse(response);

      expect(data).toHaveProperty("error");
      expect(data.error).toHaveProperty("message");
    });
  });

  describe("Edge Cases", () => {
    it("should handle wallet with special characters in name", async () => {
      const mockWallet = {
        id: "special-id",
        name: "Wallet (Main) - Bank #1",
        type: "bank",
        currency: "IDR",
        archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(createWallet).mockResolvedValue(mockWallet);

      const request = createMockRequest("POST", {
        name: "Wallet (Main) - Bank #1",
        type: "bank",
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(201);
      expect(data.name).toBe("Wallet (Main) - Bank #1");
    });

    it("should handle wallet with unicode characters", async () => {
      const mockWallet = {
        id: "unicode-id",
        name: "銀行口座 💰",
        type: "bank",
        currency: "IDR",
        archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(createWallet).mockResolvedValue(mockWallet);

      const request = createMockRequest("POST", {
        name: "銀行口座 💰",
        type: "bank",
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(201);
      expect(data.name).toBe("銀行口座 💰");
    });

    it("should handle wallet with maximum length name", async () => {
      const longName = "A".repeat(255);
      const mockWallet = {
        id: "long-name-id",
        name: longName,
        type: "bank",
        currency: "IDR",
        archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(createWallet).mockResolvedValue(mockWallet);

      const request = createMockRequest("POST", {
        name: longName,
        type: "bank",
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(201);
      expect(data.name).toHaveLength(255);
    });

    it("should handle empty request body", async () => {
      const request = createMockRequest("POST", {});

      // Mock validation error
      const validationResponse = new Response(
        JSON.stringify({
          error: { message: "Validation failed" },
        }),
        { status: 422 },
      );

      vi.mocked(createWallet).mockRejectedValue(validationResponse);

      const response = await POST(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });

    it("should handle large number of wallets", async () => {
      const manyWallets = Array.from({ length: 100 }, (_, i) => ({
        id: `wallet-${i}`,
        name: `Wallet ${i}`,
        type: "bank" as const,
        currency: "IDR",
        archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      vi.mocked(listWallets).mockResolvedValue(manyWallets);

      const response = await GET();
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toHaveLength(100);
    });
  });

  describe("Wallet Types", () => {
    it.each(["cash", "bank", "ewallet", "other"] as const)(
      "should accept wallet type: %s",
      async (walletType) => {
        const mockWallet = {
          id: `${walletType}-wallet-id`,
          name: `${walletType} Wallet`,
          type: walletType,
          currency: "IDR",
          archived: false,
          created_at: new Date(),
          updated_at: new Date(),
        };

        vi.mocked(createWallet).mockResolvedValue(mockWallet);

        const request = createMockRequest("POST", {
          name: `${walletType} Wallet`,
          type: walletType,
        });

        const response = await POST(request);
        const { status, data } = await parseResponse(response);

        expect(status).toBe(201);
        expect(data.type).toBe(walletType);
      },
    );
  });

  describe("Currency Support", () => {
    it("should default to IDR currency", async () => {
      const mockWallet = {
        id: "idr-wallet",
        name: "IDR Wallet",
        type: "bank",
        currency: "IDR",
        archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(createWallet).mockResolvedValue(mockWallet);

      const request = createMockRequest("POST", {
        name: "IDR Wallet",
        type: "bank",
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(201);
      expect(data.currency).toBe("IDR");
    });

    it("should accept custom currency", async () => {
      const mockWallet = {
        id: "usd-wallet",
        name: "USD Wallet",
        type: "bank",
        currency: "USD",
        archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(createWallet).mockResolvedValue(mockWallet);

      const request = createMockRequest("POST", {
        name: "USD Wallet",
        type: "bank",
        currency: "USD",
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(201);
      expect(data.currency).toBe("USD");
    });
  });
});
