import pino from "pino";
import { LOG_LEVEL, LOG_STACK_TRACES_IN_PRODUCTION } from "./config";

/**
 * Base application logger (Pino).
 *
 * Goals:
 * - Safe-by-default: redact common secrets.
 * - Portable: pretty logs in development, JSON in production.
 * - Small surface area: export a single `logger` instance and a `childLogger` helper.
 * - Centralized config: all knobs driven by environment variables (see config.ts).
 */

const isDevelopment = process.env.NODE_ENV !== "production";

/**
 * Redact common secret locations in objects we log.
 * Note: path matching supports wildcards (Pino redaction).
 */
const redactPaths: string[] = [
  // Credentials / tokens (generic)
  "*.password",
  "*.pass",
  "*.secret",
  "*.token",
  "*.accessToken",
  "*.refreshToken",
  "*.apiKey",
  "*.authorization",
  "*.cookie",
  "*.set-cookie",

  // Common request/response shapes
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers['set-cookie']",
  "res.headers['set-cookie']",

  // NextRequest / fetch Request-like objects (sometimes logged accidentally)
  "headers.authorization",
  "headers.cookie",
];

/**
 * Pretty printing in development:
 * - This uses Pino's built-in transport to `pino-pretty`.
 * - You may need `pino-pretty` installed depending on your environment.
 */
const transport = isDevelopment
  ? {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
        singleLine: false,
      },
    }
  : undefined;

export const logger = pino({
  level: LOG_LEVEL,
  redact: {
    paths: redactPaths,
    censor: "[REDACTED]",
    remove: false,
  },
  base: {
    env: process.env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(transport ? { transport } : {}),
});

export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
