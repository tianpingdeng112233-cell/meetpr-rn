import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import * as i18n from '@/i18n';
import * as React from 'react';
import * as ReactNative from 'react-native';
import * as design from '@/design';
import * as feedback from '@/design/FeedbackPressable';
import * as apiClient from '@/api/client';
import * as expoRouter from 'expo-router';
import BaselineLoginRoute from '@/app/login';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AppState, Linking, StyleSheet, Text, TextInput } from 'react-native';
import { router } from 'expo-router';

import BaselineGlobalLoginScreen from '../GlobalLoginScreen';
import BaselineGlobalRegisterScreen from '../GlobalRegisterScreen';
import BaselineGlobalForgotPasswordScreen from '../GlobalForgotPasswordScreen';
import { ApiError } from '@/api/client';
import { showToast } from '@/design/Toast';
import { globalAuthErrorMessage } from '../error-copy';

const { setLocaleOverride, t } = i18n;

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
const mockSignupCode = jest.fn<(input: { email: string }) => Promise<void>>();
const mockLogin = jest.fn<() => Promise<void>>();
const mockRegister = jest.fn<() => Promise<void>>();
const mockGoogle = jest.fn<() => Promise<string | null>>();
const mockRequestReset = jest.fn<() => Promise<void>>();
const mockResetPassword = jest.fn<(value: unknown) => Promise<void>>();
jest.mock('@/api/auth', () => ({ requestSignupCode: (input: { email: string }) => mockSignupCode(input), requestPasswordReset: () => mockRequestReset(), resetPassword: (value: unknown) => mockResetPassword(value) }));
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

let LoginRoute = BaselineLoginRoute;
let GlobalLoginScreen = BaselineGlobalLoginScreen;
let GlobalRegisterScreen = BaselineGlobalRegisterScreen;
let GlobalForgotPasswordScreen = BaselineGlobalForgotPasswordScreen;
let renderer: ReactTestRenderer;
beforeEach(() => { jest.clearAllMocks(); mockParams = {}; LoginRoute = BaselineLoginRoute; GlobalLoginScreen = BaselineGlobalLoginScreen; GlobalRegisterScreen = BaselineGlobalRegisterScreen; GlobalForgotPasswordScreen = BaselineGlobalForgotPasswordScreen; setLocaleOverride('en'); });
afterEach(() => { act(() => renderer?.unmount()); jest.restoreAllMocks(); jest.useRealTimers(); setLocaleOverride(null); });

function plainText(children: React.ReactNode): string {
  return React.Children.toArray(children).map(child => React.isValidElement<{ children?: React.ReactNode }>(child) ? plainText(child.props.children) : String(child)).join('');
}
function copy() {
  return renderer.root.findAllByType(Text).map(node => plainText(node.props.children)).join(' ').replace(/\s+/g, ' ');
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

test('login places credentials and account links before the separator and Google', () => {
  act(() => { renderer = create(<GlobalLoginScreen />); });
  const labels = ['EMAIL', 'PASSWORD', 'Sign in', 'Create account', 'Forgot password?', 'or', 'Continue with Google', 'Privacy Policy'];
  const order = renderer.root.findAllByType(Text)
    .map(node => node.props.children)
    .filter(text => labels.includes(text));
  expect(order).toEqual(labels);
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

function china() {
  jest.isolateModules(() => {
    jest.doMock('@/config/build-track', () => ({ BUILD_TRACK: 'china' }));
    jest.doMock('react', () => React);
    jest.doMock('react-native', () => ReactNative);
    jest.doMock('@/design', () => design);
    jest.doMock('@/design/FeedbackPressable', () => feedback);
    jest.doMock('@/i18n', () => i18n);
    jest.doMock('@/api/client', () => apiClient);
    jest.doMock('expo-router', () => expoRouter);
    LoginRoute = jest.requireActual<typeof import('@/app/login')>('@/app/login').default;
    GlobalLoginScreen = jest.requireActual<typeof import('../GlobalLoginScreen')>('../GlobalLoginScreen').default;
    GlobalRegisterScreen = jest.requireActual<typeof import('../GlobalRegisterScreen')>('../GlobalRegisterScreen').default;
    GlobalForgotPasswordScreen = jest.requireActual<typeof import('../GlobalForgotPasswordScreen')>('../GlobalForgotPasswordScreen').default;
  });
}
function fillSignup() {
  act(() => {
    input('EMAIL').props.onChangeText('student@example.com');
    input('Verification code').props.onChangeText('123456');
    input('PASSWORD').props.onChangeText('password8');
    input('Confirm password').props.onChangeText('password8');
  });
}

test('CN login route uses email, the fixed slogan and Chinese privacy URL without Google', async () => {
  china();
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValueOnce(undefined);
  act(() => { renderer = create(<LoginRoute />); });
  expect(copy()).toContain('Meet Your Personal Record Here.');
  expect(input('EMAIL')).toBeDefined();
  expect(button('Continue with Google')).toBeUndefined();
  expect(renderer.root.findAllByType(Text).some(node => node.props.children === 'or')).toBe(false);
  await act(async () => renderer.root.findAllByType(Text).find(node => node.props.children === 'Privacy Policy')!.props.onPress());
  expect(openURL).toHaveBeenCalledWith('https://meetpr.app/privacy');
});

test('CN signup requires four valid fields and sends only email, password and six digit code', async () => {
  china(); mockRegister.mockResolvedValueOnce();
  act(() => { renderer = create(<GlobalRegisterScreen />); });
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(4);
  expect(button('Get code').props.disabled).toBe(true);
  expect(copy()).not.toContain("Passwords don't match");
  fillSignup();
  expect(input('Verification code').props).toMatchObject({ keyboardType: 'number-pad', maxLength: 6, autoComplete: 'one-time-code' });
  act(() => input('Confirm password').props.onChangeText('different'));
  expect(copy()).toContain("Passwords don't match");
  expect(button('Create account').props.disabled).toBe(true);
  act(() => input('Confirm password').props.onChangeText('password8'));
  expect(button('Create account').props.disabled).toBe(false);
  await act(async () => button('Create account').props.onPress());
  expect(mockRegister).toHaveBeenCalledWith({ email: 'student@example.com', password: 'password8', code: '123456' });
});

test('CN signup code has a 60 second cooldown, resets after email edits and cleans up on unmount', async () => {
  china(); jest.useFakeTimers(); mockSignupCode.mockResolvedValue();
  act(() => { renderer = create(<GlobalRegisterScreen />); });
  act(() => input('EMAIL').props.onChangeText('student@example.com'));
  await act(async () => button('Get code').props.onPress());
  expect(mockSignupCode).toHaveBeenCalledWith({ email: 'student@example.com' });
  expect(button('Resend in 60s').props.disabled).toBe(true);
  expect(copy()).toContain('Sent to student@example.com. Valid for 10 minutes.');
  expect(copy()).toContain("Didn't get it? Check your spam folder. If you already have an account, sign in.");
  act(() => jest.advanceTimersByTime(60000));
  expect(button('Resend').props.disabled).toBe(false);
  await act(async () => button('Resend').props.onPress());
  act(() => { input('Verification code').props.onChangeText('123456'); input('EMAIL').props.onChangeText('other@example.com'); });
  expect(input('Verification code').props.value).toBe('');
  expect(copy()).not.toContain('Sent to');
  expect(button('Get code').props.disabled).toBe(false);
  await act(async () => button('Get code').props.onPress());
  act(() => renderer.unmount());
  act(() => jest.runOnlyPendingTimers());
  expect(jest.getTimerCount()).toBe(0);
});

test('CN signup corrects cooldown using elapsed time on foreground', async () => {
  china(); jest.useFakeTimers(); mockSignupCode.mockResolvedValueOnce();
  const listener = jest.spyOn(AppState, 'addEventListener');
  act(() => { renderer = create(<GlobalRegisterScreen />); });
  act(() => input('EMAIL').props.onChangeText('student@example.com'));
  await act(async () => button('Get code').props.onPress());
  jest.setSystemTime(Date.now() + 61000);
  act(() => listener.mock.calls.at(-1)![1]('active'));
  expect(button('Resend').props.disabled).toBe(false);
});

test('CN signup rejects invalid codes inline and immediately allows resend', async () => {
  china(); mockSignupCode.mockResolvedValueOnce();
  mockRegister.mockRejectedValueOnce(new ApiError('backend', 'invalid', { status: 400, code: 'AUTH_INVALID_SIGNUP_CODE' }));
  act(() => { renderer = create(<GlobalRegisterScreen />); });
  fillSignup();
  await act(async () => button('Get code').props.onPress());
  await act(async () => button('Create account').props.onPress());
  expect(input('Verification code').props.accessibilityHint).toBe('That code is invalid or has expired');
  expect(button('Resend').props.disabled).toBe(false);
  expect(copy()).not.toContain('Sent to');
  expect(renderer.root.findAllByType(Text).find(node => node.props.children === 'That code is invalid or has expired')!.props.accessibilityRole).toBe('alert');
});

test('CN signup code request prevents duplicate sends and ignores a response for an edited email', async () => {
  china(); let resolve!: () => void;
  mockSignupCode.mockImplementationOnce(() => new Promise<void>(done => { resolve = done; }));
  act(() => { renderer = create(<GlobalRegisterScreen />); });
  act(() => input('EMAIL').props.onChangeText('student@example.com'));
  act(() => { button('Get code').props.onPress(); button('Get code').props.onPress(); });
  expect(mockSignupCode).toHaveBeenCalledTimes(1);
  expect(button('Get code').props.disabled).toBe(true);
  act(() => input('EMAIL').props.onChangeText('other@example.com'));
  await act(async () => resolve());
  expect(copy()).not.toContain('Sent to');
  expect(button('Get code').props.disabled).toBe(false);
});

test.each([new ApiError('network', 'offline'), new ApiError('backend', 'rate', { status: 429, code: 'RATE_LIMITED' })])('CN failed code request shows the existing error without a cooldown %#', async error => {
  china(); mockSignupCode.mockRejectedValueOnce(error);
  act(() => { renderer = create(<GlobalRegisterScreen />); });
  act(() => input('EMAIL').props.onChangeText('student@example.com'));
  await act(async () => button('Get code').props.onPress());
  expect(copy()).toContain(globalAuthErrorMessage(error)!);
  expect(button('Get code').props.disabled).toBe(false);
  expect(copy()).not.toContain('Sent to');
});

test('CN existing account failure provides a sign-in link', async () => {
  china(); mockRegister.mockRejectedValueOnce(new ApiError('backend', 'taken', { status: 409, code: 'AUTH_EMAIL_TAKEN' }));
  act(() => { renderer = create(<GlobalRegisterScreen />); });
  fillSignup();
  await act(async () => button('Create account').props.onPress());
  const link = renderer.root.findAll(node => node.props.accessibilityRole === 'link' && node.props.accessibilityLabel === 'Sign in')[0];
  expect(link).toBeDefined();
  act(() => link.props.onPress());
  expect(router.replace).toHaveBeenCalledWith('/login');
});

test('CN Chinese screens use localized copy and light system typography while keeping the slogan', async () => {
  china(); setLocaleOverride('zh');
  act(() => { renderer = create(<GlobalLoginScreen />); });
  expect(copy()).toContain('Meet Your Personal Record Here.');
  expect(input(t('auth.email'))).toBeDefined();
  expect(button(t('auth.signIn'))).toBeDefined();
  act(() => renderer.update(<GlobalRegisterScreen />));
  const heading = renderer.root.findAllByType(Text).find(node => node.props.children === t('auth.registerTitle'))!;
  expect(StyleSheet.flatten(heading.props.style)).toMatchObject({ fontFamily: undefined, fontWeight: '500', fontSize: 30, lineHeight: 40, letterSpacing: 1 });
  const label = renderer.root.findAllByType(Text).find(node => node.props.children === t('auth.email'))!;
  expect(StyleSheet.flatten(label.props.style)).toMatchObject({ fontFamily: undefined, fontWeight: '400', fontSize: 12, letterSpacing: 0.5 });
  expect(input(t('auth.signupCode')).props.placeholder).toBe(t('auth.codePlaceholder'));
  act(() => renderer.update(<GlobalForgotPasswordScreen />));
  expect(copy()).toContain(t('auth.forgotTitle'));
  act(() => input(t('auth.email')).props.onChangeText('student@example.com'));
  mockRequestReset.mockResolvedValueOnce();
  await act(async () => button(t('auth.sendCode')).props.onPress());
  expect(copy()).toContain(t('auth.resetTitle'));
  expect(copy()).toContain(t('auth.resetSent'));
});

test('Global registration stays at two inputs in both languages', () => {
  for (const locale of ['en', 'zh'] as const) {
    setLocaleOverride(locale);
    act(() => { renderer = create(<GlobalRegisterScreen />); });
    expect(renderer.root.findAllByType(TextInput)).toHaveLength(2);
    expect(button(t('auth.getCode'))).toBeUndefined();
    act(() => renderer.unmount());
  }
});

test('CN signup help visually identifies the sign-in link after code delivery', async () => {
  china(); mockSignupCode.mockResolvedValueOnce();
  act(() => { renderer = create(<GlobalRegisterScreen />); });
  act(() => input('EMAIL').props.onChangeText('student@example.com'));
  await act(async () => button('Get code').props.onPress());
  const link = renderer.root.findAllByType(Text).find(node => node.props.children === 'sign in')!;
  expect(link).toBeDefined();
  expect(StyleSheet.flatten(link.props.style)).toMatchObject({ textDecorationLine: 'underline' });
  const action = renderer.root.findAll(node => node.props.accessibilityRole === 'link' && node.props.accessibilityLabel === t('auth.signupHelp'))[0];
  act(() => action.props.onPress());
  expect(router.replace).toHaveBeenCalledWith('/login');
});

test('CN confirmation waits until blur or both passwords are present and validates each signup field', () => {
  china();
  act(() => { renderer = create(<GlobalRegisterScreen />); });
  act(() => input('PASSWORD').props.onChangeText('password8'));
  expect(copy()).not.toContain("Passwords don't match");
  act(() => input('Confirm password').props.onBlur({}));
  expect(copy()).toContain("Passwords don't match");
  fillSignup();
  for (const [label, value] of [['EMAIL', 'invalid'], ['Verification code', '12345'], ['PASSWORD', 'short']]) {
    act(() => input(label).props.onChangeText(value));
    expect(button('Create account').props.disabled).toBe(true);
    fillSignup();
  }
  act(() => input('Verification code').props.onChangeText('1a234567'));
  expect(input('Verification code').props.value).toBe('123456');
  expect(button('Create account').props.disabled).toBe(false);
});

test('CN Chinese login and recovery submit email and preserve the existing reset success flow', async () => {
  china(); setLocaleOverride('zh'); mockLogin.mockResolvedValueOnce();
  act(() => { renderer = create(<GlobalLoginScreen />); });
  act(() => { input(t('auth.email')).props.onChangeText('student@example.com'); input(t('auth.password')).props.onChangeText('password8'); });
  await act(async () => button(t('auth.signIn')).props.onPress());
  expect(mockLogin).toHaveBeenCalledWith({ email: 'student@example.com', password: 'password8' });
  act(() => renderer.update(<GlobalForgotPasswordScreen />));
  act(() => input(t('auth.email')).props.onChangeText('student@example.com'));
  mockRequestReset.mockResolvedValueOnce(); mockResetPassword.mockResolvedValueOnce();
  await act(async () => button(t('auth.sendCode')).props.onPress());
  act(() => { input(t('auth.codePlaceholder')).props.onChangeText('123456'); input(t('auth.newPassword')).props.onChangeText('password8'); });
  await act(async () => button(t('auth.resetButton')).props.onPress());
  expect(mockResetPassword).toHaveBeenCalledWith({ email: 'student@example.com', code: '123456', newPassword: 'password8' });
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/login', params: { passwordReset: '1' } });
});

test('Global Chinese registration uses Chinese title and field label typography', () => {
  setLocaleOverride('zh');
  act(() => { renderer = create(<GlobalRegisterScreen />); });
  const heading = renderer.root.findAllByType(Text).find(node => node.props.children === t('auth.registerTitle'))!;
  expect(StyleSheet.flatten(heading.props.style)).toMatchObject({ fontFamily: undefined, fontWeight: '500', fontSize: 30, lineHeight: 40, letterSpacing: 1 });
  for (const key of ['auth.email', 'auth.password'] as const) {
    const label = renderer.root.findAllByType(Text).find(node => node.props.children === t(key))!;
    expect(StyleSheet.flatten(label.props.style)).toMatchObject({ fontFamily: undefined, fontWeight: '400', fontSize: 12, letterSpacing: 0.5 });
  }
});

test.each(['global', 'china'])('%s English registration retains the original title and field typography', track => {
  if (track === 'china') china();
  act(() => { renderer = create(<GlobalRegisterScreen />); });
  const heading = renderer.root.findAllByType(Text).find(node => node.props.children === 'Create your\naccount')!;
  expect(StyleSheet.flatten(heading.props.style)).toMatchObject({ fontFamily: 'Archivo_800ExtraBold', fontSize: 44, lineHeight: 41.8, letterSpacing: -1.1 });
  expect(StyleSheet.flatten(heading.props.style).fontWeight).toBeUndefined();
  const label = renderer.root.findAllByType(Text).find(node => node.props.children === 'EMAIL')!;
  expect(StyleSheet.flatten(label.props.style)).toMatchObject({ fontFamily: 'IBMPlexMono_700Bold', fontSize: 9.5, letterSpacing: 1.33 });
  expect(StyleSheet.flatten(label.props.style).fontWeight).toBeUndefined();
  expect(StyleSheet.flatten(input('EMAIL').props.style)).toMatchObject({ fontFamily: 'IBMPlexSans_600SemiBold', fontSize: 16 });
  expect(StyleSheet.flatten(input('EMAIL').props.style).fontWeight).toBeUndefined();
});

test.each(['global', 'china'])('%s Chinese login keeps the English slogan typography', track => {
  if (track === 'china') china();
  setLocaleOverride('zh');
  act(() => { renderer = create(<GlobalLoginScreen />); });
  const slogan = t(track === 'china' ? 'auth.chinaSlogan' : 'auth.globalSlogan');
  const heading = renderer.root.findAllByType(Text).find(node => node.props.children === slogan)!;
  expect(StyleSheet.flatten(heading.props.style)).toMatchObject({ fontFamily: 'Archivo_800ExtraBold', fontSize: 44, lineHeight: 41.8, letterSpacing: -1.1 });
  expect(StyleSheet.flatten(heading.props.style).fontWeight).toBeUndefined();
});

test.each(['global', 'china'])('%s Chinese recovery labels the code and uses the loaded regular monospace font', async track => {
  if (track === 'china') china();
  setLocaleOverride('zh'); mockRequestReset.mockResolvedValueOnce();
  act(() => { renderer = create(<GlobalForgotPasswordScreen />); });
  act(() => input(t('auth.email')).props.onChangeText('student@example.com'));
  await act(async () => button(t('auth.sendCode')).props.onPress());
  expect(renderer.root.findAllByType(Text).find(node => node.props.children === t('auth.signupCode'))).toBeDefined();
  expect(StyleSheet.flatten(input(t('auth.codePlaceholder')).props.style)).toMatchObject({ fontFamily: 'IBMPlexMono_400Regular', fontWeight: '400', fontSize: 17, letterSpacing: 2 });
});

test('CN Chinese signup uses the loaded regular monospace font for verification digits', () => {
  china(); setLocaleOverride('zh');
  act(() => { renderer = create(<GlobalRegisterScreen />); });
  expect(StyleSheet.flatten(input(t('auth.signupCode')).props.style)).toMatchObject({ fontFamily: 'IBMPlexMono_400Regular', fontWeight: '400', fontSize: 17, letterSpacing: 2 });
});

test.each(['global', 'china'])('%s registration locks email while submit is pending and unlocks after failure', async track => {
  if (track === 'china') china();
  let reject!: (reason: unknown) => void;
  mockRegister.mockImplementationOnce(() => new Promise<void>((_, fail) => { reject = fail; }));
  act(() => { renderer = create(<GlobalRegisterScreen />); });
  if (track === 'china') fillSignup();
  else act(() => { input('EMAIL').props.onChangeText('student@example.com'); input('PASSWORD').props.onChangeText('password8'); });
  expect(input('EMAIL').props.editable).toBe(true);
  act(() => button('Create account').props.onPress());
  try {
    expect(input('EMAIL').props.editable).toBe(false);
    expect(input('PASSWORD').props.editable).toBe(false);
  } finally {
    await act(async () => reject(new ApiError('network', 'offline')));
  }
  expect(input('EMAIL').props.editable).toBe(true);
});
