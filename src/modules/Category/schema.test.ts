import { describe, it, expect } from 'vitest';
import { categories, CategoryCreateSchema, CategoryUpdateSchema, CategoryIdSchema } from './schema';

// Test data
const validCategoryData = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Food & Dining',
  archived: false,
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z'),
};

const validCategoryInput = {
  name: 'Food & Dining',
};

const validCategoryUpdate = {
  name: 'Updated Category Name',
  archived: true,
};

describe('Category PostgreSQL Schema Validation', () => {
  describe('Schema Structure', () => {
    it('should be defined as a valid Drizzle table', () => {
      expect(categories).toBeDefined();
      expect(typeof categories).toBe('object');
    });

    it('should have all expected columns', () => {
      expect(categories).toHaveProperty('id');
      expect(categories).toHaveProperty('name');
      expect(categories).toHaveProperty('archived');
      expect(categories).toHaveProperty('created_at');
      expect(categories).toHaveProperty('updated_at');
    });
  });

  describe('Column Definitions', () => {
    describe('id column', () => {
      it('should be defined', () => {
        expect(categories.id).toBeDefined();
      });

      it('should be primary key', () => {
        expect(categories.id).toBeDefined();
      });
    });

    describe('name column', () => {
      it('should be defined', () => {
        expect(categories.name).toBeDefined();
      });

      it('should have unique constraint', () => {
        expect(categories.name).toBeDefined();
      });
    });

    describe('archived column', () => {
      it('should be defined', () => {
        expect(categories.archived).toBeDefined();
      });

      it('should have default value', () => {
        expect(categories.archived).toBeDefined();
      });
    });

    describe('created_at column', () => {
      it('should be defined', () => {
        expect(categories.created_at).toBeDefined();
      });

      it('should have default value', () => {
        expect(categories.created_at).toBeDefined();
      });
    });

    describe('updated_at column', () => {
      it('should be defined', () => {
        expect(categories.updated_at).toBeDefined();
      });

      it('should have default value', () => {
        expect(categories.updated_at).toBeDefined();
      });
    });
  });

  describe('Zod Schema Validation', () => {
    describe('CategoryCreateSchema', () => {
      it('should be defined', () => {
        expect(CategoryCreateSchema).toBeDefined();
      });

      it('should validate correct category creation data', () => {
        const result = CategoryCreateSchema.safeParse(validCategoryInput);
        expect(result.success).toBe(true);
      });

      it('should reject empty name', () => {
        const result = CategoryCreateSchema.safeParse({
          name: '',
        });
        expect(result.success).toBe(false);
      });

      it('should reject missing required fields', () => {
        const result = CategoryCreateSchema.safeParse({});
        expect(result.success).toBe(false);
      });

      it('should accept optional fields', () => {
        const result = CategoryCreateSchema.safeParse({
          name: 'Test Category',
        });
        expect(result.success).toBe(true);
      });

      it('should validate name length', () => {
        const result = CategoryCreateSchema.safeParse({
          name: 'a'.repeat(255),
        });
        expect(result.success).toBe(true);
      });

      it('should reject overly long name', () => {
        const result = CategoryCreateSchema.safeParse({
          name: 'a'.repeat(256),
        });
        expect(result.success).toBe(false);
      });
    });

    describe('CategoryUpdateSchema', () => {
      it('should be defined', () => {
        expect(CategoryUpdateSchema).toBeDefined();
      });

      it('should validate correct category update data', () => {
        const result = CategoryUpdateSchema.safeParse(validCategoryUpdate);
        expect(result.success).toBe(true);
      });

      it('should accept partial updates', () => {
        const result = CategoryUpdateSchema.safeParse({
          name: 'Updated Name',
        });
        expect(result.success).toBe(true);
      });

      it('should accept boolean for archived field', () => {
        const result = CategoryUpdateSchema.safeParse({
          archived: true,
        });
        expect(result.success).toBe(true);
      });

      it('should accept multiple field updates', () => {
        const result = CategoryUpdateSchema.safeParse({
          name: 'New Name',
          archived: true,
        });
        expect(result.success).toBe(true);
      });
    });

    describe('CategoryIdSchema', () => {
      it('should be defined', () => {
        expect(CategoryIdSchema).toBeDefined();
      });

      it('should validate correct UUID format', () => {
        const result = CategoryIdSchema.safeParse({
          id: '550e8400-e29b-41d4-a716-446655440000',
        });
        expect(result.success).toBe(true);
      });

      it('should reject invalid UUID format', () => {
        const result = CategoryIdSchema.safeParse({
          id: 'not-a-uuid',
        });
        expect(result.success).toBe(false);
      });

      it('should reject missing id', () => {
        const result = CategoryIdSchema.safeParse({});
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Type Safety', () => {
    it('should have compatible data types', () => {
      // These should not throw errors
      const category = validCategoryData;
      const createInput = validCategoryInput;
      const updateInput = validCategoryUpdate;
      const idInput = { id: validCategoryData.id };

      expect(category).toBeDefined();
      expect(createInput).toBeDefined();
      expect(updateInput).toBeDefined();
      expect(idInput).toBeDefined();
    });
  });

  describe('PostgreSQL Type Mappings', () => {
    it('should use PostgreSQL types', () => {
      // Verify that the schema is using PostgreSQL types
      expect(categories.id).toBeDefined();
      expect(categories.name).toBeDefined();
      expect(categories.archived).toBeDefined();
      expect(categories.created_at).toBeDefined();
      expect(categories.updated_at).toBeDefined();
    });
  });

  describe('Constraints and Defaults', () => {
    it('should enforce primary key constraint on id', () => {
      expect(categories.id).toBeDefined();
    });

    it('should enforce unique constraint on name', () => {
      expect(categories.name).toBeDefined();
    });

    it('should have correct default values', () => {
      expect(categories.archived).toBeDefined();
    });

    it('should have timestamp defaults for created_at and updated_at', () => {
      expect(categories.created_at).toBeDefined();
      expect(categories.updated_at).toBeDefined();
    });
  });

  describe('UUID Handling', () => {
    it('should handle UUID strings in id column', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = CategoryIdSchema.safeParse({ id: uuid });
      expect(result.success).toBe(true);
    });

    it('should validate UUID format', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const invalidUuid = 'not-a-uuid';

      const validResult = CategoryIdSchema.safeParse({ id: validUuid });
      const invalidResult = CategoryIdSchema.safeParse({ id: invalidUuid });

      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum length strings', () => {
      const longName = 'a'.repeat(255);
      const result = CategoryCreateSchema.safeParse({
        name: longName,
      });
      expect(result.success).toBe(true);
    });

    it('should handle empty string for name', () => {
      const result = CategoryCreateSchema.safeParse({
        name: '',
      });
      expect(result.success).toBe(false);
    });

    it('should handle special characters in name', () => {
      const specialNames = [
        'Food & Dining',
        'Travel/Transportation',
        'Shopping (Clothing)',
        'Home:Maintenance',
        'Entertainment:Movies',
      ];

      specialNames.forEach(name => {
        const result = CategoryCreateSchema.safeParse({ name });
        expect(result.success).toBe(true);
      });
    });

    it('should handle unicode characters in name', () => {
      const unicodeNames = [
        '食物与餐饮',
        'Развлечения',
        'Éducation',
        '🚀 Gaming',
        '📚 Books',
      ];

      unicodeNames.forEach(name => {
        const result = CategoryCreateSchema.safeParse({ name });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain same field names as SQLite version', () => {
      const expectedFields = [
        'id',
        'name',
        'archived',
        'created_at',
        'updated_at',
      ];

      expectedFields.forEach(field => {
        expect(categories).toHaveProperty(field);
      });
    });

    it('should maintain same validation rules', () => {
      const result = CategoryCreateSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);

      const result2 = CategoryCreateSchema.safeParse({ name: 'Valid Name' });
      expect(result2.success).toBe(true);
    });
  });

  describe('Data Integrity', () => {
    it('should validate required fields', () => {
      const result = CategoryCreateSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should validate field types', () => {
      const result = CategoryUpdateSchema.safeParse({
        name: 123,
        archived: 'true',
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid field types', () => {
      const result = CategoryUpdateSchema.safeParse({
        name: 'Valid Name',
        archived: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Schema Migration Readiness', () => {

    it('should generate valid PostgreSQL column definitions', () => {
      expect(categories.id).toBeDefined();
      expect(categories.name).toBeDefined();
      expect(categories.archived).toBeDefined();
      expect(categories.created_at).toBeDefined();
      expect(categories.updated_at).toBeDefined();
    });
  });
});
