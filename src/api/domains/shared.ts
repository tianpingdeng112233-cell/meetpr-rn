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

export const UuidSchema = z.string().uuid();

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
