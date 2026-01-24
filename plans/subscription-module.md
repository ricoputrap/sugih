# Plan: Subscription Management (Recurring Bills like Netflix)

## Goal
Add a first-class **Subscription** feature so you can:
- Create recurring subscriptions (e.g. Netflix monthly).
- Track status (active/paused/canceled).
- See upcoming charges.
- (Optionally) generate actual `transaction_events` automatically (or help you create them).

This plan is designed for the existing stack (Next.js + Postgres/Drizzle + Vitest) and follows strict module colocation.

---

## Recommendation (Best Solution)
Yes — you should build a **Subscription Module**, because subscriptions are a domain concept that does **not** fit cleanly into `Transaction`:
- A transaction is a historical event.
- A subscription is a *schedule + rules* that can *produce* events across time.
- You will want dedicated listing, forecasting, activation toggles, and “last charged / next charge” logic.

### Key product decision (must choose)
There are two valid models; the plan supports both, but you should pick one as your default:

1) **Forecast-only (no automatic posting)** — *recommended first iteration*
   - Store subscription schedule and show “upcoming charges”.
   - Provide “Create transaction from subscription” (one-click) when it’s due.
   - Pros: no background jobs needed, easiest to keep correct, no silent writes.
   - Cons: requires manual confirmation.

2) **Auto-posting (background generated transactions)** — *recommended second iteration*
   - Subscriptions generate transactions automatically when due (idempotent).
   - Requires a scheduler (cron) and careful idempotency + locking.

**Best path:** implement (1) first, then incrementally add (2) using a job runner and idempotency keys.

---

## Module Structure Check
- [ ] Confirmed that new files are colocated within `/src/modules/Subscription`.
- [ ] Confirmed types use `.ts` and are explicitly exported/imported.
- [ ] Confirmed every logic file has a sibling test file.
- [ ] Confirmed shared utilities only go to global scope if truly reusable.

---

## Proposed Module Layout (New)
- `/src/modules/Subscription/schema.ts`
- `/src/modules/Subscription/schema.test.ts`
- `/src/modules/Subscription/types.ts`
- `/src/modules/Subscription/utils/recurrence.ts`
- `/src/modules/Subscription/utils/recurrence.test.ts`
- `/src/modules/Subscription/actions.ts`
- `/src/modules/Subscription/actions.integration.test.ts`
- `/src/modules/Subscription/components/SubscriptionList.tsx`
- `/src/modules/Subscription/components/SubscriptionList.test.tsx` (or skip UI tests if your project doesn’t test React components; confirm current practice)
- `/src/app/api/subscriptions/route.ts`
- `/src/app/api/subscriptions/route.test.ts`
- `/src/app/api/subscriptions/[id]/route.ts`
- `/src/app/api/subscriptions/[id]/route.test.ts`
- `/src/app/api/subscriptions/[id]/pause/route.ts` (optional)
- `/src/app/api/subscriptions/[id]/pause/route.test.ts` (optional)

Also:
- Update `/src/db/schema.ts` to export new subscription schema.
- Add migrations via Drizzle (generate + run).

---

## Data Model (V1)
A subscription needs:
- Identity + name
- What it spends/earns (type)
- Wallet (required)
- Category (optional but recommended for expense; optional for income)
- Amount
- Schedule rules (monthly, yearly, weekly)
- State (active/paused/canceled)
- Bookkeeping fields to compute next due

### Table: `subscriptions`
Suggested columns:
- `id` (text, nanoid)
- `name` (varchar 255, required)
- `type` (`expense` | `income`)
- `wallet_id` (text, FK-like reference; enforce logically even if no FK)
- `category_id` (text nullable)
- `amount_idr` (numeric or bigint; match existing pattern)
- `currency` (varchar(3), default `IDR`) *(optional if you’re strictly IDR)*
- `recurrence` (`monthly` | `weekly` | `yearly`)
- `interval` (int, default 1) e.g. every 1 month, every 2 weeks
- `start_date` (date or timestamptz) - when it becomes active
- `next_due_at` (timestamptz) - computed and stored
- `last_charged_at` (timestamptz nullable)
- `status` (`active` | `paused` | `canceled`)
- `notes` (text nullable)
- `created_at`, `updated_at`

### Optional table (V2): `subscription_runs`
If you implement auto-posting:
- `id`
- `subscription_id`
- `due_at`
- `created_transaction_event_id` (the transaction it generated)
- `idempotency_key` (unique)
- `created_at`

This makes auditing + retries easier.

---

## Core Behavior (V1)
- Create subscription:
  - Validate wallet exists and not archived (reuse wallet logic).
  - Validate category exists (and type matches expense/income if you enforce it).
  - Compute `next_due_at` from `start_date`, `recurrence`, `interval`.
- List subscriptions:
  - Filter by status, wallet, type.
  - Sort by `next_due_at`.
- Update subscription:
  - If schedule changes, recompute `next_due_at`.
  - If paused/canceled, `next_due_at` can remain but should not be actionable (or set null).
- Get “upcoming charges”:
  - For each active subscription, compute next N occurrences (N small like 3) in-memory from recurrence util.
- “Create transaction from subscription (manual run)”:
  - Calls into `Transaction` module createExpense/createIncome.
  - Use an idempotency key derived from: `sub:${subscriptionId}:${dueISODate}` so repeated calls do not create duplicates.
  - Update `last_charged_at` and advance `next_due_at`.

---

## Execution Steps (TDD / One step per checkbox)
> Each step includes **code + tests**. Do not skip tests.

- [ ] **Step 1: Define schema + types**  
  Implement `/src/modules/Subscription/schema.ts` **AND** create `/src/modules/Subscription/schema.test.ts`.  
  Include Zod schemas: `SubscriptionCreateSchema`, `SubscriptionUpdateSchema`, `SubscriptionIdSchema`.

- [ ] **Step 2: Implement recurrence utility**  
  Implement `/src/modules/Subscription/utils/recurrence.ts` **AND** create `/src/modules/Subscription/utils/recurrence.test.ts`.  
  Functions:  
  - `computeNextDueAt({ startDate, recurrence, interval, from })`  
  - `computeUpcomingOccurrences({ nextDueAt, recurrence, interval, count })`

- [ ] **Step 3: Add DB schema export + migration**  
  Update `/src/db/schema.ts` **AND** add Drizzle migration files.  
  Test: add a minimal DB integration test to ensure the table is reachable (or cover via `actions.integration.test.ts` in Step 5).

- [ ] **Step 4: Implement Subscription actions (unit-level validation)**  
  Implement `/src/modules/Subscription/actions.ts` **AND** create `/src/modules/Subscription/actions.test.ts` (unit tests for validation logic with mocked deps if project style allows; otherwise skip directly to integration tests in Step 5).  
  Actions: `createSubscription`, `updateSubscription`, `getSubscriptionById`, `listSubscriptions`, `pauseSubscription`, `resumeSubscription`, `cancelSubscription`.

- [ ] **Step 5: Implement Subscription actions integration tests (DB)**  
  Create `/src/modules/Subscription/actions.integration.test.ts`.  
  Must ensure **full cleanup** of created wallets/categories/subscriptions after each test (follow the approach you used to fix Transaction integration cleanup).

- [ ] **Step 6: API routes (CRUD)**  
  Implement `/src/app/api/subscriptions/route.ts` and `/src/app/api/subscriptions/[id]/route.ts` **AND** corresponding route tests:  
  - `/src/app/api/subscriptions/route.test.ts`  
  - `/src/app/api/subscriptions/[id]/route.test.ts`  
  Cover status codes, validation errors, and happy paths.

- [ ] **Step 7: Upcoming charges endpoint (read-only)**  
  Implement `/src/app/api/subscriptions/upcoming/route.ts` **AND** `/src/app/api/subscriptions/upcoming/route.test.ts`.  
  Returns next occurrences per subscription (server computes using recurrence util).

- [ ] **Step 8: Manual “Run subscription” (creates transaction)**  
  Implement `/src/app/api/subscriptions/[id]/run/route.ts` **AND** `/src/app/api/subscriptions/[id]/run/route.test.ts`.  
  Behavior: createExpense/createIncome with deterministic idempotency key + advance `next_due_at`.

- [ ] **Step 9: Basic UI (minimal but useful)**  
  Implement `/src/modules/Subscription/components/SubscriptionList.tsx` and `/src/modules/Subscription/components/SubscriptionForm.tsx` **AND** tests if your repo tests module UI.  
  Add to navigation/dashboard appropriately (verify existing patterns first).

- [ ] **Step 10 (Optional): Auto-posting via scheduled job**  
  Add a server job runner (cron) that calls “run due subscriptions” safely.  
  Must include:
  - locking (DB-level advisory lock or `subscription_runs` unique constraint)
  - idempotency per (subscription, due date)
  - tests verifying no duplicates on re-run

---

## Safety & Data Integrity Notes
- **Idempotency is mandatory** for any “run” operation (manual or automatic).
- Avoid silent deletion; prefer status transitions.
- Keep recurrence math centralized in `utils/recurrence.ts` with strong tests (DST/timezones can bite).
- Always clean up integration test data (wallet/category/subscription/transaction + postings).

---

## Acceptance Criteria (V1)
- Create/list/update/pause/cancel subscriptions via API.
- See upcoming charges (next due dates).
- Run a subscription manually and produce correct transaction + postings using existing `Transaction` module.
- Every new logic file has tests.
- Integration tests do not leave residual DB rows.

---

## Open Questions (answer before Step 1)
1) Subscriptions are mostly **expense** in your use-case—do you also want **income** subscriptions (salary-like)?
2) Currency: strict `IDR` only, or should it be stored per subscription?
3) Should `category_id` be required for expenses?
4) How should “monthly” work for dates like the 31st? (Common: clamp to end-of-month.)
5) Do you want reminders/notifications later? (Would influence design but not required now.)
