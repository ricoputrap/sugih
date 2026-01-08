import type { NextRequest } from "next/server";

import { childLogger } from "./logger";
import {
  getOrCreateRequestId,
  withRequestIdHeader,
  REQUEST_ID_HEADER,
} from "./request-id";
import { serializeError, roundMs, truncate } from "./error-serialization";
import { isSlowRequest, shouldSample } from "./config";

/**
 * Shape of a Next.js App Router route handler (GET/POST/etc).
 * We keep it broad enough to support `NextRequest` but also standard `Request`.
 */
export type RouteHandler = (
  request: NextRequest,
) => Response | Promise<Response>;

export interface RouteLogOptions {
  /**
   * Logical operation name used in logs (e.g. "report.spending-trend").
   */
  operation: string;

  /**
   * When true, include query params (sanitized) in logs.
   * Default: true
   */
  logQuery?: boolean;

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
 * Wrap a route handler with:
 * - `x-request-id` propagation (uses incoming header or generates one)
 * - Timing measurement
 * - Structured Pino logging
 *
 * Intended for report endpoints (Step 7.4): request IDs + log timings.
 */
export function withReportTiming(
  handler: RouteHandler,
  options: RouteLogOptions,
): RouteHandler {
  const {
    operation,
    logQuery = true,
    logUserAgent = false,
    logIp = false,
    successLevel = "info",
    errorLevel = "error",
  } = options;

  return async function wrapped(request: NextRequest): Promise<Response> {
    const requestId = getOrCreateRequestId(request);

    const url = new URL(request.url);
    const startedAt = Date.now();
    const startHr =
      typeof performance !== "undefined" ? performance.now() : null;

    const log = childLogger({
      requestId,
      operation,
      method: request.method,
      path: url.pathname,
    });

    const requestMeta: Record<string, unknown> = {};

    if (logQuery) {
      requestMeta.query = sanitizeQueryParams(url.searchParams);
    }

    if (logUserAgent) {
      requestMeta.userAgent = request.headers.get("user-agent") || undefined;
    }

    if (logIp) {
      requestMeta.ip =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        undefined;
    }

    // Provide requestId to downstream systems via header (best effort).
    // Note: NextRequest headers are immutable; we log and set response header instead.
    log.debug(
      {
        ...requestMeta,
        requestIdHeader: request.headers.get(REQUEST_ID_HEADER) || undefined,
      },
      "request:start",
    );

    try {
      const response = await handler(request);

      const durationMs =
        startHr === null ? Date.now() - startedAt : performance.now() - startHr;

      const status = response.status;

      const sizeHeader = response.headers.get("content-length") || undefined;

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
