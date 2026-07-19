import { z } from 'zod';

import { apiRequest } from './client';

// Tolerates the same wire variants as the iOS codec: full ISO8601 with or
// without fractional seconds, plus bare YYYY-MM-DD (UTC day-start).
const Iso8601DateTimeSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/,
  'Expected an ISO8601 date-time or date',
);

export const UserRoleSchema = z.enum([
  'coach',
  'coached_student',
  'self_train_student',
]);

// The backend responds in camelCase while requests are accepted in snake_case;
// iOS's convertFromSnakeCase decoder tolerates both, so we must too.
function tolerateCamelCase(aliases: Record<string, string>) {
  return (value: unknown): unknown => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return value;
    }
    const record = { ...(value as Record<string, unknown>) };
    for (const [snake, camel] of Object.entries(aliases)) {
      if (record[snake] === undefined && record[camel] !== undefined) {
        record[snake] = record[camel];
      }
    }
    return record;
  };
}

export const UserSchema = z.preprocess(
  tolerateCamelCase({ created_at: 'createdAt' }),
  z.object({
    id: z.string().uuid(),
    phone: z.string(),
    role: UserRoleSchema,
    created_at: Iso8601DateTimeSchema,
  }),
);

export const RegisterRequestSchema = z.object({
  phone: z.string(),
  password: z.string(),
  role: UserRoleSchema,
});

export const LoginRequestSchema = z.object({
  phone: z.string(),
  password: z.string(),
});

export const RefreshRequestSchema = z.object({
  refresh_token: z.string(),
});

export const AuthResponseSchema = z.preprocess(
  tolerateCamelCase({ access_token: 'accessToken', refresh_token: 'refreshToken' }),
  z.object({
    user: UserSchema,
    access_token: z.string(),
    refresh_token: z.string(),
  }),
);

export const RefreshResponseSchema = z.preprocess(
  tolerateCamelCase({ access_token: 'accessToken', refresh_token: 'refreshToken' }),
  z.object({
    access_token: z.string(),
    refresh_token: z.string(),
  }),
);

export type UserRole = z.infer<typeof UserRoleSchema>;
export type User = z.infer<typeof UserSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

// Wire DTO convention: Decimal-valued fields in later domain DTOs are strings,
// never JavaScript numbers, so weights and other precision values are not rounded.

export function normalizeWirePhone(phone: string): string {
  return phone.startsWith('+') ? phone : `+86${phone}`;
}

export async function loginRequest(
  input: LoginRequest,
  signal?: AbortSignal,
): Promise<AuthResponse> {
  const body = LoginRequestSchema.parse({
    ...input,
    phone: normalizeWirePhone(input.phone),
  });

  return apiRequest('/auth/login', {
    method: 'POST',
    body,
    schema: AuthResponseSchema,
    signal,
  });
}

export async function registerRequest(
  input: RegisterRequest,
  signal?: AbortSignal,
): Promise<AuthResponse> {
  const body = RegisterRequestSchema.parse({
    ...input,
    phone: normalizeWirePhone(input.phone),
  });

  return apiRequest('/auth/register', {
    method: 'POST',
    body,
    schema: AuthResponseSchema,
    signal,
  });
}

export async function refreshRequest(
  refreshToken: string,
  signal?: AbortSignal,
): Promise<RefreshResponse> {
  const body = RefreshRequestSchema.parse({ refresh_token: refreshToken });

  return apiRequest('/auth/refresh', {
    method: 'POST',
    body,
    schema: RefreshResponseSchema,
    signal,
  });
}
