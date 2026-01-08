/**
 * ERROR SERIALIZATION & NORMALIZATION
 *
 * Provides safe error serialization with:
 * - Truncation of long messages
 * - Redaction of sensitive data
 * - Normalization of common DB errors
 * - Consistent structure for logging
 */

const MAX_ERROR_MESSAGE_LENGTH = 2000;
const MAX_STACK_TRACE_LENGTH = 5000;

/**
 * Serialized error shape (matches logging contract).
 */
export interface SerializedError {
  name?: string;
  message?: string;
  stack?: string;
  cause?: unknown;
}

/**
 * Normalized error with kind and safe message.
 */
export interface NormalizedError extends SerializedError {
  errorKind: string;
  safeMessage: string;
}

/**
 * Serialize any error value into a safe, loggable object.
 *
 * Features:
 * - Truncates message and stack to prevent log bloat
 * - Handles Error instances, plain objects, and primitives
 * - Preserves cause chain
 * - Never throws (defensive)
 */
export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    const result: SerializedError = {
      name: error.name,
      message: truncate(error.message, MAX_ERROR_MESSAGE_LENGTH),
      stack:
        process.env.NODE_ENV === "production"
          ? undefined
          : truncate(error.stack || "", MAX_STACK_TRACE_LENGTH),
    };

    // Preserve nested cause if present
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cause = (error as any).cause;
    if (cause) {
      result.cause = serializeError(cause);
    }

    return result;
  }

  if (typeof error === "object" && error !== null) {
    // Some libraries throw plain objects
    try {
      return {
        message: truncate(JSON.stringify(error), MAX_ERROR_MESSAGE_LENGTH),
      };
    } catch {
      return { message: "[Unserializable object]" };
    }
  }

  // Primitive values (string, number, etc.)
  return {
    message: truncate(String(error), MAX_ERROR_MESSAGE_LENGTH),
  };
}

/**
 * Normalize a database error into a structured format.
 *
 * Recognizes common SQLite and Postgres error patterns and maps them to
 * stable `errorKind` values for alerting/grouping.
 *
 * Returns a full NormalizedError with:
 * - errorKind: stable string for grouping
 * - safeMessage: user-facing message (no sensitive details)
 * - serialized error fields
 */
export function normalizeDbError(error: unknown): NormalizedError {
  const serialized = serializeError(error);
  const message = serialized.message || "";
  const messageLower = message.toLowerCase();

  // SQLite constraint violations
  if (
    messageLower.includes("sqlite_constraint") ||
    messageLower.includes("constraint failed")
  ) {
    if (messageLower.includes("unique")) {
      return {
        ...serialized,
        errorKind: "constraint_violation_unique",
        safeMessage: "A record with this value already exists",
      };
    }

    if (messageLower.includes("foreign key")) {
      return {
        ...serialized,
        errorKind: "constraint_violation_foreign_key",
        safeMessage: "Unable to complete operation due to related records",
      };
    }

    if (messageLower.includes("not null")) {
      return {
        ...serialized,
        errorKind: "constraint_violation_not_null",
        safeMessage: "Required field is missing",
      };
    }

    if (messageLower.includes("check")) {
      return {
        ...serialized,
        errorKind: "constraint_violation_check",
        safeMessage: "Value does not meet requirements",
      };
    }

    // Generic constraint
    return {
      ...serialized,
      errorKind: "constraint_violation",
      safeMessage: "Operation violates database constraint",
    };
  }

  // SQLite busy/locked errors
  if (
    messageLower.includes("sqlite_busy") ||
    messageLower.includes("database is locked")
  ) {
    return {
      ...serialized,
      errorKind: "database_locked",
      safeMessage: "Database is temporarily unavailable, please retry",
    };
  }

  // Postgres constraint violations (future-proofing)
  if (messageLower.includes("duplicate key value")) {
    return {
      ...serialized,
      errorKind: "constraint_violation_unique",
      safeMessage: "A record with this value already exists",
    };
  }

  if (
    messageLower.includes("violates foreign key constraint") ||
    messageLower.includes("foreign key violation")
  ) {
    return {
      ...serialized,
      errorKind: "constraint_violation_foreign_key",
      safeMessage: "Unable to complete operation due to related records",
    };
  }

  if (messageLower.includes("violates not-null constraint")) {
    return {
      ...serialized,
      errorKind: "constraint_violation_not_null",
      safeMessage: "Required field is missing",
    };
  }

  if (messageLower.includes("violates check constraint")) {
    return {
      ...serialized,
      errorKind: "constraint_violation_check",
      safeMessage: "Value does not meet requirements",
    };
  }

  // Connection errors
  if (
    messageLower.includes("econnrefused") ||
    messageLower.includes("connection refused") ||
    messageLower.includes("enotfound") ||
    messageLower.includes("timeout") ||
    messageLower.includes("etimedout")
  ) {
    return {
      ...serialized,
      errorKind: "connection_error",
      safeMessage: "Unable to connect to database",
    };
  }

  // Not found / does not exist errors
  if (
    messageLower.includes("does not exist") ||
    messageLower.includes("not found") ||
    messageLower.includes("no such table") ||
    messageLower.includes("no such column")
  ) {
    return {
      ...serialized,
      errorKind: "not_found",
      safeMessage: "Requested resource not found",
    };
  }

  // Generic database error
  if (
    messageLower.includes("sqlite") ||
    messageLower.includes("sql") ||
    messageLower.includes("database")
  ) {
    return {
      ...serialized,
      errorKind: "database_error",
      safeMessage: "A database error occurred",
    };
  }

  // Unknown error
  return {
    ...serialized,
    errorKind: "unknown",
    safeMessage: "An unexpected error occurred",
  };
}

/**
 * Truncate a string to a maximum length, adding ellipsis if truncated.
 */
export function truncate(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen)}…`;
}

/**
 * Safely truncate and redact any freeform text field (notes, payees, etc.).
 *
 * Use this for user-provided text that might contain sensitive info.
 * Default max length: 100 chars (configurable).
 */
export function sanitizeFreeformText(
  value: string | null | undefined,
  maxLen = 100,
): string | undefined {
  if (!value) return undefined;

  // Basic sanitization: remove control characters, excessive whitespace
  const cleaned = value
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control chars
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  if (cleaned.length === 0) return undefined;

  return truncate(cleaned, maxLen);
}

/**
 * Check if a field name likely contains sensitive data.
 * Used for defensive logging (block unknown fields that might be secrets).
 */
export function isSensitiveFieldName(fieldName: string): boolean {
  const lower = fieldName.toLowerCase();

  return (
    lower.includes("password") ||
    lower.includes("secret") ||
    lower.includes("token") ||
    lower.includes("key") ||
    lower.includes("authorization") ||
    lower.includes("auth") ||
    lower.includes("credential") ||
    lower.includes("cookie") ||
    lower.includes("session") ||
    lower.includes("apikey") ||
    lower.includes("api_key") ||
    lower === "pass" ||
    lower === "pwd"
  );
}

/**
 * Sanitize an object for logging by removing/redacting sensitive fields.
 *
 * Use this when logging objects from untrusted sources (user input, external APIs).
 * Applies a defensive allowlist approach.
 */
export function sanitizeObject(
  obj: Record<string, unknown>,
  allowedKeys?: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // If allowlist provided, only include allowed keys
    if (allowedKeys && !allowedKeys.includes(key)) {
      continue;
    }

    // Redact sensitive field names
    if (isSensitiveFieldName(key)) {
      result[key] = "[REDACTED]";
      continue;
    }

    // Truncate strings
    if (typeof value === "string") {
      result[key] = truncate(value, 200);
      continue;
    }

    // Keep primitives and simple types
    if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      result[key] = value;
      continue;
    }

    // Skip complex objects (arrays, nested objects) to avoid deep logging
    // If needed, recursively sanitize in future
    result[key] = "[Object]";
  }

  return result;
}

/**
 * Round milliseconds to 2 decimal places for consistency.
 */
export function roundMs(ms: number): number {
  return Math.round(ms * 100) / 100;
}
