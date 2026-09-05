import { z } from 'zod';

import { ApiError, type ApiErrorCode } from '../client';

/** Backend DATE columns are wire text (`YYYY-MM-DD`), never JS `Date`s. */
export const DateTextSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Decimal database values are serialized as strings to preserve precision. */
export const DecimalStringSchema = z.string();

/** UTC instants use ISO8601 text on the wire. */
export const TimestampSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/,
);

/**
 * Backend ids are 8-4-4-4-12 hex GUIDs but not always RFC 4122 (the exercise catalog
 * uses synthetic ids like 00000000-0000-0000-ca70-0000000000c1), so zod 4's strict
 * `uuid()` (version/variant nibbles) must not be used on wire ids.
 */
export const UuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Expected a GUID');

export function isApiErrorCode<C extends ApiErrorCode>(
  error: unknown,
  codes: readonly C[],
): error is ApiError & { code: C } {
  return error instanceof ApiError && codes.some((code) => code === error.code);
}

export function encodeQuery(
  params: Record<string, string | number | undefined>,
): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
}
