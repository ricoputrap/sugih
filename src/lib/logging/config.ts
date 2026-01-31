/**
 * LOGGING CONFIGURATION
 *
 * Centralized configuration for logging behavior, driven by environment variables.
 * All knobs have safe defaults and are documented inline.
 */

/**
 * Log level (controls minimum severity to output).
 * - trace (10): extremely verbose, typically unused
 * - debug (20): detailed diagnostic info (query timing, payload sizes)
 * - info (30): general informational messages (request completion, business events)
 * - warn (40): warning conditions (slow requests, recoverable errors)
 * - error (50): error conditions (failures, exceptions)
 * - fatal (60): application crash (rare)
 *
 * Default: "debug" in development, "info" in production
 */
export const LOG_LEVEL =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

/**
 * Sample rate for high-volume INFO logs (0.0 to 1.0).
 * - 1.0 = log everything (default)
 * - 0.1 = log 10% of requests
 * - 0.0 = log nothing (not recommended; use LOG_LEVEL instead)
 *
 * Sampling applies only to successful INFO-level completion logs.
 * ERROR and WARN logs are NEVER sampled.
 *
 * Use this to reduce noise from list endpoints and dashboard polling.
 *
 * Default: 1.0 (no sampling)
 */
export const LOG_SAMPLE_RATE = parseFloat(process.env.LOG_SAMPLE_RATE || "1.0");

/**
 * Enable query timing logs (db:query events).
 * When true, all database queries emit DEBUG logs with:
 * - queryName
 * - durationMs
 * - rowCount
 * - sanitized SQL (in development only)
 *
 * Useful for performance profiling but can be noisy.
 *
 * Default: false
 */
export const LOG_QUERY_TIMING =
  process.env.LOG_QUERY_TIMING === "true" || false;

/**
 * Enable request body logging (DANGEROUS - only for local debugging).
 * When true, routes MAY log request body metadata (size, validation result).
 * Even when enabled, body CONTENT should never be logged in production.
 *
 * This is an explicit opt-in to prevent accidental PII/secret logging.
 *
 * Default: false (always off unless explicitly enabled)
 */
export const LOG_BODY_LOGGING =
  process.env.LOG_BODY_LOGGING === "true" || false;

/**
 * Slow request threshold in milliseconds.
 * When a request exceeds this duration, a WARN log is emitted with:
 * - event: "request:slow"
 * - durationMs
 * - operation
 *
 * Helps identify performance bottlenecks.
 *
 * Default: 500ms
 */
export const LOG_SLOW_REQUEST_MS = parseInt(
  process.env.LOG_SLOW_REQUEST_MS || "500",
  10,
);

/**
 * Enable transaction boundary logging (db:tx:* events).
 * When true, multi-statement transactions emit:
 * - db:tx:start (DEBUG)
 * - db:tx:commit (INFO)
 * - db:tx:rollback (WARN/ERROR)
 *
 * Useful for debugging complex mutations but adds noise.
 *
 * Default: false in production, true in development
 */
export const LOG_TRANSACTIONS =
  process.env.LOG_TRANSACTIONS === "true" ||
  (process.env.LOG_TRANSACTIONS === undefined &&
    process.env.NODE_ENV !== "production");

/**
 * Enable action lifecycle logging (action:* events).
 * When true, module actions emit:
 * - action:start (DEBUG)
 * - action:complete (INFO for mutations, DEBUG for reads)
 * - action:error (ERROR)
 *
 * Default: true (recommended for production observability)
 */
export const LOG_ACTIONS = process.env.LOG_ACTIONS !== "false"; // Opt-out (enabled by default)

/**
 * Include stack traces in production error logs.
 * When false, stack traces are omitted from serialized errors in production.
 * When true, full stack traces are logged (useful for debugging but verbose).
 *
 * Default: false (omit stacks in production)
 */
export const LOG_STACK_TRACES_IN_PRODUCTION =
  process.env.LOG_STACK_TRACES_IN_PRODUCTION === "true" || false;

/**
 * Maximum number of query parameters to log.
 * Prevents log bloat from endpoints with many query params.
 *
 * Default: 20
 */
export const LOG_MAX_QUERY_PARAMS = parseInt(
  process.env.LOG_MAX_QUERY_PARAMS || "20",
  10,
);

/**
 * Check if sampling should apply to this log entry.
 * Returns true if the log should be emitted, false if it should be skipped.
 *
 * Sampling logic:
 * - Always emit if sample rate is 1.0 (no sampling)
 * - Always emit ERROR and WARN logs (never sample)
 * - For INFO logs, use random sampling based on LOG_SAMPLE_RATE
 */
export function shouldSample(
  level: "debug" | "info" | "warn" | "error",
): boolean {
  // Never sample errors or warnings
  if (level === "error" || level === "warn") {
    return true;
  }

  // No sampling configured
  if (LOG_SAMPLE_RATE >= 1.0) {
    return true;
  }

  // Always emit debug logs (controlled by LOG_LEVEL instead)
  if (level === "debug") {
    return true;
  }

  // Sample INFO logs based on rate
  return Math.random() < LOG_SAMPLE_RATE;
}

/**
 * Check if a request duration qualifies as "slow" and should emit a warning.
 */
export function isSlowRequest(durationMs: number): boolean {
  return durationMs > LOG_SLOW_REQUEST_MS;
}

/**
 * Validate configuration on module load (fail-fast if misconfigured).
 */
function validateConfig(): void {
  if (LOG_SAMPLE_RATE < 0 || LOG_SAMPLE_RATE > 1) {
    console.error(
      `Invalid LOG_SAMPLE_RATE: ${LOG_SAMPLE_RATE} (must be between 0 and 1)`,
    );
    process.exit(1);
  }

  if (LOG_SLOW_REQUEST_MS < 0) {
    console.error(
      `Invalid LOG_SLOW_REQUEST_MS: ${LOG_SLOW_REQUEST_MS} (must be >= 0)`,
    );
    process.exit(1);
  }

  if (LOG_MAX_QUERY_PARAMS < 0) {
    console.error(
      `Invalid LOG_MAX_QUERY_PARAMS: ${LOG_MAX_QUERY_PARAMS} (must be >= 0)`,
    );
    process.exit(1);
  }
}

// Run validation on load
validateConfig();

/**
 * Export a summary of current config for debugging/startup logs.
 */
export function getLoggingConfigSummary(): Record<string, unknown> {
  return {
    LOG_LEVEL,
    LOG_SAMPLE_RATE,
    LOG_QUERY_TIMING,
    LOG_BODY_LOGGING,
    LOG_SLOW_REQUEST_MS,
    LOG_TRANSACTIONS,
    LOG_ACTIONS,
    LOG_STACK_TRACES_IN_PRODUCTION,
    LOG_MAX_QUERY_PARAMS,
  };
}
