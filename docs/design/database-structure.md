# Database Structure

This document describes the PostgreSQL database schema for Sugih, a personal finance management application that uses double-entry bookkeeping to track financial transactions.

## Overview

Sugih implements **double-entry bookkeeping** where every financial transaction creates balanced postings (ledger entries) that sum to zero. The database uses:

- **PostgreSQL 16**
- **Drizzle ORM** for type-safe database operations
- **Currency**: All amounts are stored in Indonesian Rupiah (IDR) as `bigint` in `amount_idr` columns
- **IDs**: UUIDs stored as `text` for all primary keys
- **Timestamps**: All timestamps use `timestamp with time zone`

## Core Tables

### 1. `wallets`

Represents user's financial accounts (cash, bank accounts, e-wallets, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `text` | PRIMARY KEY | UUID as text |
| `name` | `varchar(255)` | NOT NULL, UNIQUE | Wallet name |
| `type` | `varchar(32)` | NOT NULL, DEFAULT 'bank' | Enum: `cash`, `bank`, `ewallet`, `other` |
| `currency` | `varchar(3)` | NOT NULL, DEFAULT 'IDR' | ISO currency code |
| `archived` | `boolean` | NOT NULL, DEFAULT false | Soft delete flag |
| `created_at` | `timestamp with time zone` | | Creation timestamp |
| `updated_at` | `timestamp with time zone` | | Last update timestamp |

**Soft Delete**: Uses `archived` boolean flag instead of hard deletion.

### 2. `categories`

Categorizes income and expense transactions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `text` | PRIMARY KEY | UUID as text |
| `name` | `varchar(255)` | NOT NULL, UNIQUE | Category name |
| `type` | `category_type` | NOT NULL | Enum: `income`, `expense` |
| `archived` | `boolean` | NOT NULL, DEFAULT false | Soft delete flag |
| `created_at` | `timestamp with time zone` | | Creation timestamp |
| `updated_at` | `timestamp with time zone` | | Last update timestamp |

**Custom Type**: `category_type` is a PostgreSQL enum with values `'income'` and `'expense'`.

**Soft Delete**: Uses `archived` boolean flag.

### 3. `savings_buckets`

Represents savings goals or allocated funds.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `text` | PRIMARY KEY | UUID as text |
| `name` | `varchar(255)` | NOT NULL, UNIQUE | Bucket name |
| `description` | `text` | | Optional description |
| `archived` | `boolean` | NOT NULL, DEFAULT false | Soft delete flag |
| `deleted_at` | `timestamp with time zone` | | Hard delete timestamp |
| `created_at` | `timestamp with time zone` | | Creation timestamp |
| `updated_at` | `timestamp with time zone` | | Last update timestamp |

**Soft Delete**: Uses both `archived` boolean and `deleted_at` timestamp.

### 4. `transaction_events`

Records financial transaction events (the "what happened").

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `text` | PRIMARY KEY | UUID as text |
| `occurred_at` | `timestamp with time zone` | NOT NULL | When transaction occurred |
| `type` | `varchar(32)` | NOT NULL | Transaction type (see below) |
| `note` | `text` | | Optional notes |
| `payee` | `text` | | Person/entity involved |
| `category_id` | `text` | FOREIGN KEY (RESTRICT) | References `categories(id)` (nullable) |
| `deleted_at` | `timestamp with time zone` | | Soft delete timestamp |
| `created_at` | `timestamp with time zone` | | Creation timestamp |
| `updated_at` | `timestamp with time zone` | | Last update timestamp |
| `idempotency_key` | `varchar(36)` | NOT NULL, UNIQUE | Prevents duplicate transactions; auto-generated if not provided |

**Transaction Types** (enum values):
- `expense` - Money spent from a wallet
- `income` - Money received into a wallet
- `transfer` - Money moved between wallets
- `savings_contribution` - Money moved from wallet to savings bucket
- `savings_withdrawal` - Money moved from savings bucket to wallet

**Indexes**:
- `idx_transaction_events_occurred_at` on `occurred_at`
- `idx_transaction_events_type_occurred_at` on `(type, occurred_at)`
- `idx_transaction_events_category_id_occurred_at` on `(category_id, occurred_at)`

**Soft Delete**: Uses `deleted_at` timestamp (nullable).

**Idempotency**: The `idempotency_key` ensures transactions aren't duplicated if operations are retried.

### 5. `postings`

Ledger entries that implement double-entry bookkeeping (the "how it affects accounts").

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `text` | PRIMARY KEY | UUID as text |
| `event_id` | `text` | NOT NULL, FOREIGN KEY (CASCADE) | References `transaction_events(id)` |
| `wallet_id` | `text` | FOREIGN KEY (RESTRICT) | References `wallets(id)` (nullable) |
| `savings_bucket_id` | `text` | FOREIGN KEY (RESTRICT) | References `savings_buckets(id)` (nullable) |
| `amount_idr` | `bigint` | NOT NULL | Signed amount in Rupiah |
| `created_at` | `timestamp with time zone` | | Creation timestamp |

**Key Concepts**:
- Each transaction event generates 2+ postings that balance to zero
- Positive `amount_idr` = debit (increase for assets)
- Negative `amount_idr` = credit (decrease for assets)
- Either `wallet_id` OR `savings_bucket_id` is set, never both

**Indexes**:
- `idx_postings_event_id` on `event_id`
- `idx_postings_wallet_id_created_at` on `(wallet_id, created_at)`
- `idx_postings_savings_bucket_id_created_at` on `(savings_bucket_id, created_at)`

**Example Postings**:

```
Expense (100,000 IDR):
  Posting 1: wallet_id=W1, amount_idr=-100000  (decrease wallet)
  Posting 2: wallet_id=null, amount_idr=+100000 (expense account)

Transfer (50,000 IDR from Wallet A to Wallet B):
  Posting 1: wallet_id=WalletA, amount_idr=-50000
  Posting 2: wallet_id=WalletB, amount_idr=+50000
```

### 6. `budgets`

Monthly budget allocations for expense categories or savings buckets.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `text` | PRIMARY KEY | UUID as text |
| `month` | `varchar(10)` | NOT NULL | ISO format YYYY-MM-01 |
| `category_id` | `text` | FOREIGN KEY (RESTRICT) | References `categories(id)` (nullable) |
| `savings_bucket_id` | `text` | FOREIGN KEY (RESTRICT) | References `savings_buckets(id)` (nullable) |
| `amount_idr` | `bigint` | NOT NULL | Budget amount in Rupiah |
| `note` | `text` | | Optional description |
| `archived` | `boolean` | NOT NULL, DEFAULT false | Soft delete flag |
| `created_at` | `timestamp with time zone` | | Creation timestamp |
| `updated_at` | `timestamp with time zone` | | Last update timestamp |

**Check Constraint**: `budget_target_check` ensures exactly one of `category_id` OR `savings_bucket_id` is set:
```sql
CHECK (
  (category_id IS NOT NULL AND savings_bucket_id IS NULL) OR
  (category_id IS NULL AND savings_bucket_id IS NOT NULL)
)
```

**Unique Indexes** (partial):
- `budget_month_category_idx` on `(month, category_id)` WHERE `category_id IS NOT NULL`
- `budget_month_savings_bucket_idx` on `(month, savings_bucket_id)` WHERE `savings_bucket_id IS NOT NULL`

These ensure only one budget per category per month, and one budget per savings bucket per month.

## Entity Relationships

```
wallets (1) ----< (N) postings
categories (1) ----< (N) transaction_events
categories (1) ----< (N) budgets
savings_buckets (1) ----< (N) postings
savings_buckets (1) ----< (N) budgets
transaction_events (1) ----< (N) postings
```

### Foreign Key Relationships

All foreign key relationships are now explicitly enforced at the database level:

1. **`postings.event_id` → `transaction_events.id`**
   - `ON DELETE CASCADE` - Postings are automatically deleted when their parent transaction event is deleted

2. **`postings.wallet_id` → `wallets.id`**
   - `ON DELETE RESTRICT` - Prevents wallet deletion if it has transaction postings (preserves financial history)

3. **`postings.savings_bucket_id` → `savings_buckets.id`**
   - `ON DELETE RESTRICT` - Prevents savings bucket deletion if it has transaction postings (preserves financial history)

4. **`transaction_events.category_id` → `categories.id`**
   - `ON DELETE RESTRICT` - Prevents category deletion if it has transactions (preserves financial records)

5. **`budgets.category_id` → `categories.id`**
   - `ON DELETE RESTRICT` - Prevents category deletion if it has budgets

6. **`budgets.savings_bucket_id` → `savings_buckets.id`**
   - `ON DELETE RESTRICT` - Prevents savings bucket deletion if it has budgets

**Deletion Strategy**:
- Resources with transaction history (wallets, categories, savings buckets) use RESTRICT to enforce archiving instead of deletion
- Transaction events and postings can be soft-deleted via `deleted_at` timestamp
- The CASCADE rule on postings ensures referential integrity when transaction events are hard-deleted

## Double-Entry Bookkeeping

Every transaction creates balanced postings where:

```
SUM(postings.amount_idr WHERE event_id = X) = 0
```

### Transaction Types and Their Postings

#### 1. Expense Transaction
User spends money from a wallet on an expense category.

```
Event: type='expense', category_id=C1, amount=100,000 IDR
Postings:
  - wallet_id=W1, amount_idr=-100,000  (wallet balance decreases)
  - wallet_id=NULL, amount_idr=+100,000 (expense offset)
```

#### 2. Income Transaction
User receives money into a wallet (optionally categorized).

```
Event: type='income', category_id=C2, amount=500,000 IDR
Postings:
  - wallet_id=W1, amount_idr=+500,000  (wallet balance increases)
  - wallet_id=NULL, amount_idr=-500,000 (income offset)
```

#### 3. Transfer Transaction
User moves money between two wallets.

```
Event: type='transfer', amount=200,000 IDR
Postings:
  - wallet_id=W1, amount_idr=-200,000  (source wallet decreases)
  - wallet_id=W2, amount_idr=+200,000  (destination wallet increases)
```

#### 4. Savings Contribution
User contributes money from a wallet to a savings bucket.

```
Event: type='savings_contribution', amount=150,000 IDR
Postings:
  - wallet_id=W1, amount_idr=-150,000         (wallet decreases)
  - savings_bucket_id=B1, amount_idr=+150,000 (savings increases)
```

#### 5. Savings Withdrawal
User withdraws money from a savings bucket to a wallet.

```
Event: type='savings_withdrawal', amount=75,000 IDR
Postings:
  - savings_bucket_id=B1, amount_idr=-75,000 (savings decreases)
  - wallet_id=W1, amount_idr=+75,000         (wallet increases)
```

## Soft Delete Strategy

Different tables use different soft delete mechanisms:

| Table | Mechanism | Field(s) |
|-------|-----------|----------|
| `wallets` | Boolean flag | `archived` |
| `categories` | Boolean flag | `archived` |
| `savings_buckets` | Boolean flag + timestamp | `archived`, `deleted_at` |
| `transaction_events` | Timestamp | `deleted_at` |
| `postings` | Inherited from event | N/A (linked via `event_id`) |
| `budgets` | Boolean flag | `archived` |

**Why Different Mechanisms?**
- **Boolean flags** (`archived`) are used for resources that should remain visible in historical contexts but not active lists
- **Timestamps** (`deleted_at`) provide audit trails and enable time-based queries
- **Postings** are never deleted directly; they inherit deletion status from their parent `transaction_event`

## Validation and Constraints

### Application-Level Validation (Zod)

All user input is validated using Zod schemas before database operations:

- **Amount validation**: Minimum 100 IDR, must be positive integer
- **Category type validation**: Expense categories can't be used for income transactions and vice versa
- **Transfer validation**: Source and destination wallets must be different
- **Date validation**: Proper date formats and ranges
- **String length**: Maximum lengths enforced (e.g., 255 chars for names)

### Database-Level Constraints

1. **Unique constraints**:
   - Wallet names must be unique
   - Category names must be unique
   - Savings bucket names must be unique
   - Transaction idempotency keys must be unique (NOT NULL)
   - Budget month+category combinations must be unique
   - Budget month+savings bucket combinations must be unique

2. **Check constraints**:
   - Budgets must target exactly one of: category OR savings bucket

3. **Foreign key constraints** (all explicitly enforced):
   - `postings.event_id` → `transaction_events.id` (CASCADE)
   - `postings.wallet_id` → `wallets.id` (RESTRICT)
   - `postings.savings_bucket_id` → `savings_buckets.id` (RESTRICT)
   - `transaction_events.category_id` → `categories.id` (RESTRICT)
   - `budgets.category_id` → `categories.id` (RESTRICT)
   - `budgets.savings_bucket_id` → `savings_buckets.id` (RESTRICT)

4. **NOT NULL constraints**:
   - Critical fields like names, types, amounts, and timestamps
   - **`transaction_events.idempotency_key`** - Ensures every transaction has an idempotency key (auto-generated if not provided)

## Performance Optimizations

### Indexes

All indexes are B-tree indexes optimized for common query patterns:

1. **Transaction event queries**:
   - Single column: `occurred_at` (for time-range queries)
   - Composite: `(type, occurred_at)` (for type-specific time queries)
   - Composite: `(category_id, occurred_at)` (for category-specific time queries)

2. **Posting queries**:
   - Single column: `event_id` (for joining with transaction events)
   - Composite: `(wallet_id, created_at)` (for wallet balance calculations)
   - Composite: `(savings_bucket_id, created_at)` (for savings balance calculations)

3. **Budget queries**:
   - Partial unique: `(month, category_id)` WHERE `category_id IS NOT NULL`
   - Partial unique: `(month, savings_bucket_id)` WHERE `savings_bucket_id IS NOT NULL`

### Query Patterns

**Balance Calculation** (for a wallet):
```sql
SELECT SUM(amount_idr)
FROM postings
WHERE wallet_id = ?
  AND created_at <= ?
```

**Monthly Spending** (for a category):
```sql
SELECT SUM(p.amount_idr)
FROM postings p
JOIN transaction_events te ON p.event_id = te.id
WHERE te.category_id = ?
  AND te.type = 'expense'
  AND te.occurred_at >= ?
  AND te.occurred_at < ?
  AND te.deleted_at IS NULL
```

## Schema Evolution

The database schema has evolved through 10 migrations:

1. `0000_curious_spirit.sql` - Initial schema with core tables
2. `0001_grey_yellowjacket.sql` - Column type refinements (varchar lengths)
3. `0002_handy_cargill.sql` - Performance indexes added
4. `0003_flimsy_blink.sql` - Added `deleted_at` to savings buckets
5. `0004_woozy_jackpot.sql` - Added `category_type` enum and column
6. `0005_add_note_to_budgets.sql` - Added `note` field to budgets
7. `0006_add_savings_bucket_to_budgets.sql` - Budget support for savings buckets
8. `0007_freezing_thena.sql` - Added explicit foreign key constraints (CASCADE/RESTRICT)
9. `0008_handy_diamondback.sql` - Made `idempotency_key` NOT NULL with auto-generation
10. `0009_add_archived_to_budgets.sql` - Added `archived` boolean flag to budgets for soft delete

## Currency and Precision

- **Storage**: `bigint` for exact integer arithmetic (no floating-point rounding errors)
- **Unit**: Indonesian Rupiah (smallest unit = 1 Rupiah)
- **Range**: -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807
- **Display**: Formatted in application layer with thousand separators
- **Validation**: Minimum transaction amount is 100 IDR (100 Rupiah)

## Best Practices

1. **Always use transactions** when creating transaction events + postings (atomic operations)
2. **Validate balances sum to zero** before committing posting sets
3. **Idempotency keys are automatic** - The server auto-generates `nanoid()` keys if not provided. Clients can still provide custom keys for retry logic
4. **Soft delete by default** - preserve financial history via `archived` flags or `deleted_at` timestamps
5. **Index by time** - most queries filter by date ranges
6. **Respect foreign key constraints** - Resources with transaction history (wallets, categories, etc.) use RESTRICT deletion and should be archived instead
7. **CASCADE is only for postings** - Transaction event deletion automatically cascades to postings since they're child records

## Idempotency Key Strategy

The `transaction_events.idempotency_key` column prevents duplicate transaction creation:

- **NOT NULL constraint**: All transactions must have an idempotency key
- **Auto-generation**: If a client doesn't provide a key, the server generates one using `nanoid()` (21-character URL-safe string)
- **Uniqueness**: Each key is unique across all transactions
- **Idempotent APIs**: Calling the same transaction creation endpoint with the same idempotency key returns the same transaction (no duplicate created)
- **Retry-safe**: Clients can safely retry failed requests using the same idempotency key

**Example**:
```
Request 1: POST /api/transactions/expense with idempotencyKey="client-key-123"
Response: Transaction created with id="tx_xyz"

Request 2: POST /api/transactions/expense with same body & idempotencyKey="client-key-123"
Response: Same transaction with id="tx_xyz" (no duplicate created)
```

## Complete SQL DDL for Schema Recreation

Use this SQL to recreate the complete database schema from scratch. This is useful when building backends in NestJS, FastAPI, or other frameworks.

### 1. Enum Types

```sql
-- Category type enum
CREATE TYPE category_type AS ENUM ('income', 'expense');
```

### 2. Tables

```sql
-- ============================================================
-- WALLETS TABLE
-- ============================================================
CREATE TABLE wallets (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(32) NOT NULL DEFAULT 'bank',
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Valid wallet types: 'cash', 'bank', 'ewallet', 'other'

-- ============================================================
-- CATEGORIES TABLE
-- ============================================================
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type category_type NOT NULL,
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- SAVINGS_BUCKETS TABLE
-- ============================================================
CREATE TABLE savings_buckets (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    archived BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- TRANSACTION_EVENTS TABLE
-- ============================================================
CREATE TABLE transaction_events (
    id TEXT PRIMARY KEY,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    type VARCHAR(32) NOT NULL,
    note TEXT,
    payee TEXT,
    category_id TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    idempotency_key VARCHAR(36) NOT NULL UNIQUE
);

-- Valid transaction types: 'expense', 'income', 'transfer', 'savings_contribution', 'savings_withdrawal'

-- ============================================================
-- POSTINGS TABLE (Double-Entry Ledger)
-- ============================================================
CREATE TABLE postings (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    wallet_id TEXT,
    savings_bucket_id TEXT,
    amount_idr BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- BUDGETS TABLE
-- ============================================================
CREATE TABLE budgets (
    id TEXT PRIMARY KEY,
    month VARCHAR(10) NOT NULL,
    category_id TEXT,
    savings_bucket_id TEXT,
    amount_idr BIGINT NOT NULL,
    note TEXT,
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### 3. Foreign Key Constraints

```sql
-- Postings foreign keys
ALTER TABLE postings
    ADD CONSTRAINT postings_event_id_fk
    FOREIGN KEY (event_id) REFERENCES transaction_events(id)
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE postings
    ADD CONSTRAINT postings_wallet_id_fk
    FOREIGN KEY (wallet_id) REFERENCES wallets(id)
    ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE postings
    ADD CONSTRAINT postings_savings_bucket_id_fk
    FOREIGN KEY (savings_bucket_id) REFERENCES savings_buckets(id)
    ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Transaction events foreign keys
ALTER TABLE transaction_events
    ADD CONSTRAINT transaction_events_category_id_fk
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Budgets foreign keys
ALTER TABLE budgets
    ADD CONSTRAINT budgets_category_id_fk
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE budgets
    ADD CONSTRAINT budgets_savings_bucket_id_fk
    FOREIGN KEY (savings_bucket_id) REFERENCES savings_buckets(id)
    ON DELETE RESTRICT ON UPDATE NO ACTION;
```

### 4. Check Constraints

```sql
-- Budget must target exactly one: category OR savings bucket
ALTER TABLE budgets
    ADD CONSTRAINT budget_target_check
    CHECK (
        (category_id IS NOT NULL AND savings_bucket_id IS NULL) OR
        (category_id IS NULL AND savings_bucket_id IS NOT NULL)
    );
```

### 5. Indexes

```sql
-- Transaction events indexes (for time-range and filtering queries)
CREATE INDEX idx_transaction_events_occurred_at
    ON transaction_events USING btree (occurred_at);

CREATE INDEX idx_transaction_events_type_occurred_at
    ON transaction_events USING btree (type, occurred_at);

CREATE INDEX idx_transaction_events_category_id_occurred_at
    ON transaction_events USING btree (category_id, occurred_at);

-- Postings indexes (for balance calculations)
CREATE INDEX idx_postings_event_id
    ON postings USING btree (event_id);

CREATE INDEX idx_postings_wallet_id_created_at
    ON postings USING btree (wallet_id, created_at);

CREATE INDEX idx_postings_savings_bucket_id_created_at
    ON postings USING btree (savings_bucket_id, created_at);

-- Budgets indexes (partial unique - one budget per target per month)
CREATE UNIQUE INDEX budget_month_category_idx
    ON budgets (month, category_id)
    WHERE category_id IS NOT NULL;

CREATE UNIQUE INDEX budget_month_savings_bucket_idx
    ON budgets (month, savings_bucket_id)
    WHERE savings_bucket_id IS NOT NULL;
```

### 6. Complete DDL in One Script

<details>
<summary>Click to expand full DDL script</summary>

```sql
-- ============================================================
-- SUGIH PERSONAL FINANCE DATABASE SCHEMA
-- PostgreSQL 16+
-- ============================================================

-- Clean slate (use with caution)
-- DROP TABLE IF EXISTS postings CASCADE;
-- DROP TABLE IF EXISTS budgets CASCADE;
-- DROP TABLE IF EXISTS transaction_events CASCADE;
-- DROP TABLE IF EXISTS savings_buckets CASCADE;
-- DROP TABLE IF EXISTS categories CASCADE;
-- DROP TABLE IF EXISTS wallets CASCADE;
-- DROP TYPE IF EXISTS category_type CASCADE;

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

CREATE TYPE category_type AS ENUM ('income', 'expense');

-- ============================================================
-- 2. TABLES
-- ============================================================

CREATE TABLE wallets (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(32) NOT NULL DEFAULT 'bank',
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type category_type NOT NULL,
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE savings_buckets (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    archived BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE transaction_events (
    id TEXT PRIMARY KEY,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    type VARCHAR(32) NOT NULL,
    note TEXT,
    payee TEXT,
    category_id TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    idempotency_key VARCHAR(36) NOT NULL UNIQUE
);

CREATE TABLE postings (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    wallet_id TEXT,
    savings_bucket_id TEXT,
    amount_idr BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE budgets (
    id TEXT PRIMARY KEY,
    month VARCHAR(10) NOT NULL,
    category_id TEXT,
    savings_bucket_id TEXT,
    amount_idr BIGINT NOT NULL,
    note TEXT,
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- 3. FOREIGN KEY CONSTRAINTS
-- ============================================================

ALTER TABLE postings
    ADD CONSTRAINT postings_event_id_fk
    FOREIGN KEY (event_id) REFERENCES transaction_events(id)
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE postings
    ADD CONSTRAINT postings_wallet_id_fk
    FOREIGN KEY (wallet_id) REFERENCES wallets(id)
    ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE postings
    ADD CONSTRAINT postings_savings_bucket_id_fk
    FOREIGN KEY (savings_bucket_id) REFERENCES savings_buckets(id)
    ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE transaction_events
    ADD CONSTRAINT transaction_events_category_id_fk
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE budgets
    ADD CONSTRAINT budgets_category_id_fk
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE budgets
    ADD CONSTRAINT budgets_savings_bucket_id_fk
    FOREIGN KEY (savings_bucket_id) REFERENCES savings_buckets(id)
    ON DELETE RESTRICT ON UPDATE NO ACTION;

-- ============================================================
-- 4. CHECK CONSTRAINTS
-- ============================================================

ALTER TABLE budgets
    ADD CONSTRAINT budget_target_check
    CHECK (
        (category_id IS NOT NULL AND savings_bucket_id IS NULL) OR
        (category_id IS NULL AND savings_bucket_id IS NOT NULL)
    );

-- ============================================================
-- 5. INDEXES
-- ============================================================

-- Transaction events indexes
CREATE INDEX idx_transaction_events_occurred_at
    ON transaction_events USING btree (occurred_at);

CREATE INDEX idx_transaction_events_type_occurred_at
    ON transaction_events USING btree (type, occurred_at);

CREATE INDEX idx_transaction_events_category_id_occurred_at
    ON transaction_events USING btree (category_id, occurred_at);

-- Postings indexes
CREATE INDEX idx_postings_event_id
    ON postings USING btree (event_id);

CREATE INDEX idx_postings_wallet_id_created_at
    ON postings USING btree (wallet_id, created_at);

CREATE INDEX idx_postings_savings_bucket_id_created_at
    ON postings USING btree (savings_bucket_id, created_at);

-- Budgets indexes (partial unique)
CREATE UNIQUE INDEX budget_month_category_idx
    ON budgets (month, category_id)
    WHERE category_id IS NOT NULL;

CREATE UNIQUE INDEX budget_month_savings_bucket_idx
    ON budgets (month, savings_bucket_id)
    WHERE savings_bucket_id IS NOT NULL;
```

</details>

## ORM/Framework Migration Notes

When implementing this schema in another framework:

### NestJS/TypeORM

- Use `@PrimaryColumn('text')` for UUIDs as text
- Use `@Column('bigint')` for `amount_idr` (returns string in TypeORM, needs parsing)
- Create a custom `category_type` enum: `@Column({ type: 'enum', enum: CategoryType })`
- Use `@ManyToOne()` with `{ onDelete: 'RESTRICT' }` or `{ onDelete: 'CASCADE' }` as appropriate

### NestJS/Prisma

```prisma
enum CategoryType {
  income
  expense
}

model Wallet {
  id        String   @id
  name      String   @unique @db.VarChar(255)
  type      String   @default("bank") @db.VarChar(32)
  currency  String   @default("IDR") @db.VarChar(3)
  archived  Boolean  @default(false)
  createdAt DateTime? @map("created_at") @db.Timestamptz
  updatedAt DateTime? @map("updated_at") @db.Timestamptz
  postings  Posting[]

  @@map("wallets")
}
```

### FastAPI/SQLAlchemy

```python
from sqlalchemy import Column, String, Boolean, BigInteger, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import TIMESTAMP

class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(String, primary_key=True)
    name = Column(String(255), unique=True, nullable=False)
    type = Column(String(32), nullable=False, default="bank")
    currency = Column(String(3), nullable=False, default="IDR")
    archived = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP(timezone=True))
    updated_at = Column(TIMESTAMP(timezone=True))
```

### Key Implementation Notes

1. **UUIDs as Text**: All IDs are UUIDs stored as `TEXT`. Generate UUIDs in application code (e.g., `uuid.uuid4()`, `crypto.randomUUID()`, `nanoid()`)

2. **BigInt for Money**: `amount_idr` uses `BIGINT` to avoid floating-point precision issues. Some ORMs return bigint as string; handle parsing in your application

3. **Partial Unique Indexes**: The budget table's conditional unique indexes (`WHERE category_id IS NOT NULL`) may require raw SQL or native queries in some ORMs

4. **Check Constraints**: The `budget_target_check` constraint ensures exactly one target. Some ORMs don't support check constraints declaratively; add via raw migration

5. **Soft Deletes**: Implement soft delete filters in your queries:
   - Wallets/Categories/Budgets: `WHERE archived = false`
   - Transaction Events: `WHERE deleted_at IS NULL`

6. **Timestamp Timezone**: All timestamps use `TIMESTAMP WITH TIME ZONE`. Store in UTC, convert to local time in the application layer
