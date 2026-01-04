# Plan: Migrate from SQLite to PostgreSQL

## Module Structure Check

- [ ] Confirmed that database client changes will be centralized in `/src/db/`.
- [ ] Confirmed that Drizzle schema updates will maintain module colocation in each module folder.
- [ ] Confirmed that API route tests will be created/updated for each modified endpoint.
- [ ] Confirmed that database integration tests will be created for PostgreSQL-specific functionality.

## Migration Strategy Overview

**Phase 1**: Database Infrastructure Setup
**Phase 2**: Drizzle ORM Migration
**Phase 3**: Raw SQL Client Migration
**Phase 4**: Schema Conversion (SQLite → PostgreSQL)
**Phase 5**: Query Syntax Updates
**Phase 6**: Testing & Validation

## Execution Steps

### Phase 1: Database Infrastructure Setup

- [x] **Step 1**: Install PostgreSQL dependencies **AND** create `docker-compose.yml` for local PostgreSQL development
  - Install: `pnpm add postgres`, `@types/pg`
  - Create `/docker-compose.yml` with PostgreSQL service
  - Create `.env.example` with PostgreSQL connection variables

- [x] **Step 2**: Create database connection configuration **AND** create configuration test
  - Create `/src/db/config.ts` for PostgreSQL connection settings
  - Create `/src/db/config.test.ts` to validate environment configuration
  - Update `.env.example` with DATABASE_URL format

### Phase 2: Drizzle ORM Migration

- [x] **Step 3**: Update Drizzle configuration for PostgreSQL **AND** create configuration validation test
  - Update `/drizzle.config.ts` to use PostgreSQL dialect
  - Create `/src/db/drizzle-config.test.ts` to verify Drizzle setup
  - Update package.json scripts for PostgreSQL migrations

- [x] **Step 4**: Convert Wallet module schema to PostgreSQL **AND** create schema validation test
  - Update `/src/modules/Wallet/schema.ts` from `sqliteTable` to `pgTable`
  - Update type mappings (text → varchar where appropriate, integer → timestamp handling)
  - Create `/src/modules/Wallet/schema.test.ts` to validate PostgreSQL types

- [x] **Step 4a (follow-up)**: Tighten string column types (text → varchar with explicit max length) **AND** update tests
  - Identify columns with _clear, stable maximum length_ and convert them to `varchar(n)` in Drizzle schemas (keep `text` for free-form/notes/descriptions)
  - Add/adjust schema tests to assert `varchar(n)` for the selected columns

- [x] **Step 5**: Convert Category module schema to PostgreSQL **AND** create schema validation test
  - Update `/src/modules/Category/schema.ts` to PostgreSQL types
  - Create `/src/modules/Category/schema.test.ts` for type validation

- [x] **Step 6**: Convert SavingsBucket module schema to PostgreSQL **AND** create schema validation test
  - Update `/src/modules/SavingsBucket/schema.ts` to PostgreSQL types
  - Create `/src/modules/SavingsBucket/schema.test.ts` for type validation

- [x] **Step 7**: Convert Transaction module schema to PostgreSQL **AND** create schema validation test
  - Update `/src/modules/Transaction/schema.ts` to PostgreSQL types
  - Update enum definitions for PostgreSQL compatibility
  - Create `/src/modules/Transaction/schema.test.ts` for type validation

- [x] **Step 8**: Convert Budget module schema to PostgreSQL **AND** create schema validation test
  - Update `/src/modules/Budget/schema.ts` to PostgreSQL types
  - Create `/src/modules/Budget/schema.test.ts` for type validation

- [x] **Step 9**: Generate new PostgreSQL migration **AND** create migration validation test
  - Run `pnpm drizzle-kit generate:pg` to create new migration files
  - Verify generated SQL in `/drizzle/` folder
  - Create `/drizzle/migration.test.ts` to validate migration SQL

- [x] **Step 9a (follow-up)**: Regenerate PostgreSQL migration after varchar changes **AND** update migration validation test
  - Re-run migration generation after updating schemas to `varchar(n)` for selected columns
  - Update `/drizzle/migration.test.ts` expectations so it asserts the new `varchar(n)` column types (and no longer expects `text` for those specific columns)

### Phase 3: Raw SQL Client Migration

- [x] **Step 10**: Replace SQLite client with PostgreSQL client **AND** create client test suite ✅
  - ✅ Replaced `/src/db/client.ts` to use PostgreSQL driver (`postgres` library)
  - ✅ Implemented PostgreSQL connection pooling with proper configuration
  - ✅ Created `/src/db/client.test.ts` for connection and query testing
  - ✅ Added comprehensive error handling and logging
  - ✅ Included utility functions for parameterized queries and error formatting
  - ✅ Added health checks, connection statistics, and graceful shutdown

- [x] **Step 11**: Convert all SQL query helpers for PostgreSQL **AND** create query helper tests ✅
  - ✅ Created `/src/db/helpers.ts` with comprehensive PostgreSQL query helpers
  - ✅ Implemented `convertPlaceholders()` to convert SQLite `?` to PostgreSQL `$n` syntax
  - ✅ Implemented `convertNamedParams()` to convert `:name` to PostgreSQL `$n` syntax
  - ✅ Created query builders: `buildInsert()`, `buildUpdate()`, `buildDelete()`, `buildSelect()`
  - ✅ Created advanced builders: `buildBatchInsert()`, `buildUpsert()`, `buildWhereClause()`
  - ✅ Created execution helpers: `executeQuery()`, `executeQueryOne()`, `insert()`, `update()`, `remove()`
  - ✅ Created convenience functions: `findBy()`, `findOneBy()`, `findById()`, `exists()`, `count()`, `paginate()`
  - ✅ Created `/src/db/helpers.test.ts` with 77 comprehensive tests

### Phase 4: API Route Testing & Updates

- [x] **Step 12**: Update Wallets API routes **AND** create comprehensive API tests ✅
  - ✅ Updated `/src/app/api/wallets/route.ts` with PostgreSQL error handling
  - ✅ Updated `/src/app/api/wallets/[id]/route.ts` with PostgreSQL error handling
  - ✅ Updated `/src/modules/Wallet/actions.ts` to use PostgreSQL template literals
  - ✅ Added proper HTTP status codes: 404 (not found), 409 (conflict), 422 (validation)
  - ✅ Added PostgreSQL-specific error code handling (23505, 23503, 23502, 23514)
  - ✅ Created `/src/app/api/wallets/route.test.ts` with 32 comprehensive tests
  - ✅ Created `/src/app/api/wallets/[id]/route.test.ts` with 41 comprehensive tests
  - ✅ Tests cover: CRUD operations, error handling, edge cases, PostgreSQL errors

- [x] **Step 13**: Update Category API routes **AND** create comprehensive API tests
  - Created `/src/modules/Category/actions.ts` with full CRUD operations
  - Created `/src/app/api/categories/route.ts` (GET, POST) with PostgreSQL error handling
  - Created `/src/app/api/categories/[id]/route.ts` (GET, PATCH, DELETE) with PostgreSQL error handling
  - Created `/src/app/api/categories/route.test.ts` (32 tests) covering all endpoints and error cases
  - Created `/src/app/api/categories/[id]/route.test.ts` (41 tests) covering individual category operations
  - Fixed `CategoryIdSchema` to accept nanoid format instead of UUID
  - Added comprehensive PostgreSQL constraint error handling (23505, 23503, 23502, 23514)
  - All 629 tests passing

- [ ] **Step 14**: Update SavingsBucket API routes **AND** create comprehensive API tests
  - Update all savings bucket API routes for PostgreSQL compatibility
  - Create corresponding test files for each endpoint

- [ ] **Step 15**: Update Transaction API routes **AND** create comprehensive API tests
  - Update all transaction API routes for PostgreSQL compatibility
  - Create corresponding test files for each endpoint

- [ ] **Step 16**: Update Budget API routes **AND** create comprehensive API tests
  - Update all budget API routes for PostgreSQL compatibility
  - Create corresponding test files for each endpoint

### Phase 5: Data Migration Script

- [ ] **Step 17**: Create data export/import utility **AND** create migration validation test
  - Create `/scripts/migrate-from-sqlite.ts` to export data from SQLite
  - Create `/scripts/import-to-postgres.ts` to import data to PostgreSQL
  - Create `/scripts/migration.test.ts` to validate data integrity

### Phase 6: Integration Testing & Documentation

- [ ] **Step 18**: Create end-to-end integration test suite **AND** update documentation
  - Create `/tests/integration/database.test.ts` for full database workflow testing
  - Update README.md with PostgreSQL setup instructions
  - Create `/docs/postgresql-setup.md` with detailed setup guide

## Key PostgreSQL-Specific Considerations

1. **Connection Pooling**: Implement proper connection management
2. **Transaction Handling**: Ensure ACID compliance with PostgreSQL
3. **UUID Handling**: Use PostgreSQL's UUID type instead of text
4. **Timestamp Handling**: Use PostgreSQL timestamp types instead of integer epoch
5. **Enum Types**: Create PostgreSQL enum types for categorical data
6. **String Types (text vs varchar)**:
   - Use `varchar(n)` only for columns with a clear, stable maximum length (enforced at the DB level)
   - Keep `text` for free-form inputs (notes, descriptions, payee) and any field where limits may evolve
   - When switching `text → varchar(n)` on existing tables, validate current data lengths before applying the migration
7. **Index Optimization**: Optimize indexes for PostgreSQL query planner
8. **JSON Support**: Leverage PostgreSQL JSON types where applicable

## Rollback Strategy

- Keep SQLite implementation as backup option via feature flag
- Maintain existing migration scripts for SQLite
- Document migration process for future reference
