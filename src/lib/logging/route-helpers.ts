import type { NextRequest } from "next/server";

import { childLogger } from "./logger";
import {
  getOrCreateRequestId,
  withRequestIdHeader,
  REQUEST_ID_HEADER,
} from "./request-id";
import { serializeError, roundMs, truncate } from "./error-serialization";
import { isSlowRequest, shouldSample, LOG_BODY_LOGGING } from "./config";

/**
 * Shape of a Next.js App Router route handler (GET/POST/etc).
 * We keep it broad enough to support `NextRequest` but also standard `Request`.
 */
export type RouteHandler = (
  request: NextRequest,
  context?: any,
) => Response | Promise<Response>;

export interface RouteLogOptions {
  /**
   * Logical operation name used in logs (e.g. "api.wallets.list").
   */
  operation: string;

  /**
   * When true, include query params (sanitized) in logs.
   * Default: true
   */
  logQuery?: boolean;

  /**
   * When true, include route params (e.g., {id: "wal_123"}) in logs.
   * Default: true for detail routes
   */
  logRouteParams?: boolean;

  /**
   * When true, include user-agent in logs.
   * Default: false
   */
  logUserAgent?: boolean;

  /**
   * When true, include x-forwarded-for / x-real-ip if present.
   * Default: false
   */
  logIp?: boolean;

  /**
   * When true, log request body metadata (size, validation outcome).
   * Only applies if LOG_BODY_LOGGING is enabled.
   * Default: false
   */
  logBodyMetadata?: boolean;

  /**
   * Log level for successful completion.
   * Default: "info"
   */
  successLevel?: "debug" | "info" | "warn";

  /**
   * Log level for failures.
   * Default: "error"
   */
  errorLevel?: "error" | "warn";
}

/**
 * Wrap a route handler with comprehensive logging:
 * - `x-request-id` propagation (uses incoming header or generates one)
 * - Timing measurement
 * - Structured Pino logging
 * - Slow request detection
 * - Sampling support
 *
 * This is the main wrapper for all API routes.
 */
export function withRouteLogging(
  handler: RouteHandler,
  options: RouteLogOptions,
): RouteHandler {
  const {
    operation,
    logQuery = true,
    logRouteParams = false,
    logUserAgent = false,
    logIp = false,
    logBodyMetadata = false,
    successLevel = "info",
    errorLevel = "error",
  } = options;

  return async function wrapped(
    request: NextRequest,
    context?: any,
  ): Promise<Response> {
    const requestId = getOrCreateRequestId(request);

    const url = request?.url ? new URL(request.url) : null;
    const startedAt = Date.now();
    const startHr =
      typeof performance !== "undefined" ? performance.now() : null;

    const log = childLogger({
      requestId,
      operation,
      method: request?.method || "GET",
      path: url?.pathname || "/",
    });

    const requestMeta: Record<string, unknown> = {};

    if (logQuery && url) {
      requestMeta.query = sanitizeQueryParams(url.searchParams);
    }

    if (logRouteParams && context?.params) {
      // Handle both Promise<params> and direct params (Next.js 13+ vs 14+)
      const params =
        context.params instanceof Promise
          ? await context.params
          : context.params;
      requestMeta.routeParams = sanitizeRouteParams(params);
    }

    if (logUserAgent && request) {
      requestMeta.userAgent = request.headers.get("user-agent") || undefined;
    }

    if (logIp && request) {
      requestMeta.ip =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        undefined;
    }

    // Log request body metadata if enabled (POST/PATCH/PUT)
    if (
      logBodyMetadata &&
      LOG_BODY_LOGGING &&
      request &&
      (request.method === "POST" ||
        request.method === "PATCH" ||
        request.method === "PUT")
    ) {
      const contentLength = request.headers.get("content-length");
      if (contentLength) {
        requestMeta.requestBodySize = Number(contentLength);
      }
    }

    log.debug(
      {
        ...requestMeta,
        event: "request:start",
      },
      "request:start",
    );

    try {
      const response = await handler(request, context);

      const durationMs =
        startHr === null ? Date.now() - startedAt : performance.now() - startHr;

      const status = response.status;

      const sizeHeader = response.headers?.get("content-length") || undefined;

      // Check if this qualifies as a slow request
      const isSlowReq = isSlowRequest(durationMs);
      const logLevel = isSlowReq ? "warn" : successLevel;

      // Apply sampling for INFO logs (never sample WARN/ERROR)
      const shouldLog = shouldSample(
        logLevel === "warn" ? "warn" : successLevel,
      );

      if (shouldLog) {
        log[logLevel](
          {
            ...requestMeta,
            status,
            durationMs: roundMs(durationMs),
            contentLength: sizeHeader ? Number(sizeHeader) : undefined,
            event: isSlowReq ? "request:slow" : "request:complete",
          },
          isSlowReq ? "request:slow" : "request:complete",
        );
      }

      return withRequestIdHeader(response, requestId);
    } catch (err) {
      const durationMs =
        startHr === null ? Date.now() - startedAt : performance.now() - startHr;

      const serialized = serializeError(err);

      // Always log errors (never sampled)
      log[errorLevel](
        {
          ...requestMeta,
          durationMs: roundMs(durationMs),
          err: serialized,
          event: "request:error",
        },
        "request:error",
      );

      // Re-throw so the existing route-level error handling keeps working.
      // (Your API routes typically catch and return `badRequest`/`serverError`.)
      throw err;
    }
  };
}

/**
 * Backward-compatible alias for existing report endpoints.
 * Use withRouteLogging for new routes.
 */
export const withReportTiming = withRouteLogging;

/**
 * Whitelist-style sanitization for query params in logs.
 * - Truncates long values
 * - Redacts common secret keys
 */
export function sanitizeQueryParams(
  params: URLSearchParams,
): Record<string, string> {
  const out: Record<string, string> = {};

  for (const [key, value] of params.entries()) {
    const lowerKey = key.toLowerCase();

    if (isSecretQueryKey(lowerKey)) {
      out[key] = "[REDACTED]";
      continue;
    }

    out[key] = truncate(value, 200);
  }

  return out;
}

/**
 * Sanitize route params for logging (e.g., {id: "wal_123"}).
 * - Truncates long values
 * - Redacts sensitive-looking params
 */
export function sanitizeRouteParams(
  params: Record<string, string | string[]>,
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(params)) {
    const lowerKey = key.toLowerCase();

    if (isSecretQueryKey(lowerKey)) {
      out[key] = "[REDACTED]";
      continue;
    }

    if (Array.isArray(value)) {
      out[key] = value.map((v) => truncate(v, 200));
    } else {
      out[key] = truncate(value, 200);
    }
  }

  return out;
}

function isSecretQueryKey(lowerKey: string): boolean {
  return (
    lowerKey.includes("token") ||
    lowerKey.includes("secret") ||
    lowerKey.includes("password") ||
    lowerKey === "authorization" ||
    lowerKey === "cookie" ||
    lowerKey === "set-cookie" ||
    lowerKey === "api_key" ||
    lowerKey === "apikey"
  );
}
