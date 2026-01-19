import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the transaction actions
vi.mock("@/modules/Transaction/actions", () => ({
  listTransactions: vi.fn(),
  createExpense: vi.fn(),
  createIncome: vi.fn(),
  createTransfer: vi.fn(),
  createSavingsContribution: vi.fn(),
  createSavingsWithdrawal: vi.fn(),
  bulkDeleteTransactions: vi.fn(),
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
  listTransactions,
  createExpense,
  createIncome,
  createTransfer,
  createSavingsContribution,
  createSavingsWithdrawal,
  bulkDeleteTransactions,
} from "@/modules/Transaction/actions";

// Import mocked functions for testing
import { formatPostgresError } from "@/db/drizzle-client";

// Helper to create mock NextRequest
function createMockRequest(
  method: string,
  url: string = "http://localhost:3000/api/transactions",
  body?: unknown,
): NextRequest {
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body !== undefined) {
    // If body is already a string, use it directly (for invalid JSON tests)
    if (typeof body === "string") {
      init.body = body;
    } else {
      init.body = JSON.stringify(body);
    }
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

describe("Transactions API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/transactions", () => {
    it("should return a list of transactions", async () => {
      const mockTransactions = [
        mockExpenseTransaction,
        mockIncomeTransaction,
        mockTransferTransaction,
      ];

      vi.mocked(listTransactions).mockResolvedValue(mockTransactions);

      const request = createMockRequest("GET");
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toEqual(mockTransactions);
      expect(listTransactions).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when no transactions exist", async () => {
      vi.mocked(listTransactions).mockResolvedValue([]);

      const request = createMockRequest("GET");
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toEqual([]);
    });

    it("should pass query parameters to listTransactions", async () => {
      vi.mocked(listTransactions).mockResolvedValue([]);

      const request = createMockRequest(
        "GET",
        "http://localhost:3000/api/transactions?type=expense&walletId=wallet1&limit=10&offset=5",
      );
      const response = await GET(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(listTransactions).toHaveBeenCalledWith({
        from: undefined,
        to: undefined,
        type: "expense",
        walletId: "wallet1",
        categoryId: undefined,
        limit: "10",
        offset: "5",
      });
    });

    it("should handle date range filters", async () => {
      vi.mocked(listTransactions).mockResolvedValue([]);

      const request = createMockRequest(
        "GET",
        "http://localhost:3000/api/transactions?from=2024-01-01&to=2024-01-31",
      );
      const response = await GET(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(listTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "2024-01-01",
          to: "2024-01-31",
        }),
      );
    });

    it("should return 500 on database error", async () => {
      vi.mocked(listTransactions).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = createMockRequest("GET");
      const response = await GET(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to fetch transactions");
    });

    it("should handle PostgreSQL-specific errors", async () => {
      vi.mocked(listTransactions).mockRejectedValue({
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

      vi.mocked(listTransactions).mockRejectedValue(validationError);

      const request = createMockRequest("GET");
      const response = await GET(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });

    it("should filter by category ID", async () => {
      vi.mocked(listTransactions).mockResolvedValue([mockExpenseTransaction]);

      const request = createMockRequest(
        "GET",
        "http://localhost:3000/api/transactions?categoryId=cat1",
      );
      const response = await GET(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(listTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: "cat1",
        }),
      );
    });
  });

  describe("POST /api/transactions", () => {
    describe("expense transactions", () => {
      it("should create an expense transaction", async () => {
        vi.mocked(createExpense).mockResolvedValue(mockExpenseTransaction);

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            type: "expense",
            occurredAt: "2024-01-15T10:00:00.000Z",
            walletId: "wallet1",
            categoryId: "cat1",
            amountIdr: 50000,
            note: "Groceries",
          },
        );

        const response = await POST(request);
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.type).toBe("expense");
        expect(createExpense).toHaveBeenCalledWith({
          occurredAt: "2024-01-15T10:00:00.000Z",
          walletId: "wallet1",
          categoryId: "cat1",
          amountIdr: 50000,
          note: "Groceries",
        });
      });

      it("should handle expense with idempotency key", async () => {
        vi.mocked(createExpense).mockResolvedValue(mockExpenseTransaction);

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            type: "expense",
            occurredAt: "2024-01-15T10:00:00.000Z",
            walletId: "wallet1",
            categoryId: "cat1",
            amountIdr: 50000,
            idempotencyKey: "unique-key-123",
          },
        );

        const response = await POST(request);
        const { status } = await parseResponse(response);

        expect(status).toBe(200);
        expect(createExpense).toHaveBeenCalledWith(
          expect.objectContaining({
            idempotencyKey: "unique-key-123",
          }),
        );
      });
    });

    describe("income transactions", () => {
      it("should create an income transaction", async () => {
        vi.mocked(createIncome).mockResolvedValue(mockIncomeTransaction);

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            type: "income",
            occurredAt: "2024-01-15T12:00:00.000Z",
            walletId: "wallet1",
            amountIdr: 5000000,
            note: "Salary",
            payee: "Company Inc",
          },
        );

        const response = await POST(request);
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.type).toBe("income");
        expect(createIncome).toHaveBeenCalledWith({
          occurredAt: "2024-01-15T12:00:00.000Z",
          walletId: "wallet1",
          amountIdr: 5000000,
          note: "Salary",
          payee: "Company Inc",
        });
      });

      it("should create income without optional fields", async () => {
        vi.mocked(createIncome).mockResolvedValue(mockIncomeTransaction);

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            type: "income",
            occurredAt: "2024-01-15T12:00:00.000Z",
            walletId: "wallet1",
            amountIdr: 5000000,
          },
        );

        const response = await POST(request);
        const { status } = await parseResponse(response);

        expect(status).toBe(200);
        expect(createIncome).toHaveBeenCalled();
      });
    });

    describe("transfer transactions", () => {
      it("should create a transfer transaction", async () => {
        vi.mocked(createTransfer).mockResolvedValue(mockTransferTransaction);

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            type: "transfer",
            occurredAt: "2024-01-16T09:00:00.000Z",
            fromWalletId: "wallet1",
            toWalletId: "wallet2",
            amountIdr: 100000,
            note: "Move to savings",
          },
        );

        const response = await POST(request);
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.type).toBe("transfer");
        expect(data.postings).toHaveLength(2);
        expect(createTransfer).toHaveBeenCalledWith({
          occurredAt: "2024-01-16T09:00:00.000Z",
          fromWalletId: "wallet1",
          toWalletId: "wallet2",
          amountIdr: 100000,
          note: "Move to savings",
        });
      });
    });

    describe("savings contribution transactions", () => {
      it("should create a savings contribution transaction", async () => {
        const mockSavingsContribution = {
          id: "txn4",
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
              id: "post4a",
              event_id: "txn4",
              wallet_id: "wallet1",
              savings_bucket_id: null,
              amount_idr: -200000,
              created_at: "2024-01-17T10:00:00.000Z",
            },
            {
              id: "post4b",
              event_id: "txn4",
              wallet_id: null,
              savings_bucket_id: "bucket1",
              amount_idr: 200000,
              created_at: "2024-01-17T10:00:00.000Z",
            },
          ],
        };

        vi.mocked(createSavingsContribution).mockResolvedValue(
          mockSavingsContribution,
        );

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            type: "savings_contribution",
            occurredAt: "2024-01-17T10:00:00.000Z",
            walletId: "wallet1",
            bucketId: "bucket1",
            amountIdr: 200000,
            note: "Monthly savings",
          },
        );

        const response = await POST(request);
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.type).toBe("savings_contribution");
        expect(createSavingsContribution).toHaveBeenCalledWith({
          occurredAt: "2024-01-17T10:00:00.000Z",
          walletId: "wallet1",
          bucketId: "bucket1",
          amountIdr: 200000,
          note: "Monthly savings",
        });
      });
    });

    describe("savings withdrawal transactions", () => {
      it("should create a savings withdrawal transaction", async () => {
        const mockSavingsWithdrawal = {
          id: "txn5",
          occurred_at: "2024-01-18T10:00:00.000Z",
          type: "savings_withdrawal",
          note: "Emergency withdrawal",
          payee: null,
          category_id: null,
          deleted_at: null,
          created_at: "2024-01-18T10:00:00.000Z",
          updated_at: "2024-01-18T10:00:00.000Z",
          idempotency_key: null,
          postings: [
            {
              id: "post5a",
              event_id: "txn5",
              wallet_id: null,
              savings_bucket_id: "bucket1",
              amount_idr: -150000,
              created_at: "2024-01-18T10:00:00.000Z",
            },
            {
              id: "post5b",
              event_id: "txn5",
              wallet_id: "wallet1",
              savings_bucket_id: null,
              amount_idr: 150000,
              created_at: "2024-01-18T10:00:00.000Z",
            },
          ],
        };

        vi.mocked(createSavingsWithdrawal).mockResolvedValue(
          mockSavingsWithdrawal,
        );

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            type: "savings_withdrawal",
            occurredAt: "2024-01-18T10:00:00.000Z",
            walletId: "wallet1",
            bucketId: "bucket1",
            amountIdr: 150000,
            note: "Emergency withdrawal",
          },
        );

        const response = await POST(request);
        const { status, data } = await parseResponse(response);

        expect(status).toBe(200);
        expect(data.type).toBe("savings_withdrawal");
        expect(createSavingsWithdrawal).toHaveBeenCalledWith({
          occurredAt: "2024-01-18T10:00:00.000Z",
          walletId: "wallet1",
          bucketId: "bucket1",
          amountIdr: 150000,
          note: "Emergency withdrawal",
        });
      });
    });

    describe("error handling", () => {
      it("should return 400 for invalid JSON body", async () => {
        const request = new NextRequest(
          "http://localhost:3000/api/transactions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: "invalid json",
          },
        );

        const response = await POST(request);
        const { status, data } = await parseResponse(response);

        expect(status).toBe(400);
        expect(data.error.message).toBe("Invalid JSON body");
      });

      it("should return 400 for missing transaction type", async () => {
        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            occurredAt: "2024-01-15T10:00:00.000Z",
            walletId: "wallet1",
            amountIdr: 50000,
          },
        );

        const response = await POST(request);
        const { status, data } = await parseResponse(response);

        expect(status).toBe(400);
        expect(data.error.message).toBe("Transaction type is required");
      });

      it("should return 400 for invalid transaction type", async () => {
        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            type: "invalid_type",
            occurredAt: "2024-01-15T10:00:00.000Z",
            walletId: "wallet1",
            amountIdr: 50000,
          },
        );

        const response = await POST(request);
        const { status, data } = await parseResponse(response);

        expect(status).toBe(400);
        expect(data.error.message).toContain("Invalid transaction type");
      });

      it("should return 404 when wallet not found", async () => {
        vi.mocked(createExpense).mockRejectedValue(
          new Error("Wallet not found or archived"),
        );

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            type: "expense",
            occurredAt: "2024-01-15T10:00:00.000Z",
            walletId: "nonexistent",
            categoryId: "cat1",
            amountIdr: 50000,
          },
        );

        const response = await POST(request);
        const { status, data } = await parseResponse(response);

        expect(status).toBe(404);
        expect(data.error.message).toBe("Wallet not found or archived");
      });

      it("should return 404 when category not found", async () => {
        vi.mocked(createExpense).mockRejectedValue(
          new Error("Category not found or archived"),
        );

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            type: "expense",
            occurredAt: "2024-01-15T10:00:00.000Z",
            walletId: "wallet1",
            categoryId: "nonexistent",
            amountIdr: 50000,
          },
        );

        const response = await POST(request);
        const { status, data } = await parseResponse(response);

        expect(status).toBe(404);
        expect(data.error.message).toBe("Category not found or archived");
      });

      it("should return 400 when resource is archived", async () => {
        vi.mocked(createExpense).mockRejectedValue(
          new Error("Wallet is archived"),
        );

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            type: "expense",
            occurredAt: "2024-01-15T10:00:00.000Z",
            walletId: "wallet1",
            categoryId: "cat1",
            amountIdr: 50000,
          },
        );

        const response = await POST(request);
        const { status, data } = await parseResponse(response);

        expect(status).toBe(400);
        expect(data.error.message).toBe("Wallet is archived");
      });

      it("should return 422 for validation errors", async () => {
        const validationError = new Error("Invalid expense data");
        validationError.name = "ZodError";
        (validationError as any).status = 422;

        vi.mocked(createExpense).mockRejectedValue(validationError);

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            type: "expense",
            occurredAt: "2024-01-15T10:00:00.000Z",
            walletId: "",
            categoryId: "cat1",
            amountIdr: 50000,
          },
        );

        const response = await POST(request);
        const { status } = await parseResponse(response);

        expect(status).toBe(422);
      });

      it("should return 409 for duplicate idempotency key", async () => {
        const pgError = {
          code: "23505",
          message: "duplicate key value violates unique constraint",
          detail: "Key (idempotency_key)=(key123) already exists.",
        };

        vi.mocked(createExpense).mockRejectedValue(pgError);

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            type: "expense",
            occurredAt: "2024-01-15T10:00:00.000Z",
            walletId: "wallet1",
            categoryId: "cat1",
            amountIdr: 50000,
            idempotencyKey: "key123",
          },
        );

        const response = await POST(request);
        const { status, data } = await parseResponse(response);

        expect(status).toBe(409);
        expect(data.error.message).toBe(
          "Transaction with this idempotency key already exists",
        );
      });

      it("should handle PostgreSQL foreign key violation", async () => {
        const pgError = {
          code: "23503",
          message: "foreign key violation",
          detail: "Key (wallet_id)=(invalid) is not present in table wallets",
        };

        vi.mocked(createExpense).mockRejectedValue(pgError);

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            type: "expense",
            occurredAt: "2024-01-15T10:00:00.000Z",
            walletId: "invalid",
            categoryId: "cat1",
            amountIdr: 50000,
          },
        );

        const response = await POST(request);
        const { status, data } = await parseResponse(response);

        expect(status).toBe(400);
        expect(data.error.message).toContain("Invalid reference:");
      });

      it("should handle PostgreSQL not-null violation", async () => {
        const pgError = {
          code: "23502",
          message: "null value in column violates not-null constraint",
          column: "wallet_id",
        };

        vi.mocked(createExpense).mockRejectedValue(pgError);

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            type: "expense",
            occurredAt: "2024-01-15T10:00:00.000Z",
            categoryId: "cat1",
            amountIdr: 50000,
          },
        );

        const response = await POST(request);
        const { status, data } = await parseResponse(response);

        expect(status).toBe(400);
        expect(data.error.message).toBe("Missing required field: wallet_id");
      });

      it("should handle PostgreSQL check constraint violation", async () => {
        const pgError = {
          code: "23514",
          message: "check constraint violation",
          detail: "Amount must be positive",
        };

        vi.mocked(createExpense).mockRejectedValue(pgError);

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            type: "expense",
            occurredAt: "2024-01-15T10:00:00.000Z",
            walletId: "wallet1",
            categoryId: "cat1",
            amountIdr: -50000,
          },
        );

        const response = await POST(request);
        const { status, data } = await parseResponse(response);

        expect(status).toBe(400);
        expect(data.error.message).toBe(
          "Invalid data: Amount must be positive",
        );
      });

      it("should return 500 for unexpected errors", async () => {
        vi.mocked(createExpense).mockRejectedValue(
          new Error("Unexpected error"),
        );

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            type: "expense",
            occurredAt: "2024-01-15T10:00:00.000Z",
            walletId: "wallet1",
            categoryId: "cat1",
            amountIdr: 50000,
          },
        );

        const response = await POST(request);
        const { status, data } = await parseResponse(response);

        expect(status).toBe(500);
        expect(data.error.message).toBe("Failed to create transaction");
      });

      it("should handle other PostgreSQL errors gracefully", async () => {
        const pgError = {
          code: "42P01",
          message: "relation does not exist",
        };

        vi.mocked(createExpense).mockRejectedValue(pgError);

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            type: "expense",
            occurredAt: "2024-01-15T10:00:00.000Z",
            walletId: "wallet1",
            categoryId: "cat1",
            amountIdr: 50000,
          },
        );

        const response = await POST(request);
        const { status, data } = await parseResponse(response);

        expect(status).toBe(500);
        expect(data.error.message).toBe("Database error");
      });
    });

    describe("edge cases", () => {
      it("should handle large amounts", async () => {
        const mockTransaction = {
          ...mockIncomeTransaction,
          postings: [
            {
              ...mockIncomeTransaction.postings[0],
              amount_idr: 999999999999,
            },
          ],
        };

        vi.mocked(createIncome).mockResolvedValue(mockTransaction);

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            type: "income",
            occurredAt: "2024-01-15T12:00:00.000Z",
            walletId: "wallet1",
            amountIdr: 999999999999,
          },
        );

        const response = await POST(request);
        const { status } = await parseResponse(response);

        expect(status).toBe(200);
      });

      it("should handle special characters in note", async () => {
        vi.mocked(createExpense).mockResolvedValue(mockExpenseTransaction);

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            type: "expense",
            occurredAt: "2024-01-15T10:00:00.000Z",
            walletId: "wallet1",
            categoryId: "cat1",
            amountIdr: 50000,
            note: "Purchase @ store 🛒 with 'special' \"characters\"",
          },
        );

        const response = await POST(request);
        const { status } = await parseResponse(response);

        expect(status).toBe(200);
      });

      it("should handle unicode payee names", async () => {
        vi.mocked(createIncome).mockResolvedValue(mockIncomeTransaction);

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/transactions",
          {
            type: "income",
            occurredAt: "2024-01-15T12:00:00.000Z",
            walletId: "wallet1",
            amountIdr: 5000000,
            payee: "株式会社テスト",
          },
        );

        const response = await POST(request);
        const { status } = await parseResponse(response);

        expect(status).toBe(200);
      });
    });
  });

  describe("DELETE /api/transactions", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should bulk delete transactions successfully", async () => {
      const mockResult = {
        deletedCount: 3,
        failedIds: [],
      };

      vi.mocked(bulkDeleteTransactions).mockResolvedValue(mockResult);

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/transactions",
        {
          ids: ["txn1", "txn2", "txn3"],
        },
      );

      const response = await DELETE(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.message).toBe("Transactions deleted successfully");
      expect(data.deletedCount).toBe(3);
      expect(vi.mocked(bulkDeleteTransactions)).toHaveBeenCalledWith([
        "txn1",
        "txn2",
        "txn3",
      ]);
    });

    it("should return partial failure with failedIds", async () => {
      const mockResult = {
        deletedCount: 2,
        failedIds: ["txn3"],
      };

      vi.mocked(bulkDeleteTransactions).mockResolvedValue(mockResult);

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/transactions",
        {
          ids: ["txn1", "txn2", "txn3"],
        },
      );

      const response = await DELETE(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Some transactions could not be deleted");
      expect(data.error.issues.code).toBe("VALIDATION_ERROR");
      expect(data.error.issues.details.deletedCount).toBe(2);
      expect(data.error.issues.details.failedIds).toEqual(["txn3"]);
    });

    it("should reject request with missing ids field", async () => {
      vi.mocked(bulkDeleteTransactions).mockResolvedValue({
        deletedCount: 0,
        failedIds: [],
      });

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/transactions",
        {
          // ids field is missing
        },
      );

      const response = await DELETE(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Missing required field: ids");
    });

    it("should reject request with non-array ids", async () => {
      vi.mocked(bulkDeleteTransactions).mockResolvedValue({
        deletedCount: 0,
        failedIds: [],
      });

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/transactions",
        {
          ids: "not-an-array",
        },
      );

      const response = await DELETE(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Field 'ids' must be an array");
    });

    it("should reject request with invalid JSON", async () => {
      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/transactions",
        "invalid-json",
      );

      const response = await DELETE(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.message).toBe("Invalid JSON body");
    });

    it("should handle validation errors from bulkDeleteTransactions", async () => {
      const validationError = new Error(
        "At least one transaction ID is required",
      );
      validationError.status = 422;
      vi.mocked(bulkDeleteTransactions).mockRejectedValue(validationError);

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/transactions",
        {
          ids: [],
        },
      );

      const response = await DELETE(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });

    it("should handle not found errors from bulkDeleteTransactions", async () => {
      vi.mocked(bulkDeleteTransactions).mockRejectedValue(
        new Error("Transaction not found"),
      );

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/transactions",
        {
          ids: ["nonexistent"],
        },
      );

      const response = await DELETE(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(404);
    });

    it("should handle PostgreSQL errors from bulkDeleteTransactions", async () => {
      const pgError = new Error("Connection failed");
      pgError.code = "ECONNREFUSED";
      vi.mocked(bulkDeleteTransactions).mockRejectedValue(pgError);

      vi.mocked(formatPostgresError).mockReturnValue("Connection failed");

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/transactions",
        {
          ids: ["txn1", "txn2"],
        },
      );

      const response = await DELETE(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Database error");
      expect(vi.mocked(formatPostgresError)).toHaveBeenCalledWith(pgError);
    });

    it("should handle unexpected errors from bulkDeleteTransactions", async () => {
      vi.mocked(bulkDeleteTransactions).mockRejectedValue(
        new Error("Unexpected error"),
      );

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/transactions",
        {
          ids: ["txn1"],
        },
      );

      const response = await DELETE(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.message).toBe("Failed to delete transactions");
    });

    it("should handle single transaction delete", async () => {
      const mockResult = {
        deletedCount: 1,
        failedIds: [],
      };

      vi.mocked(bulkDeleteTransactions).mockResolvedValue(mockResult);

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/transactions",
        {
          ids: ["single-txn-id"],
        },
      );

      const response = await DELETE(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.message).toBe("Transactions deleted successfully");
      expect(data.deletedCount).toBe(1);
    });

    it("should handle maximum 100 transactions", async () => {
      const ids = Array.from({ length: 100 }, (_, i) => `txn_${i}`);
      const mockResult = {
        deletedCount: 100,
        failedIds: [],
      };

      vi.mocked(bulkDeleteTransactions).mockResolvedValue(mockResult);

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/transactions",
        {
          ids,
        },
      );

      const response = await DELETE(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.deletedCount).toBe(100);
      expect(vi.mocked(bulkDeleteTransactions)).toHaveBeenCalledWith(ids);
    });

    it("should handle all transactions failed to delete", async () => {
      const mockResult = {
        deletedCount: 0,
        failedIds: ["txn1", "txn2", "txn3"],
      };

      vi.mocked(bulkDeleteTransactions).mockResolvedValue(mockResult);

      const request = createMockRequest(
        "DELETE",
        "http://localhost:3000/api/transactions",
        {
          ids: ["txn1", "txn2", "txn3"],
        },
      );

      const response = await DELETE(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.issues.details.deletedCount).toBe(0);
      expect(data.error.issues.details.failedIds).toHaveLength(3);
    });
  });
});
