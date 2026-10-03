import { ApiError, type ApiErrorCode } from '@/api/client';

const messages: Partial<Record<ApiErrorCode, string>> = {
  AUTH_INVALID_CREDENTIALS: 'Incorrect email or password',
  AUTH_INVALID_IDENTITY_TOKEN: "We couldn't verify this sign-in. Please try again",
  AUTH_EMAIL_TAKEN: 'An account already exists for this email',
  AUTH_INVALID_RESET_CODE: 'That code is invalid or has expired',
  AUTH_REGISTRATION_DISABLED: 'Account creation is currently unavailable',
  AUTH_REGISTRATION_NOT_ALLOWED: 'Account creation is currently unavailable',
  INVALID_TIMEZONE: "Your device timezone isn't supported",
  RATE_LIMITED: 'Too many attempts. Please try again later',
  VALIDATION_ERROR: 'Check your details and try again',
};

export function globalAuthErrorMessage(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'type' in error &&
    (error.type === 'cancel' || error.type === 'dismiss')) return null;
  if (error instanceof ApiError && error.kind === 'backend' && (error.status ?? 0) < 500 && error.code) {
    return messages[error.code] ?? 'Sign-in is temporarily unavailable';
  }
  return 'Sign-in is temporarily unavailable';
}
