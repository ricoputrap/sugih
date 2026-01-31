/**
 * HTTP response helpers for API routes
 * Standardizes response formats across all API endpoints
 */

export function jsonResponse<T>(data: T, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });
}

export function ok<T>(data: T): Response {
  return jsonResponse(data, { status: 200 });
}

export function created<T>(data: T): Response {
  return jsonResponse(data, { status: 201 });
}

export function badRequest(message: string, issues?: unknown): Response {
  return jsonResponse(
    {
      error: {
        message,
        issues: issues ?? undefined,
      },
    },
    { status: 400 },
  );
}

export function unauthorized(message = "Unauthorized"): Response {
  return jsonResponse(
    {
      error: {
        message,
      },
    },
    { status: 401 },
  );
}

export function forbidden(message = "Forbidden"): Response {
  return jsonResponse(
    {
      error: {
        message,
      },
    },
    { status: 403 },
  );
}

export function notFound(message = "Not found"): Response {
  return jsonResponse(
    {
      error: {
        message,
      },
    },
    { status: 404 },
  );
}

export function conflict(message = "Conflict"): Response {
  return jsonResponse(
    {
      error: {
        message,
      },
    },
    { status: 409 },
  );
}

export function unprocessableEntity(
  message = "Validation failed",
  issues?: unknown,
): Response {
  return jsonResponse(
    {
      error: {
        message,
        issues: issues ?? undefined,
      },
    },
    { status: 422 },
  );
}

export function serverError(
  message = "Internal server error",
  details?: unknown,
): Response {
  // Don't leak internal details in production
  const error = {
    message,
    ...(process.env.NODE_ENV === "development" && details ? { details } : {}),
  };

  return jsonResponse(
    {
      error,
    },
    { status: 500 },
  );
}

export function tooManyRequests(message = "Too many requests"): Response {
  return jsonResponse(
    {
      error: {
        message,
      },
    },
    { status: 429 },
  );
}
