import * as SecureStore from 'expo-secure-store';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import {
  authenticatedRequest,
  getAccessToken,
  resetSessionForTests,
  useSessionStore,
} from '../session';

jest.mock('expo-secure-store');

const secureValues = new Map<string, string>();
const mockedGetItem = jest.mocked(SecureStore.getItemAsync);
const mockedSetItem = jest.mocked(SecureStore.setItemAsync);
const mockedDeleteItem = jest.mocked(SecureStore.deleteItemAsync);

function jwtWithExpiration(exp: number): string {
  const encode = (value: object) =>
    globalThis
      .btoa(JSON.stringify(value))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  return `${encode({ alg: 'none' })}.${encode({ exp })}.signature`;
}

const cachedUser = {
  id: '00000000-0000-4000-8000-000000000000',
  phone: '+8613800138000',
  role: 'coach',
  created_at: '2026-07-19T12:00:00Z',
};

beforeEach(() => {
  resetSessionForTests();
  secureValues.clear();
  mockedGetItem.mockImplementation(async (key) => secureValues.get(key) ?? null);
  mockedSetItem.mockImplementation(async (key, value) => {
    secureValues.set(key, value);
  });
  mockedDeleteItem.mockImplementation(async (key) => {
    secureValues.delete(key);
  });
  globalThis.fetch = jest.fn() as unknown as typeof fetch;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('session hardening', () => {
  test('getAccessToken racing logout never surfaces the old account token', async () => {
    const staleToken = jwtWithExpiration(Math.floor(Date.now() / 1000) + 3600);
    secureValues.set('accessToken', staleToken);
    secureValues.set('refreshToken', 'refresh-old');
    useSessionStore.setState({ status: 'authenticated', user: null });

    const logoutPromise = useSessionStore.getState().logout();
    const tokenPromise = getAccessToken();

    await expect(tokenPromise).rejects.toBeDefined();
    await logoutPromise;
    expect(secureValues.size).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  test('a protected response that crosses logout never reaches the caller', async () => {
    const token = jwtWithExpiration(Math.floor(Date.now() / 1000) + 3600);
    secureValues.set('accessToken', token);
    secureValues.set('refreshToken', 'refresh-old');
    useSessionStore.setState({ status: 'authenticated', user: null });

    let releaseResponse!: (value: Response) => void;
    const pending = new Promise<Response>((resolve) => {
      releaseResponse = resolve;
    });
    const fetchMock = jest.mocked(fetch);
    fetchMock.mockImplementation(() => pending);

    const requestPromise = authenticatedRequest('/coach/students');
    while (fetchMock.mock.calls.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    await useSessionStore.getState().logout();
    releaseResponse({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ students: ['old-account-data'] }),
    } as unknown as Response);

    await expect(requestPromise).rejects.toMatchObject({ name: 'StaleSessionError' });
  });

  test('bootstrap lands on anonymous when SecureStore reads reject', async () => {
    mockedGetItem.mockRejectedValue(new Error('keystore unavailable'));

    await useSessionStore.getState().bootstrap();

    expect(useSessionStore.getState().status).toBe('anonymous');
  });

  test('login lands on anonymous and rethrows when clearing old credentials fails', async () => {
    secureValues.set('refreshToken', 'refresh-old');
    secureValues.set('cachedUser', JSON.stringify(cachedUser));
    mockedDeleteItem.mockRejectedValue(new Error('keystore unavailable'));

    await expect(
      useSessionStore.getState().login({ phone: '13800138000', password: 'pw' }),
    ).rejects.toBeDefined();
    expect(useSessionStore.getState().status).toBe('anonymous');
    expect(fetch).not.toHaveBeenCalled();
  });
});
