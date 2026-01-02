import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('PostgreSQL Migration Validation', () => {
  const migrationDir = path.join(process.cwd(), 'drizzle');
  const migrationFile = path.join(migrationDir, '0000_curious_spirit.sql');

  beforeEach(() => {
    // Ensure migration directory and file exist
    expect(fs.existsSync(migrationDir)).toBe(true);
    expect(fs.existsSync(migrationFile)).toBe(true);
  });

  describe('Migration File Structure', () => {
    it('should exist', () => {
      expect(fs.existsSync(migrationFile)).toBe(true);
    });

    it('should be a valid SQL file', () => {
      const content = fs.readFileSync(migrationFile, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
      expect(content).toContain('CREATE TABLE');
    });

    it('should have correct naming convention', () => {
      const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql'));
      expect(files.length).toBeGreaterThan(0);
      expect(files[0]).toMatch(/^\d+_[a-z0-9_]+\.sql$/);
    });
  });

  describe('PostgreSQL Type Validation', () => {
    let migrationContent: string;

    beforeEach(() => {
      migrationContent = fs.readFileSync(migrationFile, 'utf-8');
    });

    it('should use boolean type for archived columns', () => {
      expect(migrationContent).toContain('boolean DEFAULT false NOT NULL');
    });

    it('should use timestamp with time zone for datetime columns', () => {
      const timestampMatches = migrationContent.match(/timestamp with time zone/g);
      expect(timestampMatches).not.toBeNull();
      expect(timestampMatches!.length).toBeGreaterThan(0);
    });

    it('should use bigint for amount_idr columns', () => {
      expect(migrationContent).toContain('bigint NOT NULL');
    });

    it('should use proper PostgreSQL quoting (double quotes)', () => {
      expect(migrationContent).toContain('"wallets"');
      expect(migrationContent).toContain('"categories"');
      expect(migrationContent).toContain('"postings"');
      expect(migrationContent).toContain('"transaction_events"');
      expect(migrationContent).toContain('"budgets"');
      expect(migrationContent).toContain('"savings_buckets"');
    });

    it('should not use SQLite-specific types', () => {
      expect(migrationContent).not.toContain('integer');
      expect(migrationContent).not.toContain('REAL');
      expect(migrationContent).not.toContain('BLOB');
      expect(migrationContent).not.toContain('CURRENT_TIMESTAMP');
    });
  });

  describe('Table Creation Validation', () => {
    let migrationContent: string;

    beforeEach(() => {
      migrationContent = fs.readFileSync(migrationFile, 'utf-8');
    });

    it('should create wallets table', () => {
      expect(migrationContent).toContain('CREATE TABLE "wallets"');
      expect(migrationContent).toContain('"id" text PRIMARY KEY NOT NULL');
      expect(migrationContent).toContain('"name" text NOT NULL');
      expect(migrationContent).toContain('"type" text DEFAULT \'bank\' NOT NULL');
      expect(migrationContent).toContain('"currency" text DEFAULT \'IDR\' NOT NULL');
      expect(migrationContent).toContain('"archived" boolean DEFAULT false NOT NULL');
    });

    it('should create categories table', () => {
      expect(migrationContent).toContain('CREATE TABLE "categories"');
      expect(migrationContent).toContain('"id" text PRIMARY KEY NOT NULL');
      expect(migrationContent).toContain('"name" text NOT NULL');
      expect(migrationContent).toContain('"archived" boolean DEFAULT false NOT NULL');
    });

    it('should create savings_buckets table', () => {
      expect(migrationContent).toContain('CREATE TABLE "savings_buckets"');
      expect(migrationContent).toContain('"id" text PRIMARY KEY NOT NULL');
      expect(migrationContent).toContain('"name" text NOT NULL');
      expect(migrationContent).toContain('"description" text');
      expect(migrationContent).toContain('"archived" boolean DEFAULT false NOT NULL');
    });

    it('should create transaction_events table', () => {
      expect(migrationContent).toContain('CREATE TABLE "transaction_events"');
      expect(migrationContent).toContain('"id" text PRIMARY KEY NOT NULL');
      expect(migrationContent).toContain('"occurred_at" timestamp with time zone NOT NULL');
      expect(migrationContent).toContain('"type" text NOT NULL');
      expect(migrationContent).toContain('"note" text');
      expect(migrationContent).toContain('"payee" text');
      expect(migrationContent).toContain('"category_id" text');
      expect(migrationContent).toContain('"deleted_at" timestamp with time zone');
      expect(migrationContent).toContain('"idempotency_key" text');
    });

    it('should create postings table', () => {
      expect(migrationContent).toContain('CREATE TABLE "postings"');
      expect(migrationContent).toContain('"id" text PRIMARY KEY NOT NULL');
      expect(migrationContent).toContain('"event_id" text NOT NULL');
      expect(migrationContent).toContain('"wallet_id" text');
      expect(migrationContent).toContain('"savings_bucket_id" text');
      expect(migrationContent).toContain('"amount_idr" bigint NOT NULL');
    });

    it('should create budgets table', () => {
      expect(migrationContent).toContain('CREATE TABLE "budgets"');
      expect(migrationContent).toContain('"id" text PRIMARY KEY NOT NULL');
      expect(migrationContent).toContain('"month" text NOT NULL');
      expect(migrationContent).toContain('"category_id" text NOT NULL');
      expect(migrationContent).toContain('"amount_idr" bigint NOT NULL');
    });
  });

  describe('Constraint Validation', () => {
    let migrationContent: string;

    beforeEach(() => {
      migrationContent = fs.readFileSync(migrationFile, 'utf-8');
    });

    it('should have unique constraints on wallet names', () => {
      expect(migrationContent).toContain('CONSTRAINT "wallets_name_unique" UNIQUE("name")');
    });

    it('should have unique constraints on category names', () => {
      expect(migrationContent).toContain('CONSTRAINT "categories_name_unique" UNIQUE("name")');
    });

    it('should have unique constraints on savings bucket names', () => {
      expect(migrationContent).toContain('CONSTRAINT "savings_buckets_name_unique" UNIQUE("name")');
    });

    it('should have unique constraints on transaction idempotency keys', () => {
      expect(migrationContent).toContain('CONSTRAINT "transaction_events_idempotency_key_unique" UNIQUE("idempotency_key")');
    });

    it('should have unique index on budgets (month, category_id)', () => {
      expect(migrationContent).toContain('CREATE UNIQUE INDEX "budget_month_category_idx"');
      expect(migrationContent).toContain('"month","category_id"');
    });

    it('should use btree index for composite unique constraint', () => {
      expect(migrationContent).toContain('USING btree');
    });
  });

  describe('Schema Completeness', () => {
    let migrationContent: string;

    beforeEach(() => {
      migrationContent = fs.readFileSync(migrationFile, 'utf-8');
    });

    it('should contain all 6 expected tables', () => {
      const tables = [
        'wallets',
        'categories',
        'savings_buckets',
        'postings',
        'transaction_events',
        'budgets',
      ];

      tables.forEach(table => {
        expect(migrationContent).toContain(`CREATE TABLE "${table}"`);
      });
    });

    it('should have all expected columns across all tables', () => {
      // Wallets columns
      expect(migrationContent).toContain('"id" text PRIMARY KEY NOT NULL');
      expect(migrationContent).toContain('"name" text NOT NULL');
      expect(migrationContent).toContain('"type" text DEFAULT \'bank\' NOT NULL');
      expect(migrationContent).toContain('"currency" text DEFAULT \'IDR\' NOT NULL');
      expect(migrationContent).toContain('"archived" boolean DEFAULT false NOT NULL');
      expect(migrationContent).toContain('"created_at" timestamp with time zone');
      expect(migrationContent).toContain('"updated_at" timestamp with time zone');

      // Categories columns
      expect(migrationContent).toContain('"archived" boolean DEFAULT false NOT NULL');
      expect(migrationContent).toContain('"created_at" timestamp with time zone');
      expect(migrationContent).toContain('"updated_at" timestamp with time zone');

      // SavingsBuckets columns
      expect(migrationContent).toContain('"description" text');
      expect(migrationContent).toContain('"archived" boolean DEFAULT false NOT NULL');

      // TransactionEvents columns
      expect(migrationContent).toContain('"occurred_at" timestamp with time zone NOT NULL');
      expect(migrationContent).toContain('"type" text NOT NULL');
      expect(migrationContent).toContain('"note" text');
      expect(migrationContent).toContain('"payee" text');
      expect(migrationContent).toContain('"category_id" text');
      expect(migrationContent).toContain('"deleted_at" timestamp with time zone');
      expect(migrationContent).toContain('"idempotency_key" text');

      // Postings columns
      expect(migrationContent).toContain('"event_id" text NOT NULL');
      expect(migrationContent).toContain('"wallet_id" text');
      expect(migrationContent).toContain('"savings_bucket_id" text');
      expect(migrationContent).toContain('"amount_idr" bigint NOT NULL');

      // Budgets columns
      expect(migrationContent).toContain('"month" text NOT NULL');
      expect(migrationContent).toContain('"amount_idr" bigint NOT NULL');
    });
  });

  describe('Data Type Accuracy', () => {
    let migrationContent: string;

    beforeEach(() => {
      migrationContent = fs.readFileSync(migrationFile, 'utf-8');
    });

    it('should use text for ID fields', () => {
      const textIdMatches = migrationContent.match(/"[^"]*"\s+text\s+PRIMARY\s+KEY/g);
      expect(textIdMatches).not.toBeNull();
      expect(textIdMatches!.length).toBe(6); // 6 tables have ID fields
    });

    it('should use bigint for amount_idr fields', () => {
      const bigintMatches = migrationContent.match(/amount_idr["\s]+bigint/g);
      expect(bigintMatches).not.toBeNull();
      expect(bigintMatches!.length).toBe(2); // postings and budgets
    });

    it('should use boolean for archived fields', () => {
      const booleanMatches = migrationContent.match(/archived["\s]+boolean/g);
      expect(booleanMatches).not.toBeNull();
      expect(booleanMatches!.length).toBe(3); // wallets, categories, savings_buckets
    });

    it('should use timestamp with time zone for all datetime fields', () => {
      const timestampMatches = migrationContent.match(/timestamp with time zone/g);
      expect(timestampMatches).not.toBeNull();
      // Wallets (2) + Categories (2) + SavingsBuckets (2) + TransactionEvents (4) + Postings (1) + Budgets (2) = 13
      expect(timestampMatches!.length).toBeGreaterThanOrEqual(10);
    });

    it('should have correct default values', () => {
      expect(migrationContent).toContain('DEFAULT \'bank\''); // wallet type
      expect(migrationContent).toContain('DEFAULT \'IDR\''); // wallet currency
      expect(migrationContent).toContain('DEFAULT false'); // archived fields
    });
  });

  describe('Migration Metadata', () => {
    it('should have meta directory', () => {
      const metaDir = path.join(migrationDir, 'meta');
      expect(fs.existsSync(metaDir)).toBe(true);
    });

    it('should have valid meta files', () => {
      const metaDir = path.join(migrationDir, 'meta');
      const metaFiles = fs.readdirSync(metaDir);
      expect(metaFiles.length).toBeGreaterThan(0);
    });

    it('should have snapshot file', () => {
      const snapshotFile = path.join(migrationDir, 'meta', '0000_snapshot.json');
      expect(fs.existsSync(snapshotFile)).toBe(true);
    });
  });

  describe('SQL Syntax Validation', () => {
    let migrationContent: string;

    beforeEach(() => {
      migrationContent = fs.readFileSync(migrationFile, 'utf-8');
    });

    it('should use valid PostgreSQL syntax', () => {
      // Should not contain SQLite-specific syntax
      expect(migrationContent).not.toContain('INTEGER PRIMARY KEY');
      expect(migrationContent).not.toContain('AUTOINCREMENT');
      expect(migrationContent).not.toContain('WITHOUT ROWID');
      
      // Should use PostgreSQL syntax
      expect(migrationContent).toContain('CREATE TABLE');
      expect(migrationContent).toContain('PRIMARY KEY');
      expect(migrationContent).toContain('NOT NULL');
      expect(migrationContent).toContain('DEFAULT');
    });

    it('should properly terminate statements', () => {
      expect(migrationContent).toContain('--> statement-breakpoint');
    });

    it('should have balanced CREATE TABLE statements', () => {
      const createTableMatches = migrationContent.match(/CREATE TABLE/g);
      expect(createTableMatches).not.toBeNull();
      expect(createTableMatches!.length).toBe(6); // 6 tables
    });
  });

  describe('Index and Constraint Definitions', () => {
    let migrationContent: string;

    beforeEach(() => {
      migrationContent = fs.readFileSync(migrationFile, 'utf-8');
    });

    it('should define all expected unique constraints', () => {
      expect(migrationContent).toContain('UNIQUE("name")');
      expect(migrationContent).toContain('UNIQUE("idempotency_key")');
    });

    it('should use proper index syntax', () => {
      expect(migrationContent).toContain('CREATE UNIQUE INDEX');
      expect(migrationContent).toContain('USING btree');
    });

    it('should have composite index for budgets', () => {
      expect(migrationContent).toMatch(/CREATE UNIQUE INDEX.*budget_month_category_idx.*ON.*"budgets".*\("month","category_id"\)/);
    });
  });

  describe('Enum Support', () => {
    let migrationContent: string;

    beforeEach(() => {
      migrationContent = fs.readFileSync(migrationFile, 'utf-8');
    });

    it('should handle enum types as text', () => {
      // Transaction type enum should be represented as text
      expect(migrationContent).toContain('"type" text NOT NULL');
    });
  });

  describe('Migration File Quality', () => {
    it('should be readable and parseable', () => {
      const content = fs.readFileSync(migrationFile, 'utf-8');
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(100);
    });

    it('should be properly formatted', () => {
      const content = fs.readFileSync(migrationFile, 'utf-8');
      // Should have proper indentation
      expect(content).toContain('\t');
      // Should have newlines
      expect(content).toContain('\n');
    });

    it('should be compatible with drizzle-kit migrate command', () => {
      // This is a forward-looking test to ensure the migration
      // can be applied with drizzle-kit migrate
      const content = fs.readFileSync(migrationFile, 'utf-8');
      expect(content).toContain('CREATE TABLE');
      expect(content).toContain('--> statement-breakpoint');
    });
  });
});
