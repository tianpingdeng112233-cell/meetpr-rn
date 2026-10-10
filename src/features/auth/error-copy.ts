import { t, type TranslationKey } from '@/i18n';

import { ApiError, type ApiErrorCode } from '@/api/client';

const messages: Partial<Record<ApiErrorCode, TranslationKey>> = {
  AUTH_INVALID_CREDENTIALS: 'auth.invalidCredentials',
  AUTH_INVALID_IDENTITY_TOKEN: 'auth.invalidIdentityToken',
  AUTH_EMAIL_TAKEN: 'auth.emailTaken',
  AUTH_INVALID_SIGNUP_CODE: 'auth.invalidSignupCode',
  AUTH_INVALID_RESET_CODE: 'auth.invalidResetCode',
  AUTH_REGISTRATION_DISABLED: 'auth.registrationUnavailable',
  AUTH_REGISTRATION_NOT_ALLOWED: 'auth.registrationUnavailable',
  INVALID_TIMEZONE: 'auth.invalidTimezone',
  RATE_LIMITED: 'auth.rateLimited',
  VALIDATION_ERROR: 'auth.validationError',
};

export function globalAuthErrorMessage(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'type' in error &&
    (error.type === 'cancel' || error.type === 'dismiss')) return null;
  if (error instanceof ApiError && error.kind === 'backend' && (error.status ?? 0) < 500 && error.code) {
    return t(messages[error.code] ?? 'auth.unavailable');
  }
  return t('auth.unavailable');
}
