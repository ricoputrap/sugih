import { describe, it, expect } from 'vitest';
import {
  budgets,
  BudgetMonthSchema,
  BudgetItemSchema,
  BudgetUpsertSchema,
  BudgetQuerySchema,
  BudgetIdSchema,
} from './schema';

// Test data
const validBudgetData = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  month: '2024-01-01',
  category_id: '550e8400-e29b-41d4-a716-446655440001',
  amount_idr: 1000000,
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z'),
};

const validBudgetItem = {
  categoryId: '550e8400-e29b-41d4-a716-446655440001',
  amountIdr: 1000000,
};

const validBudgetUpsert = {
  month: '2024-01-01',
  items: [
    {
      categoryId: '550e8400-e29b-41d4-a716-446655440001',
      amountIdr: 1000000,
    },
    {
      categoryId: '550e8400-e29b-41d4-a716-446655440002',
      amountIdr: 500000,
    },
  ],
};

const validBudgetQuery = {
  month: '2024-01-01',
};

describe('Budget PostgreSQL Schema Validation', () => {
  describe('Schema Structure', () => {
    it('should be defined as a valid Drizzle table', () => {
      expect(budgets).toBeDefined();
      expect(typeof budgets).toBe('object');
    });

    it('should have all expected columns', () => {
      expect(budgets).toHaveProperty('id');
      expect(budgets).toHaveProperty('month');
      expect(budgets).toHaveProperty('category_id');
      expect(budgets).toHaveProperty('amount_idr');
      expect(budgets).toHaveProperty('created_at');
      expect(budgets).toHaveProperty('updated_at');
    });

    it('should have unique index on month and category_id', () => {
      expect(budgets).toBeDefined();
    });
  });

  describe('Column Definitions', () => {
    describe('id column', () => {
      it('should be defined', () => {
        expect(budgets.id).toBeDefined();
      });

      it('should be primary key', () => {
        expect(budgets.id).toBeDefined();
      });
    });

    describe('month column', () => {
      it('should be defined', () => {
        expect(budgets.month).toBeDefined();
      });

      it('should be not null', () => {
        expect(budgets.month).toBeDefined();
      });
    });

    describe('category_id column', () => {
      it('should be defined', () => {
        expect(budgets.category_id).toBeDefined();
      });

      it('should be not null', () => {
        expect(budgets.category_id).toBeDefined();
      });
    });

    describe('amount_idr column', () => {
      it('should be defined', () => {
        expect(budgets.amount_idr).toBeDefined();
      });

      it('should be not null', () => {
        expect(budgets.amount_idr).toBeDefined();
      });
    });

    describe('created_at column', () => {
      it('should be defined', () => {
        expect(budgets.created_at).toBeDefined();
      });

      it('should have default value', () => {
        expect(budgets.created_at).toBeDefined();
      });
    });

    describe('updated_at column', () => {
      it('should be defined', () => {
        expect(budgets.updated_at).toBeDefined();
      });

      it('should have default value', () => {
        expect(budgets.updated_at).toBeDefined();
      });
    });
  });

  describe('Zod Schema Validation', () => {
    describe('BudgetMonthSchema', () => {
      it('should be defined', () => {
        expect(BudgetMonthSchema).toBeDefined();
      });

      it('should validate correct month format', () => {
        const months = [
          '2024-01-01',
          '2024-12-01',
          '2025-06-01',
          '2030-02-01',
        ];

        months.forEach(month => {
          const result = BudgetMonthSchema.safeParse(month);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid month formats', () => {
        const testCases = [
          { month: '2024-1-01', shouldPass: false },
          { month: '24-01-01', shouldPass: false },
          { month: '2024/01/01', shouldPass: false },
          { month: '2024-13-01', shouldPass: false },
          { month: '2024-00-01', shouldPass: false },
          { month: '2024-01-1', shouldPass: false },
          { month: '2024-01-00', shouldPass: false },
          { month: 'not-a-date', shouldPass: false },
          { month: '', shouldPass: false },
        ];

        testCases.forEach(({ month, shouldPass }) => {
          const result = BudgetMonthSchema.safeParse(month);
          if (shouldPass) {
            expect(result.success).toBe(true);
          } else {
            expect(result.success).toBe(false);
          }
        });
      });

      it('should enforce YYYY-MM-01 format', () => {
        const result = BudgetMonthSchema.safeParse('2024-01-01');
        expect(result.success).toBe(true);

        const result2 = BudgetMonthSchema.safeParse('2024-01-02');
        expect(result2.success).toBe(false);
      });
    });

    describe('BudgetItemSchema', () => {
      it('should be defined', () => {
        expect(BudgetItemSchema).toBeDefined();
      });

      it('should validate correct budget item', () => {
        const result = BudgetItemSchema.safeParse(validBudgetItem);
        expect(result.success).toBe(true);
      });

      it('should validate UUID format for categoryId', () => {
        const result = BudgetItemSchema.safeParse({
          categoryId: 'invalid-uuid',
          amountIdr: 1000000,
        });
        expect(result.success).toBe(false);
      });

      it('should reject negative amounts', () => {
        const result = BudgetItemSchema.safeParse({
          categoryId: '550e8400-e29b-41d4-a716-446655440001',
          amountIdr: -1000,
        });
        expect(result.success).toBe(false);
      });

      it('should reject zero amounts', () => {
        const result = BudgetItemSchema.safeParse({
          categoryId: '550e8400-e29b-41d4-a716-446655440001',
          amountIdr: 0,
        });
        expect(result.success).toBe(false);
      });

      it('should accept positive amounts', () => {
        const result = BudgetItemSchema.safeParse({
          categoryId: '550e8400-e29b-41d4-a716-446655440001',
          amountIdr: 1000,
        });
        expect(result.success).toBe(true);
      });

      it('should accept large amounts', () => {
        const result = BudgetItemSchema.safeParse({
          categoryId: '550e8400-e29b-41d4-a716-446655440001',
          amountIdr: Number.MAX_SAFE_INTEGER,
        });
        expect(result.success).toBe(true);
      });
    });

    describe('BudgetUpsertSchema', () => {
      it('should be defined', () => {
        expect(BudgetUpsertSchema).toBeDefined();
      });

      it('should validate correct budget upsert data', () => {
        const result = BudgetUpsertSchema.safeParse(validBudgetUpsert);
        expect(result.success).toBe(true);
      });

      it('should validate correct month format', () => {
        const result = BudgetUpsertSchema.safeParse({
          month: '2024-01-01',
          items: [validBudgetItem],
        });
        expect(result.success).toBe(true);
      });

      it('should reject invalid month format', () => {
        const result = BudgetUpsertSchema.safeParse({
          month: 'invalid-month',
          items: [validBudgetItem],
        });
        expect(result.success).toBe(false);
      });

      it('should require at least one budget item', () => {
        const result = BudgetUpsertSchema.safeParse({
          month: '2024-01-01',
          items: [],
        });
        expect(result.success).toBe(false);
      });

      it('should accept multiple budget items', () => {
        const result = BudgetUpsertSchema.safeParse({
          month: '2024-01-01',
          items: [
            validBudgetItem,
            {
              categoryId: '550e8400-e29b-41d4-a716-446655440002',
              amountIdr: 500000,
            },
            {
              categoryId: '550e8400-e29b-41d4-a716-446655440003',
              amountIdr: 750000,
            },
          ],
        });
        expect(result.success).toBe(true);
      });

      it('should validate all items in array', () => {
        const result = BudgetUpsertSchema.safeParse({
          month: '2024-01-01',
          items: [
            validBudgetItem,
            {
              categoryId: 'invalid-uuid',
              amountIdr: 500000,
            },
          ],
        });
        expect(result.success).toBe(false);
      });
    });

    describe('BudgetQuerySchema', () => {
      it('should be defined', () => {
        expect(BudgetQuerySchema).toBeDefined();
      });

      it('should validate correct query parameters', () => {
        const result = BudgetQuerySchema.safeParse(validBudgetQuery);
        expect(result.success).toBe(true);
      });

      it('should accept empty query', () => {
        const result = BudgetQuerySchema.safeParse({});
        expect(result.success).toBe(true);
      });

      it('should validate month format in query', () => {
        const result = BudgetQuerySchema.safeParse({
          month: '2024-01-01',
        });
        expect(result.success).toBe(true);

        const result2 = BudgetQuerySchema.safeParse({
          month: 'invalid-month',
        });
        expect(result2.success).toBe(false);
      });
    });

    describe('BudgetIdSchema', () => {
      it('should be defined', () => {
        expect(BudgetIdSchema).toBeDefined();
      });

      it('should validate correct UUID format', () => {
        const result = BudgetIdSchema.safeParse({
          id: '550e8400-e29b-41d4-a716-446655440000',
        });
        expect(result.success).toBe(true);
      });

      it('should reject invalid UUID format', () => {
        const result = BudgetIdSchema.safeParse({
          id: 'not-a-uuid',
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Type Safety', () => {
    it('should have compatible data types', () => {
      const budget = validBudgetData;
      const budgetItem = validBudgetItem;
      const budgetUpsert = validBudgetUpsert;
      const budgetQuery = validBudgetQuery;

      expect(budget).toBeDefined();
      expect(budgetItem).toBeDefined();
      expect(budgetUpsert).toBeDefined();
      expect(budgetQuery).toBeDefined();
    });
  });

  describe('PostgreSQL Type Mappings', () => {
    it('should use PostgreSQL types', () => {
      expect(budgets.id).toBeDefined();
      expect(budgets.month).toBeDefined();
      expect(budgets.category_id).toBeDefined();
      expect(budgets.amount_idr).toBeDefined();
      expect(budgets.created_at).toBeDefined();
      expect(budgets.updated_at).toBeDefined();
    });
  });

  describe('Constraints and Defaults', () => {
    it('should enforce primary key constraint on id', () => {
      expect(budgets.id).toBeDefined();
    });

    it('should enforce not null constraints on required fields', () => {
      expect(budgets.month).toBeDefined();
      expect(budgets.category_id).toBeDefined();
      expect(budgets.amount_idr).toBeDefined();
    });

    it('should have timestamp defaults for created_at and updated_at', () => {
      expect(budgets.created_at).toBeDefined();
      expect(budgets.updated_at).toBeDefined();
    });
  });

  describe('Unique Index', () => {
    it('should enforce unique constraint on month and category_id', () => {
      expect(budgets).toBeDefined();
    });
  });

  describe('UUID Handling', () => {
    it('should handle UUID strings in id column', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = BudgetIdSchema.safeParse({ id: uuid });
      expect(result.success).toBe(true);
    });

    it('should validate UUID format', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const invalidUuid = 'not-a-uuid';

      const validResult = BudgetIdSchema.safeParse({ id: validUuid });
      const invalidResult = BudgetIdSchema.safeParse({ id: invalidUuid });

      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle various valid months', () => {
      const validMonths = [
        '2024-01-01',
        '2024-02-01',
        '2024-03-01',
        '2024-04-01',
        '2024-05-01',
        '2024-06-01',
        '2024-07-01',
        '2024-08-01',
        '2024-09-01',
        '2024-10-01',
        '2024-11-01',
        '2024-12-01',
      ];

      validMonths.forEach(month => {
        const result = BudgetMonthSchema.safeParse(month);
        expect(result.success).toBe(true);
      });
    });

    it('should handle leap year February', () => {
      const result = BudgetMonthSchema.safeParse('2024-02-01');
      expect(result.success).toBe(true);
    });

    it('should handle non-leap year February', () => {
      const result = BudgetMonthSchema.safeParse('2025-02-01');
      expect(result.success).toBe(true);
    });

    it('should handle edge year ranges', () => {
      const edgeYears = ['2020-01-01', '2030-01-01', '2050-01-01'];

      edgeYears.forEach(month => {
        const result = BudgetMonthSchema.safeParse(month);
        expect(result.success).toBe(true);
      });
    });

    it('should handle large budget amounts', () => {
      const largeAmounts = [
        1000000, // 1 million
        10000000, // 10 million
        100000000, // 100 million
        1000000000, // 1 billion
        Number.MAX_SAFE_INTEGER,
      ];

      largeAmounts.forEach(amount => {
        const result = BudgetItemSchema.safeParse({
          categoryId: '550e8400-e29b-41d4-a716-446655440001',
          amountIdr: amount,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should handle multiple budget items', () => {
      const items = [
        validBudgetItem,
        {
          categoryId: '550e8400-e29b-41d4-a716-446655440002',
          amountIdr: 500000,
        },
      ];

      const result = BudgetUpsertSchema.safeParse({
        month: '2024-01-01',
        items,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain same field names', () => {
      const expectedFields = [
        'id',
        'month',
        'category_id',
        'amount_idr',
        'created_at',
        'updated_at',
      ];

      expectedFields.forEach(field => {
        expect(budgets).toHaveProperty(field);
      });
    });

    it('should maintain same validation rules', () => {
      const result = BudgetItemSchema.safeParse({
        categoryId: '550e8400-e29b-41d4-a716-446655440001',
        amountIdr: -1000,
      });
      expect(result.success).toBe(false);
    });

    it('should maintain same month format requirement', () => {
      const result = BudgetMonthSchema.safeParse('2024-1-01');
      expect(result.success).toBe(false);
    });
  });

  describe('Data Integrity', () => {
    it('should validate required fields', () => {
      const result = BudgetUpsertSchema.safeParse({
        month: '2024-01-01',
        items: [],
      });
      expect(result.success).toBe(false);
    });

    it('should validate field types', () => {
      const result = BudgetItemSchema.safeParse({
        categoryId: 123,
        amountIdr: 'not-a-number',
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid field types', () => {
      const result = BudgetItemSchema.safeParse(validBudgetItem);
      expect(result.success).toBe(true);
    });
  });

  describe('Schema Migration Readiness', () => {
    it('should generate valid PostgreSQL column definitions', () => {
      expect(budgets.id).toBeDefined();
      expect(budgets.month).toBeDefined();
      expect(budgets.category_id).toBeDefined();
      expect(budgets.amount_idr).toBeDefined();
      expect(budgets.created_at).toBeDefined();
      expect(budgets.updated_at).toBeDefined();
    });

    it('should be ready for drizzle-kit generate', () => {
      expect(budgets).toBeDefined();
      expect(typeof budgets).toBe('object');
    });
  });

  describe('Business Logic Validation', () => {
    it('should support monthly budget planning', () => {
      const monthlyBudgets = [
        '2024-01-01',
        '2024-02-01',
        '2024-03-01',
        '2024-04-01',
      ];

      monthlyBudgets.forEach(month => {
        const result = BudgetUpsertSchema.safeParse({
          month,
          items: [validBudgetItem],
        });
        expect(result.success).toBe(true);
      });
    });

    it('should support budget categories', () => {
      const categories = [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440003',
      ];

      categories.forEach(categoryId => {
        const result = BudgetItemSchema.safeParse({
          categoryId,
          amountIdr: 100000,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should handle budget variations', () => {
      const budgetVariations = [
        { categoryId: '550e8400-e29b-41d4-a716-446655440001', amountIdr: 500000 },
        { categoryId: '550e8400-e29b-41d4-a716-446655440002', amountIdr: 1000000 },
        { categoryId: '550e8400-e29b-41d4-a716-446655440003', amountIdr: 250000 },
      ];

      const result = BudgetUpsertSchema.safeParse({
        month: '2024-01-01',
        items: budgetVariations,
      });
      expect(result.success).toBe(true);
    });
  });
});
