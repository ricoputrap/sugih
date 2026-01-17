# Drizzle ORM Migration Plan V2

## Overview

This document provides a structured, phased plan to migrate the Sugih personal finance application from direct SQL using the `postgres` package to **Drizzle ORM with `drizzle-orm/node-postgres` adapter**.

**Migration Philosophy**: "Client-Side UI, Server-Side Logic, Type-Safe ORM." We use Drizzle ORM's Query Builder for all database interactions, ensuring type safety and leveraging Drizzle's full feature set.

**Current State**:

- Using `postgres` package (v3.4.7) with template literal SQL queries
- Drizzle schemas already defined in each module's `schema.ts`
- Direct SQL queries in `actions.ts` files
- PostgreSQL 16 database

**Target State**:

- Using `drizzle-orm/node-postgres` with Drizzle Query Builder
- Type-safe queries with full TypeScript inference
- All CRUD operations using Drizzle's API
- Consistent patterns across all modules

---

## Prerequisites

### Phase 0: Infrastructure Setup

- [x] **Step 0.1**: Install dependencies (Drizzle ORM, pg driver, types)
- [x] **Step 0.2**: Create `src/db/drizzle-client.ts` (Drizzle + pg Pool client)
- [x] **Step 0.3**: Verify `DATABASE_URL` environment variable works
- [x] **Step 0.4**: Update `drizzle.config.ts` for node-postgres adapter
- [x] **Step 0.5**: Update test setup to mock new Drizzle client

#### Step 0.1: Install Dependencies

```bash
# Remove the current postgres package
pnpm remove postgres

# Install the required packages for drizzle-orm with node-postgres
pnpm add pg
pnpm add -D @types/pg

# Ensure drizzle-orm is up to date
pnpm add drizzle-orm@latest
```

#### Step 0.2: Create Drizzle Client

Create `src/db/drizzle-client.ts`:

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getDatabaseConfig } from "@/db/config";
import * as schema from "./schema";

// Singleton pattern for database connection with pooling
let pool: Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Get the Drizzle database instance
 *
 * Uses DATABASE_URL from environment (already parsed in config.ts).
 * No need for individual PGHOST/PGPORT/PGUSER etc.
 */
export function getDb() {
  if (!db || !pool) {
    const config = getDatabaseConfig();

    pool = new Pool({
      connectionString: config.url,
      max: config.maxConnections,
      idleTimeoutMillis: config.idleTimeout,
      connectionTimeoutMillis: config.connectionTimeout,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
    });

    db = drizzle(pool, { schema });
  }

  return db!;
}

/**
 * Get the raw pg Pool for advanced operations
 */
export function getPool(): Pool {
  if (!pool) {
    getDb(); // Initialize pool
  }
  return pool!;
}

/**
 * Close the database connection pool
 *
 * Call this during application shutdown or test teardown.
 */
export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

/**
 * Check database connectivity
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const database = getDb();
    await database.execute({ sql: "SELECT 1" });
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

// Re-export Drizzle utilities
export {
  sql,
  eq,
  and,
  or,
  desc,
  asc,
  isNull,
  isNotNull,
  gte,
  lte,
  gt,
  lt,
  inArray,
  notInArray,
} from "drizzle-orm";
```

#### Step 0.3: Verify DATABASE_URL

Ensure your `.env` file contains:

```bash
DATABASE_URL=postgresql://user:password@host:port/database
```

**Note**: You do NOT need to add individual PGHOST, PGPORT, PGUSER, etc. The existing `getDatabaseConfig()` in `src/db/config.ts` parses all connection details from `DATABASE_URL`.

#### Step 0.4: Update drizzle.config.ts

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

#### Step 0.5: Update Test Setup

Update `src/test/setup.ts`:

```typescript
import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Mock environment variables for testing
vi.mock("./lib/env", () => ({
  env: {
    DATABASE_URL: "postgresql://test:test@localhost:5432/sugih_test",
    NODE_ENV: "test",
  },
}));

// Mock Drizzle database connection for tests
vi.mock("../db/drizzle-client", () => {
  return {
    getDb: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
      execute: vi.fn().mockResolvedValue({ rows: [] }),
      transaction: vi.fn().mockImplementation(async (cb) => {
        const tx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
          execute: vi.fn().mockResolvedValue({ rows: [] }),
        };
        return cb(tx as any);
      }),
    })),
    getPool: vi.fn(() => ({
      connect: vi.fn(),
      query: vi.fn(),
      end: vi.fn(),
    })),
    closeDb: vi.fn(),
    healthCheck: vi.fn(() => Promise.resolve(true)),
  };
});

// Suppress console warnings during tests
const originalWarn = console.warn;
vi.stubGlobal("console", {
  ...console,
  warn: (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning:") || args[0].includes("ReactDOM.render"))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  },
});
```

---

## Migration Order

We follow a **dependency-aware migration order**:

1. **Category** - Simplest, no foreign key dependencies
2. **Wallet** - Simple, no foreign key dependencies
3. **Savings Bucket** - Simple, no foreign key dependencies
4. **Budget** - Depends on Category
5. **Transaction** - Depends on Wallet, Category, SavingsBucket
6. **Report** - Read-only, depends on all above (aggregations)
7. **Dashboard** - Aggregates data from Report and Transaction

**Principle**: Complete the Backend AND Frontend of a module before moving to the next.

---

## Module Migration Format

For each module, we follow this format:

```markdown
## Phase X: [Module Name] Module

### Backend (Actions)

- [ ] **Step X.1**: Update imports (use new Drizzle client)
- [ ] **Step X.2**: Migrate CRUD operations to use Drizzle Query Builder
- [ ] **Step X.3**: Verify all operations work correctly

### Frontend (Components & Pages)

- [ ] **Step X.4**: Update imports in components
- [ ] **Step X.5**: Verify UI integration

### Tests

- [ ] **Step X.6**: Create integration tests for all functionalities
- [ ] **Step X.7**: Run and verify tests pass

### Verification

- [ ] **Step X.8**: Manual testing of all features
- [ ] **Step X.9**: API route verification
```

---

## Phase 1: Category Module (Backend Only)

**Priority**: HIGH - Simplest module, good for validating the migration pattern.

### Backend Actions

- [x] **Step 1.1**: Update imports in `src/modules/Category/actions.ts` ✅

```typescript
// Before
import { getDb } from "@/db/client";

// After
import { getDb, eq, and, sql, isNull, desc, asc } from "@/db/drizzle-client";
import { categories } from "./schema";
```

- [x] **Step 1.2**: Migrate `listCategories()` using Drizzle `sql` tag ✅

```typescript
// Before: Template literal SQL (old postgres client)
export async function listCategories(): Promise<Category[]> {
  const db = getDb();
  const categories = await db<Category[]>`
    SELECT id, name, archived, created_at, updated_at
    FROM categories
    ORDER BY name ASC
  `;
  return Array.from(categories);
}

// After: Drizzle ORM with sql tag and execute()
export async function listCategories(): Promise<Category[]> {
  const db = getDb();
  const result = await db.execute(
    sql`SELECT id, name, archived, created_at, updated_at FROM categories ORDER BY name ASC`,
  );
  return result.rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    archived: row.archived as boolean,
    created_at: row.created_at,
    updated_at: row.updated_at,
  })) as Category[];
}
```

**Approach**: Using Drizzle's `sql` tagged template literal with `db.execute()`. Safe from SQL injection (Drizzle parameterizes values). Raw SQL provides full control and avoids TypeScript schema type conflicts.

- [x] **Step 1.3**: Migrate `getCategoryById()` to use `sql` tag ✅

```typescript
export async function getCategoryById(id: string): Promise<Category | null> {
  const db = getDb();
  const result = await db.execute(
    sql`SELECT id, name, archived, created_at, updated_at FROM categories WHERE id = ${id}`,
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id as string,
    name: row.name as string,
    archived: row.archived as boolean,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
```

- [x] **Step 1.4**: Migrate `createCategory()` to use `sql` tag ✅

```typescript
export async function createCategory(input: unknown): Promise<Category> {
  const db = getDb();
  const validatedInput = CategoryCreateSchema.parse(input);
  const id = nanoid();

  // Check for duplicate name
  const existing = await db.execute(
    sql`SELECT id FROM categories WHERE name = ${validatedInput.name}`,
  );
  if (existing.rows.length > 0) {
    throw new Error("Category name already exists");
  }

  const now = new Date();
  await db.execute(
    sql`INSERT INTO categories (id, name, archived, created_at, updated_at)
        VALUES (${id}, ${validatedInput.name}, ${false}, ${now}, ${now})`,
  );

  return getCategoryById(id)!;
}
```

- [x] **Step 1.5**: Migrate `updateCategory()` to use `sql` tag ✅

```typescript
export async function updateCategory(
  id: string,
  input: unknown,
): Promise<Category> {
  const db = getDb();
  const validatedInput = CategoryUpdateSchema.parse(input);

  // Check if category exists
  const existing = await getCategoryById(id);
  if (!existing) {
    throw new Error("Category not found");
  }

  // Check for duplicate name
  if (validatedInput.name !== undefined) {
    const nameConflict = await db.execute(
      sql`SELECT id FROM categories WHERE name = ${validatedInput.name} AND id != ${id}`,
    );
    if (nameConflict.rows.length > 0) {
      throw new Error("Category name already exists");
    }
  }

  const now = new Date();
  if (
    validatedInput.name !== undefined &&
    validatedInput.archived !== undefined
  ) {
    await db.execute(
      sql`UPDATE categories SET name = ${validatedInput.name}, archived = ${validatedInput.archived}, updated_at = ${now} WHERE id = ${id}`,
    );
  } else if (validatedInput.name !== undefined) {
    await db.execute(
      sql`UPDATE categories SET name = ${validatedInput.name}, updated_at = ${now} WHERE id = ${id}`,
    );
  } else if (validatedInput.archived !== undefined) {
    await db.execute(
      sql`UPDATE categories SET archived = ${validatedInput.archived}, updated_at = ${now} WHERE id = ${id}`,
    );
  }

  return getCategoryById(id)!;
}
```

- [x] **Step 1.6**: Migrate `archiveCategory()` and `restoreCategory()` to use `sql` tag ✅

```typescript
export async function archiveCategory(id: string): Promise<Category> {
  const db = getDb();
  const existing = await getCategoryById(id);
  if (!existing) {
    throw new Error("Category not found");
  }
  if (existing.archived) {
    throw new Error("Category is already archived");
  }

  const now = new Date();
  await db.execute(
    sql`UPDATE categories SET archived = ${true}, updated_at = ${now} WHERE id = ${id}`,
  );

  return getCategoryById(id)!;
}

export async function restoreCategory(id: string): Promise<Category> {
  const db = getDb();
  const existing = await getCategoryById(id);
  if (!existing) {
    throw new Error("Category not found");
  }
  if (!existing.archived) {
    throw new Error("Category is not archived");
  }

  const now = new Date();
  await db.execute(
    sql`UPDATE categories SET archived = ${false}, updated_at = ${now} WHERE id = ${id}`,
  );

  return getCategoryById(id)!;
}
```

- [x] **Step 1.7**: Migrate `deleteCategory()` to use `sql` tag ✅

```typescript
export async function deleteCategory(id: string): Promise<void> {
  const db = getDb();
  const existing = await getCategoryById(id);
  if (!existing) {
    throw new Error("Category not found");
  }

  await db.execute(sql`DELETE FROM categories WHERE id = ${id}`);
}
```

- [x] **Step 1.8**: Migrate `getCategoryStats()` to use `sql` tag ✅

```typescript
export async function getCategoryStats(id: string): Promise<{
  transactionCount: number;
  totalAmount: number;
}> {
  const db = getDb();

  const result = await db.execute(
    sql`SELECT COUNT(*)::int as count, COALESCE(SUM(amount_idr), 0)::numeric as total
        FROM transactions WHERE category_id = ${id} AND deleted_at IS NULL`,
  );

  const stats = result.rows[0] || { count: 0, total: 0 };
  return {
    transactionCount: (stats.count as number) || 0,
    totalAmount: Number(stats.total) || 0,
  };
}
```

**Approach**: Using Drizzle's `sql` tagged template literal with `db.execute()` for all queries. Safe from SQL injection (Drizzle parameterizes values). Raw SQL provides full control and consistency across all functions.

### Tests

- [x] **Step 1.9**: Create `src/modules/Category/actions.integration.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { nanoid } from "nanoid";
import {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  archiveCategory,
  restoreCategory,
  deleteCategory,
  getCategoryStats,
} from "./actions";
import { getDb, closeDb } from "@/db/drizzle-client";
import { categories } from "./schema";
import { eq } from "drizzle-orm";

describe("Category Integration Tests", () => {
  const testCategoryIds: string[] = [];

  async function cleanupTestCategory(id: string) {
    const db = getDb();
    try {
      await db.delete(categories).where(eq(categories.id, id));
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }

  afterEach(async () => {
    for (const id of testCategoryIds) {
      await cleanupTestCategory(id);
    }
    testCategoryIds.length = 0;
  });

  afterAll(async () => {
    await closeDb();
  });

  describe("Create Category", () => {
    it("should create a new category with valid data", async () => {
      const name = `Test Category ${nanoid()}`;
      const category = await createCategory({ name });
      testCategoryIds.push(category.id);

      expect(category.id).toBeDefined();
      expect(category.name).toBe(name);
      expect(category.archived).toBe(false);
    });

    it("should reject duplicate category name", async () => {
      const name = `Duplicate ${nanoid()}`;
      const category = await createCategory({ name });
      testCategoryIds.push(category.id);

      await expect(createCategory({ name })).rejects.toThrow("already exists");
    });

    it("should reject empty category name", async () => {
      await expect(createCategory({ name: "" })).rejects.toThrow();
    });
  });

  describe("List Categories", () => {
    it("should list all categories ordered by name", async () => {
      const cat1 = await createCategory({ name: `Zebra ${nanoid()}` });
      const cat2 = await createCategory({ name: `Alpha ${nanoid()}` });
      testCategoryIds.push(cat1.id, cat2.id);

      const allCategories = await listCategories();
      const testCategories = allCategories.filter((c) =>
        testCategoryIds.includes(c.id),
      );

      expect(testCategories[0].name).toContain("Alpha");
      expect(testCategories[1].name).toContain("Zebra");
    });
  });

  describe("Get Category by ID", () => {
    it("should return category when ID exists", async () => {
      const created = await createCategory({ name: `Get Test ${nanoid()}` });
      testCategoryIds.push(created.id);

      const retrieved = await getCategoryById(created.id);
      expect(retrieved?.id).toBe(created.id);
    });

    it("should return null when ID does not exist", async () => {
      const retrieved = await getCategoryById("non-existent-id");
      expect(retrieved).toBeNull();
    });
  });

  describe("Update Category", () => {
    it("should update category name", async () => {
      const created = await createCategory({ name: `Update Test ${nanoid()}` });
      testCategoryIds.push(created.id);

      const newName = `Updated ${nanoid()}`;
      const updated = await updateCategory(created.id, { name: newName });

      expect(updated.name).toBe(newName);
    });
  });

  describe("Archive Category", () => {
    it("should archive an active category", async () => {
      const created = await createCategory({
        name: `Archive Test ${nanoid()}`,
      });
      testCategoryIds.push(created.id);

      const archived = await archiveCategory(created.id);
      expect(archived.archived).toBe(true);
    });
  });

  describe("Restore Category", () => {
    it("should restore an archived category", async () => {
      const created = await createCategory({
        name: `Restore Test ${nanoid()}`,
      });
      testCategoryIds.push(created.id);

      await archiveCategory(created.id);
      const restored = await restoreCategory(created.id);
      expect(restored.archived).toBe(false);
    });
  });

  describe("Delete Category", () => {
    it("should permanently delete a category", async () => {
      const created = await createCategory({ name: `Delete Test ${nanoid()}` });

      await deleteCategory(created.id);

      const retrieved = await getCategoryById(created.id);
      expect(retrieved).toBeNull();
    });
  });

  describe("Get Category Stats", () => {
    it("should return zero stats for category with no transactions", async () => {
      const created = await createCategory({ name: `Stats Test ${nanoid()}` });
      testCategoryIds.push(created.id);

      const stats = await getCategoryStats(created.id);
      expect(stats.transactionCount).toBe(0);
      expect(stats.totalAmount).toBe(0);
    });
  });
});
```

### Verification

- [x] **Step 1.10**: Run tests: `pnpm test src/modules/Category/actions.integration.test.ts`
- [x] **Step 1.11**: Manual test via API: `GET /api/categories`

---

## Phase 2: Wallet Module

**Priority**: HIGH - Simple module, no foreign key dependencies.

### Backend Actions

- [ ] **Step 2.1**: Update imports in `src/modules/Wallet/actions.ts`
- [ ] **Step 2.2**: Migrate `listWallets()` (includes balance calculation)
- [ ] **Step 2.3**: Migrate `getWalletById()`, `createWallet()`, `updateWallet()`
- [ ] **Step 2.4**: Migrate `archiveWallet()`, `restoreWallet()`, `deleteWallet()`
- [ ] **Step 2.5**: Migrate `getWalletStats()`

**Key Pattern for Balance Calculation using Drizzle**:

```typescript
export async function getWalletBalance(walletId: string): Promise<number> {
  const db = getDb();
  const { transactionEvents, postings } =
    await import("@/modules/Transaction/schema");

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${postings.amount_idr}), 0)::numeric`,
    })
    .from(postings)
    .innerJoin(transactionEvents, eq(postings.event_id, transactionEvents.id))
    .where(
      and(
        eq(postings.wallet_id, walletId),
        isNull(transactionEvents.deleted_at),
      ),
    );

  return Number(result[0]?.total) || 0;
}

export async function listWallets(): Promise<(Wallet & { balance: number })[]> {
  const db = getDb();

  const walletList = await db.select().from(wallets).orderBy(wallets.name);

  const walletsWithBalance = await Promise.all(
    walletList.map(async (wallet) => ({
      ...wallet,
      balance: await getWalletBalance(wallet.id),
    })),
  );

  return walletsWithBalance;
}
```

### Tests

- [ ] **Step 2.6**: Create `src/modules/Wallet/actions.integration.test.ts`

```typescript
import { describe, it, expect, afterEach, afterAll } from "vitest";
import { nanoid } from "nanoid";
import {
  listWallets,
  getWalletById,
  createWallet,
  updateWallet,
  archiveWallet,
  restoreWallet,
  deleteWallet,
  getWalletStats,
} from "./actions";
import { getDb, closeDb } from "@/db/drizzle-client";
import { wallets } from "./schema";
import { transactionEvents, postings } from "@/modules/Transaction/schema";
import { eq } from "drizzle-orm";

describe("Wallet Integration Tests", () => {
  const testWalletIds: string[] = [];

  async function cleanupTestWallet(id: string) {
    const db = getDb();
    try {
      await db.delete(postings).where(eq(postings.wallet_id, id));
      await db.delete(wallets).where(eq(wallets.id, id));
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }

  async function createTestPosting(walletId: string, amount: number) {
    const db = getDb();
    const eventId = nanoid();
    const postingId = nanoid();

    await db.insert(transactionEvents).values({
      id: eventId,
      occurred_at: new Date(),
      type: amount > 0 ? "income" : "expense",
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db.insert(postings).values({
      id: postingId,
      event_id: eventId,
      wallet_id: walletId,
      amount_idr: amount,
      created_at: new Date(),
    });
  }

  afterEach(async () => {
    for (const id of testWalletIds) {
      await cleanupTestWallet(id);
    }
    testWalletIds.length = 0;
  });

  afterAll(async () => {
    await closeDb();
  });

  describe("Create Wallet", () => {
    it("should create a new wallet with valid data", async () => {
      const wallet = await createWallet({
        name: `Test Wallet ${nanoid()}`,
        type: "bank",
        currency: "IDR",
      });
      testWalletIds.push(wallet.id);

      expect(wallet.id).toBeDefined();
      expect(wallet.type).toBe("bank");
      expect(wallet.archived).toBe(false);
    });

    it("should reject duplicate wallet name", async () => {
      const name = `Duplicate ${nanoid()}`;
      const wallet = await createWallet({ name, type: "bank" });
      testWalletIds.push(wallet.id);

      await expect(createWallet({ name, type: "cash" })).rejects.toThrow(
        "already exists",
      );
    });
  });

  describe("List Wallets with Balance", () => {
    it("should list wallets with zero balance when no postings", async () => {
      const wallet = await createWallet({
        name: `Zero ${nanoid()}`,
        type: "bank",
      });
      testWalletIds.push(wallet.id);

      const allWallets = await listWallets();
      const testWallet = allWallets.find((w) => w.id === wallet.id);
      expect(testWallet?.balance).toBe(0);
    });

    it("should calculate positive balance from income", async () => {
      const wallet = await createWallet({
        name: `Income ${nanoid()}`,
        type: "bank",
      });
      testWalletIds.push(wallet.id);

      await createTestPosting(wallet.id, 1000000);

      const allWallets = await listWallets();
      const testWallet = allWallets.find((w) => w.id === wallet.id);
      expect(testWallet?.balance).toBe(1000000);
    });

    it("should calculate net balance from multiple postings", async () => {
      const wallet = await createWallet({
        name: `Net ${nanoid()}`,
        type: "bank",
      });
      testWalletIds.push(wallet.id);

      await createTestPosting(wallet.id, 1000000);
      await createTestPosting(wallet.id, -300000);
      await createTestPosting(wallet.id, 500000);

      const allWallets = await listWallets();
      const testWallet = allWallets.find((w) => w.id === wallet.id);
      expect(testWallet?.balance).toBe(1200000);
    });
  });

  describe("Get Wallet Stats", () => {
    it("should return correct balance and transaction count", async () => {
      const wallet = await createWallet({
        name: `Stats ${nanoid()}`,
        type: "bank",
      });
      testWalletIds.push(wallet.id);

      await createTestPosting(wallet.id, 1000000);
      await createTestPosting(wallet.id, -300000);

      const stats = await getWalletStats(wallet.id);
      expect(stats.balance).toBe(700000);
      expect(stats.transactionCount).toBe(2);
    });
  });
});
```

### Verification

- [ ] **Step 2.7**: Run tests: `pnpm test src/modules/Wallet/actions.integration.test.ts`
- [ ] **Step 2.8**: Manual test via API: `GET /api/wallets`

---

## Phase 3: Savings Bucket Module

**Priority**: MEDIUM - Simple module, no foreign key dependencies.

### Backend Actions

- [ ] **Step 3.1**: Update imports in `src/modules/SavingsBucket/actions.ts`
- [ ] **Step 3.2**: Migrate all CRUD operations using Drizzle Query Builder

**Pattern for Savings Bucket CRUD**:

```typescript
// List all buckets
export async function listSavingsBuckets(): Promise<SavingsBucket[]> {
  const db = getDb();
  return await db.select().from(savingsBuckets).orderBy(savingsBuckets.name);
}

// Get by ID
export async function getSavingsBucketById(
  id: string,
): Promise<SavingsBucket | null> {
  const db = getDb();
  const result = await db
    .select()
    .from(savingsBuckets)
    .where(eq(savingsBuckets.id, id))
    .limit(1);
  return result[0] || null;
}

// Create
export async function createSavingsBucket(
  input: unknown,
): Promise<SavingsBucket> {
  const db = getDb();
  const validatedInput = SavingsBucketCreateSchema.parse(input);

  const existing = await db
    .select({ id: savingsBuckets.id })
    .from(savingsBuckets)
    .where(eq(savingsBuckets.name, validatedInput.name))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Savings bucket name already exists");
  }

  const [created] = await db
    .insert(savingsBuckets)
    .values({
      id: nanoid(),
      name: validatedInput.name,
      description: validatedInput.description,
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();

  return created;
}
```

### Tests

- [ ] **Step 3.3**: Create `src/modules/SavingsBucket/actions.integration.test.ts`

```typescript
import { describe, it, expect, afterEach, afterAll } from "vitest";
import { nanoid } from "nanoid";
import {
  listSavingsBuckets,
  getSavingsBucketById,
  createSavingsBucket,
  updateSavingsBucket,
  archiveSavingsBucket,
  restoreSavingsBucket,
  deleteSavingsBucket,
  getSavingsBucketStats,
} from "./actions";
import { getDb, closeDb } from "@/db/drizzle-client";
import { savingsBuckets } from "./schema";
import { eq } from "drizzle-orm";

describe("Savings Bucket Integration Tests", () => {
  const testBucketIds: string[] = [];

  async function cleanupTestBucket(id: string) {
    const db = getDb();
    try {
      await db.delete(savingsBuckets).where(eq(savingsBuckets.id, id));
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }

  afterEach(async () => {
    for (const id of testBucketIds) {
      await cleanupTestBucket(id);
    }
    testBucketIds.length = 0;
  });

  afterAll(async () => {
    await closeDb();
  });

  describe("Create Savings Bucket", () => {
    it("should create a new savings bucket", async () => {
      const bucket = await createSavingsBucket({
        name: `Test Bucket ${nanoid()}`,
        description: "Test description",
      });
      testBucketIds.push(bucket.id);

      expect(bucket.id).toBeDefined();
      expect(bucket.description).toBe("Test description");
    });

    it("should reject duplicate bucket name", async () => {
      const name = `Duplicate ${nanoid()}`;
      const bucket = await createSavingsBucket({ name });
      testBucketIds.push(bucket.id);

      await expect(createSavingsBucket({ name })).rejects.toThrow(
        "already exists",
      );
    });
  });

  describe("List Savings Buckets", () => {
    it("should list all buckets ordered by name", async () => {
      const b1 = await createSavingsBucket({ name: `Zebra ${nanoid()}` });
      const b2 = await createSavingsBucket({ name: `Alpha ${nanoid()}` });
      testBucketIds.push(b1.id, b2.id);

      const allBuckets = await listSavingsBuckets();
      const testBuckets = allBuckets.filter((b) =>
        testBucketIds.includes(b.id),
      );

      expect(testBuckets[0].name).toContain("Alpha");
    });
  });

  describe("Get Savings Bucket Stats", () => {
    it("should return zero stats for empty bucket", async () => {
      const bucket = await createSavingsBucket({ name: `Stats ${nanoid()}` });
      testBucketIds.push(bucket.id);

      const stats = await getSavingsBucketStats(bucket.id);
      expect(stats.transactionCount).toBe(0);
      expect(stats.totalAmount).toBe(0);
    });
  });
});
```

### Verification

- [ ] **Step 3.4**: Run tests: `pnpm test src/modules/SavingsBucket/actions.integration.test.ts`

---

## Phase 4: Budget Module

**Priority**: MEDIUM - Depends on Category.

### Backend Actions

- [ ] **Step 4.1**: Update imports in `src/modules/Budget/actions.ts`
- [ ] **Step 4.2**: Migrate `listBudgets()`, `getBudgetById()`, `getBudgetsByMonth()` using Drizzle joins
- [ ] **Step 4.3**: Migrate `upsertBudgets()` using Drizzle transactions
- [ ] **Step 4.4**: Migrate `createBudget()`, `updateBudget()`, `deleteBudget()`
- [ ] **Step 4.5**: Migrate `getBudgetSummary()`, `copyBudgets()`

**Key Pattern for Upsert with Drizzle Transaction**:

```typescript
export async function upsertBudgets(
  input: unknown,
): Promise<BudgetWithCategory[]> {
  const db = getDb();
  const validatedInput = BudgetUpsertSchema.parse(input);
  const { categories } = await import("@/modules/Category/schema");

  // Verify all categories exist
  const categoryCheck = await db
    .select({ id: categories.id })
    .from(categories)
    .where(sql`${categories.id} = ANY($1) AND ${categories.archived} = false`, [
      validatedInput.items.map((i) => i.categoryId),
    ]);

  if (categoryCheck.length !== validatedInput.items.length) {
    throw new Error("Some categories not found or archived");
  }

  return await db.transaction(async (tx) => {
    const results: BudgetWithCategory[] = [];
    const now = new Date();

    for (const item of validatedInput.items) {
      // Check for existing budget
      const existing = await tx
        .select({ id: budgets.id })
        .from(budgets)
        .where(
          and(
            eq(budgets.month, validatedInput.month),
            eq(budgets.category_id, item.categoryId),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await tx
          .update(budgets)
          .set({ amount_idr: item.amountIdr, updated_at: now })
          .where(eq(budgets.id, existing[0].id));

        results.push({
          id: existing[0].id,
          month: validatedInput.month,
          category_id: item.categoryId,
          amount_idr: item.amountIdr,
          created_at: now,
          updated_at: now,
          category_name: "",
        });
      } else {
        // Insert new
        const newId = nanoid();
        await tx.insert(budgets).values({
          id: newId,
          month: validatedInput.month,
          category_id: item.categoryId,
          amount_idr: item.amountIdr,
          created_at: now,
          updated_at: now,
        });

        results.push({
          id: newId,
          month: validatedInput.month,
          category_id: item.categoryId,
          amount_idr: item.amountIdr,
          created_at: now,
          updated_at: now,
          category_name: "",
        });
      }
    }

    return results;
  });
}
```

**Why Drizzle**: `db.transaction()` ensures atomicity. If any operation fails, all changes are rolled back.

### Tests

- [ ] **Step 4.6**: Create `src/modules/Budget/actions.integration.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { nanoid } from "nanoid";
import {
  listBudgets,
  getBudgetById,
  getBudgetsByMonth,
  upsertBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetSummary,
  copyBudgets,
} from "./actions";
import { createCategory, deleteCategory } from "@/modules/Category/actions";
import { getDb, closeDb } from "@/db/drizzle-client";
import { budgets } from "./schema";
import { eq } from "drizzle-orm";

describe("Budget Integration Tests", () => {
  const testCategoryIds: string[] = [];
  const testBudgetIds: string[] = [];
  const testMonth = "2025-01-01";
  const testMonth2 = "2025-02-01";

  async function createTestCategory() {
    const category = await createCategory({
      name: `Budget Category ${nanoid()}`,
    });
    testCategoryIds.push(category.id);
    return category;
  }

  afterEach(async () => {
    const db = getDb();
    for (const id of testBudgetIds) {
      try {
        await db.delete(budgets).where(eq(budgets.id, id));
      } catch {}
    }
    testBudgetIds.length = 0;

    for (const id of testCategoryIds) {
      try {
        await deleteCategory(id);
      } catch {}
    }
    testCategoryIds.length = 0;
  });

  afterAll(async () => {
    await closeDb();
  });

  describe("Create Budget", () => {
    it("should create a budget for a category and month", async () => {
      const category = await createTestCategory();
      const budget = await createBudget(testMonth, {
        categoryId: category.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget.id);

      expect(budget.month).toBe(testMonth);
      expect(budget.amount_idr).toBe(1000000);
    });

    it("should reject budget for non-existent category", async () => {
      await expect(
        createBudget(testMonth, {
          categoryId: "non-existent",
          amountIdr: 1000000,
        }),
      ).rejects.toThrow("not found");
    });
  });

  describe("Upsert Budgets", () => {
    it("should create multiple budgets in one call", async () => {
      const cat1 = await createTestCategory();
      const cat2 = await createTestCategory();

      const result = await upsertBudgets({
        month: testMonth,
        items: [
          { categoryId: cat1.id, amountIdr: 1000000 },
          { categoryId: cat2.id, amountIdr: 2000000 },
        ],
      });

      result.forEach((b) => testBudgetIds.push(b.id));
      expect(result).toHaveLength(2);
    });
  });

  describe("Get Budget Summary", () => {
    it("should return budget summary for a month", async () => {
      const category = await createTestCategory();
      const budget = await createBudget(testMonth, {
        categoryId: category.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget.id);

      const summary = await getBudgetSummary(testMonth);
      expect(summary.month).toBe(testMonth);
      expect(summary.totalBudget).toBe(1000000);
    });
  });

  describe("Copy Budgets", () => {
    it("should copy budgets from one month to another", async () => {
      const cat1 = await createTestCategory();
      const budget = await createBudget(testMonth, {
        categoryId: cat1.id,
        amountIdr: 1000000,
      });
      testBudgetIds.push(budget.id);

      const copied = await copyBudgets(testMonth, testMonth2);
      copied.forEach((b) => testBudgetIds.push(b.id));

      expect(copied).toHaveLength(1);
      expect(copied[0].month).toBe(testMonth2);
    });
  });
});
```

### Verification

- [ ] **Step 4.7**: Run tests: `pnpm test src/modules/Budget/actions.integration.test.ts`

---

## Phase 5: Transaction Module

**Priority**: HIGH - Most complex module, depends on all previous modules.

### Backend Actions

- [ ] **Step 5.1**: Update imports in `src/modules/Transaction/actions.ts`
- [ ] **Step 5.2**: Migrate `listTransactions()` (complex joins with Drizzle)
- [ ] **Step 5.3**: Migrate `getTransactionById()`
- [ ] **Step 5.4**: Migrate transaction creation functions using Drizzle transactions
- [ ] **Step 5.5**: Migrate `deleteTransaction()`, `restoreTransaction()`, `permanentlyDeleteTransaction()`
- [ ] **Step 5.6**: Migrate `getTransactionStats()`

**Key Pattern for Transaction Creation with Drizzle**:

```typescript
export async function createExpense(
  input: unknown,
): Promise<TransactionWithPostings> {
  const db = getDb();
  const validatedInput = ExpenseCreateSchema.parse(input);
  const { wallets } = await import("@/modules/Wallet/schema");
  const { categories } = await import("@/modules/Category/schema");
  const { transactionEvents, postings } = await import("./schema");

  // Check idempotency
  if (validatedInput.idempotencyKey) {
    const existing = await db
      .select({ id: transactionEvents.id })
      .from(transactionEvents)
      .where(
        eq(transactionEvents.idempotency_key, validatedInput.idempotencyKey),
      )
      .limit(1);

    if (existing.length > 0) {
      return getTransactionById(
        existing[0].id,
      ) as Promise<TransactionWithPostings>;
    }
  }

  // Verify wallet exists and is not archived
  const wallet = await db
    .select()
    .from(wallets)
    .where(
      and(eq(wallets.id, validatedInput.walletId), eq(wallets.archived, false)),
    )
    .limit(1);

  if (!wallet.length) {
    throw new Error("Wallet not found or archived");
  }

  // Verify category exists
  const category = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.id, validatedInput.categoryId),
        eq(categories.archived, false),
      ),
    )
    .limit(1);

  if (!category.length) {
    throw new Error("Category not found or archived");
  }

  const eventId = nanoid();
  const postingId = nanoid();
  const now = new Date();

  return await db.transaction(async (tx) => {
    // Insert transaction event
    const [event] = await tx
      .insert(transactionEvents)
      .values({
        id: eventId,
        occurred_at: validatedInput.occurredAt,
        type: "expense",
        note: validatedInput.note,
        category_id: validatedInput.categoryId,
        idempotency_key: validatedInput.idempotencyKey,
        created_at: now,
        updated_at: now,
      })
      .returning();

    // Insert posting (negative for expense)
    const [posting] = await tx
      .insert(postings)
      .values({
        id: postingId,
        event_id: eventId,
        wallet_id: validatedInput.walletId,
        amount_idr: -validatedInput.amountIdr,
        created_at: now,
      })
      .returning();

    return {
      ...event,
      postings: [posting],
    };
  });
}
```

**Why Drizzle**: Type-safe transaction with automatic type inference for inserted/returning values.

### Tests

- [ ] **Step 5.7**: Create `src/modules/Transaction/actions.integration.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { nanoid } from "nanoid";
import {
  listTransactions,
  getTransactionById,
  createExpense,
  createIncome,
  createTransfer,
  createSavingsContribution,
  createSavingsWithdrawal,
  deleteTransaction,
  restoreTransaction,
  getTransactionStats,
} from "./actions";
import { createWallet, deleteWallet } from "@/modules/Wallet/actions";
import { createCategory, deleteCategory } from "@/modules/Category/actions";
import {
  createSavingsBucket,
  deleteSavingsBucket,
} from "@/modules/SavingsBucket/actions";
import { getDb, closeDb } from "@/db/drizzle-client";
import { transactionEvents, postings } from "./schema";
import { eq } from "drizzle-orm";

describe("Transaction Integration Tests", () => {
  let testWalletId: string;
  let testWallet2Id: string;
  let testCategoryId: string;
  let testBucketId: string;
  const testTransactionIds: string[] = [];

  beforeEach(async () => {
    const wallet = await createWallet({
      name: `Tx Wallet ${nanoid()}`,
      type: "bank",
    });
    const wallet2 = await createWallet({
      name: `Tx Wallet 2 ${nanoid()}`,
      type: "bank",
    });
    const category = await createCategory({ name: `Tx Category ${nanoid()}` });
    const bucket = await createSavingsBucket({ name: `Tx Bucket ${nanoid()}` });

    testWalletId = wallet.id;
    testWallet2Id = wallet2.id;
    testCategoryId = category.id;
    testBucketId = bucket.id;
  });

  afterEach(async () => {
    const db = getDb();
    for (const id of testTransactionIds) {
      try {
        await db.delete(postings).where(eq(postings.event_id, id));
        await db.delete(transactionEvents).where(eq(transactionEvents.id, id));
      } catch {}
    }
    testTransactionIds.length = 0;

    try {
      await db.delete(postings).where(eq(postings.wallet_id, testWalletId));
      await db.delete(postings).where(eq(postings.wallet_id, testWallet2Id));
      await deleteWallet(testWalletId);
      await deleteWallet(testWallet2Id);
      await deleteCategory(testCategoryId);
      await deleteSavingsBucket(testBucketId);
    } catch {}
  });

  afterAll(async () => {
    await closeDb();
  });

  describe("Create Expense", () => {
    it("should create an expense transaction", async () => {
      const expense = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 100000,
        note: "Test expense",
      });
      testTransactionIds.push(expense.id);

      expect(expense.type).toBe("expense");
      expect(expense.display_amount_idr).toBe(-100000);
    });

    it("should handle idempotency key", async () => {
      const key = nanoid();
      const expense1 = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 100000,
        idempotencyKey: key,
      });
      testTransactionIds.push(expense1.id);

      const expense2 = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 200000,
        idempotencyKey: key,
      });

      expect(expense1.id).toBe(expense2.id);
    });
  });

  describe("Create Income", () => {
    it("should create an income transaction", async () => {
      const income = await createIncome({
        occurredAt: new Date(),
        walletId: testWalletId,
        amountIdr: 500000,
        note: "Test income",
        payee: "Employer",
      });
      testTransactionIds.push(income.id);

      expect(income.type).toBe("income");
      expect(income.display_amount_idr).toBe(500000);
    });
  });

  describe("Create Transfer", () => {
    it("should create a transfer between wallets", async () => {
      const transfer = await createTransfer({
        occurredAt: new Date(),
        fromWalletId: testWalletId,
        toWalletId: testWallet2Id,
        amountIdr: 200000,
        note: "Test transfer",
      });
      testTransactionIds.push(transfer.id);

      expect(transfer.type).toBe("transfer");
      expect(transfer.postings).toHaveLength(2);
    });
  });

  describe("Delete/Restore Transaction", () => {
    it("should soft delete a transaction", async () => {
      const expense = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 100000,
      });
      testTransactionIds.push(expense.id);

      await deleteTransaction(expense.id);

      const retrieved = await getTransactionById(expense.id);
      expect(retrieved?.deleted_at).toBeDefined();
    });

    it("should restore a deleted transaction", async () => {
      const expense = await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 100000,
      });
      testTransactionIds.push(expense.id);

      await deleteTransaction(expense.id);
      const restored = await restoreTransaction(expense.id);

      expect(restored.deleted_at).toBeNull();
    });
  });

  describe("Get Transaction Stats", () => {
    it("should return transaction statistics", async () => {
      await createExpense({
        occurredAt: new Date(),
        walletId: testWalletId,
        categoryId: testCategoryId,
        amountIdr: 100000,
      }).then((tx) => testTransactionIds.push(tx.id));

      await createIncome({
        occurredAt: new Date(),
        walletId: testWalletId,
        amountIdr: 500000,
      }).then((tx) => testTransactionIds.push(tx.id));

      const stats = await getTransactionStats({});

      expect(stats.totalIncome).toBe(500000);
      expect(stats.totalExpense).toBe(100000);
    });
  });
});
```

### Verification

- [ ] **Step 5.8**: Run tests: `pnpm test src/modules/Transaction/actions.integration.test.ts`

---

## Phase 6: Report Module

**Priority**: MEDIUM - Read-only, depends on all above.

### Backend Actions

- [ ] **Step 6.1**: Update imports in `src/modules/Report/actions.ts`
- [ ] **Step 6.2**: Migrate `spendingTrend()` using Drizzle aggregations
- [ ] **Step 6.3**: Migrate `categoryBreakdown()` using Drizzle aggregations and joins
- [ ] **Step 6.4**: Migrate `netWorthTrend()` using Drizzle CTEs
- [ ] **Step 6.5**: Migrate `moneyLeftToSpend()` using Drizzle joins

**Key Pattern for Complex Aggregations with Drizzle**:

```typescript
export async function spendingTrend(
  query: unknown,
): Promise<SpendingTrendData[]> {
  const db = getDb();
  const validatedQuery = SpendingTrendQuerySchema.parse(query);
  const { transactionEvents, postings } =
    await import("@/modules/Transaction/schema");

  const result = await db
    .select({
      period: sql<Date>`DATE_TRUNC(${validatedQuery.granularity || "month"}, ${transactionEvents.occurred_at})`,
      totalAmount: sql<number>`COALESCE(SUM(ABS(${postings.amount_idr})), 0)::numeric`,
      transactionCount: sql<number>`COUNT(DISTINCT ${transactionEvents.id})::int`,
    })
    .from(transactionEvents)
    .innerJoin(postings, eq(transactionEvents.id, postings.event_id))
    .where(
      and(
        eq(transactionEvents.type, "expense"),
        isNull(transactionEvents.deleted_at),
        validatedQuery.from
          ? gte(transactionEvents.occurred_at, validatedQuery.from)
          : undefined,
        validatedQuery.to
          ? lte(transactionEvents.occurred_at, validatedQuery.to)
          : undefined,
      ),
    )
    .groupBy(
      sql`DATE_TRUNC(${validatedQuery.granularity || "month"}, ${transactionEvents.occurred_at})`,
    )
    .orderBy(
      sql`DATE_TRUNC(${validatedQuery.granularity || "month"}, ${transactionEvents.occurred_at})`,
    );

  return result.map((row) => ({
    period: row.period.toISOString().split("T")[0],
    totalAmount: Number(row.totalAmount),
    transactionCount: Number(row.transactionCount),
  }));
}
```

### Tests

- [ ] **Step 6.6**: Create `src/modules/Report/actions.integration.test.ts`

```typescript
import { describe, it, expect, afterAll } from "vitest";
import {
  spendingTrend,
  categoryBreakdown,
  netWorthTrend,
  moneyLeftToSpend,
} from "./actions";
import { closeDb } from "@/db/drizzle-client";

describe("Report Integration Tests", () => {
  afterAll(async () => {
    await closeDb();
  });

  describe("Spending Trend", () => {
    it("should return spending trend data", async () => {
      const trend = await spendingTrend({
        from: new Date("2025-01-01"),
        to: new Date("2025-12-31"),
        granularity: "month",
      });

      expect(Array.isArray(trend)).toBe(true);
    });
  });

  describe("Category Breakdown", () => {
    it("should return spending by category", async () => {
      const breakdown = await categoryBreakdown({
        from: new Date("2025-01-01"),
        to: new Date("2025-12-31"),
      });

      expect(Array.isArray(breakdown)).toBe(true);
    });
  });

  describe("Net Worth Trend", () => {
    it("should return net worth trend data", async () => {
      const trend = await netWorthTrend({
        from: new Date("2025-01-01"),
        to: new Date("2025-12-31"),
        granularity: "month",
      });

      expect(Array.isArray(trend)).toBe(true);
    });
  });

  describe("Money Left to Spend", () => {
    it("should calculate remaining budget", async () => {
      const result = await moneyLeftToSpend({
        month: "2025-01",
      });

      expect(result.month).toBe("2025-01");
      expect(typeof result.remaining).toBe("number");
    });
  });
});
```

### Verification

- [ ] **Step 6.7**: Run tests: `pnpm test src/modules/Report/actions.integration.test.ts`

---

## Phase 7: Dashboard Module

**Priority**: LOW - Aggregates data from other modules.

### Backend Actions

- [ ] **Step 7.1**: Update imports in `src/modules/Dashboard/actions.ts`
- [ ] **Step 7.2**: Migrate `getDashboardSummary()` - primarily calls other modules
- [ ] **Step 7.3**: Migrate helper functions that use Drizzle
- [ ] **Step 7.4**: Migrate `getRecentTransactions()`
- [ ] **Step 7.5**: Migrate `getDashboardData()`

**Note**: Dashboard primarily calls other modules, so most changes are import updates.

### Tests

- [ ] **Step 7.6**: Create `src/modules/Dashboard/actions.integration.test.ts`

```typescript
import { describe, it, expect, afterAll } from "vitest";
import {
  getDashboardSummary,
  getSpendingTrendChartData,
  getNetWorthTrendChartData,
  getCategoryBreakdownData,
  getRecentTransactions,
  getDashboardData,
} from "./actions";
import { closeDb } from "@/db/drizzle-client";

describe("Dashboard Integration Tests", () => {
  afterAll(async () => {
    await closeDb();
  });

  describe("Get Dashboard Summary", () => {
    it("should return dashboard summary", async () => {
      const summary = await getDashboardSummary({});

      expect(summary).toHaveProperty("currentNetWorth");
      expect(summary).toHaveProperty("moneyLeftToSpend");
      expect(summary).toHaveProperty("totalSpending");
      expect(summary).toHaveProperty("totalIncome");
    });
  });

  describe("Get Dashboard Data", () => {
    it("should return complete dashboard data", async () => {
      const data = await getDashboardData({});

      expect(data).toHaveProperty("summary");
      expect(data).toHaveProperty("spendingTrend");
      expect(data).toHaveProperty("netWorthTrend");
      expect(data).toHaveProperty("categoryBreakdown");
      expect(data).toHaveProperty("recentTransactions");
    });
  });
});
```

### Verification

- [ ] **Step 7.7**: Run tests: `pnpm test src/modules/Dashboard/actions.integration.test.ts`

---

## Post-Migration Tasks

### Cleanup

- [ ] **Step 8.1**: Remove the old `src/db/client.ts` file (or rename to `.legacy`)
- [ ] **Step 8.2**: Update all API routes to use new Drizzle client
- [ ] **Step 8.3**: Update `drizzle.config.ts` if needed
- [ ] **Step 8.4**: Remove unused imports across the codebase
- [ ] **Step 8.5**: Remove `postgres` package from `package.json`

### Verification

- [ ] **Step 8.6**: Run all tests: `pnpm test`
- [ ] **Step 8.7**: Manual API testing for all endpoints
- [ ] **Step 8.8**: Performance regression testing (if applicable)

### Documentation

- [ ] **Step 8.9**: Update README.md with new database client setup
- [ ] **Step 8.10**: Update API documentation if needed

---

## Estimated Timeline

| Phase     | Module                 | Estimated Time | Complexity |
| --------- | ---------------------- | -------------- | ---------- |
| 0         | Prerequisites          | 1 hour         | Low        |
| 1         | Category               | 2 hours        | Low        |
| 2         | Wallet                 | 3 hours        | Medium     |
| 3         | Savings Bucket         | 2 hours        | Low        |
| 4         | Budget                 | 3 hours        | Medium     |
| 5         | Transaction            | 5 hours        | High       |
| 6         | Report                 | 4 hours        | High       |
| 7         | Dashboard              | 2 hours        | Medium     |
| 8         | Cleanup & Verification | 4 hours        | -          |
| **Total** |                        | **~26 hours**  |            |

---

## Rollback Plan

If issues are encountered during migration:

1. **Keep the old client**: Rename `src/db/client.ts` to `src/db/client.legacy.ts`
2. **Feature flags**: Migrate one module at a time with ability to switch between old/new
3. **Parallel testing**: Run both old and new implementations during testing phase
4. **Module-level rollback**: Each module can be reverted independently by changing imports

---

## Success Criteria

- [ ] All integration tests pass
- [ ] No direct `postgres` package usage in new code
- [ ] All queries use new Drizzle client (`getDb()`) with Query Builder
- [ ] Application runs without errors
- [ ] Database operations perform correctly
- [ ] No regression in functionality
- [ ] All API routes work correctly

---

## Key Principles (Fullstack Next.js Rule)

1. **Drizzle ORM First**: **Always** use Drizzle's TypeScript API (Query Builder) for database interactions.
   - **YES:** `await db.select().from(users).where(...)` or `await db.query.users.findMany({...})`
   - **NO:** `db.all(sql'SELECT * FROM users')` (Unless absolutely required for unsupported SQL features)
2. **Validation First**: `zodSchema.parse(input)` must be the first line of any Action.
3. **Shadcn Only**: Do not write custom UI primitives if Shadcn has them.
4. **One Module at a Time**: Complete Backend AND Frontend of a module before moving to the next.

---

## Next Steps

1. Review this plan
2. Ask questions or request clarification
3. Say "Start Phase 0" to begin infrastructure setup

**Ready to proceed?**
