# Project-wide Logging Expansion Plan (Pino, stdout JSON)

Goal: Expand logging beyond a few GET report routes into a consistent, safe, low-noise observability layer across the entire Sugih codebase while keeping **stdout JSON logs** as the single output (platform-friendly).

Non-goals:

- No persistent local file logging (for now).
- No APM/metrics backend integration (optional future).
- No logging of sensitive user data (PII/secrets), ever.

---

## Guiding Principles

1. **Structured logs only**: JSON objects with stable keys; avoid string-only logs.
2. **Request correlation everywhere**: a single `requestId` propagated across request → module actions → db calls.
3. **Log intent, not noise**:
   - INFO: request completion, lifecycle events, major business operations (create wallet/tx/budget updates).
   - WARN: recoverable problems, invalid state attempts, expected constraint conflicts.
   - ERROR: unexpected failures, exceptions, DB failures.
   - DEBUG: development-only or sampled detail (query timing, payload sizes).
4. **Redact by default**: authorization/cookies/tokens/passwords and any fields that can contain secrets.
5. **Avoid PII**: never log freeform notes/payees unless explicitly whitelisted and sanitized/truncated.
6. **Use consistent event naming**: `request:start`, `request:complete`, `db:query`, `action:start`, `action:complete`, `action:error`, `ui:error` (if needed).
7. **Sampling / throttling**: allow reducing high-volume logs (e.g., list endpoints) via environment config.

---

## Current State (baseline)

- Pino base logger + redaction exists (`src/lib/logging/logger.ts`).
- Request ID utilities exist (`src/lib/logging/request-id.ts`).
- Route wrapper exists (`src/lib/logging/route-helpers.ts`) and is applied to report endpoints + dashboard.
- Logging is currently focused on a subset of GET routes, and does not consistently cover non-GET routes, module actions, or DB operations.

---

## Phase 1 — Establish a Project-wide Logging Contract ✅

- [x] **Step 1.1: Define standard log fields (contract)**
  - Required:
    - `timestamp` (Pino provides)
    - `level` (Pino provides)
    - `requestId`
    - `operation` (route or action name)
    - `event` (e.g. `request:complete`)
  - Common optional fields:
    - `method`, `path`
    - `status`
    - `durationMs`
    - `query` (sanitized)
    - `routeParams` (sanitized)
    - `actor` (future: user/session id)
    - `resourceType`, `resourceId` (e.g. `wallet`, `wal_...`)
    - `counts` (e.g. number of rows returned)
    - `err` (serialized)
  - Output should be stable for easy grep and future ingestion.
  - ✅ **Completed:** Created `src/lib/logging/contract.ts` with comprehensive TypeScript types and documentation for all standard fields.

- [x] **Step 1.2: Centralize error serialization and safe truncation**
  - Enhance current error serialization rules:
    - Ensure `err.message` is truncated to a safe size.
    - Never include raw request bodies in error logs.
    - Normalize known DB errors (SQLite constraint violations, Postgres errors if still present).
  - ✅ **Completed:** Created `src/lib/logging/error-serialization.ts` with:
    - `serializeError()` - Safe error serialization with truncation (2000 chars for messages, 5000 for stacks)
    - `normalizeDbError()` - Maps SQLite/Postgres errors to stable `errorKind` values with safe user-facing messages
    - `sanitizeFreeformText()`, `sanitizeObject()`, `isSensitiveFieldName()` - Utilities for safe field logging
    - `truncate()`, `roundMs()` - Helper utilities

- [x] **Step 1.3: Define environment knobs**
  - `LOG_LEVEL` (already supported)
  - `LOG_SAMPLE_RATE` (0..1 for high-volume endpoints)
  - `LOG_QUERY_TIMING=true|false`
  - `LOG_BODY_LOGGING=false` (explicitly off; only allow for local debugging with strict allowlist)
  - `LOG_SLOW_REQUEST_MS=500` (warn when exceeded)
  - ✅ **Completed:** Created `src/lib/logging/config.ts` with all environment knobs:
    - `LOG_LEVEL`, `LOG_SAMPLE_RATE`, `LOG_QUERY_TIMING`, `LOG_BODY_LOGGING`, `LOG_SLOW_REQUEST_MS`
    - `LOG_TRANSACTIONS`, `LOG_ACTIONS`, `LOG_STACK_TRACES_IN_PRODUCTION`, `LOG_MAX_QUERY_PARAMS`
    - `shouldSample()`, `isSlowRequest()`, `getLoggingConfigSummary()` helper functions
    - Validation on module load (fail-fast if misconfigured)

**Deliverable:** ✅ **COMPLETE** - Documented and implemented conventions for how logs look and what's allowed.

**Additional deliverables:**

- ✅ Created `src/lib/logging/index.ts` - Main export file for all logging utilities
- ✅ Created `src/lib/logging/README.md` - Comprehensive documentation (577 lines) covering:
  - Architecture and module overview
  - Configuration reference
  - Logging contract and field standards
  - Usage patterns (routes, actions, DB queries)
  - Event naming conventions
  - Security and safety guidelines
  - Sampling and performance monitoring
  - Migration guide (replacing console.\*)
  - Troubleshooting
- ✅ Updated `src/lib/logging/logger.ts` - Integrated with centralized config
- ✅ Updated `src/lib/logging/route-helpers.ts` - Uses centralized error serialization, config, and slow request detection

**Next Phase:** Phase 2 — Route-level Logging Everywhere (All API Routes, All Methods)

---

## Phase 2 — Route-level Logging Everywhere (All API Routes, All Methods) ⚠️ IN PROGRESS

- [x] **Step 2.1: Wrap all API route handlers**
  - Apply a generalized wrapper (similar to `withReportTiming`) to **every API route**:
    - GET/POST/PATCH/PUT/DELETE
    - Ensure `x-request-id` is always set on responses
    - Log timing + status + sanitized query params
    - Add slow-request warning threshold (`LOG_SLOW_REQUEST_MS`)
  - Event patterns:
    - `request:start` (DEBUG or INFO based on config)
    - `request:complete` (INFO)
    - `request:error` (ERROR)
  - ✅ **Completed:**
    - Created `withRouteLogging()` - generalized wrapper for all HTTP methods
    - Enhanced `route-helpers.ts` with support for:
      - Route params logging (`logRouteParams`)
      - Body metadata logging (`logBodyMetadata`)
      - Slow request detection and WARN logging
      - Sampling support (via `shouldSample()`)
      - Defensive handling for handlers without request parameter
    - Made `getOrCreateRequestId()` defensive (handles null/undefined request)
    - Made `withRequestIdHeader()` defensive (handles responses without headers/consumed bodies)

- [x] **Step 2.2: Add payload metadata (not payload content)**
  - For routes that read JSON body:
    - Log `contentLength` and/or approximate body size
    - Log validation outcome (success/failure) without echoing the body
  - For list endpoints:
    - Log pagination params (`limit`, `offset`) and returned counts
  - ✅ **Completed:**
    - Added `logBodyMetadata` option to `withRouteLogging()`
    - Logs `requestBodySize` from Content-Length header
    - Only logs when `LOG_BODY_LOGGING=true` (safe by default)
    - Query params logged and sanitized for list endpoints

- [x] **Step 2.3: Standardize route handler structure**
  - Use consistent `handleX` functions (e.g. `handlePost`, `handlePatch`) and export wrapped handlers:
    - `export const POST = withRouteLogging(handlePost, {...})`
  - Ensure route `operation` naming conventions:
    - `api.wallets.list`, `api.wallets.create`, `api.wallets.update`, `api.wallets.archive`
    - `api.transactions.expense.create`, etc.
  - ✅ **Completed for 13/21 routes:**
    - ✅ `/api/wallets` (GET, POST)
    - ✅ `/api/wallets/[id]` (GET, PATCH, DELETE)
    - ✅ `/api/categories` (GET, POST)
    - ✅ `/api/categories/[id]` (GET, PATCH, DELETE)
    - ✅ `/api/budgets` (GET, POST, PUT)
    - ✅ `/api/savings-buckets` (GET, POST)
    - ✅ `/api/transactions` (GET)
    - ✅ `/api/health` (GET)
    - ✅ `/api/dashboard` (GET) - already had logging
    - ✅ `/api/reports/spending-trend` (GET) - already had logging
    - ✅ `/api/reports/category-breakdown` (GET) - already had logging
    - ✅ `/api/reports/net-worth-trend` (GET) - already had logging
    - ✅ `/api/reports/money-left-to-spend` (GET) - already had logging
  - ⚠️ **Remaining 8 routes to update:**
    - `/api/savings-buckets/[id]` (GET, PATCH, DELETE)
    - `/api/transactions/[id]` (GET, PATCH, DELETE)
    - `/api/transactions/expense` (POST)
    - `/api/transactions/income` (POST)
    - `/api/transactions/transfer` (POST)
    - `/api/transactions/savings/contribute` (POST)
    - `/api/transactions/savings/withdraw` (POST)
    - `/api/budgets/[id]` (GET, PATCH, DELETE)

**Deliverable Status:** ⚠️ **PARTIALLY COMPLETE** - 13/21 routes updated (62%)

- All updated endpoints emit request-complete logs with `requestId` and `durationMs`
- All 800 tests pass ✅
- Core logging infrastructure complete and tested

---

## Phase 3 — Module Actions Logging (Business Operations)

- [ ] **Step 3.1: Introduce a lightweight logging context**
  - Define `ActionContext` (no user PII):
    - `requestId`
    - optional `operation` override
  - Actions accept optional `ctx?: ActionContext` or use a helper to bind a child logger.

- [ ] **Step 3.2: Add action lifecycle logs**
  - For each module (`Wallet`, `Category`, `SavingsBucket`, `Transaction`, `Budget`, `Report`, `Dashboard`):
    - `action:start` (DEBUG)
    - `action:complete` (INFO for mutations, DEBUG for reads)
    - `action:error` (ERROR)
  - Include:
    - `resourceType`, `resourceId` (when available)
    - counts: rows affected, postings created, etc.
    - timings: action-level durationMs
  - **Do not log full input objects**; log only:
    - ids, counts, date range bounds, type enums, and numeric amounts (where safe)
    - truncate any freeform strings (`note`, `payee`) or omit entirely

- [ ] **Step 3.3: Idempotency logging**
  - For transaction creation endpoints with `idempotencyKey`:
    - Log whether the request was deduped vs inserted
    - Include event id and idempotency key hash (never raw key if considered sensitive)

Deliverable: Business ops are observable beyond HTTP status codes.

---

## Phase 4 — Database Logging (Query Timing + Error Normalization)

- [ ] **Step 4.1: Instrument DB helper layer**
  - Add optional query timing logs in database wrappers (e.g. `db.all/get/run` helpers):
    - `db:query` (DEBUG): `durationMs`, `rowCount`, `queryName` (preferred), and a sanitized query template.
  - Avoid logging raw SQL with interpolated values.
    - Prefer logging a stable `queryName` and optional query fingerprint (hash).
    - If logging SQL text, sanitize/truncate aggressively.

- [ ] **Step 4.2: Transaction boundary logs**
  - For multi-statement transactions (Transaction posting engine, budget upserts):
    - `db:tx:start` (DEBUG)
    - `db:tx:commit` (INFO for mutations)
    - `db:tx:rollback` (WARN/ERROR)

- [ ] **Step 4.3: Normalize DB errors**
  - Provide a single function to map DB errors to:
    - `kind` (constraint_violation, foreign_key, not_found, connection_error, etc.)
    - `safeMessage`
    - `details` only in development
  - Route handlers log the normalized error object (not raw).

Deliverable: You can identify slow queries and constraint failures from logs reliably.

---

## Phase 5 — UI/Client Logging (Optional, Minimal)

Decision: For an MVP, prefer **server-side logs**. Client logs can be useful but also noisy.

- [ ] **Step 5.1: Add a small client error boundary logger**
  - On unhandled UI errors (React error boundary):
    - log to console in dev
    - optionally POST to a server endpoint `/api/logs/client-error` (future), sampled and redacted
  - Keep off by default to avoid collecting PII accidentally.

Deliverable: Optional, controlled visibility into critical client crashes.

---

## Phase 6 — Replace `console.*` with Pino (Consistency Pass)

- [ ] **Step 6.1: Replace `console.error` in API routes**
  - Use the route logger from wrappers.
  - Ensure errors are serialized via shared helper.

- [ ] **Step 6.2: Replace `console.warn/log` throughout the server code**
  - Standardize to `logger.*` usage.
  - For tests, consider stubbing logger output if noise is an issue.

Deliverable: One logging system; predictable output.

---

## Phase 7 — Logging Quality Controls (Noise, Safety, Performance)

- [ ] **Step 7.1: Sampling**
  - Apply sampling to high-volume endpoints (lists, dashboard polls):
    - keep errors always logged
    - sample INFO completions based on `LOG_SAMPLE_RATE`

- [ ] **Step 7.2: Size limits**
  - Enforce max length for:
    - `.err.message`, `.query` values, any freeform string fields
  - Ensure logs stay small and cheap.

- [ ] **Step 7.3: Security review**
  - Confirm redaction paths cover:
    - headers: `authorization`, `cookie`, `set-cookie`
    - query keys: `token`, `secret`, `password`, etc.
  - Add explicit denylist for:
    - transaction `note`, `payee` fields (omit or truncate + allowlist)
    - any future user profile PII

Deliverable: Safe, low-noise logs suitable for production.

---

## Verification Checklist

- [ ] Every API response has `x-request-id`.
- [ ] All API routes (all methods) log `request:complete` with: `requestId`, `operation`, `status`, `durationMs`.
- [ ] All mutations log an `action:complete` with: `resourceType`, `resourceId` (when available), and counts.
- [ ] DB wrappers can emit `db:query` logs when enabled, without leaking values.
- [ ] No secrets appear in logs (spot-check using known tokens/cookies in requests).
- [ ] Slow requests produce WARN logs when exceeding `LOG_SLOW_REQUEST_MS`.

---

## Acceptance Criteria

- You can trace a request across:
  - route handler → module action → db calls
    using the same `requestId`.
- Logs are structured, safe, and consistent.
- Noise is controlled via sampling and level knobs.
- Production remains “stdout JSON only” (platform-friendly).

---

## Future Enhancements (Optional)

- Add OpenTelemetry tracing (request spans, DB spans) once you need distributed tracing.
- Add metrics counters (requests, errors, p95 latency) if/when you integrate a metrics backend.
- Add an admin-only “recent errors” view backed by a log sink (not SQLite unless necessary).
