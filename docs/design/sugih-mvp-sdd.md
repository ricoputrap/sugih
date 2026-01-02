# Sugih (MVP) — System Design Document (SDD)

## 1. Executive Summary

**Sugih** is a desktop-first, web-based personal finance management app for a single user, run locally for an MVP. The core capabilities are:

- Record transactions:
  - Expense
  - Income
  - Savings contribution / withdrawal (first-class savings buckets)
  - Transfers between wallets (two-sided movement)
- Manage reference data:
  - Wallets
  - Categories (expense classification)
  - Savings buckets (goals/containers)
- Budgeting:
  - Monthly budgets per **expense** category
  - Budget vs actual tracking
- Dashboard:
  - Spending trends over time
  - Category breakdowns
  - Net worth trend + current net worth
  - Money left to spend

### Key Decisions (from your answers)

- **User model:** single-user MVP (no sharing, no multi-tenancy)
- **Deployment:** local only
- **Stack constraint:** Next.js “fullstack” (no RSC)
- **Connectivity:** online-only (no offline-first requirements)
- **Currency:** single currency **IDR** (Rupiah)
- **Savings:** buckets are first-class entities; budgets apply to **expense categories only**
- **Scale:** only yourself for MVP

---

## 2. Goals & Non-Goals

### Goals

- Fast, correct entry and retrieval of financial transactions
- Strict accounting-style integrity for transfers and savings movements
- Accurate budget vs actual calculations per month (expense categories)
- Useful dashboards that are performant on a local environment
- Simple, maintainable architecture suitable for evolving into multi-user later (optional)

### Non-Goals (MVP)

- Bank sync / Open Banking connections
- Multi-user roles, sharing, collaboration
- True offline-first with conflict-free sync
- Multi-currency and FX rates
- Complex investment tracking (stocks, portfolios, lots, etc.)

---

## 3. Requirements

### Functional Requirements (FR)

1. **Transactions**
   - Create/read/update/delete transactions (with soft delete recommended)
   - Types supported: `expense`, `income`, `transfer`, `savings_contribution`, `savings_withdrawal`
   - **Income semantics (MVP):**
     - Income requires selecting a **wallet only** (no category)
     - Income is **wallet-only** (directly increasing savings buckets is not allowed)
   - Transfers move value between two wallets with atomicity (both legs succeed or none)
   - Savings movements affect both a wallet and a savings bucket

2. **Reference Data**
   - CRUD wallets
   - CRUD categories (expense only)
   - CRUD savings buckets

3. **Budgeting**
   - Set monthly budget amounts for expense categories
   - Budget vs actual:
     - Actual = sum of expense transactions for the category within the month
     - Remaining = budget - actual
     - Overspend = max(0, actual - budget)

4. **Dashboards**
   - Spending trend time series (e.g., daily/weekly/monthly)
   - Category breakdown for selected period
   - Net worth trend and current net worth
   - “Money left to spend” for the month (see Section 6)

### Non-Functional Requirements (NFR)

- **Performance:** dashboards should render quickly locally; aim for <200ms API response for common aggregations over typical personal data volumes (10k–200k transactions).
- **Data integrity:** prevent orphan legs, ensure atomic posting of transfers/savings moves.
- **Security:** local deployment but still:
  - AuthN to protect app access
  - Encryption in transit (localhost TLS optional for MVP; keep design TLS-ready)
  - Secrets management via environment variables
- **Reliability:** idempotent creation of complex movements; safe retries.
- **Observability:** lightweight logging and basic health endpoints; optional tracing.
- **Maintainability:** clear domain model, predictable APIs, migrations.

---

## 4. Proposed Architecture

### 4.1 High-Level Architecture

- **UI:** Next.js App Router (without RSC usage), desktop-first responsive design
- **Backend:** Next.js API route handlers (no Server Actions required)
- **Database:** SQLite (local-only MVP simplicity)
- **ORM / Migrations:** Drizzle (recommended) or Prisma (SQLite)
- **Auth:** optional single-user auth gate (recommended if the app is not strictly bound to localhost)

### 4.2 C4 Container Diagram (Mermaid)

```/dev/null/c4-container.mmd#L1-60
flowchart TB
  user[User (Desktop Browser)] -->|HTTPS/HTTP localhost| web[Next.js Web App]
  web -->|Route Handlers / API| api[Next.js Backend (API Routes)]
  api --> db[(Relational DB)]
  api --> logs[(Local Logs)]
```

### 4.3 Key Architectural Principles

- **Single Source of Truth:** all balances are derived from transaction postings, not stored as mutable wallet balance fields.
- **Double-entry–like ledger approach for movements:** represent transfers/savings as paired postings to enforce atomic movement integrity.
- **Event grouping:** group multiple postings into a single “transaction event” so the UI can treat it as one operation.

---

## 5. Domain Model & Data Model

### 5.1 Core Concepts

- **Wallet:** where money lives (cash, bank, e-wallet). Has a currency (fixed to IDR for MVP).
- **Category:** expense classification (expense-only for MVP).
- **Savings Bucket:** goal/container (e.g., Emergency Fund). Has a computed balance derived from savings movements.
- **Transaction Event:** user-facing record (e.g., “Buy groceries”, “Transfer BCA → Cash”, “Contribute to Emergency Fund”).
- **Posting:** internal ledger entries that affect wallet balances (and optionally savings buckets). A single event can create multiple postings.
  - Expense: one posting decreases a wallet
  - Income: one posting increases a wallet (**wallet-only; cannot post directly to a bucket**)
  - Transfer: two postings (−fromWallet, +toWallet)
  - Savings contribution: two postings (−wallet, +bucket)
  - Savings withdrawal: two postings (+wallet, −bucket)

This keeps computations consistent and makes reporting easy.

### 5.2 ER Diagram (Mermaid)

```/dev/null/erd.mmd#L1-120
erDiagram
  WALLET ||--o{ POSTING : has
  CATEGORY ||--o{ TRANSACTION_EVENT : classifies
  SAVINGS_BUCKET ||--o{ POSTING : affects
  TRANSACTION_EVENT ||--o{ POSTING : contains

  WALLET {
    uuid id PK
    string name
    string type
    string currency
    boolean archived
    datetime created_at
    datetime updated_at
  }

  CATEGORY {
    uuid id PK
    string name
    boolean archived
    datetime created_at
    datetime updated_at
  }

  SAVINGS_BUCKET {
    uuid id PK
    string name
    string description
    boolean archived
    datetime created_at
    datetime updated_at
  }

  TRANSACTION_EVENT {
    uuid id PK
    datetime occurred_at
    string type "expense|income|transfer|savings_contribution|savings_withdrawal"
    string note
    uuid category_id FK "nullable for transfer"
    string payee "optional"
    boolean deleted
    datetime created_at
    datetime updated_at
  }

  POSTING {
    uuid id PK
    uuid event_id FK
    uuid wallet_id FK "nullable for bucket-only posting? (recommended: wallet_id nullable)"
    uuid savings_bucket_id FK "nullable"
    int amount_idr  "signed integer in Rupiah"
    string direction "debit|credit (optional helper)"
    datetime created_at
  }
```

### 5.3 Relational Schema (Recommended)

> Amounts are stored as **integer Rupiah** (`amount_idr`) to avoid floating point errors.

#### `wallets`

- `id` (UUID, PK)
- `name` (text, unique)
- `type` (text: cash|bank|ewallet|other)
- `currency` (text, default `IDR`)
- `archived` (bool, default false)
- `created_at`, `updated_at`

Indexes:

- `UNIQUE(name)`
- `INDEX(archived)`

#### `categories` (expense-only)

- `id` (UUID, PK)
- `name` (text)
- `archived` (bool)
- `created_at`, `updated_at`

Indexes:

- `UNIQUE(name)`
- `INDEX(archived)`

#### `savings_buckets`

- `id` (UUID, PK)
- `name` (text, unique)
- `description` (text, nullable)
- `archived` (bool)
- `created_at`, `updated_at`

Indexes:

- `UNIQUE(name)`
- `INDEX(archived)`

#### `transaction_events`

- `id` (UUID, PK)
- `occurred_at` (timestamptz)
- `type` (text enum)
- `note` (text, nullable)
- `payee` (text, nullable)
- `category_id` (UUID FK -> categories.id, nullable)
- `deleted_at` (timestamptz nullable) or `deleted` bool + `deleted_at`
- `created_at`, `updated_at`

Constraints:

- If `type` = `expense` then `category_id` MUST be non-null.
- If `type` IN (`income`, `transfer`, `savings_contribution`, `savings_withdrawal`) then `category_id` MUST be null for MVP (keep categories strictly for expenses).
- If `type` = `income` then postings MUST be exactly 1 posting where:
  - `wallet_id` is non-null
  - `savings_bucket_id` is null
  - `amount_idr` is positive

Indexes:

- `INDEX(occurred_at)`
- `INDEX(type, occurred_at)`
- `INDEX(category_id, occurred_at)` partial on non-null
- `INDEX(deleted_at)` (or `deleted`)

#### `postings`

- `id` (UUID, PK)
- `event_id` (UUID FK -> transaction_events.id)
- `wallet_id` (UUID FK -> wallets.id, nullable)
- `savings_bucket_id` (UUID FK -> savings_buckets.id, nullable)
- `amount_idr` (integer, signed; positive = inflow to target, negative = outflow)
- `created_at`

Constraints:

- `amount_idr <> 0`
- Exactly one of (`wallet_id`, `savings_bucket_id`) or both present?
  - **Recommendation (MVP):** allow either:
    - Wallet posting: `wallet_id` set, bucket null
    - Bucket posting: `savings_bucket_id` set, wallet null
  - Disallow both set to keep semantics clear.
- For transfers and savings movements, enforce posting count per event:
  - transfer: exactly 2 wallet postings, sum(amount_idr)=0
  - savings_contribution/withdrawal: exactly 2 postings (1 wallet + 1 bucket), sum(amount_idr)=0
  - expense/income: exactly 1 wallet posting

Indexes:

- `INDEX(event_id)`
- `INDEX(wallet_id, created_at)`
- `INDEX(savings_bucket_id, created_at)`

> Implementation note: Some of the “posting count” constraints are hard to express purely with SQL constraints; enforce at application layer within a DB transaction.

---

## 6. Aggregations & Reporting Definitions

### 6.1 Wallet Balance

For a wallet `W`:

- `balance(W) = SUM(postings.amount_idr WHERE wallet_id = W AND event not deleted)`

### 6.2 Savings Bucket Balance

For a bucket `B`:

- `balance(B) = SUM(postings.amount_idr WHERE savings_bucket_id = B AND event not deleted)`

### 6.3 Net Worth

For IDR-only MVP:

- **Definition (per your requirement):**
  - `net_worth = SUM(wallet balances) + SUM(savings bucket balances)`

Accounting semantics (important):

- **Wallets represent “spendable cash” only.**
  - Example: your real-world bank account has Rp10,000,000, but if you allocate Rp2,000,000 into a savings bucket, the wallet balance shown in Sugih should become Rp8,000,000 (spendable), not Rp10,000,000.
- **Savings buckets represent “allocated savings assets” inside Sugih.**
  - Buckets are treated as a separate asset class for reporting (even though in reality the money is still in the bank).
- Therefore, a **savings contribution is modeled as moving money out of spendable wallets into buckets**:
  - Wallet posting: `-amountIdr`
  - Bucket posting: `+amountIdr`
- A **savings withdrawal is modeled as moving money out of buckets back into spendable wallets**:
  - Bucket posting: `-amountIdr`
  - Wallet posting: `+amountIdr`

With this semantic model, summing wallets + buckets is intentional and does **not** represent “double counting” in the UX; it represents “spendable cash + allocated savings = net worth” as Sugih defines it for this MVP.

### 6.4 Budget vs Actual (Expense Categories Only)

For month `M` and expense category `C`:

- `actual_spend(M,C) = SUM(ABS(wallet_postings.amount_idr))` for events of type `expense`
  - If expense is modeled as a single negative posting, then:
    - actual = `-SUM(postings.amount_idr)` (since amounts are negative)
- `budget(M,C) = budgets.amount_idr`
- `remaining = budget - actual`

**Time boundaries:** Use local timezone consistent with your locale for month boundaries; store timestamps as UTC but compute month buckets in configured timezone.

### 6.5 Money Left to Spend (Month)

Define:

- `total_budgeted = SUM(budget(M, each expense category))`
- `spent_budgeted = SUM(actual_spend(M, each budgeted expense category))`
- `money_left_to_spend = total_budgeted - spent_budgeted`

Optionally show:

- `spent_unbudgeted = SUM(actual_spend(M, expense categories without a budget entry))`

---

## 7. API Interface (Next.js Route Handlers)

> These are logical endpoints; implement as `/api/...` or `/app/api/...` route handlers.

### 7.1 Common Conventions

- Content-Type: `application/json`
- IDs: UUID strings
- Amounts: integer Rupiah (no decimals)
- Pagination: `?limit=50&cursor=...` (cursor optional for MVP)
- Soft delete: `deleted_at` set; queries exclude deleted by default

### 7.2 Reference Data

#### Wallets

- `GET /api/wallets`
- `POST /api/wallets`
  - `{ "name": "BCA", "type": "bank" }`
- `PATCH /api/wallets/:id`
- `DELETE /api/wallets/:id` (archive recommended)

#### Categories (expense-only)

- `GET /api/categories`
- `POST /api/categories`
  - `{ "name": "Groceries" }`
- `PATCH /api/categories/:id`
- `DELETE /api/categories/:id` (archive)

#### Savings Buckets

- `GET /api/savings-buckets`
- `POST /api/savings-buckets`
  - `{ "name": "Emergency Fund", "description": "6 months expenses" }`
- `PATCH /api/savings-buckets/:id`
- `DELETE /api/savings-buckets/:id` (archive)

### 7.3 Transactions

#### Create Expense

`POST /api/transactions/expense`

- Request:
  - `{ "occurredAt": "...", "walletId": "...", "categoryId": "...", "amountIdr": 25000, "note": "Lunch" }`
- Semantics:
  - Create event type `expense`
  - Create 1 posting with `amount_idr = -amountIdr`

#### Create Income

`POST /api/transactions/income`

- Request:
  - `{ "occurredAt": "...", "walletId": "...", "amountIdr": 10000000, "note": "Salary" }`
- Semantics:
  - Create event type `income`
  - Category is not applicable (expense-only categories)
  - Create exactly 1 posting to the wallet with `amount_idr = +amountIdr`
  - **Bucket deposits are not allowed** for income

#### Create Transfer

`POST /api/transactions/transfer`

- Request:
  - `{ "occurredAt": "...", "fromWalletId": "...", "toWalletId": "...", "amountIdr": 500000, "note": "Top up e-wallet" }`
- Postings:
  - From wallet: `-amountIdr`
  - To wallet: `+amountIdr`
- Must be atomic in a DB transaction.

#### Savings Contribution

`POST /api/transactions/savings/contribute`

- Request:
  - `{ "occurredAt": "...", "walletId": "...", "bucketId": "...", "amountIdr": 200000, "note": "Monthly saving" }`
- Postings:
  - Wallet: `-amountIdr`
  - Bucket: `+amountIdr`

#### Savings Withdrawal

`POST /api/transactions/savings/withdraw`

- Request:
  - `{ "occurredAt": "...", "walletId": "...", "bucketId": "...", "amountIdr": 150000, "note": "Emergency use" }`
- Postings:
  - Bucket: `-amountIdr`
  - Wallet: `+amountIdr`

#### List Transactions

`GET /api/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD&type=...&walletId=...&categoryId=...`

- Returns events with derived fields:
  - display amount
  - involved wallets/buckets
  - category

### 7.4 Budgets

- `GET /api/budgets?month=YYYY-MM`
- `PUT /api/budgets`
  - Request:
    - `{ "month": "2026-01", "items": [{ "categoryId": "...", "amountIdr": 1500000 }] }`
  - Upsert budgets for that month.

Schema for `budgets` table (suggested):

- `id` UUID
- `month` date (normalize to first day of month)
- `category_id` FK categories
- `amount_idr` int
- unique `(month, category_id)`

### 7.5 Dashboard/Reports

- `GET /api/reports/spending-trend?from=...&to=...&granularity=day|week|month`
- `GET /api/reports/category-breakdown?from=...&to=...`
- `GET /api/reports/net-worth-trend?from=...&to=...&granularity=...`
- `GET /api/reports/money-left-to-spend?month=YYYY-MM`

---

## 8. Key Workflows (Sequence Diagrams)

### 8.1 Create Transfer (Atomic Two-Leg Posting)

```/dev/null/seq-transfer.mmd#L1-60
sequenceDiagram
  actor U as User
  participant UI as Next.js UI
  participant API as API Route Handler
  participant DB as Database

  U->>UI: Submit transfer form
  UI->>API: POST /transactions/transfer
  API->>DB: BEGIN
  API->>DB: INSERT transaction_event(type=transfer)
  API->>DB: INSERT posting(wallet=from, amount=-X)
  API->>DB: INSERT posting(wallet=to, amount=+X)
  API->>DB: COMMIT
  API-->>UI: 201 Created (event + legs)
  UI-->>U: Show transfer in list
```

### 8.2 Create Savings Contribution (Wallet → Bucket)

```/dev/null/seq-savings.mmd#L1-60
sequenceDiagram
  actor U as User
  participant UI as Next.js UI
  participant API as API Route Handler
  participant DB as Database

  U->>UI: Submit contribution
  UI->>API: POST /transactions/savings/contribute
  API->>DB: BEGIN
  API->>DB: INSERT transaction_event(type=savings_contribution)
  API->>DB: INSERT posting(wallet, amount=-X)
  API->>DB: INSERT posting(bucket, amount=+X)
  API->>DB: COMMIT
  API-->>UI: 201 Created
```

---

## 9. Data Integrity & Validation Strategy

### 9.1 App-Level Invariants (Enforced in Transaction)

For each `transaction_event` creation/update:

- `expense`: exactly 1 wallet posting, amount negative, category required
- `income`: exactly 1 wallet posting, amount positive, **no category**, and **must be wallet-only** (no bucket posting)
- `transfer`: exactly 2 wallet postings, one negative one positive, same absolute value, sum=0
- `savings_contribution`: exactly 2 postings (wallet negative + bucket positive), sum=0
- `savings_withdrawal`: exactly 2 postings (bucket negative + wallet positive), sum=0

### 9.2 Idempotency

Add an optional `idempotency_key` to `transaction_events` for write endpoints.

- Client sends a UUID per submit
- Backend ensures `UNIQUE(idempotency_key)` to avoid duplicates on retries

### 9.3 Soft Deletes

Prefer `deleted_at` on `transaction_events`.

- Deleting an event excludes it from balance/report computations.
- Keep postings for audit but filtered via join on event `deleted_at is null`.

---

## 10. Security

Even locally, treat this as a real finance app:

- **AuthN:** single-user login
  - Option A: NextAuth credentials provider (hashed password in DB)
  - Option B: simple passcode gate stored as salted hash (MVP)
- **AuthZ:** for MVP, all authenticated requests allowed (single user).
- **Transport:** localhost HTTP is acceptable for MVP; keep TLS-ready if exposed beyond localhost.
- **Encryption at rest:** if using Postgres, rely on disk encryption; if you later host, enable DB encryption/backups encryption.
- **Secrets:** store credentials (DB, auth secret) in environment variables; never in repo.

---

## 11. Observability

- **Logging:** structured logs for:
  - transaction creations (type, amounts, involved wallet/bucket IDs)
  - report queries (timing, parameters)
  - errors with request IDs
- **Metrics (optional MVP):**
  - request latency per endpoint
  - count of transaction creations
- **Tracing:** optional; not required for local MVP.

---

## 12. Performance & Caching Strategy

For local MVP, keep it simple:

- Optimize DB indexes around `occurred_at`, `category_id`, `wallet_id`
- Use pre-aggregations only if needed:
  - If dashboards become slow, introduce a `monthly_category_spend` materialized view or table updated on writes.
- API caching:
  - In-memory cache per request not needed; if desired, small TTL caching for report endpoints.

---

## 13. UI/UX Notes (Desktop-First)

- Primary navigation:
  - Dashboard
  - Transactions
  - Budgets
  - Reference Data (Wallets/Categories/Savings)
- Transactions entry:
  - Quick add modal with type switcher
  - Keyboard-friendly (tab order, enter to submit)
  - Inline creation of categories/wallets if missing (optional)
- Reports:
  - Default month view for budgets and money left to spend
  - Date range picker for category breakdown and trends

---

## 14. Implementation Roadmap (MVP)

### Phase 0 — Foundations

- Choose DB (Postgres recommended) + ORM + migrations
- Define schema and migrations
- Add auth gate (single-user)

### Phase 1 — Reference Data

- Wallets CRUD
- Categories CRUD (income vs expense)
- Savings buckets CRUD

### Phase 2 — Transactions (Core)

- Implement transaction_events + postings write APIs with invariants
- Transaction list + filters
- Edit and delete (soft delete)

### Phase 3 — Budgets

- Budgets table + upsert API
- Budget vs actual computations per month

### Phase 4 — Dashboard & Reports

- Spending trend
- Category breakdown
- Net worth (wallet balances) + trend
- Money left to spend

### Phase 5 — Hardening

- Idempotency keys
- Better validation/error messages
- Basic logging/metrics
- Seed data scripts (optional)

---

## 15. Open Questions / Future Extensions

- Do you want to tag transfers/savings with categories for reporting (e.g., “Savings” category)?
- Should net worth include savings buckets or treat them as internal allocations (current recommendation: allocations)?
- Do you want recurring transactions and recurring budgets?
- Import/export (CSV) for backups?

---
