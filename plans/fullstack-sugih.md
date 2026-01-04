# Sugih MVP — Fullstack Implementation Plan (Next.js + SQLite + Drizzle Migrations + Raw SQL + Zod + shadcn)

> Style: client-side UI, server-side logic, raw SQL at runtime.  
> Source of truth: `docs/design/sugih-mvp-sdd.md`.

## Conventions (apply to all phases)

- **Runtime DB access:** Raw SQL only (no ORM query builder at runtime).
- **Validation-first:** every action/route starts with `zodSchema.parse(input)`.
- **UI primitives:** shadcn UI components only.
- **Colocation:** each module lives in `src/modules/<ModuleName>/...` with:
  - `schema.ts` (Drizzle tables + Zod schemas)
  - `actions.ts` (server-side logic; raw SQL; called by API routes)
  - `components/*` (client UI)
- **Routing glue only** in `src/app/**`:
  - `src/app/api/**/route.ts` imports functions from modules
  - `src/app/<page>/page.tsx` composes UI from modules
- **Amounts:** integer Rupiah (`amount_idr` as signed int).
- **Money semantics:** wallets = spendable, savings buckets = allocated savings; net worth = sum(wallet balances) + sum(bucket balances).
- **Categories:** expense-only. No income categories. Income posts to **wallet only**.

---

## Phase 1: Infrastructure & Foundation (SQLite + Drizzle + Zod + shadcn)

- [x] **Step 1.1**: Create project structure
  - Create `src/` root (if not present) and move/keep Next.js app under `src/app/**`.
  - Create `src/modules/` and `src/db/` directories.
  - Decide a consistent import alias (e.g. `@/`).
- [x] **Step 1.2**: Install dependencies
  - DB/migrations: `drizzle-orm`, `drizzle-kit`, `better-sqlite3`
  - Validation: `zod`
  - Utilities: `nanoid` or `uuid` (for IDs), `date-fns` (optional for month boundaries)
- [x] **Step 1.3**: Create DB files
  - `drizzle.config.ts` pointing at SQLite file `./sqlite.db` and migrations folder.
  - `src/db/client.ts`: open a singleton `better-sqlite3` connection and expose helpers:
    - `db` connection
    - `all/get/run` wrappers with prepared statements
- [x] **Step 1.4**: Create schema entrypoint
  - `src/db/schema.ts` exports module schemas (or re-exports from each module).
- [x] **Step 1.5**: Initialize shadcn UI + Tailwind wiring
  - Run `shadcn init`
  - Ensure `globals.css` includes Tailwind and shadcn base styles.
- [x] **Step 1.6**: Add baseline UI shell
  - Desktop-first layout in `src/app/layout.tsx`:
    - Left sidebar nav: Dashboard, Transactions, Budgets, Reference (Wallets, Categories, Savings)
- [x] **Step 1.7**: Add error handling + response helpers
  - `src/lib/http.ts`: `ok(data)`, `badRequest(message, issues?)`, `serverError()`
  - `src/lib/zod.ts`: helper to format Zod errors
- [x] **Step 1.8**: Verification
  - Create a simple API route: `GET /api/health` -> runs `SELECT 1` against SQLite.
  - Confirm dev server works and health returns OK.

Deliverable: app boots, shadcn set up, DB connection verified, project structure established.

## Phase 2: Database Schema + Migrations (Core Tables)

> Goal: implement the schema from the SDD with SQLite-friendly constraints.

- [x] **Step 2.1**: Define core tables using Drizzle (migrations only)
  - Create module schemas (recommended split):
    - `src/modules/Wallet/schema.ts`
    - `src/modules/Category/schema.ts` (expense-only)
    - `src/modules/SavingsBucket/schema.ts`
    - `src/modules/Transaction/schema.ts` (events + postings)
    - `src/modules/Budget/schema.ts`
- [x] **Step 2.2**: Schema details (align to SDD)
  - `wallets`: `id`, `name` unique, `type`, `currency` default `IDR`, `archived`, timestamps
  - `categories`: `id`, `name` unique, `archived`, timestamps
  - `savings_buckets`: `id`, `name` unique, `description`, `archived`, timestamps
  - `transaction_events`: `id`, `occurred_at`, `type`, `note`, `payee`, `category_id` nullable, `deleted_at` nullable, timestamps, `idempotency_key` unique nullable
  - `postings`: `id`, `event_id`, `wallet_id` nullable, `savings_bucket_id` nullable, `amount_idr` (signed int), `created_at`
  - `budgets`: `id`, `month` (ISO `YYYY-MM-01`), `category_id`, `amount_idr`, unique `(month, category_id)`
- [x] **Step 2.3**: Add SQLite-level constraints where possible
  - `CHECK(amount_idr != 0)`
  - `CHECK((wallet_id IS NULL) != (savings_bucket_id IS NULL))` (XOR to ensure exactly one is set)
  - `CHECK(type IN (...))`
- [x] **Step 2.4**: Generate & apply migration
  - Run `drizzle-kit generate` and apply (push/migrate, per your setup).
- [x] **Step 2.5**: Seed minimal reference data (optional)
  - A small script or route to add default wallets/categories for quick start.

Deliverable: SQLite DB initialized with all tables + constraints + migration history.

---

## Phase 3: Reference Data Modules (End-to-End vertical slices)

> Finish backend + UI per module before moving on.

### Phase 3A: Wallet Module

- [ ] **Step 3A.1**: `src/modules/Wallet/schema.ts`
  - Zod: `WalletCreateSchema`, `WalletUpdateSchema`, `WalletIdSchema`
- [x] **Step 3A.2**: `src/modules/Wallet/actions.ts` (Raw SQL)
  - `listWallets()`
  - `createWallet(input)`
  - `updateWallet(id, input)`
  - `archiveWallet(id)` (soft archive)
- [x] **Step 3A.3**: API routes
  - `GET /api/wallets`
  - `POST /api/wallets`
  - `PATCH /api/wallets/:id`
  - `DELETE /api/wallets/:id`
- [x] **Step 3A.4**: UI components (shadcn)
  - Install: `button`, `input`, `dialog`, `form`, `table`, `dropdown-menu`, `toast`
  - `WalletTable`, `WalletDialogForm`
- [x] **Step 3A.5**: Page assembly
  - `src/app/wallets/page.tsx` (client-first: fetch via API)
- [x] **Step 3A.6**: Verification
  - Can create/update/archive wallets; list excludes archived by default.

### Phase 3B: Category Module (Expense-only)

- [x] **Step 3B.1**: Schema + Zod
  - `CategoryCreateSchema` requires `name`.
  - `CategoryUpdateSchema` for editing (name field).
  - `CategoryIdSchema` for ID validation.
- [x] **Step 3B.2**: Actions (Raw SQL)
  - `listCategories()`
  - `createCategory(input)`
  - `updateCategory(id, input)`
  - `archiveCategory(id)` (soft archive)
- [x] **Step 3B.3**: API routes (no `kind`)
  - `GET /api/categories`
  - `POST /api/categories`
  - `PATCH /api/categories/:id` (edit category name)
  - `DELETE /api/categories/:id` (archive)
- [x] **Step 3B.4**: UI components (shadcn)
  - `CategoryTable` with actions dropdown (edit, archive)
  - `CategoryDialogForm` for create and edit modes
  - Statistics cards (active/archived counts)
- [x] **Step 3B.5**: Page assembly
  - `src/app/categories/page.tsx` (client-first: fetch via API)
- [x] **Step 3B.6**: Verification
  - Can create/update/archive categories; list excludes archived by default.

### Phase 3C: Savings Bucket Module

- [x] **Step 3C.1**: Schema + Zod (`name`, optional `description`)
  - `SavingsBucketCreateSchema` requires `name`, optional `description`.
  - `SavingsBucketUpdateSchema` for editing (name, description fields).
  - `SavingsBucketIdSchema` for ID validation.
- [x] **Step 3C.2**: Actions (Raw SQL)
  - `listSavingsBuckets()`
  - `createSavingsBucket(input)`
  - `updateSavingsBucket(id, input)`
  - `archiveSavingsBucket(id)` (soft archive)
  - `restoreSavingsBucket(id)`
  - `deleteSavingsBucket(id)` (hard delete)
- [x] **Step 3C.3**: API routes
  - `GET /api/savings-buckets`
  - `POST /api/savings-buckets`
  - `PATCH /api/savings-buckets/:id` (edit bucket)
  - `DELETE /api/savings-buckets/:id` (archive/restore toggle or delete)
- [x] **Step 3C.4**: UI components (shadcn)
  - `SavingsBucketTable` with actions dropdown (edit, archive, delete)
  - `SavingsBucketDialogForm` for create and edit modes
  - Statistics cards (active/archived counts)
- [x] **Step 3C.5**: Page assembly
  - `src/app/savings/page.tsx` (client-first: fetch via API)
- [x] **Step 3C.6**: Verification
  - Can create/update/archive/restore savings buckets; list shows all buckets.

Deliverable: Reference data CRUD fully functional with desktop-first UIs.

---

## Phase 4: Transaction Module (Core Ledger + Invariants)

> This is the heart of the app. Enforce invariants in a DB transaction.

- [x] **Step 4.1**: Define enums & Zod inputs
  - `ExpenseCreateSchema`: `{ occurredAt, walletId, categoryId, amountIdr, note?, idempotencyKey? }`
  - `IncomeCreateSchema`: `{ occurredAt, walletId, amountIdr, note?, payee?, idempotencyKey? }`
  - `TransferCreateSchema`: `{ occurredAt, fromWalletId, toWalletId, amountIdr, note?, idempotencyKey? }` + refinement (from ≠ to)
  - `SavingsContributeSchema`: `{ occurredAt, walletId, bucketId, amountIdr, note?, idempotencyKey? }`
  - `SavingsWithdrawSchema`: `{ occurredAt, walletId, bucketId, amountIdr, note?, idempotencyKey? }`
  - `TransactionListQuerySchema`: filters by date range, walletId, categoryId, type, limit (default 50), offset (default 0)
  - `TransactionIdSchema`: for single transaction operations
- [x] **Step 4.2**: Implement posting engine (Raw SQL) in `src/modules/Transaction/actions.ts`
  - `createExpense(input)`:
    - insert event(type=expense, category_id required)
    - insert 1 posting(wallet_id, amount=-X)
  - `createIncome(input)`:
    - insert event(type=income, category_id NULL)
    - insert 1 posting(wallet_id, amount=+X)
  - `createTransfer(input)`:
    - insert event(type=transfer, category_id NULL)
    - insert 2 postings:
      - from wallet `-X`
      - to wallet `+X`
  - `createSavingsContribution(input)`:
    - insert event(type=savings_contribution)
    - insert 2 postings:
      - wallet `-X`
      - bucket `+X`
  - `createSavingsWithdrawal(input)`:
    - insert event(type=savings_withdrawal)
    - insert 2 postings:
      - bucket `-X`
      - wallet `+X`
  - Use a single SQL transaction (`BEGIN`/`COMMIT`/`ROLLBACK`) per create.
- [x] **Step 4.3**: Implement list/read models
  - `listTransactions(query)` should return:
    - event fields
    - joined category name (expense only)
    - derived "display amount" and involved wallet/bucket IDs
- [x] **Step 4.4**: API routes
  - `POST /api/transactions/expense`
  - `POST /api/transactions/income`
  - `POST /api/transactions/transfer`
  - `POST /api/transactions/savings/contribute`
  - `POST /api/transactions/savings/withdraw`
  - `GET /api/transactions`
- [ ] **Step 4.5**: Transactions UI (desktop-first)
  - Install: `tabs`, `select`, `calendar` (or date picker), `textarea`, `badge`
  - Page `src/app/transactions/page.tsx`:
    - list with filters (date range, wallet, type)
    - “Add transaction” dialog with tabs for type
- [ ] **Step 4.6**: Soft delete
  - Add API/action: `DELETE /api/transactions/:id` sets `deleted_at`
- [ ] **Step 4.7**: Verification checklist
  - Transfer creates exactly 2 wallet postings that sum to 0
  - Savings contribute/withdraw create wallet+bucket postings that sum to 0
  - Income only inserts wallet posting (no bucket)
  - Deleting an event hides it from lists and reports

Deliverable: You can record all transaction types and view them.

---

## Phase 5: Budgets Module (Expense categories only)

- [ ] **Step 5.1**: Budget schema + Zod
  - `BudgetMonthSchema`: `YYYY-MM`
  - `BudgetUpsertSchema`: `{ month, items: [{ categoryId, amountIdr }] }`
- [ ] **Step 5.2**: Actions (Raw SQL)
  - `getBudgetsByMonth(month)`
  - `upsertBudgets(month, items)` (transaction + upsert)
- [ ] **Step 5.3**: API routes
  - `GET /api/budgets?month=YYYY-MM`
  - `PUT /api/budgets`
- [ ] **Step 5.4**: Budget vs actual query
  - For a month, compute:
    - budget per category
    - actual spend per category (expense events only)
    - remaining/overspend
- [ ] **Step 5.5**: UI
  - Install: `table`, `input`, `button`, `card`
  - `src/app/budgets/page.tsx`:
    - month selector
    - editable table (budget amount per category)
    - summary totals (budgeted, spent, remaining)

Deliverable: Monthly budgets set and tracked vs actual expenses.

---

## Phase 6: Reporting & Dashboard

> Use raw SQL aggregation queries. Keep them fast with indexes on `occurred_at`, `category_id`, and posting foreign keys.

- [ ] **Step 6.1**: Reports actions (Raw SQL) in `src/modules/Report/actions.ts`
  - `spendingTrend(from,to,granularity)`
  - `categoryBreakdown(from,to)`
  - `netWorthTrend(from,to,granularity)` using:
    - wallet balances + bucket balances over time buckets
  - `moneyLeftToSpend(month)`:
    - total_budgeted - spent_budgeted (budgeted categories)
- [ ] **Step 6.2**: API routes
  - `GET /api/reports/spending-trend`
  - `GET /api/reports/category-breakdown`
  - `GET /api/reports/net-worth-trend`
  - `GET /api/reports/money-left-to-spend`
- [ ] **Step 6.3**: Dashboard UI
  - Install: `card`, `tabs`, `separator`
  - Charts: pick a library (e.g., `recharts`) and standardize components in `src/modules/Dashboard/components/*`.
  - `src/app/page.tsx` becomes dashboard:
    - cards: current net worth, money left to spend
    - charts: spending trend, net worth trend
    - breakdown: category breakdown table or donut

Deliverable: MVP dashboard with core insights.

---

## Phase 7: Hardening (Idempotency, Indexes, Guardrails)

- [ ] **Step 7.1**: Idempotency keys
  - Add optional `idempotencyKey` to create endpoints.
  - Enforce `UNIQUE(idempotency_key)` in schema (already planned).
  - Action logic: if key exists, return existing event instead of inserting new.
- [ ] **Step 7.2**: Add/verify indexes
  - `transaction_events(occurred_at)`
  - `transaction_events(type, occurred_at)`
  - `transaction_events(category_id, occurred_at)`
  - `postings(event_id)`, `(wallet_id, created_at)`, `(savings_bucket_id, created_at)`
  - `budgets(month, category_id)` unique
- [ ] **Step 7.3**: Input hardening
  - amount must be positive for user input; convert to signed in posting layer
  - prevent transfer with same from/to wallet
  - prevent negative/zero inputs
- [ ] **Step 7.4**: Logging
  - Add request IDs, log timings for report endpoints.
- [ ] **Step 7.5**: Backup/export (optional MVP+)
  - Add a “download sqlite.db” or export CSV for transactions.

Deliverable: safer writes, fewer duplicates, predictable performance.

---

## Phase 8: QA Checklist (MVP Acceptance)

- [ ] Can create wallets, categories, savings buckets (archive works).
- [ ] Can record expense/income/transfer/savings contribute/withdraw.
- [ ] Balances:
  - wallet balance reflects spendable cash
  - bucket balance reflects allocated savings
  - net worth = sum(wallet balances) + sum(bucket balances)
- [ ] Budget:
  - budgets set per month per category
  - budget vs actual accurate (expenses only)
  - money left to spend correct
- [ ] Dashboard:
  - trend charts render for a date range
  - category breakdown matches transaction sums
- [ ] Soft delete hides any deleted event from all reports and balances.

---

## Next Step

When you say **“Start Phase 1”**, we’ll execute **only Step 1.1** first (project structure + `src/` layout), verify it, mark it complete, then stop.
