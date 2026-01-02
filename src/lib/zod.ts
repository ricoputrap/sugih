/**
 * Zod validation error formatting utilities
 * Converts ZodError into a structured format for API responses
 */

import { ZodError, ZodIssue } from "zod";

export interface FormattedZodError {
  field: string;
  message: string;
  code: string;
  path?: Array<string | number>;
}

export function formatZodError(error: ZodError): FormattedZodError[] {
  return error.issues.map(formatZodIssue);
}

export function formatZodIssue(issue: ZodIssue): FormattedZodError {
  return {
    field: issue.path.join("."),
    message: issue.message,
    code: issue.code,
    path: issue.path as Array<string | number>,
  };
}

export function getFieldErrors(error: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path.join(".");
    if (!errors[field]) {
      errors[field] = [];
    }
    errors[field].push(issue.message);
  }

  return errors;
}

export function getFirstFieldError(error: ZodError): string | undefined {
  const firstIssue = error.issues[0];
  if (!firstIssue) return undefined;

  return `${firstIssue.path.join(".")}: ${firstIssue.message}`;
}
