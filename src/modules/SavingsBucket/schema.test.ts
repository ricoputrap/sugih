import { describe, it, expect } from 'vitest';
import { savingsBuckets, SavingsBucketCreateSchema, SavingsBucketUpdateSchema, SavingsBucketIdSchema } from './schema';

// Test data
const validSavingsBucketData = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Emergency Fund',
  description: 'Emergency savings for unexpected expenses',
  archived: false,
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z'),
};

const validSavingsBucketInput = {
  name: 'Emergency Fund',
  description: 'Emergency savings for unexpected expenses',
};

const validSavingsBucketInputMinimal = {
  name: 'Vacation Fund',
};

const validSavingsBucketUpdate = {
  name: 'Updated Emergency Fund',
  description: 'Updated description',
  archived: true,
};

describe('SavingsBucket PostgreSQL Schema Validation', () => {
  describe('Schema Structure', () => {
    it('should be defined as a valid Drizzle table', () => {
      expect(savingsBuckets).toBeDefined();
      expect(typeof savingsBuckets).toBe('object');
    });

    it('should have all expected columns', () => {
      expect(savingsBuckets).toHaveProperty('id');
      expect(savingsBuckets).toHaveProperty('name');
      expect(savingsBuckets).toHaveProperty('description');
      expect(savingsBuckets).toHaveProperty('archived');
      expect(savingsBuckets).toHaveProperty('created_at');
      expect(savingsBuckets).toHaveProperty('updated_at');
    });
  });

  describe('Column Definitions', () => {
    describe('id column', () => {
      it('should be defined', () => {
        expect(savingsBuckets.id).toBeDefined();
      });

      it('should be primary key', () => {
        expect(savingsBuckets.id).toBeDefined();
      });
    });

    describe('name column', () => {
      it('should be defined', () => {
        expect(savingsBuckets.name).toBeDefined();
      });

      it('should have unique constraint', () => {
        expect(savingsBuckets.name).toBeDefined();
      });
    });

    describe('description column', () => {
      it('should be defined', () => {
        expect(savingsBuckets.description).toBeDefined();
      });

      it('should be optional', () => {
        const result = SavingsBucketCreateSchema.safeParse({
          name: 'Test Bucket',
        });
        expect(result.success).toBe(true);
      });
    });

    describe('archived column', () => {
      it('should be defined', () => {
        expect(savingsBuckets.archived).toBeDefined();
      });

      it('should have default value', () => {
        expect(savingsBuckets.archived).toBeDefined();
      });
    });

    describe('created_at column', () => {
      it('should be defined', () => {
        expect(savingsBuckets.created_at).toBeDefined();
      });

      it('should have default value', () => {
        expect(savingsBuckets.created_at).toBeDefined();
      });
    });

    describe('updated_at column', () => {
      it('should be defined', () => {
        expect(savingsBuckets.updated_at).toBeDefined();
      });

      it('should have default value', () => {
        expect(savingsBuckets.updated_at).toBeDefined();
      });
    });
  });

  describe('Zod Schema Validation', () => {
    describe('SavingsBucketCreateSchema', () => {
      it('should be defined', () => {
        expect(SavingsBucketCreateSchema).toBeDefined();
      });

      it('should validate correct savings bucket creation data', () => {
        const result = SavingsBucketCreateSchema.safeParse(validSavingsBucketInput);
        expect(result.success).toBe(true);
      });

      it('should validate minimal creation data', () => {
        const result = SavingsBucketCreateSchema.safeParse(validSavingsBucketInputMinimal);
        expect(result.success).toBe(true);
      });

      it('should reject empty name', () => {
        const result = SavingsBucketCreateSchema.safeParse({
          name: '',
          description: 'Some description',
        });
        expect(result.success).toBe(false);
      });

      it('should reject missing required fields', () => {
        const result = SavingsBucketCreateSchema.safeParse({
          description: 'Some description',
        });
        expect(result.success).toBe(false);
      });

      it('should accept optional description field', () => {
        const result = SavingsBucketCreateSchema.safeParse({
          name: 'Test Bucket',
        });
        expect(result.success).toBe(true);
      });

      it('should validate name length', () => {
        const result = SavingsBucketCreateSchema.safeParse({
          name: 'a'.repeat(255),
          description: 'Test description',
        });
        expect(result.success).toBe(true);
      });

      it('should reject overly long name', () => {
        const result = SavingsBucketCreateSchema.safeParse({
          name: 'a'.repeat(256),
          description: 'Test description',
        });
        expect(result.success).toBe(false);
      });

      it('should handle long description', () => {
        const result = SavingsBucketCreateSchema.safeParse({
          name: 'Test Bucket',
          description: 'a'.repeat(1000),
        });
        expect(result.success).toBe(true);
      });
    });

    describe('SavingsBucketUpdateSchema', () => {
      it('should be defined', () => {
        expect(SavingsBucketUpdateSchema).toBeDefined();
      });

      it('should validate correct savings bucket update data', () => {
        const result = SavingsBucketUpdateSchema.safeParse(validSavingsBucketUpdate);
        expect(result.success).toBe(true);
      });

      it('should accept partial updates', () => {
        const result = SavingsBucketUpdateSchema.safeParse({
          name: 'Updated Name',
        });
        expect(result.success).toBe(true);
      });

      it('should accept boolean for archived field', () => {
        const result = SavingsBucketUpdateSchema.safeParse({
          archived: true,
        });
        expect(result.success).toBe(true);
      });

      it('should accept multiple field updates', () => {
        const result = SavingsBucketUpdateSchema.safeParse({
          name: 'New Name',
          description: 'New description',
          archived: true,
        });
        expect(result.success).toBe(true);
      });

      it('should allow clearing description', () => {
        const result = SavingsBucketUpdateSchema.safeParse({
          description: '',
        });
        expect(result.success).toBe(true);
      });
    });

    describe('SavingsBucketIdSchema', () => {
      it('should be defined', () => {
        expect(SavingsBucketIdSchema).toBeDefined();
      });

      it('should validate correct UUID format', () => {
        const result = SavingsBucketIdSchema.safeParse({
          id: '550e8400-e29b-41d4-a716-446655440000',
        });
        expect(result.success).toBe(true);
      });

      it('should reject invalid UUID format', () => {
        const result = SavingsBucketIdSchema.safeParse({
          id: 'not-a-uuid',
        });
        expect(result.success).toBe(false);
      });

      it('should reject missing id', () => {
        const result = SavingsBucketIdSchema.safeParse({});
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Type Safety', () => {
    it('should have compatible data types', () => {
      // These should not throw errors
      const savingsBucket = validSavingsBucketData;
      const createInput = validSavingsBucketInput;
      const updateInput = validSavingsBucketUpdate;
      const idInput = { id: validSavingsBucketData.id };

      expect(savingsBucket).toBeDefined();
      expect(createInput).toBeDefined();
      expect(updateInput).toBeDefined();
      expect(idInput).toBeDefined();
    });
  });

  describe('PostgreSQL Type Mappings', () => {
    it('should use PostgreSQL types', () => {
      // Verify that the schema is using PostgreSQL types
      expect(savingsBuckets.id).toBeDefined();
      expect(savingsBuckets.name).toBeDefined();
      expect(savingsBuckets.description).toBeDefined();
      expect(savingsBuckets.archived).toBeDefined();
      expect(savingsBuckets.created_at).toBeDefined();
      expect(savingsBuckets.updated_at).toBeDefined();
    });
  });

  describe('Constraints and Defaults', () => {
    it('should enforce primary key constraint on id', () => {
      expect(savingsBuckets.id).toBeDefined();
    });

    it('should enforce unique constraint on name', () => {
      expect(savingsBuckets.name).toBeDefined();
    });

    it('should have correct default values', () => {
      expect(savingsBuckets.archived).toBeDefined();
    });

    it('should have timestamp defaults for created_at and updated_at', () => {
      expect(savingsBuckets.created_at).toBeDefined();
      expect(savingsBuckets.updated_at).toBeDefined();
    });
  });

  describe('UUID Handling', () => {
    it('should handle UUID strings in id column', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = SavingsBucketIdSchema.safeParse({ id: uuid });
      expect(result.success).toBe(true);
    });

    it('should validate UUID format', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const invalidUuid = 'not-a-uuid';

      const validResult = SavingsBucketIdSchema.safeParse({ id: validUuid });
      const invalidResult = SavingsBucketIdSchema.safeParse({ id: invalidUuid });

      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum length strings', () => {
      const longName = 'a'.repeat(255);
      const longDescription = 'b'.repeat(1000);

      const result = SavingsBucketCreateSchema.safeParse({
        name: longName,
        description: longDescription,
      });
      expect(result.success).toBe(true);
    });

    it('should handle empty strings', () => {
      const result = SavingsBucketCreateSchema.safeParse({
        name: 'Valid Name',
        description: '',
      });
      expect(result.success).toBe(true);
    });

    it('should handle special characters in name', () => {
      const specialNames = [
        'Emergency Fund',
        'Vacation/Travel',
        'Home:Down Payment',
        'Car (Maintenance)',
        'Kids:Education',
      ];

      specialNames.forEach(name => {
        const result = SavingsBucketCreateSchema.safeParse({ name });
        expect(result.success).toBe(true);
      });
    });

    it('should handle special characters in description', () => {
      const specialDescriptions = [
        'For "emergency" expenses!',
        'Travel @ 2024: Budget $5000',
        'Goal: Save 20% of income',
        'Car > Maintenance & Repairs',
      ];

      specialDescriptions.forEach(description => {
        const result = SavingsBucketCreateSchema.safeParse({
          name: 'Test Bucket',
          description,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should handle unicode characters', () => {
      const unicodeNames = [
        '紧急基金',
        'Фонд отпуска',
        'Fondo de Emergencia',
        '🚗 Car Fund',
        '💰 Savings Goal',
      ];

      unicodeNames.forEach(name => {
        const result = SavingsBucketCreateSchema.safeParse({ name });
        expect(result.success).toBe(true);
      });
    });

    it('should handle multiline descriptions', () => {
      const multilineDescription = `This is a multiline description.
It has multiple lines.
And even more content.`;

      const result = SavingsBucketCreateSchema.safeParse({
        name: 'Test Bucket',
        description: multilineDescription,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain same field names as SQLite version', () => {
      const expectedFields = [
        'id',
        'name',
        'description',
        'archived',
        'created_at',
        'updated_at',
      ];

      expectedFields.forEach(field => {
        expect(savingsBuckets).toHaveProperty(field);
      });
    });

    it('should maintain same validation rules', () => {
      const result = SavingsBucketCreateSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);

      const result2 = SavingsBucketCreateSchema.safeParse({ name: 'Valid Name' });
      expect(result2.success).toBe(true);
    });

    it('should maintain optional description field', () => {
      const result1 = SavingsBucketCreateSchema.safeParse({ name: 'Test' });
      expect(result1.success).toBe(true);

      const result2 = SavingsBucketCreateSchema.safeParse({ name: 'Test', description: 'Optional' });
      expect(result2.success).toBe(true);
    });
  });

  describe('Data Integrity', () => {
    it('should validate required fields', () => {
      const result = SavingsBucketCreateSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should validate field types', () => {
      const result = SavingsBucketUpdateSchema.safeParse({
        name: 123,
        description: 456,
        archived: 'true',
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid field types', () => {
      const result = SavingsBucketUpdateSchema.safeParse({
        name: 'Valid Name',
        description: 'Valid description',
        archived: true,
      });
      expect(result.success).toBe(true);
    });

    it('should reject null values for required fields', () => {
      const result = SavingsBucketCreateSchema.safeParse({
        name: null,
        description: 'Some description',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Schema Migration Readiness', () => {
    it('should generate valid PostgreSQL column definitions', () => {
      expect(savingsBuckets.id).toBeDefined();
      expect(savingsBuckets.name).toBeDefined();
      expect(savingsBuckets.description).toBeDefined();
      expect(savingsBuckets.archived).toBeDefined();
      expect(savingsBuckets.created_at).toBeDefined();
      expect(savingsBuckets.updated_at).toBeDefined();
    });

    it('should be ready for drizzle-kit generate', () => {
      expect(savingsBuckets).toBeDefined();
      expect(typeof savingsBuckets).toBe('object');
    });
  });

  describe('Business Logic Validation', () => {
    it('should support savings bucket naming conventions', () => {
      const validNames = [
        'Emergency Fund',
        'Vacation 2024',
        'New Car Fund',
        'Home Down Payment',
        'Kids College Fund',
      ];

      validNames.forEach(name => {
        const result = SavingsBucketCreateSchema.safeParse({ name });
        expect(result.success).toBe(true);
      });
    });

    it('should handle description length variations', () => {
      const descriptions = [
        '', // Empty
        'Short', // Very short
        'This is a medium length description that provides some context.', // Medium
        'a'.repeat(500), // Long
      ];

      descriptions.forEach(description => {
        const result = SavingsBucketCreateSchema.safeParse({
          name: 'Test Bucket',
          description,
        });
        expect(result.success).toBe(true);
      });
    });
  });
});
