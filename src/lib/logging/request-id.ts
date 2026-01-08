import { randomUUID } from "crypto";

export const REQUEST_ID_HEADER = "x-request-id";

/**
 * Prefer a caller-provided request id, otherwise generate a new one.
 *
 * Accepts:
 * - `x-request-id` header
 * - `requestId` query parameter (useful for local debugging)
 */
export function getOrCreateRequestId(
  request: Request | null | undefined,
): string {
  if (!request) {
    return generateRequestId();
  }

  const fromHeader = request.headers?.get(REQUEST_ID_HEADER);
  if (fromHeader && isValidRequestId(fromHeader)) {
    return fromHeader;
  }

  try {
    const url = new URL(request.url);
    const fromQuery = url.searchParams.get("requestId");
    if (fromQuery && isValidRequestId(fromQuery)) {
      return fromQuery;
    }
  } catch {
    // Invalid URL or request.url is undefined
  }

  return generateRequestId();
}

export function generateRequestId(): string {
  // Keep it short-ish but unique and sortable enough for logs.
  const ts = Date.now().toString(36);
  const rand = randomUUID().split("-")[0];
  return `req_${ts}_${rand}`;
}

/**
 * Very lightweight validation to avoid log/header injection and huge IDs.
 * We allow a small, safe charset.
 */
export function isValidRequestId(value: string): boolean {
  if (value.length < 6 || value.length > 128) return false;
  // Allow alnum + a few common separators
  return /^[a-zA-Z0-9._-]+$/.test(value);
}

/**
 * Apply request id to response headers.
 * Defensive: handles responses without headers or with consumed bodies.
 */
export function withRequestIdHeader(
  response: Response,
  requestId: string,
): Response {
  // If response doesn't have headers, return as-is (likely a mock or invalid response)
  if (!response.headers) {
    return response;
  }

  try {
    const headers = new Headers(response.headers);
    headers.set(REQUEST_ID_HEADER, requestId);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    // If cloning fails (body already consumed), return original response
    return response;
  }
}

/**
 * Convenience for creating a JSON response that always includes request id.
 * (You can keep using your existing `ok()` helper and then call `withRequestIdHeader()` too.)
 */
export function jsonWithRequestId(
  data: unknown,
  requestId: string,
  init?: ResponseInit,
): Response {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  headers.set(REQUEST_ID_HEADER, requestId);

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}
