import { z } from 'zod';

export const DEFAULT_API_BASE_URL = 'http://121.40.160.241:3000';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, '');

const ErrorEnvelopeSchema = z.object({
  error: z.string(),
  missing_fields: z.array(z.string()).optional(),
  status: z.string().optional(),
  issues: z
    .array(
      z.object({
        path: z.array(z.union([z.string(), z.number()])),
        message: z.string(),
      }),
    )
    .optional(),
});

export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
export type ApiErrorKind = 'backend' | 'server' | 'network';

export const KNOWN_BACKEND_ERROR_CODES = [
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_INVALID_REFRESH',
  'AUTH_INVALID_TOKEN',
  'AUTH_PHONE_TAKEN',
  'AUTHORIZATION_FORBIDDEN',
  'RATE_LIMITED',
  'AUTH_REFRESH_EXPIRED',
  'VALIDATION_ERROR',
  'PLAN_NOT_FOUND',
  'PLAN_NOT_ACTIVE',
  'NOT_PLAN_STUDENT',
  'UNDO_WINDOW_PASSED',
  'NOT_LATEST_COMPLETION',
  'NO_COMPLETION_TO_UNDO',
  'SETS_PLAN_EXERCISE_NOT_PUBLISHED',
  'SETS_EXERCISE_NOT_FOUND',
  'FEEDBACK_NOT_FOUND',
  'UPLOADS_NOT_CONFIGURED',
  'UPLOAD_CONTENT_TYPE_MISMATCH',
  'UPLOAD_TOO_LARGE',
  'SET_LOG_NOT_FOUND',
  'UPLOAD_QUOTA_EXCEEDED',
  'UPLOAD_INVALID_STATE',
  'UPLOAD_SIZE_MISMATCH',
  'UPLOAD_INVALID_PARTS',
  'UPLOAD_SIZE_VERIFICATION_FAILED',
  'UPLOAD_ABORT_FAILED',
  'ATTACHMENT_NOT_FOUND',
  'ATTACHMENT_NOT_READY',
  'INVITE_CODE_INVALID',
  'BIND_REQUEST_ALREADY_PENDING',
  'BIND_ALREADY_BOUND',
  'BIND_REQUEST_EXPIRED',
  'BIND_REQUEST_NOT_FOUND',
  'BIND_REQUEST_NOT_PENDING',
  'ONBOARDING_NOT_FOUND',
  'ONE_RM_LOCKED',
  'ONBOARDING_INCOMPLETE',
  'PASSWORD_MISMATCH',
] as const;

export type ApiErrorCode = (typeof KNOWN_BACKEND_ERROR_CODES)[number];

const knownBackendCodes = new Set<string>(KNOWN_BACKEND_ERROR_CODES);

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly code?: ApiErrorCode;
  readonly envelope?: ErrorEnvelope;
  override readonly cause?: unknown;

  constructor(
    kind: ApiErrorKind,
    message: string,
    options: {
      status?: number;
      code?: ApiErrorCode;
      envelope?: ErrorEnvelope;
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = options.status;
    this.code = options.code;
    this.envelope = options.envelope;
    this.cause = options.cause;
  }
}

export type ApiRequestOptions<T> = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string;
  schema?: z.ZodType<T>;
  signal?: AbortSignal;
};

function parseJson(text: string): unknown {
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions<T> = {},
): Promise<T> {
  const headers: Record<string, string> = {
    accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  if (options.accessToken) {
    headers.authorization = `Bearer ${options.accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (cause) {
    throw new ApiError('network', 'Network request failed', { cause });
  }

  let responseText: string;
  try {
    responseText = await response.text();
  } catch (cause) {
    throw new ApiError('network', 'Could not read the server response', {
      status: response.status,
      cause,
    });
  }

  const payload = parseJson(responseText);

  if (!response.ok) {
    const envelopeResult = ErrorEnvelopeSchema.safeParse(payload);
    if (envelopeResult.success && knownBackendCodes.has(envelopeResult.data.error)) {
      throw new ApiError('backend', envelopeResult.data.error, {
        status: response.status,
        code: envelopeResult.data.error as ApiErrorCode,
        envelope: envelopeResult.data,
      });
    }

    if (response.status >= 500) {
      throw new ApiError('server', `Server returned ${response.status}`, {
        status: response.status,
      });
    }

    throw new ApiError('network', `Unexpected HTTP response ${response.status}`, {
      status: response.status,
    });
  }

  if (!options.schema) {
    return payload as T;
  }

  const parsed = options.schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError('network', 'Server response did not match the expected DTO', {
      status: response.status,
      cause: parsed.error,
    });
  }

  return parsed.data;
}

export function isUnauthorizedError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401;
}
