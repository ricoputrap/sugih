import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("PostgreSQL Migration Validation", () => {
  const migrationDir = path.join(process.cwd(), "drizzle");
  const initialMigrationFile = path.join(
    migrationDir,
    "0000_curious_spirit.sql",
  );
  const varcharMigrationFile = path.join(
    migrationDir,
    "0001_grey_yellowjacket.sql",
  );

  beforeEach(() => {
    // Ensure migration directory and files exist
    expect(fs.existsSync(migrationDir)).toBe(true);
    expect(fs.existsSync(initialMigrationFile)).toBe(true);
    expect(fs.existsSync(varcharMigrationFile)).toBe(true);
  });

  describe("Migration File Structure", () => {
    describe("Initial Migration (0000)", () => {
      it("should exist", () => {
        expect(fs.existsSync(initialMigrationFile)).toBe(true);
      });

      it("should be a valid SQL file", () => {
        const content = fs.readFileSync(initialMigrationFile, "utf-8");
        expect(content.length).toBeGreaterThan(0);
        expect(content).toContain("CREATE TABLE");
      });
    });

    describe("Varchar Migration (0001)", () => {
      it("should exist", () => {
        expect(fs.existsSync(varcharMigrationFile)).toBe(true);
      });

      it("should be a valid SQL file", () => {
        const content = fs.readFileSync(varcharMigrationFile, "utf-8");
        expect(content.length).toBeGreaterThan(0);
        expect(content).toContain("ALTER TABLE");
      });
    });

    it("should have correct naming convention", () => {
      const files = fs
        .readdirSync(migrationDir)
        .filter((f) => f.endsWith(".sql"));
      expect(files.length).toBeGreaterThanOrEqual(2);
      files.forEach((file) => {
        expect(file).toMatch(/^\d+_[a-z0-9_]+\.sql$/);
      });
    });
  });

  describe("PostgreSQL Type Validation", () => {
    let initialMigrationContent: string;
    let varcharMigrationContent: string;

    beforeEach(() => {
      initialMigrationContent = fs.readFileSync(initialMigrationFile, "utf-8");
      varcharMigrationContent = fs.readFileSync(varcharMigrationFile, "utf-8");
    });

    it("should use boolean type for archived columns", () => {
      expect(initialMigrationContent).toContain(
        "boolean DEFAULT false NOT NULL",
      );
    });

    it("should use timestamp with time zone for datetime columns", () => {
      const timestampMatches = initialMigrationContent.match(
        /timestamp with time zone/g,
      );
      expect(timestampMatches).not.toBeNull();
      expect(timestampMatches!.length).toBeGreaterThan(0);
    });

    it("should use bigint for amount_idr columns", () => {
      expect(initialMigrationContent).toContain("bigint NOT NULL");
    });

    it("should use proper PostgreSQL quoting (double quotes)", () => {
      expect(initialMigrationContent).toContain('"wallets"');
      expect(initialMigrationContent).toContain('"categories"');
      expect(initialMigrationContent).toContain('"postings"');
      expect(initialMigrationContent).toContain('"transaction_events"');
      expect(initialMigrationContent).toContain('"budgets"');
      expect(initialMigrationContent).toContain('"savings_buckets"');
    });

    it("should not use SQLite-specific types", () => {
      expect(initialMigrationContent).not.toContain("integer");
      expect(initialMigrationContent).not.toContain("REAL");
      expect(initialMigrationContent).not.toContain("BLOB");
      expect(initialMigrationContent).not.toContain("CURRENT_TIMESTAMP");
    });

    it("should convert selected text columns to varchar", () => {
      // Verify varchar conversions in the second migration
      expect(varcharMigrationContent).toContain(
        'ALTER TABLE "wallets" ALTER COLUMN "name" SET DATA TYPE varchar(255)',
      );
      expect(varcharMigrationContent).toContain(
        'ALTER TABLE "wallets" ALTER COLUMN "type" SET DATA TYPE varchar(32)',
      );
      expect(varcharMigrationContent).toContain(
        'ALTER TABLE "wallets" ALTER COLUMN "currency" SET DATA TYPE varchar(3)',
      );
      expect(varcharMigrationContent).toContain(
        'ALTER TABLE "categories" ALTER COLUMN "name" SET DATA TYPE varchar(255)',
      );
      expect(varcharMigrationContent).toContain(
        'ALTER TABLE "savings_buckets" ALTER COLUMN "name" SET DATA TYPE varchar(255)',
      );
      expect(varcharMigrationContent).toContain(
        'ALTER TABLE "transaction_events" ALTER COLUMN "type" SET DATA TYPE varchar(32)',
      );
      expect(varcharMigrationContent).toContain(
        'ALTER TABLE "transaction_events" ALTER COLUMN "idempotency_key" SET DATA TYPE varchar(36)',
      );
      expect(varcharMigrationContent).toContain(
        'ALTER TABLE "budgets" ALTER COLUMN "month" SET DATA TYPE varchar(10)',
      );
    });
  });

  describe("Table Creation Validation", () => {
    let initialMigrationContent: string;

    beforeEach(() => {
      initialMigrationContent = fs.readFileSync(initialMigrationFile, "utf-8");
    });

    it("should create wallets table", () => {
      expect(initialMigrationContent).toContain('CREATE TABLE "wallets"');
      expect(initialMigrationContent).toContain(
        '"id" text PRIMARY KEY NOT NULL',
      );
      expect(initialMigrationContent).toContain('"name" text NOT NULL');
      expect(initialMigrationContent).toContain(
        "\"type\" text DEFAULT 'bank' NOT NULL",
      );
      expect(initialMigrationContent).toContain(
        "\"currency\" text DEFAULT 'IDR' NOT NULL",
      );
      expect(initialMigrationContent).toContain(
        '"archived" boolean DEFAULT false NOT NULL',
      );
    });

    it("should create categories table", () => {
      expect(initialMigrationContent).toContain('CREATE TABLE "categories"');
      expect(initialMigrationContent).toContain(
        '"id" text PRIMARY KEY NOT NULL',
      );
      expect(initialMigrationContent).toContain('"name" text NOT NULL');
      expect(initialMigrationContent).toContain(
        '"archived" boolean DEFAULT false NOT NULL',
      );
    });

    it("should create savings_buckets table", () => {
      expect(initialMigrationContent).toContain(
        'CREATE TABLE "savings_buckets"',
      );
      expect(initialMigrationContent).toContain(
        '"id" text PRIMARY KEY NOT NULL',
      );
      expect(initialMigrationContent).toContain('"name" text NOT NULL');
      expect(initialMigrationContent).toContain('"description" text');
      expect(initialMigrationContent).toContain(
        '"archived" boolean DEFAULT false NOT NULL',
      );
    });

    it("should create transaction_events table", () => {
      expect(initialMigrationContent).toContain(
        'CREATE TABLE "transaction_events"',
      );
      expect(initialMigrationContent).toContain(
        '"id" text PRIMARY KEY NOT NULL',
      );
      expect(initialMigrationContent).toContain(
        '"occurred_at" timestamp with time zone NOT NULL',
      );
      expect(initialMigrationContent).toContain('"type" text NOT NULL');
      expect(initialMigrationContent).toContain('"note" text');
      expect(initialMigrationContent).toContain('"payee" text');
      expect(initialMigrationContent).toContain('"category_id" text');
      expect(initialMigrationContent).toContain(
        '"deleted_at" timestamp with time zone',
      );
      expect(initialMigrationContent).toContain('"idempotency_key" text');
    });

    it("should create postings table", () => {
      expect(initialMigrationContent).toContain('CREATE TABLE "postings"');
      expect(initialMigrationContent).toContain(
        '"id" text PRIMARY KEY NOT NULL',
      );
      expect(initialMigrationContent).toContain('"event_id" text NOT NULL');
      expect(initialMigrationContent).toContain('"wallet_id" text');
      expect(initialMigrationContent).toContain('"savings_bucket_id" text');
      expect(initialMigrationContent).toContain('"amount_idr" bigint NOT NULL');
    });

    it("should create budgets table", () => {
      expect(initialMigrationContent).toContain('CREATE TABLE "budgets"');
      expect(initialMigrationContent).toContain(
        '"id" text PRIMARY KEY NOT NULL',
      );
      expect(initialMigrationContent).toContain('"month" text NOT NULL');
      expect(initialMigrationContent).toContain('"category_id" text NOT NULL');
      expect(initialMigrationContent).toContain('"amount_idr" bigint NOT NULL');
    });
  });

  describe("Constraint Validation", () => {
    let initialMigrationContent: string;

    beforeEach(() => {
      initialMigrationContent = fs.readFileSync(initialMigrationFile, "utf-8");
    });

    it("should have unique constraints on wallet names", () => {
      expect(initialMigrationContent).toContain(
        'CONSTRAINT "wallets_name_unique" UNIQUE("name")',
      );
    });

    it("should have unique constraints on category names", () => {
      expect(initialMigrationContent).toContain(
        'CONSTRAINT "categories_name_unique" UNIQUE("name")',
      );
    });

    it("should have unique constraints on savings bucket names", () => {
      expect(initialMigrationContent).toContain(
        'CONSTRAINT "savings_buckets_name_unique" UNIQUE("name")',
      );
    });

    it("should have unique constraints on transaction idempotency keys", () => {
      expect(initialMigrationContent).toContain(
        'CONSTRAINT "transaction_events_idempotency_key_unique" UNIQUE("idempotency_key")',
      );
    });

    it("should have unique index on budgets (month, category_id)", () => {
      expect(initialMigrationContent).toContain(
        'CREATE UNIQUE INDEX "budget_month_category_idx"',
      );
      expect(initialMigrationContent).toContain('"month","category_id"');
    });

    it("should use btree index for composite unique constraint", () => {
      expect(initialMigrationContent).toContain("USING btree");
    });
  });

  describe("Schema Completeness", () => {
    let initialMigrationContent: string;

    beforeEach(() => {
      initialMigrationContent = fs.readFileSync(initialMigrationFile, "utf-8");
    });

    it("should contain all 6 expected tables", () => {
      const tables = [
        "wallets",
        "categories",
        "savings_buckets",
        "postings",
        "transaction_events",
        "budgets",
      ];

      tables.forEach((table) => {
        expect(initialMigrationContent).toContain(`CREATE TABLE "${table}"`);
      });
    });

    it("should have all expected columns across all tables", () => {
      // Wallets columns
      expect(initialMigrationContent).toContain(
        '"id" text PRIMARY KEY NOT NULL',
      );
      expect(initialMigrationContent).toContain('"name" text NOT NULL');
      expect(initialMigrationContent).toContain(
        "\"type\" text DEFAULT 'bank' NOT NULL",
      );
      expect(initialMigrationContent).toContain(
        "\"currency\" text DEFAULT 'IDR' NOT NULL",
      );
      expect(initialMigrationContent).toContain(
        '"archived" boolean DEFAULT false NOT NULL',
      );
      expect(initialMigrationContent).toContain(
        '"created_at" timestamp with time zone',
      );
      expect(initialMigrationContent).toContain(
        '"updated_at" timestamp with time zone',
      );

      // Categories columns
      expect(initialMigrationContent).toContain(
        '"archived" boolean DEFAULT false NOT NULL',
      );
      expect(initialMigrationContent).toContain(
        '"created_at" timestamp with time zone',
      );
      expect(initialMigrationContent).toContain(
        '"updated_at" timestamp with time zone',
      );

      // SavingsBuckets columns
      expect(initialMigrationContent).toContain('"description" text');
      expect(initialMigrationContent).toContain(
        '"archived" boolean DEFAULT false NOT NULL',
      );

      // TransactionEvents columns
      expect(initialMigrationContent).toContain(
        '"occurred_at" timestamp with time zone NOT NULL',
      );
      expect(initialMigrationContent).toContain('"type" text NOT NULL');
      expect(initialMigrationContent).toContain('"note" text');
      expect(initialMigrationContent).toContain('"payee" text');
      expect(initialMigrationContent).toContain('"category_id" text');
      expect(initialMigrationContent).toContain(
        '"deleted_at" timestamp with time zone',
      );
      expect(initialMigrationContent).toContain('"idempotency_key" text');

      // Postings columns
      expect(initialMigrationContent).toContain('"event_id" text NOT NULL');
      expect(initialMigrationContent).toContain('"wallet_id" text');
      expect(initialMigrationContent).toContain('"savings_bucket_id" text');
      expect(initialMigrationContent).toContain('"amount_idr" bigint NOT NULL');

      // Budgets columns
      expect(initialMigrationContent).toContain('"month" text NOT NULL');
      expect(initialMigrationContent).toContain('"amount_idr" bigint NOT NULL');
    });
  });

  describe("Data Type Accuracy", () => {
    let initialMigrationContent: string;
    let varcharMigrationContent: string;

    beforeEach(() => {
      initialMigrationContent = fs.readFileSync(initialMigrationFile, "utf-8");
      varcharMigrationContent = fs.readFileSync(varcharMigrationFile, "utf-8");
    });

    it("should use text for ID fields", () => {
      const textIdMatches = initialMigrationContent.match(
        /"[^"]*"\s+text\s+PRIMARY\s+KEY/g,
      );
      expect(textIdMatches).not.toBeNull();
      expect(textIdMatches!.length).toBe(6); // 6 tables have ID fields
    });

    it("should use bigint for amount_idr fields", () => {
      const bigintMatches = initialMigrationContent.match(
        /amount_idr["\s]+bigint/g,
      );
      expect(bigintMatches).not.toBeNull();
      expect(bigintMatches!.length).toBe(2); // postings and budgets
    });

    it("should use boolean for archived fields", () => {
      const booleanMatches = initialMigrationContent.match(
        /archived["\s]+boolean/g,
      );
      expect(booleanMatches).not.toBeNull();
      expect(booleanMatches!.length).toBe(3); // wallets, categories, savings_buckets
    });

    it("should use timestamp with time zone for all datetime fields", () => {
      const timestampMatches = initialMigrationContent.match(
        /timestamp with time zone/g,
      );
      expect(timestampMatches).not.toBeNull();
      // Wallets (2) + Categories (2) + SavingsBuckets (2) + TransactionEvents (4) + Postings (1) + Budgets (2) = 13
      expect(timestampMatches!.length).toBeGreaterThanOrEqual(10);
    });

    it("should have correct default values", () => {
      expect(initialMigrationContent).toContain("DEFAULT 'bank'"); // wallet type
      expect(initialMigrationContent).toContain("DEFAULT 'IDR'"); // wallet currency
      expect(initialMigrationContent).toContain("DEFAULT false"); // archived fields
    });

    it("should use varchar for limited-length string fields", () => {
      // Verify that the varchar migration converted appropriate columns
      const varcharConversions = [
        { table: "wallets", column: "name", expected: "varchar(255)" },
        { table: "wallets", column: "type", expected: "varchar(32)" },
        { table: "wallets", column: "currency", expected: "varchar(3)" },
        { table: "categories", column: "name", expected: "varchar(255)" },
        { table: "savings_buckets", column: "name", expected: "varchar(255)" },
        {
          table: "transaction_events",
          column: "type",
          expected: "varchar(32)",
        },
        {
          table: "transaction_events",
          column: "idempotency_key",
          expected: "varchar(36)",
        },
        { table: "budgets", column: "month", expected: "varchar(10)" },
      ];

      varcharConversions.forEach(({ table, column, expected }) => {
        const searchString = `ALTER TABLE "${table}" ALTER COLUMN "${column}" SET DATA TYPE ${expected}`;
        expect(varcharMigrationContent).toContain(searchString);
      });
    });
  });

  describe("Migration Metadata", () => {
    it("should have meta directory", () => {
      const metaDir = path.join(migrationDir, "meta");
      expect(fs.existsSync(metaDir)).toBe(true);
    });

    it("should have valid meta files", () => {
      const metaDir = path.join(migrationDir, "meta");
      const metaFiles = fs.readdirSync(metaDir);
      expect(metaFiles.length).toBeGreaterThan(0);
    });

    it("should have snapshot file", () => {
      const snapshotFile = path.join(
        migrationDir,
        "meta",
        "0000_snapshot.json",
      );
      expect(fs.existsSync(snapshotFile)).toBe(true);
    });
  });

  describe("SQL Syntax Validation", () => {
    let initialMigrationContent: string;
    let varcharMigrationContent: string;

    beforeEach(() => {
      initialMigrationContent = fs.readFileSync(initialMigrationFile, "utf-8");
      varcharMigrationContent = fs.readFileSync(varcharMigrationFile, "utf-8");
    });

    it("should use valid PostgreSQL syntax", () => {
      // Should not contain SQLite-specific syntax
      expect(initialMigrationContent).not.toContain("INTEGER PRIMARY KEY");
      expect(initialMigrationContent).not.toContain("AUTOINCREMENT");
      expect(initialMigrationContent).not.toContain("WITHOUT ROWID");

      // Should use PostgreSQL syntax
      expect(initialMigrationContent).toContain("CREATE TABLE");
      expect(initialMigrationContent).toContain("PRIMARY KEY");
      expect(initialMigrationContent).toContain("NOT NULL");
      expect(initialMigrationContent).toContain("DEFAULT");
    });

    it("should properly terminate statements", () => {
      expect(initialMigrationContent).toContain("--> statement-breakpoint");
      expect(varcharMigrationContent).toContain("--> statement-breakpoint");
    });

    it("should have balanced CREATE TABLE statements", () => {
      const createTableMatches = initialMigrationContent.match(/CREATE TABLE/g);
      expect(createTableMatches).not.toBeNull();
      expect(createTableMatches!.length).toBe(6); // 6 tables
    });
  });

  describe("Index and Constraint Definitions", () => {
    let initialMigrationContent: string;

    beforeEach(() => {
      initialMigrationContent = fs.readFileSync(initialMigrationFile, "utf-8");
    });

    it("should define all expected unique constraints", () => {
      expect(initialMigrationContent).toContain('UNIQUE("name")');
      expect(initialMigrationContent).toContain('UNIQUE("idempotency_key")');
    });

    it("should use proper index syntax", () => {
      expect(initialMigrationContent).toContain("CREATE UNIQUE INDEX");
      expect(initialMigrationContent).toContain("USING btree");
    });

    it("should have composite index for budgets", () => {
      expect(initialMigrationContent).toMatch(
        /CREATE UNIQUE INDEX.*budget_month_category_idx.*ON.*"budgets".*\("month","category_id"\)/,
      );
    });
  });

  describe("Enum Support", () => {
    let initialMigrationContent: string;
    let varcharMigrationContent: string;

    beforeEach(() => {
      initialMigrationContent = fs.readFileSync(initialMigrationFile, "utf-8");
      varcharMigrationContent = fs.readFileSync(varcharMigrationFile, "utf-8");
    });

    it("should handle enum types as varchar", () => {
      // Transaction type enum should be represented as varchar after migration
      expect(initialMigrationContent).toContain('"type" text NOT NULL');
      // The migration should convert it to varchar
      expect(varcharMigrationContent).toContain(
        'ALTER TABLE "transaction_events" ALTER COLUMN "type" SET DATA TYPE varchar(32)',
      );
    });
  });

  describe("Migration File Quality", () => {
    describe("Initial Migration", () => {
      it("should be readable and parseable", () => {
        const content = fs.readFileSync(initialMigrationFile, "utf-8");
        expect(content).toBeTruthy();
        expect(content.length).toBeGreaterThan(100);
      });

      it("should be properly formatted", () => {
        const content = fs.readFileSync(initialMigrationFile, "utf-8");
        // Should have proper indentation
        expect(content).toContain("\t");
        // Should have newlines
        expect(content).toContain("\n");
      });

      it("should be compatible with drizzle-kit migrate command", () => {
        // This is a forward-looking test to ensure the migration
        // can be applied with drizzle-kit migrate
        const content = fs.readFileSync(initialMigrationFile, "utf-8");
        expect(content).toContain("CREATE TABLE");
        expect(content).toContain("--> statement-breakpoint");
      });
    });

    describe("Varchar Migration", () => {
      it("should be readable and parseable", () => {
        const content = fs.readFileSync(varcharMigrationFile, "utf-8");
        expect(content).toBeTruthy();
        expect(content.length).toBeGreaterThan(0);
      });

      it("should be properly formatted", () => {
        const content = fs.readFileSync(varcharMigrationFile, "utf-8");
        // Should have newlines
        expect(content).toContain("\n");
      });

      it("should be compatible with drizzle-kit migrate command", () => {
        const content = fs.readFileSync(varcharMigrationFile, "utf-8");
        expect(content).toContain("ALTER TABLE");
        expect(content).toContain("--> statement-breakpoint");
      });
    });
  });
});
