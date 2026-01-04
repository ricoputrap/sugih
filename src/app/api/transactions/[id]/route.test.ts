import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the transaction actions
vi.mock("@/modules/Transaction/actions", () => ({
  getTransactionById: vi.fn(),
  deleteTransaction: vi.fn(),
  restoreTransaction: vi.fn(),
  permanentlyDeleteTransaction: vi.fn(),
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

import { GET, DELETE } from "./route";

import {
  getTransactionById,
  deleteTransaction,
  restoreTransaction,
  permanentlyDeleteTransaction,
} from "@/modules/Transaction/actions";

// Helper to create mock NextRequest
function createMockRequest(
  method: string,
  url: string = "http://localhost:3000/api/transactions/txn1",
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  });
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

// Mock transaction data
const mockExpenseTransaction = {
  id: "txn1",
  occurred_at: "2024-01-15T10:00:00.000Z",
  type: "expense",
  note: "Groceries",
  payee: null,
  category_id: "cat1",
  deleted_at: null,
  created_at: "2024-01-15T10:00:00.000Z",
  updated_at: "2024-01-15T10:00:00.000Z",
  idempotency_key: null,
  postings: [
    {
      id: "post1",
      event_id: "txn1",
      wallet_id: "wallet1",
      savings_bucket_id: null,
      amount_idr: -50000,
      created_at: "2024-01-15T10:00:00.000Z",
    },
  ],
};

const mockIncomeTransaction = {
  id: "txn2",
  occurred_at: "2024-01-15T12:00:00.000Z",
  type: "income",
  note: "Salary",
  payee: "Company Inc",
  category_id: null,
  deleted_at: null,
  created_at: "2024-01-15T12:00:00.000Z",
  updated_at: "2024-01-15T12:00:00.000Z",
  idempotency_key: null,
  postings: [
    {
      id: "post2",
      event_id: "txn2",
      wallet_id: "wallet1",
      savings_bucket_id: null,
      amount_idr: 5000000,
      created_at: "2024-01-15T12:00:00.000Z",
    },
  ],
};

const mockTransferTransaction = {
  id: "txn3",
  occurred_at: "2024-01-16T09:00:00.000Z",
  type: "transfer",
  note: "Move to savings",
  payee: null,
  category_id: null,
  deleted_at: null,
  created_at: "2024-01-16T09:00:00.000Z",
  updated_at: "2024-01-16T09:00:00.000Z",
  idempotency_key: null,
  postings: [
    {
      id: "post3a",
      event_id: "txn3",
      wallet_id: "wallet1",
      savings_bucket_id: null,
      amount_idr: -100000,
      created_at: "2024-01-16T09:00:00.000Z",
    },
    {
      id: "post3b",
      event_id: "txn3",
      wallet_id: "wallet2",
      savings_bucket_id: null,
      amount_idr: 100000,
      created_at: "2024-01-16T09:00:00.000Z",
    },
  ],
};

const mockDeletedTransaction = {
  id: "txn-deleted",
  occurred_at: "2024-01-14T10:00:00.000Z",
  type: "expense",
  note: "Deleted transaction",
  payee: null,
  category_id: "cat1",
  deleted_at: "2024-01-15T10:00:00.000Z",
  created_at: "2024-01-14T10:00:00.000Z",
  updated_at: "2024-01-15T10:00:00.000Z",
  idempotency_key: null,
  postings: [
    {
      id: "post-deleted",
      event_id: "txn-deleted",
      wallet_id: "wallet1",
      savings_bucket_id: null,
      amount_idr: -25000,
      created_at: "2024-01-14T10:00:00.000Z",
    },
  ],
};

describe("Transactions [id] API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/transactions/[id]", () => {
    it("should return a transaction by ID", async () => {
      vi.mocked(getTransactionById).mockResolvedValue(mockExpenseTransaction);

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("txn1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toEqual(mockExpenseTransaction);
      expect(getTransactionById).toHaveBeenCalledWith("txn1");
    });

    it("should return an expense transaction with postings", async () => {
      vi.mocked(getTransactionById).mockResolvedValue(mockExpenseTransaction);

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("txn1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.type).toBe("expense");
      expect(data.postings).toHaveLength(1);
      expect(data.postings[0].amount_idr).toBe(-50000);
    });

    it("should return an income transaction", async () => {
      vi.mocked(getTransactionById).mockResolvedValue(mockIncomeTransaction);

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("txn2"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.type).toBe("income");
      expect(data.payee).toBe("Company Inc");
      expect(data.postings[0].amount_idr).toBe(5000000);
    });

    it("should return a transfer transaction with two postings", async () => {
      vi.mocked(getTransactionById).mockResolvedValue(mockTransferTransaction);

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("txn3"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.type).toBe("transfer");
      expect(data.postings).toHaveLength(2);
    });

    it("should return a deleted transaction", async () => {
      vi.mocked(getTransactionById).mockResolvedValue(mockDeletedTransaction);

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("txn-deleted"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.deleted_at).not.toBeNull();
    });

    it("should return 404 when transaction not found", async () => {
      vi.mocked(getTransactionById).mockResolvedValue(null);

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("nonexistent"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(404);
      expect(data.error.message).toBe("Transaction not found");
    });

    it("should return 500 on database error", async () => {
      vi.mocked(getTransactionById).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("txn1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to fetch transaction");
    });

    it("should handle PostgreSQL-specific errors", async () => {
      vi.mocked(getTransactionById).mockRejectedValue({
        code: "ECONNREFUSED",
        message: "Connection refused",
      });

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("txn1"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Database error");
    });

    it("should return 422 for validation errors", async () => {
      const validationError = new Error("Invalid transaction ID");
      validationError.name = "ZodError";
      (validationError as any).status = 422;

      vi.mocked(getTransactionById).mockRejectedValue(validationError);

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("invalid"));
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });

    it("should handle transaction with savings bucket postings", async () => {
      const mockSavingsTransaction = {
        id: "txn-savings",
        occurred_at: "2024-01-17T10:00:00.000Z",
        type: "savings_contribution",
        note: "Monthly savings",
        payee: null,
        category_id: null,
        deleted_at: null,
        created_at: "2024-01-17T10:00:00.000Z",
        updated_at: "2024-01-17T10:00:00.000Z",
        idempotency_key: null,
        postings: [
          {
            id: "post-s1",
            event_id: "txn-savings",
            wallet_id: "wallet1",
            savings_bucket_id: null,
            amount_idr: -200000,
            created_at: "2024-01-17T10:00:00.000Z",
          },
          {
            id: "post-s2",
            event_id: "txn-savings",
            wallet_id: null,
            savings_bucket_id: "bucket1",
            amount_idr: 200000,
            created_at: "2024-01-17T10:00:00.000Z",
          },
        ],
      };

      vi.mocked(getTransactionById).mockResolvedValue(mockSavingsTransaction);

      const request = createMockRequest("GET");
      const response = await GET(request, createMockParams("txn-savings"));
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.type).toBe("savings_contribution");
      expect(data.postings).toHaveLength(2);
      expect(data.postings[1].savings_bucket_id).toBe("bucket1");
    });
  });

  describe("DELETE /api/transactions/[id]", () => {
    describe("soft delete (default action)", () => {
      it("should soft delete a transaction by default", async () => {
        vi.mocked(deleteTransaction).mockResolvedValue(undefined);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/transactions/txn1",
        );
        const response = await DELETE(request, createMockParams("txn1"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.message).toBe("Transaction deleted successfully");
        expect(deleteTransaction).toHaveBeenCalledWith("txn1");
      });

      it("should soft delete when action=soft is specified", async () => {
        vi.mocked(deleteTransaction).mockResolvedValue(undefined);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/transactions/txn1?action=soft",
        );
        const response = await DELETE(request, createMockParams("txn1"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.message).toBe("Transaction deleted successfully");
        expect(deleteTransaction).toHaveBeenCalledWith("txn1");
      });

      it("should return 404 when transaction not found for soft delete", async () => {
        vi.mocked(deleteTransaction).mockRejectedValue(
          new Error("Transaction not found"),
        );

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/transactions/nonexistent",
        );
        const response = await DELETE(request, createMockParams("nonexistent"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(404);
        expect(data.error.message).toBe("Transaction not found");
      });

      it("should return 409 when transaction is already deleted", async () => {
        vi.mocked(deleteTransaction).mockRejectedValue(
          new Error("Transaction is already deleted"),
        );

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/transactions/txn-deleted",
        );
        const response = await DELETE(
          request,
          createMockParams("txn-deleted"),
        );
        const { status, data } = await parseResponse(response);

        expect(status).toBe(409);
        expect(data.error.message).toBe("Transaction is already deleted");
      });
    });

    describe("restore action", () => {
      it("should restore a soft-deleted transaction", async () => {
        const restoredTransaction = {
          ...mockDeletedTransaction,
          deleted_at: null,
        };

        vi.mocked(restoreTransaction).mockResolvedValue(restoredTransaction);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/transactions/txn-deleted?action=restore",
        );
        const response = await DELETE(
          request,
          createMockParams("txn-deleted"),
        );
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.message).toBe("Transaction restored successfully");
        expect(data.transaction).toBeDefined();
        expect(restoreTransaction).toHaveBeenCalledWith("txn-deleted");
      });

      it("should return 404 when transaction not found for restore", async () => {
        vi.mocked(restoreTransaction).mockRejectedValue(
          new Error("Transaction not found"),
        );

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/transactions/nonexistent?action=restore",
        );
        const response = await DELETE(request, createMockParams("nonexistent"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(404);
        expect(data.error.message).toBe("Transaction not found");
      });

      it("should return 409 when transaction is not deleted", async () => {
        vi.mocked(restoreTransaction).mockRejectedValue(
          new Error("Transaction is not deleted"),
        );

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/transactions/txn1?action=restore",
        );
        const response = await DELETE(request, createMockParams("txn1"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(409);
        expect(data.error.message).toBe("Transaction is not deleted");
      });
    });

    describe("permanent delete action", () => {
      it("should permanently delete a transaction", async () => {
        vi.mocked(permanentlyDeleteTransaction).mockResolvedValue(undefined);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/transactions/txn1?action=permanent",
        );
        const response = await DELETE(request, createMockParams("txn1"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.message).toBe("Transaction permanently deleted");
        expect(permanentlyDeleteTransaction).toHaveBeenCalledWith("txn1");
      });

      it("should return 404 when transaction not found for permanent delete", async () => {
        vi.mocked(permanentlyDeleteTransaction).mockRejectedValue(
          new Error("Transaction not found"),
        );

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/transactions/nonexistent?action=permanent",
        );
        const response = await DELETE(request, createMockParams("nonexistent"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(404);
        expect(data.error.message).toBe("Transaction not found");
      });

      it("should handle PostgreSQL foreign key violation on permanent delete", async () => {
        const pgError = {
          code: "23503",
          message: "foreign key violation",
          detail: "Key is still referenced from another table",
        };

        vi.mocked(permanentlyDeleteTransaction).mockRejectedValue(pgError);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/transactions/txn1?action=permanent",
        );
        const response = await DELETE(request, createMockParams("txn1"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(409);
        expect(data.error.message).toBe(
          "Cannot delete transaction: it is referenced by other records",
        );
      });
    });

    describe("invalid action", () => {
      it("should return 400 for invalid action parameter", async () => {
        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/transactions/txn1?action=invalid",
        );
        const response = await DELETE(request, createMockParams("txn1"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(400);
        expect(data.error.message).toBe(
          "Invalid action. Use 'soft', 'restore', or 'permanent'",
        );
      });
    });

    describe("error handling", () => {
      it("should return 422 for Zod validation errors", async () => {
        const zodError = new Error("Invalid ID");
        zodError.name = "ZodError";
        (zodError as any).status = 422;

        vi.mocked(deleteTransaction).mockRejectedValue(zodError);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/transactions/invalid-id",
        );
        const response = await DELETE(request, createMockParams("invalid-id"));
        const { status } = await parseResponse(response);

        expect(status).toBe(422);
      });

      it("should return 500 for unexpected errors", async () => {
        vi.mocked(deleteTransaction).mockRejectedValue(
          new Error("Unexpected error"),
        );

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/transactions/txn1",
        );
        const response = await DELETE(request, createMockParams("txn1"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(500);
        expect(data.error.message).toBe("Failed to delete transaction");
      });

      it("should handle PostgreSQL connection errors", async () => {
        const pgError = {
          code: "ECONNREFUSED",
          message: "Connection refused",
        };

        vi.mocked(deleteTransaction).mockRejectedValue(pgError);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/transactions/txn1",
        );
        const response = await DELETE(request, createMockParams("txn1"));
        const { status, data } = await parseResponse(response);

        expect(status).toBe(500);
        expect(data.error.message).toBe("Database error");
      });

      it("should handle Response object errors", async () => {
        const responseError = new Response(
          JSON.stringify({ error: { message: "Custom error" } }),
          { status: 400 },
        );

        vi.mocked(deleteTransaction).mockRejectedValue(responseError);

        const request = createMockRequest(
          "DELETE",
          "http://localhost:3000/api/transactions/txn1",
        );
        const response = await DELETE(request, createMockParams("txn1"));

        expect(response).toBe(responseError);
      });
    });
  });
});
