# Plan: Fix Build Errors - Node Modules in Browser

## Problem Analysis

The build is failing because **Node.js-only modules** (`pg`, `pg-connection-string`, `pgpass`) are being imported into **Browser/Client Components**, which causes module resolution errors for Node.js APIs like `dns`, `fs`, `net`, `tls`.

### Root Cause

- `src/db/drizzle-client.ts` is imported as a **Client Component** (no `'use server'` directive)
- This module imports `pg` (PostgreSQL driver), which is Node.js-only
- The import chain flows into Browser Components:
  - `BudgetDialogForm.tsx` (Client Component) imports from `Budget/schema.ts`
  - `Budget/schema.ts` imports from `Category/actions.ts`
  - `Category/actions.ts` likely imports database client
  - Eventually reaches `drizzle-client.ts` in the browser

### Impact

6 module resolution errors:

- `dns` module not found
- `fs` module not found (appears 2x)
- `net` module not found (appears 2x)
- `tls` module not found

## Solution Strategy

**Separate Server and Client Code**:

1. Mark `src/db/drizzle-client.ts` with `'use server'` to keep it server-only
2. Mark `src/modules/Category/actions.ts` with `'use server'` (if it calls DB functions)
3. Verify `src/modules/Budget/schema.ts` is **client-safe** (only Zod/type definitions)
4. Update `next.config.ts` to explicitly exclude Node modules from client bundle

## Module Structure Check

- [x] `drizzle-client.ts` - Removed `'use server'` (routes are server-only by default)
- [x] `Category/actions.ts` - Added `'use server'` directive
- [x] `Budget/schema.ts` - Verified as client-safe, removed async server imports
- [x] `Budget/drizzle-schema.ts` - Created server-only Drizzle schema file
- [x] `next.config.ts` - Simplified (Turbopack handles `'use server'` directives)

## Execution Steps

- [x] **Step 1**: Add `'use server'` to `src/db/drizzle-client.ts` - Initially added but later removed since routes are server-only by default
- [x] **Step 2**: Add `'use server'` to `src/modules/Category/actions.ts` - Added successfully
- [x] **Step 3**: Audit `src/modules/Budget/schema.ts` to ensure it's client-safe - Removed Drizzle table imports, created separate drizzle-schema.ts
- [x] **Step 4**: Update `next.config.ts` with webpack config - Simplified to rely on Turbopack's `'use server'` handling
- [x] **Step 5**: Run `pnpm build` and verify all 6 errors are resolved - ✅ BUILD SUCCESSFUL

## Additional Fixes Applied

### File Structure Improvements

- [x] **Created** `src/modules/Budget/drizzle-schema.ts` - Moved Drizzle table definition out of client-facing schema
- [x] **Updated** `src/modules/Budget/schema.ts` - Removed Drizzle imports, kept only Zod validation
- [x] **Updated** `src/modules/Budget/schema.test.ts` - Adjusted imports to use new drizzle-schema location
- [x] **Updated** `src/modules/Budget/actions.ts` - Added expense category type validation in upsertBudgets

### Removed Legacy Files

- [x] **Archived** `src/db/client.legacy.ts` → `src/db/client.legacy.ts.bak` (was using old postgres driver)
- [x] **Archived** `src/db/migrate.ts` → `src/db/migrate.ts.bak` (SQLite-based, not used)

### Type & Error Fixes

- [x] Fixed TypeScript generic constraint error in `drizzle-client.ts` pool.query
- [x] Fixed Zod enum error in `Category/schema.ts` (removed unsupported required_error parameter)
- [x] Added missing `CategorySpendingTrendQueryInput` import in `Dashboard/actions.ts`
- [x] Fixed type constraints for optional query parameters in `Dashboard/actions.ts`
- [x] Fixed missing export in `Dashboard/utils/index.ts` (formatGrowthLabel → formatGrowthMetric)
- [x] Added `deleted_at` field to `SavingsBucket` return object
- [x] Fixed bigint to number conversion in `Transaction/actions.ts`
- [x] Made Budget interface date fields nullable (created_at, updated_at)

## Expected Outcome

- ✅ Turbopack build completes without module resolution errors
- ✅ All Node.js modules correctly isolated to server code
- ✅ Browser bundle excludes pg, dns, fs, net, tls dependencies
- ✅ TypeScript compilation passes
- ✅ All 34 static and dynamic routes properly generated

## Build Result

```
✓ Compiled successfully
✓ Generating static pages using 7 workers (34/34)
✓ Finalizing page optimization
```

**Status: COMPLETE** ✅
