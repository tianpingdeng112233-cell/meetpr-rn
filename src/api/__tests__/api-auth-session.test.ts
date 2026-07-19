import * as SecureStore from 'expo-secure-store';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { z } from 'zod';

import {
  loginRequest,
  normalizeWirePhone,
  refreshRequest,
  registerRequest,
  UserSchema,
} from '../auth';
import { ApiError, apiRequest } from '../client';
import {
  authenticatedRequest,
  getAccessToken,
  refreshAccessToken,
  resetSessionForTests,
  shouldRefreshAccessToken,
  useSessionStore,
} from '../session';

jest.mock('expo-secure-store');

const secureValues = new Map<string, string>();
const mockedGetItem = jest.mocked(SecureStore.getItemAsync);
const mockedSetItem = jest.mocked(SecureStore.setItemAsync);
const mockedDeleteItem = jest.mocked(SecureStore.deleteItemAsync);

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, reject, resolve };
}

function requestHeaders(init?: RequestInit): Record<string, string> {
  return init?.headers as Record<string, string>;
}

function requestBody(init?: RequestInit): unknown {
  return JSON.parse(init?.body as string) as unknown;
}

const coachUser = {
  id: '00000000-0000-4000-8000-000000000000',
  phone: '+8613800138000',
  role: 'coach' as const,
  created_at: '2026-07-19T12:00:00Z',
};

const studentUser = {
  id: '10000000-0000-4000-8000-000000000000',
  phone: '+8613900139000',
  role: 'coached_student' as const,
  created_at: '2026-07-19T12:00:00.123Z',
};

function jwtWithExpiration(exp: number): string {
  const encode = (value: object) =>
    globalThis
      .btoa(JSON.stringify(value))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  return `${encode({ alg: 'none' })}.${encode({ exp })}.signature`;
}

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

describe('API error classification', () => {
  test('parses a known backend error envelope', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(
      mockResponse(400, {
        error: 'VALIDATION_ERROR',
        missing_fields: ['phone'],
        issues: [{ path: ['phone'], message: 'Required' }],
      }),
    );

    await expect(apiRequest('/auth/login')).rejects.toMatchObject({
      kind: 'backend',
      status: 400,
      code: 'VALIDATION_ERROR',
      envelope: { missing_fields: ['phone'] },
    });
  });

  test('classifies an envelope-free 5xx response as server', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(mockResponse(503, '<html>down</html>'));

    await expect(apiRequest('/health')).rejects.toMatchObject({
      kind: 'server',
      status: 503,
    });
  });

  test('classifies a fetch transport failure as network', async () => {
    jest.mocked(fetch).mockRejectedValueOnce(new TypeError('offline'));

    await expect(apiRequest('/health')).rejects.toMatchObject({
      kind: 'network',
    });
  });
});

test('normalizes a phone number to the +86 wire format only when needed', () => {
  expect(normalizeWirePhone('13800138000')).toBe('+8613800138000');
  expect(normalizeWirePhone('+447700900123')).toBe('+447700900123');
});

describe('auth wire format', () => {
  test('login sends a normalized phone and JSON headers', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(
      mockResponse(200, {
        user: coachUser,
        access_token: 'access-login',
        refresh_token: 'refresh-login',
      }),
    );

    await loginRequest({ phone: '13800138000', password: 'secret' });

    const [url, init] = jest.mocked(fetch).mock.calls[0];
    expect(url).toEqual(expect.stringContaining('/auth/login'));
    expect(init?.method).toBe('POST');
    expect(requestBody(init)).toEqual({
      phone: '+8613800138000',
      password: 'secret',
    });
    expect(requestHeaders(init)).toEqual({
      accept: 'application/json',
      'content-type': 'application/json',
    });
  });

  test('register sends snake_case-compatible JSON and normalizes +86', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(
      mockResponse(200, {
        user: studentUser,
        access_token: 'access-register',
        refresh_token: 'refresh-register',
      }),
    );

    await registerRequest({
      phone: '13900139000',
      password: 'secret',
      role: 'coached_student',
    });

    const [url, init] = jest.mocked(fetch).mock.calls[0];
    expect(url).toEqual(expect.stringContaining('/auth/register'));
    expect(init?.method).toBe('POST');
    expect(requestBody(init)).toEqual({
      phone: '+8613900139000',
      password: 'secret',
      role: 'coached_student',
    });
    expect(requestHeaders(init)).toEqual({
      accept: 'application/json',
      'content-type': 'application/json',
    });
  });

  test('refresh pins the refresh_token snake_case key', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(
      mockResponse(200, {
        access_token: 'access-new',
        refresh_token: 'refresh-new',
      }),
    );

    await refreshRequest('refresh-old');

    const [url, init] = jest.mocked(fetch).mock.calls[0];
    expect(url).toEqual(expect.stringContaining('/auth/refresh'));
    expect(init?.method).toBe('POST');
    expect(requestBody(init)).toEqual({ refresh_token: 'refresh-old' });
    expect(requestHeaders(init)).toEqual({
      accept: 'application/json',
      'content-type': 'application/json',
    });
  });

  test('token-bearing JSON requests use lowercase authorization and content headers', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(mockResponse(200, { ok: true }));

    await apiRequest('/protected', {
      method: 'POST',
      body: { snake_case: true },
      accessToken: 'access-token',
    });

    const [, init] = jest.mocked(fetch).mock.calls[0];
    expect(requestBody(init)).toEqual({ snake_case: true });
    expect(requestHeaders(init)).toEqual({
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: 'Bearer access-token',
    });
    expect(Object.keys(requestHeaders(init))).not.toEqual(
      expect.arrayContaining(['Accept', 'Content-Type', 'Authorization']),
    );
  });
});

test.each([
  '2026-07-19T12:00:00.123Z',
  '2026-07-19T12:00:00Z',
  '2026-07-19',
])('UserSchema accepts the ISO8601 created_at variant %s', (createdAt) => {
  expect(
    UserSchema.safeParse({ ...coachUser, created_at: createdAt }).success,
  ).toBe(true);
});

test('refreshes JWT access tokens at the 60-second expiry boundary', () => {
  const nowMs = Date.UTC(2026, 6, 19, 12, 0, 0);
  const nowSeconds = Math.floor(nowMs / 1000);

  expect(shouldRefreshAccessToken(jwtWithExpiration(nowSeconds + 60), nowMs)).toBe(true);
  expect(shouldRefreshAccessToken(jwtWithExpiration(nowSeconds + 61), nowMs)).toBe(false);
  expect(shouldRefreshAccessToken(jwtWithExpiration(nowSeconds - 1), nowMs)).toBe(true);
});

test('getAccessToken pre-refreshes a JWT expiring within 60 seconds', async () => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  secureValues.set('accessToken', jwtWithExpiration(nowSeconds + 60));
  secureValues.set('refreshToken', 'refresh-old');
  jest.mocked(fetch).mockResolvedValueOnce(
    mockResponse(200, {
      access_token: 'access-refreshed',
      refresh_token: 'refresh-refreshed',
    }),
  );

  await expect(getAccessToken()).resolves.toBe('access-refreshed');
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(jest.mocked(fetch).mock.calls[0][0]).toEqual(
    expect.stringContaining('/auth/refresh'),
  );
  expect(secureValues.get('refreshToken')).toBe('refresh-refreshed');
});

test('getAccessToken returns a far-future JWT without refreshing', async () => {
  const accessToken = jwtWithExpiration(Math.floor(Date.now() / 1000) + 3600);
  secureValues.set('accessToken', accessToken);
  secureValues.set('refreshToken', 'refresh-old');

  await expect(getAccessToken()).resolves.toBe(accessToken);
  expect(fetch).not.toHaveBeenCalled();
  expect(secureValues.get('refreshToken')).toBe('refresh-old');
});

test('deduplicates concurrent refresh calls into one request', async () => {
  secureValues.set('refreshToken', 'refresh-old');
  jest.mocked(fetch).mockResolvedValueOnce(
    mockResponse(200, {
      access_token: 'access-new',
      refresh_token: 'refresh-new',
    }),
  );

  const [first, second] = await Promise.all([
    refreshAccessToken(),
    refreshAccessToken(),
  ]);

  expect(first).toBe('access-new');
  expect(second).toBe('access-new');
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(secureValues.get('refreshToken')).toBe('refresh-new');
});

test('recovers one 401, retries once, and persists rotated tokens', async () => {
  secureValues.set('accessToken', 'access-old');
  secureValues.set('refreshToken', 'refresh-old');
  jest
    .mocked(fetch)
    .mockResolvedValueOnce(
      mockResponse(401, { error: 'AUTH_INVALID_CREDENTIALS' }),
    )
    .mockResolvedValueOnce(
      mockResponse(200, {
        access_token: 'access-new',
        refresh_token: 'refresh-new',
      }),
    )
    .mockResolvedValueOnce(mockResponse(200, { value: 'ok' }));

  const result = await authenticatedRequest('/protected', {
    schema: z.object({ value: z.string() }),
  });

  expect(result).toEqual({ value: 'ok' });
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(fetch).toHaveBeenNthCalledWith(
    1,
    expect.stringContaining('/protected'),
    expect.objectContaining({
      headers: expect.objectContaining({ authorization: 'Bearer access-old' }),
    }),
  );
  expect(fetch).toHaveBeenNthCalledWith(
    3,
    expect.stringContaining('/protected'),
    expect.objectContaining({
      headers: expect.objectContaining({ authorization: 'Bearer access-new' }),
    }),
  );
  expect(secureValues.get('accessToken')).toBe('access-new');
  expect(secureValues.get('refreshToken')).toBe('refresh-new');
});

test('concurrent 401 recovery reuses a token already rotated by the other request', async () => {
  secureValues.set('accessToken', 'access-old');
  secureValues.set('refreshToken', 'refresh-old');
  const secondOldTokenResponse = deferred<Response>();
  let oldTokenRequestCount = 0;
  let newTokenRequestCount = 0;

  jest.mocked(fetch).mockImplementation(async (input, init) => {
    const url = String(input);
    const authorization = requestHeaders(init).authorization;

    if (url.endsWith('/auth/refresh')) {
      return mockResponse(200, {
        access_token: 'access-new',
        refresh_token: 'refresh-new',
      });
    }

    if (authorization === 'Bearer access-old') {
      oldTokenRequestCount += 1;
      return oldTokenRequestCount === 1
        ? mockResponse(401, { error: 'AUTH_INVALID_CREDENTIALS' })
        : secondOldTokenResponse.promise;
    }

    if (authorization === 'Bearer access-new') {
      newTokenRequestCount += 1;
      if (newTokenRequestCount === 1) {
        secondOldTokenResponse.resolve(
          mockResponse(401, { error: 'AUTH_INVALID_CREDENTIALS' }),
        );
      }
      return mockResponse(200, { value: `request-${newTokenRequestCount}` });
    }

    throw new Error(`Unexpected request: ${url}`);
  });

  const schema = z.object({ value: z.string() });
  const results = await Promise.all([
    authenticatedRequest('/protected', { schema }),
    authenticatedRequest('/protected', { schema }),
  ]);

  expect(results).toEqual([
    { value: 'request-1' },
    { value: 'request-2' },
  ]);
  expect(
    jest
      .mocked(fetch)
      .mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh')),
  ).toHaveLength(1);
  expect(oldTokenRequestCount).toBe(2);
  expect(newTokenRequestCount).toBe(2);
  expect(secureValues.get('accessToken')).toBe('access-new');
  expect(secureValues.get('refreshToken')).toBe('refresh-new');
});

test('logs out and clears credentials when the retried request is still 401', async () => {
  secureValues.set('accessToken', 'access-old');
  secureValues.set('refreshToken', 'refresh-old');
  secureValues.set('cachedUser', JSON.stringify(coachUser));
  useSessionStore.setState({ status: 'authenticated', user: coachUser });
  jest
    .mocked(fetch)
    .mockResolvedValueOnce(
      mockResponse(401, { error: 'AUTH_INVALID_CREDENTIALS' }),
    )
    .mockResolvedValueOnce(
      mockResponse(200, {
        access_token: 'access-new',
        refresh_token: 'refresh-new',
      }),
    )
    .mockResolvedValueOnce(
      mockResponse(401, { error: 'AUTH_INVALID_CREDENTIALS' }),
    );

  await expect(authenticatedRequest('/protected')).rejects.toMatchObject({
    kind: 'backend',
    status: 401,
  });

  expect(fetch).toHaveBeenCalledTimes(3);
  expect(useSessionStore.getState()).toMatchObject({
    status: 'anonymous',
    user: null,
  });
  expect(secureValues.size).toBe(0);
});

test.each([400, 401])(
  'logs out and clears credentials when refresh receives backend %i',
  async (status) => {
    secureValues.set('accessToken', 'not-a-jwt');
    secureValues.set('refreshToken', 'refresh-invalid');
    secureValues.set('cachedUser', JSON.stringify(coachUser));
    useSessionStore.setState({ status: 'authenticated', user: coachUser });
    jest.mocked(fetch).mockResolvedValueOnce(
      mockResponse(status, { error: 'AUTH_INVALID_REFRESH' }),
    );

    secureValues.delete('accessToken');
    await expect(getAccessToken()).rejects.toMatchObject({
      kind: 'backend',
      status,
    });

    expect(useSessionStore.getState()).toMatchObject({
      status: 'anonymous',
      user: null,
    });
    expect(secureValues.size).toBe(0);
  },
);

describe('session bootstrap failure policy', () => {
  beforeEach(() => {
    secureValues.set('accessToken', 'access-cached');
    secureValues.set('refreshToken', 'refresh-cached');
    secureValues.set('cachedUser', JSON.stringify(coachUser));
  });

  test('retains the cached authenticated session after a transport failure', async () => {
    jest.mocked(fetch).mockRejectedValueOnce(new TypeError('offline'));

    await useSessionStore.getState().bootstrap();

    expect(useSessionStore.getState()).toMatchObject({
      status: 'authenticated',
      user: coachUser,
    });
    expect(secureValues.get('refreshToken')).toBe('refresh-cached');
  });

  test.each([
    ['a 5xx response', mockResponse(503, '<html>down</html>')],
    [
      'a backend 429 response',
      mockResponse(429, { error: 'RATE_LIMITED' }),
    ],
    ['an envelope-free 403 network-kind response', mockResponse(403, '<html>forbidden</html>')],
  ])('retains the cached authenticated session after %s', async (_, response) => {
    jest.mocked(fetch).mockResolvedValueOnce(response);

    await useSessionStore.getState().bootstrap();

    expect(useSessionStore.getState()).toMatchObject({
      status: 'authenticated',
      user: coachUser,
    });
    expect(secureValues.get('accessToken')).toBe('access-cached');
    expect(secureValues.get('refreshToken')).toBe('refresh-cached');
    expect(secureValues.get('cachedUser')).toBe(JSON.stringify(coachUser));
  });

  test.each([400, 401])(
    'clears credentials and becomes anonymous after backend %i',
    async (status) => {
      jest.mocked(fetch).mockResolvedValueOnce(
        mockResponse(status, { error: 'AUTH_INVALID_REFRESH' }),
      );

      await useSessionStore.getState().bootstrap();

      expect(useSessionStore.getState()).toMatchObject({
        status: 'anonymous',
        user: null,
      });
      expect(secureValues.size).toBe(0);
    },
  );
});

describe('credential mutation races', () => {
  test('a refresh started immediately after logout cannot resurrect cleared credentials', async () => {
    secureValues.set('accessToken', 'access-old');
    secureValues.set('refreshToken', 'refresh-old');
    secureValues.set('cachedUser', JSON.stringify(coachUser));
    useSessionStore.setState({ status: 'authenticated', user: coachUser });
    const allowClearSession = deferred<void>();
    mockedDeleteItem.mockImplementation(async (key) => {
      await allowClearSession.promise;
      secureValues.delete(key);
    });

    const logoutPromise = useSessionStore.getState().logout();
    const refreshPromise = refreshAccessToken();
    allowClearSession.resolve();

    await logoutPromise;
    await expect(refreshPromise).rejects.toThrow('No refresh token is available');
    expect(mockedDeleteItem).toHaveBeenCalledTimes(3);
    expect(fetch).not.toHaveBeenCalled();
    expect(secureValues.size).toBe(0);
  });

  test('an old-generation refresh finishing during login cannot overwrite the new account', async () => {
    secureValues.set('accessToken', 'access-old');
    secureValues.set('refreshToken', 'refresh-old');
    secureValues.set('cachedUser', JSON.stringify(coachUser));
    useSessionStore.setState({ status: 'authenticated', user: coachUser });
    const oldRefreshResponse = deferred<Response>();
    const oldRefreshStarted = deferred<void>();

    jest.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) {
        oldRefreshStarted.resolve();
        return oldRefreshResponse.promise;
      }
      if (url.endsWith('/auth/login')) {
        return mockResponse(200, {
          user: studentUser,
          access_token: 'access-new-account',
          refresh_token: 'refresh-new-account',
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const oldRefreshPromise = refreshAccessToken();
    await oldRefreshStarted.promise;
    await useSessionStore.getState().login({
      phone: '13900139000',
      password: 'new-account-password',
    });

    oldRefreshResponse.resolve(
      mockResponse(200, {
        access_token: 'access-stale',
        refresh_token: 'refresh-stale',
      }),
    );
    await expect(oldRefreshPromise).rejects.toThrow(
      'The session changed while the request was in flight',
    );

    expect(useSessionStore.getState()).toMatchObject({
      status: 'authenticated',
      user: studentUser,
    });
    expect(secureValues.get('accessToken')).toBe('access-new-account');
    expect(secureValues.get('refreshToken')).toBe('refresh-new-account');
    expect(JSON.parse(secureValues.get('cachedUser') ?? 'null')).toEqual(studentUser);
  });
});

test('ApiError remains identifiable across callers', () => {
  expect(new ApiError('network', 'offline')).toBeInstanceOf(ApiError);
});
