/**
 * LOGGING CONTRACT & FIELD STANDARDS
 *
 * This file defines the canonical structure for all logs emitted by the Sugih application.
 * Goals:
 * - Stable, queryable fields across all log events
 * - Safe defaults (no PII, no secrets)
 * - Easy integration with log aggregation tools (stdout JSON)
 *
 * Version: 1.0.0
 */

// ============================================================================
// CORE REQUIRED FIELDS (Provided by Pino automatically)
// ============================================================================

/**
 * Every log entry includes these fields (from Pino base config):
 * - `time`: ISO 8601 timestamp (e.g., "2024-01-08T12:34:56.789Z")
 * - `level`: numeric level (10=trace, 20=debug, 30=info, 40=warn, 50=error, 60=fatal)
 * - `msg`: human-readable message string
 * - `env`: environment name (e.g., "development", "production")
 */

// ============================================================================
// STANDARD CONTEXT FIELDS (Present in most logs)
// ============================================================================

export interface LogContext {
  /**
   * Unique identifier for the request (generated or propagated).
   * Format: `req_{timestamp}_{uuid}`
   * Example: "req_lx8k2p_a3f4b7c8"
   *
   * REQUIRED for all request-scoped logs.
   */
  requestId: string;

  /**
   * Logical operation being performed.
   * Naming convention: `{domain}.{resource}.{action}` or `{layer}.{name}`
   *
   * Examples:
   * - Route: "api.wallets.list", "api.transactions.expense.create"
   * - Action: "wallet.archive", "budget.upsert"
   * - DB: "db.query", "db.tx.commit"
   * - Report: "report.spending-trend", "report.category-breakdown"
   *
   * REQUIRED for all logs.
   */
  operation: string;

  /**
   * Event type within the operation lifecycle.
   * Standard values:
   * - "request:start" — HTTP request received
   * - "request:complete" — HTTP request completed successfully
   * - "request:error" — HTTP request failed
   * - "action:start" — Business logic action started
   * - "action:complete" — Business logic action completed
   * - "action:error" — Business logic action failed
   * - "db:query" — Database query executed
   * - "db:tx:start" — Database transaction started
   * - "db:tx:commit" — Database transaction committed
   * - "db:tx:rollback" — Database transaction rolled back
   * - "ui:error" — Client-side error (future)
   *
   * RECOMMENDED for lifecycle logs.
   */
  event?: string;
}

// ============================================================================
// HTTP REQUEST FIELDS (Route handlers)
// ============================================================================

export interface HttpLogFields {
  /**
   * HTTP method (GET, POST, PATCH, PUT, DELETE, etc.)
   */
  method: string;

  /**
   * Request path (pathname only, no query string or domain).
   * Example: "/api/wallets/123"
   */
  path: string;

  /**
   * HTTP status code (200, 404, 500, etc.)
   * Present in `request:complete` and `request:error` events.
   */
  status?: number;

  /**
   * Request duration in milliseconds (wall-clock time).
   * Rounded to 2 decimal places.
   * Present in `request:complete` and `request:error` events.
   */
  durationMs?: number;

  /**
   * Sanitized query parameters.
   * - Truncated to 200 chars per value
   * - Secret keys (token, password, etc.) are redacted
   * Optional; controlled by route config.
   */
  query?: Record<string, string>;

  /**
   * Sanitized route parameters (e.g., {id: "wal_123"}).
   * Optional; include for mutations and detail routes.
   */
  routeParams?: Record<string, string>;

  /**
   * Response body size in bytes (from Content-Length header).
   * Optional; useful for monitoring payload sizes.
   */
  contentLength?: number;

  /**
   * User-Agent header (truncated).
   * Optional; disabled by default to reduce noise.
   */
  userAgent?: string;

  /**
   * Client IP address (from x-forwarded-for or x-real-ip).
   * Optional; disabled by default for privacy.
   */
  ip?: string;
}

// ============================================================================
// ACTION / BUSINESS LOGIC FIELDS (Module actions)
// ============================================================================

export interface ActionLogFields {
  /**
   * Type of resource being operated on.
   * Examples: "wallet", "category", "transaction", "budget", "savings_bucket"
   */
  resourceType?: string;

  /**
   * ID of the specific resource (e.g., "wal_abc123", "cat_xyz789").
   * Include in mutation logs when available.
   */
  resourceId?: string;

  /**
   * Count-related metadata (rows affected, items created, etc.).
   * Examples:
   * - { rowsAffected: 1 }
   * - { postingsCreated: 2 }
   * - { itemsReturned: 42 }
   */
  counts?: Record<string, number>;

  /**
   * Optional actor identifier (user ID, session ID).
   * Future: once authentication is added.
   * NEVER log user email or name directly.
   */
  actor?: string;

  /**
   * Whether this operation was a no-op due to idempotency.
   * true = request was deduplicated (idempotent match)
   * false or omitted = new operation
   */
  idempotent?: boolean;

  /**
   * Hash of the idempotency key (never the raw key).
   * Include only if idempotency is relevant.
   */
  idempotencyKeyHash?: string;
}

// ============================================================================
// DATABASE FIELDS (DB wrapper layer)
// ============================================================================

export interface DbLogFields {
  /**
   * Stable query name or fingerprint (preferred over raw SQL).
   * Example: "wallet.findById", "transaction.insertPosting"
   */
  queryName?: string;

  /**
   * Query duration in milliseconds.
   * Present in `db:query` events.
   */
  durationMs?: number;

  /**
   * Number of rows returned or affected.
   * Optional; useful for performance monitoring.
   */
  rowCount?: number;

  /**
   * Sanitized SQL query (only in DEBUG mode, with placeholders).
   * NEVER log raw SQL with interpolated values.
   * Example: "SELECT * FROM wallets WHERE id = ?"
   */
  sql?: string;

  /**
   * Transaction ID (for correlating multi-query transactions).
   * Optional; use when logging within a transaction boundary.
   */
  txId?: string;
}

// ============================================================================
// ERROR FIELDS (Failures and exceptions)
// ============================================================================

export interface ErrorLogFields {
  /**
   * Serialized error object.
   * Structure:
   * - name: Error class name
   * - message: Error message (truncated to 2000 chars)
   * - stack: Stack trace (omit in production for external-facing logs)
   * - cause: Nested error cause (if present)
   */
  err: {
    name?: string;
    message?: string;
    stack?: string;
    cause?: unknown;
  };

  /**
   * Normalized error kind (for grouping/alerting).
   * Examples:
   * - "validation_error"
   * - "constraint_violation"
   * - "foreign_key_error"
   * - "not_found"
   * - "connection_error"
   * - "timeout"
   * - "unknown"
   */
  errorKind?: string;

  /**
   * Safe, user-facing error message (redacted, generic).
   * Use this for client responses; keep technical details in `err.message`.
   */
  safeMessage?: string;
}

// ============================================================================
// COMBINED LOG ENTRY TYPE (For reference)
// ============================================================================

/**
 * Full log entry shape (union of all possible fields).
 * Not all fields are present in every log; context determines which apply.
 */
export type LogEntry = LogContext &
  Partial<HttpLogFields> &
  Partial<ActionLogFields> &
  Partial<DbLogFields> &
  Partial<ErrorLogFields> & {
    [key: string]: unknown; // Allow extensions for module-specific fields
  };

// ============================================================================
// FIELD NAMING CONVENTIONS
// ============================================================================

/**
 * CONVENTIONS:
 *
 * 1. Use camelCase for field names (e.g., `requestId`, `durationMs`).
 * 2. Use stable, searchable keys (avoid dynamic keys like `error_${timestamp}`).
 * 3. Use suffixes for units:
 *    - `Ms` for milliseconds (e.g., `durationMs`)
 *    - `At` for timestamps (e.g., `createdAt`)
 *    - `Count` for counts (e.g., `rowCount`)
 * 4. Avoid abbreviations unless universally understood (e.g., `id`, `url`, `ip`).
 * 5. Prefix resource-related fields with resource type when ambiguous:
 *    - Good: `walletId`, `categoryId`
 *    - Avoid: `id` (too generic)
 * 6. Use nested objects sparingly; prefer flat structures for easier querying:
 *    - Good: `query.startDate`, `counts.rowsAffected`
 *    - Avoid: deeply nested hierarchies
 *
 * REDACTION RULES:
 *
 * 1. NEVER log:
 *    - Passwords, tokens, API keys, authorization headers, cookies
 *    - Credit card numbers, SSNs, or other sensitive PII
 *    - Full user email addresses (hash or truncate if needed)
 *    - Raw request bodies (log metadata like size/validation result instead)
 * 2. TRUNCATE:
 *    - Freeform text fields (notes, payees) to 100 chars or omit entirely
 *    - Error messages to 2000 chars
 *    - Query param values to 200 chars
 * 3. ALLOWLIST-ONLY for sensitive fields:
 *    - Only log known-safe fields from user input
 *    - Never log entire objects from untrusted sources
 *
 * SAMPLING:
 *
 * - High-volume read endpoints (lists, dashboards) should sample INFO logs
 * - Always log ERROR and WARN (no sampling)
 * - Use `LOG_SAMPLE_RATE` env var (0.0 to 1.0)
 *
 * SLOW REQUEST THRESHOLD:
 *
 * - Log WARN when request exceeds `LOG_SLOW_REQUEST_MS` (default: 500ms)
 * - Include `durationMs` and `operation` for easy filtering
 */

// ============================================================================
// EXAMPLES
// ============================================================================

/**
 * Example 1: Successful API request
 * {
 *   "time": "2024-01-08T12:34:56.789Z",
 *   "level": 30,
 *   "msg": "request:complete",
 *   "env": "production",
 *   "requestId": "req_lx8k2p_a3f4b7c8",
 *   "operation": "api.wallets.list",
 *   "event": "request:complete",
 *   "method": "GET",
 *   "path": "/api/wallets",
 *   "status": 200,
 *   "durationMs": 42.33,
 *   "contentLength": 1234,
 *   "query": { "archived": "false" }
 * }
 *
 * Example 2: Business action (mutation)
 * {
 *   "time": "2024-01-08T12:35:00.123Z",
 *   "level": 30,
 *   "msg": "action:complete",
 *   "env": "production",
 *   "requestId": "req_lx8k2p_a3f4b7c8",
 *   "operation": "wallet.archive",
 *   "event": "action:complete",
 *   "resourceType": "wallet",
 *   "resourceId": "wal_abc123",
 *   "durationMs": 15.67,
 *   "counts": { "rowsAffected": 1 }
 * }
 *
 * Example 3: Database query (DEBUG)
 * {
 *   "time": "2024-01-08T12:35:00.100Z",
 *   "level": 20,
 *   "msg": "db:query",
 *   "env": "development",
 *   "requestId": "req_lx8k2p_a3f4b7c8",
 *   "operation": "wallet.archive",
 *   "event": "db:query",
 *   "queryName": "wallet.updateArchivedFlag",
 *   "durationMs": 3.21,
 *   "rowCount": 1,
 *   "sql": "UPDATE wallets SET archived = ? WHERE id = ?"
 * }
 *
 * Example 4: Request error
 * {
 *   "time": "2024-01-08T12:36:00.456Z",
 *   "level": 50,
 *   "msg": "request:error",
 *   "env": "production",
 *   "requestId": "req_lx8k3q_b4c5d8e9",
 *   "operation": "api.transactions.expense.create",
 *   "event": "request:error",
 *   "method": "POST",
 *   "path": "/api/transactions/expense",
 *   "status": 500,
 *   "durationMs": 123.45,
 *   "err": {
 *     "name": "Error",
 *     "message": "SQLITE_CONSTRAINT: FOREIGN KEY constraint failed",
 *     "stack": "Error: SQLITE_CONSTRAINT...\n    at ..."
 *   },
 *   "errorKind": "foreign_key_error",
 *   "safeMessage": "Unable to create transaction due to invalid reference"
 * }
 */
