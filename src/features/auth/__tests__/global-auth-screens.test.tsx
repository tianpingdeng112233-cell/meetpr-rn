import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Linking, Text, TextInput } from 'react-native';
import { router } from 'expo-router';

import GlobalLoginScreen from '../GlobalLoginScreen';
import GlobalRegisterScreen from '../GlobalRegisterScreen';
import GlobalForgotPasswordScreen from '../GlobalForgotPasswordScreen';
import { ApiError } from '@/api/client';
import { showToast } from '@/design/Toast';
import { globalAuthErrorMessage } from '../error-copy';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
const mockLogin = jest.fn<() => Promise<void>>();
const mockRegister = jest.fn<() => Promise<void>>();
const mockGoogle = jest.fn<() => Promise<string | null>>();
const mockRequestReset = jest.fn<() => Promise<void>>();
const mockResetPassword = jest.fn<(value: unknown) => Promise<void>>();
jest.mock('@/api/auth', () => ({ requestPasswordReset: () => mockRequestReset(), resetPassword: (value: unknown) => mockResetPassword(value) }));
jest.mock('@/api/session', () => ({
  useSessionStore: { getState: () => ({ loginWithEmail: mockLogin, registerWithEmail: mockRegister, loginWithGoogle: jest.fn() }) },
}));
jest.mock('../google-oauth', () => ({ useGoogleOAuth: () => mockGoogle }));
let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), setParams: jest.fn((params: Record<string, string | undefined>) => { mockParams = { ...mockParams, ...params }; }) },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/design/Toast', () => ({ showToast: jest.fn() }));

let renderer: ReactTestRenderer;
beforeEach(() => { jest.clearAllMocks(); mockParams = {}; });
afterEach(() => { act(() => renderer?.unmount()); jest.restoreAllMocks(); });

function copy() {
  return renderer.root.findAllByType(Text).map(node => node.props.children).join(' ').replace(/\s+/g, ' ');
}
function button(label: string) {
  return renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label)[0];
}
function input(label: string) {
  return renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label)!;
}

test('login presents the Global actions and lets the user reveal their password', () => {
  act(() => { renderer = create(<GlobalLoginScreen />); });
  for (const text of ['Better than yesterday', 'Continue with Google', 'or', 'EMAIL', 'PASSWORD', 'Sign in', 'Create account', 'Forgot password?', 'Privacy Policy']) {
    expect(copy()).toContain(text);
  }
  expect(button('Sign in').props.disabled).toBe(true);
  expect(input('PASSWORD').props.secureTextEntry).toBe(true);
  expect(button('Show password')).toBeDefined();
  act(() => button('Show password').props.onPress());
  expect(input('PASSWORD').props.secureTextEntry).toBe(false);
  act(() => button('Hide password').props.onPress());
  expect(input('PASSWORD').props.secureTextEntry).toBe(true);
});

test('login validates email on blur and shows a failed sign-in inline without a floating toast', async () => {
  const error = new ApiError('backend', 'invalid', { status: 401, code: 'AUTH_INVALID_CREDENTIALS' });
  mockLogin.mockRejectedValueOnce(error);
  act(() => { renderer = create(<GlobalLoginScreen />); });
  act(() => input('EMAIL').props.onChangeText('invalid'));
  expect(copy()).not.toContain('Enter a valid email address');
  act(() => input('EMAIL').props.onBlur({}));
  expect(copy()).toContain('Enter a valid email address');
  act(() => { input('EMAIL').props.onChangeText('student@example.com'); input('PASSWORD').props.onChangeText('password8'); });
  expect(copy()).not.toContain('Enter a valid email address');
  expect(button('Sign in').props.disabled).toBe(false);
  await act(async () => { button('Sign in').props.onPress(); });
  const message = renderer.root.findAllByType(Text).find(node => node.props.children === globalAuthErrorMessage(error));
  expect(message).toBeDefined();
  expect(message?.props.accessibilityRole).toBe('alert');
  expect(mockLogin).toHaveBeenCalledWith({ email: 'student@example.com', password: 'password8' });
  expect(showToast).not.toHaveBeenCalled();
});

test('registration presents its subtitle, password guidance and account failure inline', async () => {
  mockRegister.mockRejectedValueOnce(new ApiError('backend', 'taken', { status: 409, code: 'AUTH_EMAIL_TAKEN' }));
  act(() => { renderer = create(<GlobalRegisterScreen />); });
  expect(copy()).toContain('Join your coach and start building better training days.');
  expect(copy()).toContain('8–72 characters');
  expect(button('Create account').props.disabled).toBe(true);
  expect(input('PASSWORD').props.placeholder).toBe('At least 8 characters');
  act(() => input('PASSWORD').props.onChangeText('short'));
  expect(copy()).toContain('Use 8–72 characters');
  act(() => { input('EMAIL').props.onChangeText('student@example.com'); input('PASSWORD').props.onChangeText('password8'); });
  await act(async () => { button('Create account').props.onPress(); });
  expect(copy()).toContain('An account already exists for this email');
  expect(showToast).not.toHaveBeenCalled();
});

test('recovery advances from Send code to an unlabelled six-digit code field and shows reset errors inline', async () => {
  mockRequestReset.mockResolvedValueOnce();
  mockResetPassword.mockRejectedValueOnce(new ApiError('backend', 'code', { status: 401, code: 'AUTH_INVALID_RESET_CODE' }));
  act(() => { renderer = create(<GlobalForgotPasswordScreen />); });
  expect(copy()).toContain('Enter the email address linked to your account.');
  expect(button('Send code').props.disabled).toBe(true);
  act(() => input('EMAIL').props.onChangeText('student@example.com'));
  await act(async () => { button('Send code').props.onPress(); });
  expect(copy()).toContain("If an account exists, we've sent a code.");
  expect(copy()).not.toContain('6-digit code');
  expect(input('6-digit code').props.placeholder).toBe('6-digit code');
  expect(input('6-digit code').props.keyboardType).toBe('number-pad');
  expect(button('Reset password').props.disabled).toBe(true);
  act(() => {
    input('6-digit code').props.onChangeText('1a23４45678');
    input('NEW PASSWORD').props.onChangeText('password8');
  });
  expect(input('6-digit code').props.value).toBe('123456');
  expect(button('Reset password').props.disabled).toBe(false);
  await act(async () => { button('Reset password').props.onPress(); });
  expect(copy()).toContain('That code is invalid or has expired');
  expect(mockResetPassword).toHaveBeenCalledWith({ email: 'student@example.com', code: '123456', newPassword: 'password8' });
  expect(showToast).not.toHaveBeenCalled();
});

test('a successful reset returns to login with a success notice that is consumed once', async () => {
  mockRequestReset.mockResolvedValueOnce();
  mockResetPassword.mockResolvedValueOnce();
  act(() => { renderer = create(<GlobalForgotPasswordScreen />); });
  act(() => input('EMAIL').props.onChangeText('student@example.com'));
  await act(async () => { button('Send code').props.onPress(); });
  act(() => { input('6-digit code').props.onChangeText('123456'); input('NEW PASSWORD').props.onChangeText('password8'); });
  await act(async () => { button('Reset password').props.onPress(); });
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/login', params: { passwordReset: '1' } });
  mockParams = { passwordReset: '1' };
  act(() => renderer.update(<GlobalLoginScreen />));
  expect(copy()).toContain('Password updated, sign in with your new password');
  expect(showToast).not.toHaveBeenCalled();
  act(() => { renderer.unmount(); renderer = create(<GlobalLoginScreen />); });
  expect(copy()).not.toContain('Password updated, sign in with your new password');
});

test('a privacy link failure replaces the prior password-reset success notice inline', async () => {
  mockParams = { passwordReset: '1' };
  const openURL = jest.spyOn(Linking, 'openURL').mockRejectedValueOnce(new Error('unavailable'));
  act(() => { renderer = create(<GlobalLoginScreen />); });
  const privacyLink = renderer.root.findAllByType(Text).find(node => node.props.children === 'Privacy Policy')!;
  await act(async () => { privacyLink.props.onPress(); });
  expect(openURL).toHaveBeenCalledWith('https://meetpr.app/privacy/en');
  expect(copy()).toContain('Sign-in is temporarily unavailable');
  expect(copy()).not.toContain('Password updated, sign in with your new password');
  expect(showToast).not.toHaveBeenCalled();
});
