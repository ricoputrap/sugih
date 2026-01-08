/**
 * LOGGING MODULE - Main Export
 *
 * Provides structured logging for the Sugih application using Pino.
 * All exports follow the logging contract defined in contract.ts.
 *
 * Quick Start:
 * ```typescript
 * import { logger, childLogger } from '@/lib/logging';
 *
 * const log = childLogger({ requestId: 'req_123', operation: 'wallet.create' });
 * log.info({ resourceId: 'wal_abc' }, 'action:complete');
 * ```
 */

// Core logger instance
export { logger, childLogger } from "./logger";

// Request ID utilities
export {
  REQUEST_ID_HEADER,
  getOrCreateRequestId,
  generateRequestId,
  isValidRequestId,
  withRequestIdHeader,
  jsonWithRequestId,
} from "./request-id";

// Route handler wrappers
export {
  withReportTiming,
  sanitizeQueryParams,
  type RouteHandler,
  type RouteLogOptions,
} from "./route-helpers";

// Error serialization and normalization
export {
  serializeError,
  normalizeDbError,
  truncate,
  sanitizeFreeformText,
  isSensitiveFieldName,
  sanitizeObject,
  roundMs,
  type SerializedError,
  type NormalizedError,
} from "./error-serialization";

// Configuration and environment knobs
export {
  LOG_LEVEL,
  LOG_SAMPLE_RATE,
  LOG_QUERY_TIMING,
  LOG_BODY_LOGGING,
  LOG_SLOW_REQUEST_MS,
  LOG_TRANSACTIONS,
  LOG_ACTIONS,
  LOG_STACK_TRACES_IN_PRODUCTION,
  LOG_MAX_QUERY_PARAMS,
  shouldSample,
  isSlowRequest,
  getLoggingConfigSummary,
} from "./config";

// Type exports for logging contract
export type {
  LogContext,
  HttpLogFields,
  ActionLogFields,
  DbLogFields,
  ErrorLogFields,
  LogEntry,
} from "./contract";
