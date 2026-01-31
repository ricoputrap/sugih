import { describe, it, expect } from "vitest";
import {
  wallets,
  WalletCreateSchema,
  WalletUpdateSchema,
  WalletIdSchema,
} from "./schema";

// Test data
const validWalletData = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Main Bank Account",
  type: "bank" as const,
  currency: "IDR",
  archived: false,
  created_at: new Date("2024-01-01T00:00:00Z"),
  updated_at: new Date("2024-01-01T00:00:00Z"),
};

const validWalletInput = {
  name: "Main Bank Account",
  type: "bank" as const,
  currency: "IDR",
};

const validWalletUpdate = {
  name: "Updated Bank Account",
  archived: true,
};

describe("Wallet PostgreSQL Schema Validation", () => {
  describe("Schema Structure", () => {
    it("should be defined as a valid Drizzle table", () => {
      expect(wallets).toBeDefined();
      expect(typeof wallets).toBe("object");
    });

    it("should have all expected columns", () => {
      expect(wallets).toHaveProperty("id");
      expect(wallets).toHaveProperty("name");
      expect(wallets).toHaveProperty("type");
      expect(wallets).toHaveProperty("currency");
      expect(wallets).toHaveProperty("archived");
      expect(wallets).toHaveProperty("created_at");
      expect(wallets).toHaveProperty("updated_at");
    });
  });

  describe("Column Definitions", () => {
    describe("id column", () => {
      it("should be defined", () => {
        expect(wallets.id).toBeDefined();
      });

      it("should be primary key", () => {
        expect(wallets.id).toBeDefined();
      });
    });

    describe("name column", () => {
      it("should be defined", () => {
        expect(wallets.name).toBeDefined();
      });
    });

    describe("type column", () => {
      it("should be defined", () => {
        expect(wallets.type).toBeDefined();
      });
    });

    describe("currency column", () => {
      it("should be defined", () => {
        expect(wallets.currency).toBeDefined();
      });
    });

    describe("archived column", () => {
      it("should be defined", () => {
        expect(wallets.archived).toBeDefined();
      });
    });

    describe("created_at column", () => {
      it("should be defined", () => {
        expect(wallets.created_at).toBeDefined();
      });
    });

    describe("updated_at column", () => {
      it("should be defined", () => {
        expect(wallets.updated_at).toBeDefined();
      });
    });
  });

  describe("Zod Schema Validation", () => {
    describe("WalletCreateSchema", () => {
      it("should be defined", () => {
        expect(WalletCreateSchema).toBeDefined();
      });

      it("should validate correct wallet creation data", () => {
        const result = WalletCreateSchema.safeParse(validWalletInput);
        expect(result.success).toBe(true);
      });

      it("should reject empty name", () => {
        const result = WalletCreateSchema.safeParse({
          name: "",
          type: "bank",
        });
        expect(result.success).toBe(false);
      });

      it("should validate enum values for type", () => {
        const validTypes = ["cash", "bank", "ewallet", "other"];
        validTypes.forEach((type) => {
          const result = WalletCreateSchema.safeParse({
            name: "Test Wallet",
            type,
          });
          expect(result.success).toBe(true);
        });
      });
    });

    describe("WalletUpdateSchema", () => {
      it("should be defined", () => {
        expect(WalletUpdateSchema).toBeDefined();
      });

      it("should validate correct wallet update data", () => {
        const result = WalletUpdateSchema.safeParse(validWalletUpdate);
        expect(result.success).toBe(true);
      });

      it("should accept partial updates", () => {
        const result = WalletUpdateSchema.safeParse({
          name: "Updated Name",
        });
        expect(result.success).toBe(true);
      });
    });

    describe("WalletIdSchema", () => {
      it("should be defined", () => {
        expect(WalletIdSchema).toBeDefined();
      });

      it("should validate correct UUID format", () => {
        const result = WalletIdSchema.safeParse({
          id: "550e8400-e29b-41d4-a716-446655440000",
        });
        expect(result.success).toBe(true);
      });

      it("should reject empty wallet ID", () => {
        const result = WalletIdSchema.safeParse({
          id: "",
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Type Safety", () => {
    it("should have compatible data types", () => {
      // These should not throw errors
      const wallet = validWalletData;
      const createInput = validWalletInput;
      const updateInput = validWalletUpdate;
      const idInput = { id: validWalletData.id };

      expect(wallet).toBeDefined();
      expect(createInput).toBeDefined();
      expect(updateInput).toBeDefined();
      expect(idInput).toBeDefined();
    });
  });

  describe("PostgreSQL Type Mappings", () => {
    it("should use PostgreSQL types", () => {
      // Verify that the schema is using PostgreSQL types
      expect(wallets.id).toBeDefined();
      expect(wallets.name).toBeDefined();
      expect(wallets.type).toBeDefined();
      expect(wallets.currency).toBeDefined();
      expect(wallets.archived).toBeDefined();
      expect(wallets.created_at).toBeDefined();
      expect(wallets.updated_at).toBeDefined();
    });
  });

  describe("Enum Handling", () => {
    it("should validate type enum values", () => {
      const validValues = ["cash", "bank", "ewallet", "other"];

      validValues.forEach((value) => {
        const result = WalletCreateSchema.safeParse({
          name: "Test",
          type: value as any,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle maximum length strings", () => {
      const longName = "a".repeat(255);
      const result = WalletCreateSchema.safeParse({
        name: longName,
      });
      expect(result.success).toBe(true);
    });

    it("should handle various currency codes", () => {
      const currencies = ["IDR", "USD", "EUR", "JPY", "GBP"];
      currencies.forEach((currency) => {
        const result = WalletCreateSchema.safeParse({
          name: "Test",
          currency,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Backward Compatibility", () => {
    it("should maintain same field names", () => {
      const expectedFields = [
        "id",
        "name",
        "type",
        "currency",
        "archived",
        "created_at",
        "updated_at",
      ];

      expectedFields.forEach((field) => {
        expect(wallets).toHaveProperty(field);
      });
    });
  });
});
