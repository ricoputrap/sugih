# Step 7.4 — Logging (Pino) Plan

Goal: Add request IDs and log timings for report endpoints (and dashboard) using Pino, with safe defaults (redaction) and consistent structured logs.

## Scope (this step)

- Use Pino for server-side logging.
- Add/request-propagate `x-request-id`.
- Log request duration for:
  - `GET /api/reports/spending-trend`
  - `GET /api/reports/category-breakdown`
  - `GET /api/reports/net-worth-trend`
  - `GET /api/reports/money-left-to-spend`
  - `GET /api/dashboard` (same “report-like” timing requirement)

## Implementation Steps

- [x] **1) Install dependencies**
  - Added `pino`, `pino-http`, and `pino-pretty` (dev)

- [x] **2) Create logging utilities**
  - Added `src/lib/logging/logger.ts`
    - Base `logger` instance (Pino)
    - Redacts common secrets (authorization/cookies/tokens/passwords)
    - Pretty logs in development, JSON in production
  - Added `src/lib/logging/request-id.ts`
    - `REQUEST_ID_HEADER = "x-request-id"`
    - `getOrCreateRequestId(request)` (prefer incoming header; else generate)
    - `withRequestIdHeader(response, requestId)` helper

- [x] **3) Route wrapper for timings**
  - Added `src/lib/logging/route-helpers.ts`
    - `withReportTiming(handler, { operation })`:
      - captures start time/end time
      - logs `{ requestId, operation, method, path, query, status, durationMs }`
      - sets `x-request-id` response header

- [x] **4) Apply wrapper to target endpoints**
  - Updated the 4 report routes + dashboard route:
    - refactored `GET` -> `handleGet`
    - `export const GET = withReportTiming(handleGet, { operation: "report.<name>" })`

- [x] **5) Verification**
  - Quick sanity check complete:
    - All covered endpoints now set `x-request-id` on responses.
    - Logs include `requestId`, `operation`, `status`, `durationMs` via `withReportTiming`.

## Acceptance Criteria

- Every covered endpoint returns `x-request-id` header (honoring inbound header when provided).
- Logs are structured, include `requestId`, `operation`, `status`, `durationMs`.
- Secret headers/fields are redacted in logs.

## Completion Note

Step 7.4 is complete: report endpoints (and dashboard) now emit structured Pino logs with a propagated/generated `x-request-id` and per-request timing (`durationMs`).
