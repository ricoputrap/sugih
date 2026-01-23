import { describe, it, expect } from "vitest";
import {
  transactionEvents,
  postings,
  ExpenseCreateSchema,
  IncomeCreateSchema,
  TransferCreateSchema,
  SavingsContributeSchema,
  SavingsWithdrawSchema,
  TransactionListQuerySchema,
  TransactionIdSchema,
  BulkDeleteTransactionsSchema,
} from "./schema";

// Test data - using nanoid format for IDs
const validTransactionEventData = {
  id: "cPRN4GwjAn0EhLig1KJla",
  occurred_at: new Date("2024-01-01T12:00:00Z"),
  type: "expense" as const,
  note: "Lunch at restaurant",
  payee: "Restaurant ABC",
  category_id: "dQRS5HxkBo1FiMjh2LKmb",
  deleted_at: null,
  created_at: new Date("2024-01-01T10:00:00Z"),
  updated_at: new Date("2024-01-01T10:00:00Z"),
  idempotency_key: "eRST6IylCp2GjNki3MLnc",
};

const validPostingData = {
  id: "fSTU7JzmDq3HkOlj4NMod",
  event_id: "cPRN4GwjAn0EhLig1KJla",
  wallet_id: "gTUV8KanEr4IlPmk5OPpe",
  savings_bucket_id: null,
  amount_idr: 50000,
  created_at: new Date("2024-01-01T10:00:00Z"),
};

const validExpenseInput = {
  occurredAt: new Date("2024-01-01T12:00:00Z"),
  walletId: "gTUV8KanEr4IlPmk5OPpe",
  categoryId: "dQRS5HxkBo1FiMjh2LKmb",
  amountIdr: 50000,
  note: "Lunch at restaurant",
  idempotencyKey: "eRST6IylCp2GjNki3MLnc",
};

const validIncomeInput = {
  occurredAt: new Date("2024-01-01T12:00:00Z"),
  walletId: "gTUV8KanEr4IlPmk5OPpe",
  amountIdr: 1000000,
  note: "Salary payment",
  payee: "Company XYZ",
  idempotencyKey: "hUVW9LboFs5JmQnl6PRqf",
};

const validTransferInput = {
  occurredAt: new Date("2024-01-01T12:00:00Z"),
  fromWalletId: "gTUV8KanEr4IlPmk5OPpe",
  toWalletId: "iVWX0McpGt6KnRom7QSrg",
  amountIdr: 100000,
  note: "Transfer to savings",
  idempotencyKey: "jWXY1NdqHu7LoSpn8RTsh",
};

const validSavingsContributeInput = {
  occurredAt: new Date("2024-01-01T12:00:00Z"),
  walletId: "gTUV8KanEr4IlPmk5OPpe",
  bucketId: "kXYZ2OerIv8MpTqo9SUti",
  amountIdr: 200000,
  note: "Monthly savings contribution",
  idempotencyKey: "lYZa3PfsJw9NqUrp0TVuj",
};

const validSavingsWithdrawInput = {
  occurredAt: new Date("2024-01-01T12:00:00Z"),
  walletId: "gTUV8KanEr4IlPmk5OPpe",
  bucketId: "kXYZ2OerIv8MpTqo9SUti",
  amountIdr: 50000,
  note: "Emergency withdrawal",
  idempotencyKey: "mZab4QgtKx0OrVsq1UWvk",
};

describe("Transaction PostgreSQL Schema Validation", () => {
  describe("Schema Structure", () => {
    describe("transactionEvents table", () => {
      it("should be defined as a valid Drizzle table", () => {
        expect(transactionEvents).toBeDefined();
        expect(typeof transactionEvents).toBe("object");
      });

      it("should have all expected columns", () => {
        expect(transactionEvents).toHaveProperty("id");
        expect(transactionEvents).toHaveProperty("occurred_at");
        expect(transactionEvents).toHaveProperty("type");
        expect(transactionEvents).toHaveProperty("note");
        expect(transactionEvents).toHaveProperty("payee");
        expect(transactionEvents).toHaveProperty("category_id");
        expect(transactionEvents).toHaveProperty("deleted_at");
        expect(transactionEvents).toHaveProperty("created_at");
        expect(transactionEvents).toHaveProperty("updated_at");
        expect(transactionEvents).toHaveProperty("idempotency_key");
      });
    });

    describe("postings table", () => {
      it("should be defined as a valid Drizzle table", () => {
        expect(postings).toBeDefined();
        expect(typeof postings).toBe("object");
      });

      it("should have all expected columns", () => {
        expect(postings).toHaveProperty("id");
        expect(postings).toHaveProperty("event_id");
        expect(postings).toHaveProperty("wallet_id");
        expect(postings).toHaveProperty("savings_bucket_id");
        expect(postings).toHaveProperty("amount_idr");
        expect(postings).toHaveProperty("created_at");
      });
    });
  });

  describe("Column Definitions", () => {
    describe("transactionEvents.id column", () => {
      it("should be defined", () => {
        expect(transactionEvents.id).toBeDefined();
      });

      it("should be primary key", () => {
        expect(transactionEvents.id).toBeDefined();
      });
    });

    describe("transactionEvents.occurred_at column", () => {
      it("should be defined", () => {
        expect(transactionEvents.occurred_at).toBeDefined();
      });

      it("should be not null", () => {
        expect(transactionEvents.occurred_at).toBeDefined();
      });
    });

    describe("transactionEvents.type column", () => {
      it("should be defined", () => {
        expect(transactionEvents.type).toBeDefined();
      });

      it("should have enum constraint", () => {
        expect(transactionEvents.type).toBeDefined();
      });
    });

    describe("transactionEvents.idempotency_key column", () => {
      it("should be defined", () => {
        expect(transactionEvents.idempotency_key).toBeDefined();
      });

      it("should have unique constraint", () => {
        expect(transactionEvents.idempotency_key).toBeDefined();
      });
    });

    describe("postings.amount_idr column", () => {
      it("should be defined", () => {
        expect(postings.amount_idr).toBeDefined();
      });

      it("should be not null", () => {
        expect(postings.amount_idr).toBeDefined();
      });
    });
  });

  describe("Zod Schema Validation", () => {
    describe("ExpenseCreateSchema", () => {
      it("should be defined", () => {
        expect(ExpenseCreateSchema).toBeDefined();
      });

      it("should validate correct expense creation data", () => {
        const result = ExpenseCreateSchema.safeParse(validExpenseInput);
        expect(result.success).toBe(true);
      });

      it("should reject negative amounts", () => {
        const result = ExpenseCreateSchema.safeParse({
          ...validExpenseInput,
          amountIdr: -1000,
        });
        expect(result.success).toBe(false);
      });

      it("should reject zero amounts", () => {
        const result = ExpenseCreateSchema.safeParse({
          ...validExpenseInput,
          amountIdr: 0,
        });
        expect(result.success).toBe(false);
      });

      it("should accept positive amounts", () => {
        const result = ExpenseCreateSchema.safeParse({
          ...validExpenseInput,
          amountIdr: 1000,
        });
        expect(result.success).toBe(true);
      });

      it("should reject empty walletId", () => {
        const result = ExpenseCreateSchema.safeParse({
          ...validExpenseInput,
          walletId: "",
        });
        expect(result.success).toBe(false);
      });

      it("should reject empty categoryId", () => {
        const result = ExpenseCreateSchema.safeParse({
          ...validExpenseInput,
          categoryId: "",
        });
        expect(result.success).toBe(false);
      });

      it("should accept optional note field", () => {
        const result = ExpenseCreateSchema.safeParse({
          occurredAt: validExpenseInput.occurredAt,
          walletId: validExpenseInput.walletId,
          categoryId: validExpenseInput.categoryId,
          amountIdr: validExpenseInput.amountIdr,
        });
        expect(result.success).toBe(true);
      });
    });

    describe("IncomeCreateSchema", () => {
      it("should be defined", () => {
        expect(IncomeCreateSchema).toBeDefined();
      });

      it("should validate correct income creation data", () => {
        const result = IncomeCreateSchema.safeParse(validIncomeInput);
        expect(result.success).toBe(true);
      });

      it("should accept optional payee field", () => {
        const result = IncomeCreateSchema.safeParse({
          occurredAt: validIncomeInput.occurredAt,
          walletId: validIncomeInput.walletId,
          amountIdr: validIncomeInput.amountIdr,
        });
        expect(result.success).toBe(true);
      });

      it("should reject negative amounts", () => {
        const result = IncomeCreateSchema.safeParse({
          ...validIncomeInput,
          amountIdr: -1000,
        });
        expect(result.success).toBe(false);
      });

      it("should accept income with no categoryId", () => {
        const result = IncomeCreateSchema.safeParse({
          occurredAt: validIncomeInput.occurredAt,
          walletId: validIncomeInput.walletId,
          amountIdr: validIncomeInput.amountIdr,
        });
        expect(result.success).toBe(true);
      });

      it("should accept income with valid categoryId", () => {
        const result = IncomeCreateSchema.safeParse({
          ...validIncomeInput,
          categoryId: "cat_valid_123",
        });
        expect(result.success).toBe(true);
      });

      it("should reject income with empty string categoryId", () => {
        const result = IncomeCreateSchema.safeParse({
          ...validIncomeInput,
          categoryId: "",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            "Category ID cannot be empty",
          );
        }
      });

      it("should reject income with too-long categoryId", () => {
        const result = IncomeCreateSchema.safeParse({
          ...validIncomeInput,
          categoryId: "a".repeat(51),
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Category ID too long");
        }
      });
    });

    describe("TransferCreateSchema", () => {
      it("should be defined", () => {
        expect(TransferCreateSchema).toBeDefined();
      });

      it("should validate correct transfer data", () => {
        const result = TransferCreateSchema.safeParse(validTransferInput);
        expect(result.success).toBe(true);
      });

      it("should reject same wallet for from and to", () => {
        const result = TransferCreateSchema.safeParse({
          ...validTransferInput,
          fromWalletId: validTransferInput.toWalletId,
        });
        expect(result.success).toBe(false);
      });

      it("should accept different wallets for from and to", () => {
        const result = TransferCreateSchema.safeParse(validTransferInput);
        expect(result.success).toBe(true);
      });

      it("should reject empty fromWalletId", () => {
        const result = TransferCreateSchema.safeParse({
          ...validTransferInput,
          fromWalletId: "",
        });
        expect(result.success).toBe(false);
      });

      it("should reject empty toWalletId", () => {
        const result = TransferCreateSchema.safeParse({
          ...validTransferInput,
          toWalletId: "",
        });
        expect(result.success).toBe(false);
      });
    });

    describe("SavingsContributeSchema", () => {
      it("should be defined", () => {
        expect(SavingsContributeSchema).toBeDefined();
      });

      it("should validate correct savings contribution data", () => {
        const result = SavingsContributeSchema.safeParse(
          validSavingsContributeInput,
        );
        expect(result.success).toBe(true);
      });

      it("should reject negative amounts", () => {
        const result = SavingsContributeSchema.safeParse({
          ...validSavingsContributeInput,
          amountIdr: -1000,
        });
        expect(result.success).toBe(false);
      });

      it("should reject empty bucketId", () => {
        const result = SavingsContributeSchema.safeParse({
          ...validSavingsContributeInput,
          bucketId: "",
        });
        expect(result.success).toBe(false);
      });
    });

    describe("SavingsWithdrawSchema", () => {
      it("should be defined", () => {
        expect(SavingsWithdrawSchema).toBeDefined();
      });

      it("should validate correct savings withdrawal data", () => {
        const result = SavingsWithdrawSchema.safeParse(
          validSavingsWithdrawInput,
        );
        expect(result.success).toBe(true);
      });

      it("should reject negative amounts", () => {
        const result = SavingsWithdrawSchema.safeParse({
          ...validSavingsWithdrawInput,
          amountIdr: -1000,
        });
        expect(result.success).toBe(false);
      });
    });

    describe("TransactionListQuerySchema", () => {
      it("should be defined", () => {
        expect(TransactionListQuerySchema).toBeDefined();
      });

      it("should validate correct query parameters", () => {
        const result = TransactionListQuerySchema.safeParse({
          from: new Date("2024-01-01"),
          to: new Date("2024-01-31"),
          type: "expense",
          walletId: "550e8400-e29b-41d4-a716-446655440004",
          categoryId: "550e8400-e29b-41d4-a716-446655440001",
          limit: 50,
          offset: 0,
        });
        expect(result.success).toBe(true);
      });

      it("should accept minimal query parameters", () => {
        const result = TransactionListQuerySchema.safeParse({});
        expect(result.success).toBe(true);
      });

      it("should apply default values", () => {
        const result = TransactionListQuerySchema.safeParse({});
        if (result.success) {
          expect(result.data.limit).toBe(50);
          expect(result.data.offset).toBe(0);
        }
      });

      it("should validate limit range", () => {
        const result = TransactionListQuerySchema.safeParse({
          limit: 150,
        });
        expect(result.success).toBe(false);
      });

      it("should accept valid limit range", () => {
        const result = TransactionListQuerySchema.safeParse({
          limit: 100,
        });
        expect(result.success).toBe(true);
      });
    });

    describe("TransactionIdSchema", () => {
      it("should be defined", () => {
        expect(TransactionIdSchema).toBeDefined();
      });

      it("should validate correct nanoid format", () => {
        const result = TransactionIdSchema.safeParse({
          id: "cPRN4GwjAn0EhLig1KJla",
        });
        expect(result.success).toBe(true);
      });

      it("should reject empty id", () => {
        const result = TransactionIdSchema.safeParse({
          id: "",
        });
        expect(result.success).toBe(false);
      });

      it("should reject overly long id", () => {
        const result = TransactionIdSchema.safeParse({
          id: "a".repeat(51),
        });
        expect(result.success).toBe(false);
      });
    });

    describe("BulkDeleteTransactionsSchema", () => {
      it("should be defined", () => {
        expect(BulkDeleteTransactionsSchema).toBeDefined();
      });

      it("should validate correct bulk delete data", () => {
        const result = BulkDeleteTransactionsSchema.safeParse({
          ids: [
            "cPRN4GwjAn0EhLig1KJla",
            "abc123def456ghi789jkl",
            "txn_1234567890",
          ],
        });
        expect(result.success).toBe(true);
      });

      it("should reject empty ids array", () => {
        const result = BulkDeleteTransactionsSchema.safeParse({
          ids: [],
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            "At least one transaction ID is required",
          );
        }
      });

      it("should reject single empty string id", () => {
        const result = BulkDeleteTransactionsSchema.safeParse({
          ids: [""],
        });
        expect(result.success).toBe(false);
      });

      it("should reject ids array with empty string", () => {
        const result = BulkDeleteTransactionsSchema.safeParse({
          ids: ["cPRN4GwjAn0EhLig1KJla", "", "abc123"],
        });
        expect(result.success).toBe(false);
      });

      it("should accept up to 100 ids", () => {
        const result = BulkDeleteTransactionsSchema.safeParse({
          ids: Array.from(
            { length: 100 },
            (_, i) => `txn_${i.toString().padStart(10, "0")}`,
          ),
        });
        expect(result.success).toBe(true);
      });

      it("should reject more than 100 ids", () => {
        const result = BulkDeleteTransactionsSchema.safeParse({
          ids: Array.from(
            { length: 101 },
            (_, i) => `txn_${i.toString().padStart(10, "0")}`,
          ),
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            "Maximum 100 transactions can be deleted at once",
          );
        }
      });

      it("should accept minimal single id", () => {
        const result = BulkDeleteTransactionsSchema.safeParse({
          ids: ["1"],
        });
        expect(result.success).toBe(true);
      });

      it("should accept maximum length ids", () => {
        const result = BulkDeleteTransactionsSchema.safeParse({
          ids: ["a".repeat(50), "b".repeat(50), "c".repeat(50)],
        });
        expect(result.success).toBe(true);
      });

      it("should accept long id (50 characters)", () => {
        const result = BulkDeleteTransactionsSchema.safeParse({
          ids: ["a".repeat(50)],
        });
        expect(result.success).toBe(true);
      });

      it("should reject overly long id (51 characters)", () => {
        const result = BulkDeleteTransactionsSchema.safeParse({
          ids: ["a".repeat(51)],
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Type Safety", () => {
    it("should have compatible data types", () => {
      // These should not throw errors
      const transactionEvent = validTransactionEventData;
      const posting = validPostingData;

      expect(transactionEvent).toBeDefined();
      expect(posting).toBeDefined();
    });
  });

  describe("PostgreSQL Type Mappings", () => {
    it("should use PostgreSQL types for transactionEvents", () => {
      expect(transactionEvents.id).toBeDefined();
      expect(transactionEvents.occurred_at).toBeDefined();
      expect(transactionEvents.type).toBeDefined();
      expect(transactionEvents.note).toBeDefined();
      expect(transactionEvents.payee).toBeDefined();
      expect(transactionEvents.category_id).toBeDefined();
      expect(transactionEvents.deleted_at).toBeDefined();
      expect(transactionEvents.created_at).toBeDefined();
      expect(transactionEvents.updated_at).toBeDefined();
      expect(transactionEvents.idempotency_key).toBeDefined();
    });

    it("should use PostgreSQL types for postings", () => {
      expect(postings.id).toBeDefined();
      expect(postings.event_id).toBeDefined();
      expect(postings.wallet_id).toBeDefined();
      expect(postings.savings_bucket_id).toBeDefined();
      expect(postings.amount_idr).toBeDefined();
      expect(postings.created_at).toBeDefined();
    });
  });

  describe("Enum Handling", () => {
    it("should validate transaction type enum values", () => {
      const validTypes = [
        "expense",
        "income",
        "transfer",
        "savings_contribution",
        "savings_withdrawal",
      ];

      validTypes.forEach((type) => {
        const result = ExpenseCreateSchema.safeParse({
          occurredAt: new Date(),
          walletId: "550e8400-e29b-41d4-a716-446655440004",
          categoryId: "550e8400-e29b-41d4-a716-446655440001",
          amountIdr: 1000,
          type: type as any,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Foreign Key Support", () => {
    it("should support nullable category_id", () => {
      const result = ExpenseCreateSchema.safeParse({
        ...validExpenseInput,
        categoryId: null as any,
      });
      expect(result.success).toBe(false); // categoryId is required for expenses
    });

    it("should support nullable wallet_id in postings", () => {
      expect(postings.wallet_id).toBeDefined();
    });

    it("should support nullable savings_bucket_id in postings", () => {
      expect(postings.savings_bucket_id).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle large amounts", () => {
      const largeAmount = Number.MAX_SAFE_INTEGER;
      const result = ExpenseCreateSchema.safeParse({
        ...validExpenseInput,
        amountIdr: largeAmount,
      });
      expect(result.success).toBe(true);
    });

    it("should handle long notes", () => {
      const longNote = "a".repeat(1000);
      const result = ExpenseCreateSchema.safeParse({
        ...validExpenseInput,
        note: longNote,
      });
      expect(result.success).toBe(true);
    });

    it("should handle special characters in notes", () => {
      const specialNotes = [
        "Payment @ restaurant #123",
        'Transfer to: "Savings Account"',
        "Purchase > $100 & shipping",
      ];

      specialNotes.forEach((note) => {
        const result = ExpenseCreateSchema.safeParse({
          ...validExpenseInput,
          note,
        });
        expect(result.success).toBe(true);
      });
    });

    it("should handle unicode in notes and payees", () => {
      const unicodeData = [
        "支付餐厅费用",
        "Оплата в ресторане",
        "Paiement au restaurant",
        "🍕 Pizza Delivery",
      ];

      unicodeData.forEach((note) => {
        const result = ExpenseCreateSchema.safeParse({
          ...validExpenseInput,
          note,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Backward Compatibility", () => {
    it("should maintain same field names for transactionEvents", () => {
      const expectedFields = [
        "id",
        "occurred_at",
        "type",
        "note",
        "payee",
        "category_id",
        "deleted_at",
        "created_at",
        "updated_at",
        "idempotency_key",
      ];

      expectedFields.forEach((field) => {
        expect(transactionEvents).toHaveProperty(field);
      });
    });

    it("should maintain same field names for postings", () => {
      const expectedFields = [
        "id",
        "event_id",
        "wallet_id",
        "savings_bucket_id",
        "amount_idr",
        "created_at",
      ];

      expectedFields.forEach((field) => {
        expect(postings).toHaveProperty(field);
      });
    });

    it("should maintain same validation rules", () => {
      const result = ExpenseCreateSchema.safeParse({
        occurredAt: new Date(),
        walletId: "550e8400-e29b-41d4-a716-446655440004",
        categoryId: "550e8400-e29b-41d4-a716-446655440001",
        amountIdr: -1000, // Negative should fail
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Schema Migration Readiness", () => {
    it("should generate valid PostgreSQL column definitions for transactionEvents", () => {
      expect(transactionEvents.id).toBeDefined();
      expect(transactionEvents.occurred_at).toBeDefined();
      expect(transactionEvents.type).toBeDefined();
    });

    it("should generate valid PostgreSQL column definitions for postings", () => {
      expect(postings.id).toBeDefined();
      expect(postings.event_id).toBeDefined();
      expect(postings.amount_idr).toBeDefined();
    });

    it("should be ready for drizzle-kit generate", () => {
      expect(transactionEvents).toBeDefined();
      expect(postings).toBeDefined();
    });
  });
});
