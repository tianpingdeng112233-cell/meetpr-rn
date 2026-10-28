import { setLocaleOverride } from '@/i18n';
import { expect, test } from '@jest/globals';
import { ApiError, type ApiErrorCode } from '@/api/client';
import { globalAuthErrorMessage } from '../error-copy';
test.each([
  ['AUTH_INVALID_CREDENTIALS', 'Incorrect email or password'],
  ['AUTH_INVALID_IDENTITY_TOKEN', "We couldn't verify this sign-in. Please try again"],
  ['AUTH_EMAIL_TAKEN', 'An account already exists for this email'],
  ['AUTH_INVALID_RESET_CODE', 'That code is invalid or has expired'],
  ['AUTH_REGISTRATION_DISABLED', 'Account creation is currently unavailable'],
  ['AUTH_REGISTRATION_NOT_ALLOWED', 'Account creation is currently unavailable'],
  ['INVALID_TIMEZONE', "Your device timezone isn't supported"],
  ['RATE_LIMITED', 'Too many attempts. Please try again later'],
  ['VALIDATION_ERROR', 'Check your details and try again'],
  ['AUTH_PROVIDER_NOT_CONFIGURED', 'Sign-in is temporarily unavailable'],
  ['AUTH_PROVIDER_UNAVAILABLE', 'Sign-in is temporarily unavailable'],
  ['AUTH_INVALID_REFRESH', 'Sign-in is temporarily unavailable'],
])('%s error copy', (code, copy) => {
  expect(globalAuthErrorMessage(new ApiError('backend', code, { code: code as ApiErrorCode }))).toBe(copy);
});
test.each([new Error('decode'), new ApiError('network', 'offline'), new ApiError('server', 'unavailable', { status: 503 }), new ApiError('backend', 'invalid', { status: 500, code: 'VALIDATION_ERROR' })])('fallback %#', error => {
  expect(globalAuthErrorMessage(error)).toBe('Sign-in is temporarily unavailable');
});
test('Google cancellation has no toast', () => {
  expect(globalAuthErrorMessage({ type: 'cancel' })).toBeNull();
  expect(globalAuthErrorMessage({ type: 'dismiss' })).toBeNull();
});

test('signup code error copy follows the system locale', () => {
  const error = new ApiError('backend', 'invalid', { status: 400, code: 'AUTH_INVALID_SIGNUP_CODE' });
  try {
    setLocaleOverride('en');
    expect(globalAuthErrorMessage(error)).toBe('That code is invalid or has expired');
    setLocaleOverride('zh');
    expect(globalAuthErrorMessage(error)).toBe('\u9a8c\u8bc1\u7801\u4e0d\u5bf9\u6216\u5df2\u8fc7\u671f\uff0c\u8bf7\u91cd\u65b0\u83b7\u53d6');
  } finally { setLocaleOverride(null); }
});
