# Logging System Documentation

**Version:** 1.0.0  
**Last Updated:** January 2024

## Overview

The Sugih application uses **Pino** for structured, JSON-based logging with a focus on:

- **Safety**: No secrets, no PII, redaction by default
- **Observability**: Request tracing, timing, and correlation via `requestId`
- **Performance**: Minimal overhead, sampling for high-volume endpoints
- **Platform-friendly**: stdout JSON logs (no file persistence)

All logs follow a **standardized contract** (see `contract.ts`) with stable field names for easy querying and integration with log aggregation tools.

---

## Quick Start

### 1. Import the logger

```typescript
import { logger, childLogger } from "@/lib/logging";
```

### 2. Create a request-scoped logger

```typescript
const log = childLogger({
  requestId: "req_lx8k2p_a3f4b7c8",
  operation: "api.wallets.list",
});
```

### 3. Log events

```typescript
log.info(
  {
    status: 200,
    durationMs: 42.33,
    counts: { itemsReturned: 10 },
  },
  "request:complete",
);
```

---

## Architecture

### Modules

| Module                   | Purpose                                                |
| ------------------------ | ------------------------------------------------------ |
| `logger.ts`              | Base Pino logger instance with redaction rules         |
| `request-id.ts`          | Request ID generation and propagation                  |
| `route-helpers.ts`       | Route handler wrappers with timing and logging         |
| `error-serialization.ts` | Safe error serialization, truncation, DB normalization |
| `config.ts`              | Environment-driven configuration (knobs)               |
| `contract.ts`            | Type definitions and field standards (documentation)   |
| `index.ts`               | Main export (use this for imports)                     |

### Configuration (Environment Variables)

| Variable                         | Type    | Default       | Description                                      |
| -------------------------------- | ------- | ------------- | ------------------------------------------------ |
| `LOG_LEVEL`                      | string  | `info` (prod) | Minimum log level (trace/debug/info/warn/error)  |
| `LOG_SAMPLE_RATE`                | float   | `1.0`         | Sample rate for INFO logs (0.0 to 1.0)           |
| `LOG_QUERY_TIMING`               | boolean | `false`       | Enable db:query timing logs                      |
| `LOG_BODY_LOGGING`               | boolean | `false`       | Enable request body metadata logging (dangerous) |
| `LOG_SLOW_REQUEST_MS`            | integer | `500`         | Threshold for slow request warnings (ms)         |
| `LOG_TRANSACTIONS`               | boolean | `true` (dev)  | Enable db:tx:\* transaction boundary logs        |
| `LOG_ACTIONS`                    | boolean | `true`        | Enable action:\* business logic logs             |
| `LOG_STACK_TRACES_IN_PRODUCTION` | boolean | `false`       | Include stack traces in production error logs    |
| `LOG_MAX_QUERY_PARAMS`           | integer | `20`          | Max query params to log                          |

**Example `.env` additions:**

```bash
LOG_LEVEL=debug
LOG_SAMPLE_RATE=0.1          # Log 10% of INFO requests
LOG_SLOW_REQUEST_MS=300      # Warn on requests > 300ms
LOG_QUERY_TIMING=true        # Enable query timing logs
```

---

## Logging Contract

### Standard Fields

All logs include these core fields (provided by Pino):

- `time`: ISO 8601 timestamp
- `level`: Numeric level (30=info, 50=error, etc.)
- `msg`: Human-readable message

### Request-Scoped Fields (HTTP routes)

```typescript
{
  requestId: string;           // Unique request identifier
  operation: string;           // e.g., "api.wallets.list"
  event: string;               // e.g., "request:complete"
  method: string;              // HTTP method
  path: string;                // Request path
  status: number;              // HTTP status code
  durationMs: number;          // Request duration
  query?: Record<string, string>; // Sanitized query params
  contentLength?: number;      // Response size
}
```

### Action-Scoped Fields (Business logic)

```typescript
{
  requestId: string;
  operation: string;           // e.g., "wallet.archive"
  event: string;               // e.g., "action:complete"
  resourceType?: string;       // e.g., "wallet"
  resourceId?: string;         // e.g., "wal_abc123"
  durationMs?: number;
  counts?: Record<string, number>; // e.g., { rowsAffected: 1 }
}
```

### Error Fields

```typescript
{
  err: {
    name: string;              // Error class name
    message: string;           // Error message (truncated to 2000 chars)
    stack?: string;            // Stack trace (dev only by default)
    cause?: unknown;           // Nested error cause
  };
  errorKind?: string;          // Normalized error kind (e.g., "constraint_violation_unique")
  safeMessage?: string;        // User-facing error message
}
```

---

## Usage Patterns

### 1. API Route Handler (Next.js App Router)

Use `withReportTiming` to wrap route handlers:

```typescript
// src/app/api/wallets/route.ts
import { withReportTiming } from "@/lib/logging";
import type { NextRequest } from "next/server";

async function handleGet(request: NextRequest): Promise<Response> {
  // Your route logic
  return Response.json({ wallets: [] });
}

export const GET = withReportTiming(handleGet, {
  operation: "api.wallets.list",
  logQuery: true,
  successLevel: "info",
});
```

**What this provides:**

- Automatic `x-request-id` header on responses
- `request:start` (DEBUG) and `request:complete` (INFO) logs
- `request:slow` (WARN) if duration exceeds `LOG_SLOW_REQUEST_MS`
- `request:error` (ERROR) on exceptions
- Sanitized query params in logs

### 2. Module Action (Business Logic)

Create a child logger with context:

```typescript
// src/modules/Wallet/actions.ts
import { childLogger } from "@/lib/logging";
import { db } from "@/db/client";

export async function archiveWallet(
  id: string,
  requestId?: string,
): Promise<void> {
  const log = childLogger({
    requestId: requestId || "internal",
    operation: "wallet.archive",
  });

  const startedAt = performance.now();

  try {
    log.debug({ resourceId: id }, "action:start");

    const result = await db.run(
      `UPDATE wallets SET archived = 1 WHERE id = ?`,
      [id],
    );

    const durationMs = performance.now() - startedAt;

    log.info(
      {
        event: "action:complete",
        resourceType: "wallet",
        resourceId: id,
        durationMs: Math.round(durationMs * 100) / 100,
        counts: { rowsAffected: result.changes },
      },
      "action:complete",
    );
  } catch (err) {
    const durationMs = performance.now() - startedAt;
    const { err: serialized, errorKind, safeMessage } = normalizeDbError(err);

    log.error(
      {
        event: "action:error",
        resourceId: id,
        durationMs: Math.round(durationMs * 100) / 100,
        err: serialized,
        errorKind,
      },
      "action:error",
    );

    throw new Error(safeMessage);
  }
}
```

### 3. Database Query Logging (Optional)

When `LOG_QUERY_TIMING=true`, you can instrument DB calls:

```typescript
import { childLogger, roundMs } from "@/lib/logging";
import { LOG_QUERY_TIMING } from "@/lib/logging/config";

export async function queryWithLogging<T>(
  queryName: string,
  sql: string,
  params: unknown[],
  requestId?: string,
): Promise<T> {
  if (!LOG_QUERY_TIMING) {
    // Skip logging overhead when disabled
    return db.all(sql, params) as T;
  }

  const log = childLogger({
    requestId: requestId || "internal",
    operation: queryName,
  });

  const startedAt = performance.now();

  try {
    const result = await db.all(sql, params);
    const durationMs = performance.now() - startedAt;

    log.debug(
      {
        event: "db:query",
        queryName,
        durationMs: roundMs(durationMs),
        rowCount: Array.isArray(result) ? result.length : 1,
        sql: process.env.NODE_ENV === "development" ? sql : undefined,
      },
      "db:query",
    );

    return result as T;
  } catch (err) {
    const durationMs = performance.now() - startedAt;
    const serialized = serializeError(err);

    log.error(
      {
        event: "db:query:error",
        queryName,
        durationMs: roundMs(durationMs),
        err: serialized,
      },
      "db:query:error",
    );

    throw err;
  }
}
```

### 4. Error Normalization (Database Errors)

Use `normalizeDbError` to map DB errors to stable kinds:

```typescript
import { normalizeDbError } from '@/lib/logging';

try {
  await db.run(`INSERT INTO wallets (...) VALUES (...)`, [...]);
} catch (err) {
  const { errorKind, safeMessage, ...serialized } = normalizeDbError(err);

  log.error(
    {
      err: serialized,
      errorKind, // e.g., "constraint_violation_unique"
    },
    'Database error'
  );

  return Response.json(
    { error: safeMessage }, // e.g., "A record with this value already exists"
    { status: 400 }
  );
}
```

**Supported error kinds:**

- `constraint_violation_unique`
- `constraint_violation_foreign_key`
- `constraint_violation_not_null`
- `constraint_violation_check`
- `database_locked`
- `connection_error`
- `not_found`
- `database_error`
- `unknown`

---

## Event Naming Conventions

Use these standard event names for consistency:

| Event              | Level | Description                            |
| ------------------ | ----- | -------------------------------------- |
| `request:start`    | DEBUG | HTTP request received                  |
| `request:complete` | INFO  | HTTP request completed successfully    |
| `request:slow`     | WARN  | HTTP request exceeded slow threshold   |
| `request:error`    | ERROR | HTTP request failed                    |
| `action:start`     | DEBUG | Business action started                |
| `action:complete`  | INFO  | Business action completed successfully |
| `action:error`     | ERROR | Business action failed                 |
| `db:query`         | DEBUG | Database query executed                |
| `db:tx:start`      | DEBUG | Database transaction started           |
| `db:tx:commit`     | INFO  | Database transaction committed         |
| `db:tx:rollback`   | WARN  | Database transaction rolled back       |
| `ui:error`         | ERROR | Client-side error (future)             |

---

## Security & Safety

### Redaction Rules

The following fields are **automatically redacted** (replaced with `[REDACTED]`):

- `*.password`, `*.pass`, `*.secret`, `*.token`
- `*.accessToken`, `*.refreshToken`, `*.apiKey`
- `*.authorization`, `*.cookie`, `*.set-cookie`
- `req.headers.authorization`, `req.headers.cookie`
- `res.headers['set-cookie']`

### PII Protection

**Never log:**

- User email addresses (use hashed user ID instead)
- Full names
- Phone numbers
- Credit card numbers
- Raw request/response bodies

**Truncate or omit:**

- Transaction notes (use `sanitizeFreeformText` if needed)
- Payee names (omit or truncate to 100 chars)
- Any user-provided freeform text

**Safe to log:**

- Resource IDs (e.g., `wal_abc123`, `cat_xyz789`)
- Enum values (e.g., `type: "expense"`)
- Numeric amounts (already public in the app)
- Date ranges (already public in the app)
- Counts (e.g., `itemsReturned: 42`)

### Utilities for Safe Logging

```typescript
import {
  sanitizeFreeformText,
  sanitizeObject,
  isSensitiveFieldName,
} from "@/lib/logging";

// Truncate and clean user input
const note = sanitizeFreeformText(transaction.note, 100); // Max 100 chars

// Sanitize entire objects
const safeInput = sanitizeObject(input, ["id", "type", "amount"]); // Allowlist

// Check if a field name is sensitive
if (isSensitiveFieldName("apiKey")) {
  // Don't log this field
}
```

---

## Sampling

High-volume endpoints (e.g., list routes, dashboard polling) can generate excessive logs. Use sampling to reduce noise:

**Set `LOG_SAMPLE_RATE` in `.env`:**

```bash
LOG_SAMPLE_RATE=0.1  # Log 10% of INFO requests
```

**Behavior:**

- `LOG_SAMPLE_RATE=1.0` (default): No sampling, log everything
- `LOG_SAMPLE_RATE=0.1`: Log 10% of successful INFO-level requests
- ERROR and WARN logs are **never sampled**
- DEBUG logs are controlled by `LOG_LEVEL` (not sampled)

---

## Performance Monitoring

### Slow Request Detection

When a request exceeds `LOG_SLOW_REQUEST_MS`, a **WARN** log is emitted:

```json
{
  "level": 40,
  "msg": "request:slow",
  "event": "request:slow",
  "requestId": "req_lx8k2p_a3f4b7c8",
  "operation": "api.transactions.list",
  "durationMs": 723.45,
  "path": "/api/transactions",
  "status": 200
}
```

**Configure threshold:**

```bash
LOG_SLOW_REQUEST_MS=300  # Warn if request > 300ms
```

### Query Timing

Enable `LOG_QUERY_TIMING=true` to log all database queries with timing:

```json
{
  "level": 20,
  "msg": "db:query",
  "event": "db:query",
  "requestId": "req_lx8k2p_a3f4b7c8",
  "operation": "wallet.findById",
  "queryName": "wallet.findById",
  "durationMs": 3.21,
  "rowCount": 1,
  "sql": "SELECT * FROM wallets WHERE id = ?"
}
```

---

## Testing & Development

### Pretty Logs in Development

When `NODE_ENV !== 'production'`, logs are pretty-printed via `pino-pretty`:

```
[12:34:56.789] INFO (req_lx8k2p_a3f4b7c8): request:complete
    operation: "api.wallets.list"
    method: "GET"
    path: "/api/wallets"
    status: 200
    durationMs: 42.33
```

### Debugging with Request IDs

Pass a `requestId` query param for consistent tracing:

```bash
curl 'http://localhost:3000/api/wallets?requestId=debug_001'
```

All logs for this request will include `"requestId": "debug_001"`.

### Logging Config Summary

Log the current config at app startup:

```typescript
import { logger, getLoggingConfigSummary } from "@/lib/logging";

logger.info(getLoggingConfigSummary(), "Logging configuration loaded");
```

---

## Migration Guide (Replacing `console.*`)

### Before (Old)

```typescript
console.log("Fetching wallets for user");
console.error("Failed to create transaction:", err);
```

### After (New)

```typescript
import { logger, childLogger, serializeError } from "@/lib/logging";

const log = childLogger({ requestId, operation: "wallet.list" });

log.debug("Fetching wallets");
log.error({ err: serializeError(err) }, "Failed to create transaction");
```

---

## Troubleshooting

### Problem: Logs not appearing

**Solution:**

- Check `LOG_LEVEL` (set to `debug` for verbose output)
- Check `LOG_SAMPLE_RATE` (set to `1.0` to disable sampling)
- Ensure `NODE_ENV` is set correctly

### Problem: Too many logs (noisy)

**Solution:**

- Increase `LOG_LEVEL` to `info` or `warn`
- Reduce `LOG_SAMPLE_RATE` (e.g., `0.1` for 10% sampling)
- Disable `LOG_QUERY_TIMING` and `LOG_TRANSACTIONS` in production

### Problem: Sensitive data in logs

**Solution:**

- Use `sanitizeObject` or `sanitizeFreeformText` before logging
- Check redaction paths in `logger.ts`
- Never log raw request bodies

---

## Roadmap (Future Enhancements)

- [ ] OpenTelemetry tracing integration (distributed traces)
- [ ] Metrics counters (request rate, error rate, p95 latency)
- [ ] Client-side error logging endpoint (`/api/logs/client-error`)
- [ ] Log sink integration (Loki, ELK, Datadog, etc.)
- [ ] Automatic log rotation for local file output (optional)

---

## References

- [Pino Documentation](https://getpino.io/)
- [Logging Contract](./contract.ts)
- [Environment Config](./config.ts)
- [Error Serialization](./error-serialization.ts)
