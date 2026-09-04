import { create } from 'zustand';

import { BUILD_TRACK } from '@/config/build-track';
import {
  emailLogin,
  emailRegister,
  googleSignIn,
  type EmailCredentials,
  type GoogleSignIn,
  loginRequest,
  refreshRequest,
  registerRequest,
  type AuthResponse,
  type LoginRequest,
  type RegisterRequest,
  type User,
} from './auth';
import {
  ApiError,
  apiRequest,
  isUnauthorizedError,
  type ApiRequestOptions,
} from './client';
import * as tokenStore from './token-store';
import { deviceTimezone, timezoneStore } from './timezone-store';

export type SessionStatus = 'anonymous' | 'authenticating' | 'authenticated';

type SessionStore = {
  status: SessionStatus;
  user: User | null;
  authenticationError: unknown | null;
  /** False until the cold-start bootstrap has settled — routing must show the
   * loading screen (not the login screen) before then. */
  bootstrapped: boolean;
  bootstrap: () => Promise<void>;
  login: (input: LoginRequest) => Promise<User>;
  register: (input: RegisterRequest) => Promise<User>;
  loginWithEmail: (input: EmailCredentials) => Promise<User>;
  registerWithEmail: (input: EmailCredentials) => Promise<User>;
  loginWithGoogle: (input: Omit<GoogleSignIn, 'timezone'>) => Promise<User>;
  reportTimezone: () => Promise<void>;
  logout: () => Promise<void>;
};

class MissingCredentialsError extends Error {
  constructor() {
    super('No refresh token is available');
    this.name = 'MissingCredentialsError';
  }
}

class StaleSessionError extends Error {
  constructor() {
    super('The session changed while the request was in flight');
    this.name = 'StaleSessionError';
  }
}

type RefreshFlight = {
  generation: number;
  controller: AbortController;
  promise: Promise<string>;
};

let generation = 0;
let refreshFlight: RefreshFlight | null = null;
let credentialMutationQueue: Promise<void> = Promise.resolve();

function queueCredentialMutation(operation: () => Promise<void>): Promise<void> {
  const queued = credentialMutationQueue.then(operation, operation);
  credentialMutationQueue = queued.catch(() => undefined);
  return queued;
}

function cancelRefresh(): void {
  const flight = refreshFlight;
  refreshFlight = null;
  if (flight) {
    flight.controller.abort();
    void flight.promise.catch(() => undefined);
  }
}

async function performRefresh(
  capturedGeneration: number,
  controller: AbortController,
): Promise<string> {
  // Read through the mutation queue so a pending clearSession (logout) or
  // clear-before-login always lands first; otherwise a refresh started right
  // after the generation bump can resurrect just-cleared credentials.
  let storedRefreshToken: string | null = null;
  await queueCredentialMutation(async () => {
    storedRefreshToken = await tokenStore.getRefreshToken();
  });
  if (!storedRefreshToken) {
    throw new MissingCredentialsError();
  }
  if (capturedGeneration !== generation) {
    throw new StaleSessionError();
  }

  const response = await refreshRequest(storedRefreshToken, controller.signal);
  if (capturedGeneration !== generation) {
    throw new StaleSessionError();
  }

  await queueCredentialMutation(async () => {
    if (capturedGeneration === generation) {
      await tokenStore.setTokens(response.access_token, response.refresh_token);
    }
  });

  if (capturedGeneration !== generation) {
    throw new StaleSessionError();
  }
  return response.access_token;
}

export function refreshAccessToken(): Promise<string> {
  const capturedGeneration = generation;
  if (refreshFlight?.generation === capturedGeneration) {
    return refreshFlight.promise;
  }

  const controller = new AbortController();
  const flight: RefreshFlight = {
    generation: capturedGeneration,
    controller,
    promise: Promise.resolve(''),
  };

  flight.promise = performRefresh(capturedGeneration, controller).finally(() => {
    if (refreshFlight === flight) {
      refreshFlight = null;
    }
  });
  refreshFlight = flight;
  return flight.promise;
}

function decodeJwtExpiration(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = JSON.parse(globalThis.atob(padded)) as { exp?: unknown };
    return typeof decoded.exp === 'number' && Number.isFinite(decoded.exp)
      ? decoded.exp
      : null;
  } catch {
    return null;
  }
}

export function shouldRefreshAccessToken(token: string, nowMs = Date.now()): boolean {
  const expiration = decodeJwtExpiration(token);
  return expiration !== null && expiration - Math.floor(nowMs / 1000) <= 60;
}

export async function getAccessToken(): Promise<string> {
  const capturedGeneration = generation;
  // Serialized behind pending credential mutations so a token read racing a
  // logout/login clear can never surface the previous account's token.
  let storedToken: string | null = null;
  await queueCredentialMutation(async () => {
    storedToken = await tokenStore.getAccessToken();
  });
  if (capturedGeneration !== generation) {
    throw new StaleSessionError();
  }

  if (storedToken && !shouldRefreshAccessToken(storedToken)) {
    return storedToken;
  }

  try {
    return await refreshAccessToken();
  } catch (error) {
    if (
      capturedGeneration === generation &&
      (isInvalidCredentialError(error) || error instanceof MissingCredentialsError)
    ) {
      await useSessionStore.getState().logout();
    }
    throw error;
  }
}

// Mirrors iOS shouldKeepCachedSession: transient transport/server trouble and
// rate limiting keep the cached session; every other backend verdict clears it.
function shouldRetainCachedSession(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.kind === 'network' ||
      error.kind === 'server' ||
      error.status === 429 ||
      error.code === 'RATE_LIMITED')
  );
}

function isInvalidCredentialError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.kind === 'backend' &&
    (error.status === 400 || error.status === 401)
  );
}

async function persistAuthenticatedResponse(
  response: AuthResponse,
  capturedGeneration: number,
): Promise<User> {
  await queueCredentialMutation(async () => {
    if (capturedGeneration === generation) {
      await tokenStore.setSession(
        response.access_token,
        response.refresh_token,
        response.user,
      );
    }
  });

  if (capturedGeneration !== generation) {
    throw new StaleSessionError();
  }
  return response.user;
}

async function authenticate(
  operation: () => Promise<AuthResponse>,
): Promise<User> {
  cancelRefresh();
  const capturedGeneration = ++generation;
  useSessionStore.setState({
    status: 'authenticating',
    user: null,
    authenticationError: null,
  });
  try {
    // Drop any previous account's credentials before the login round-trip so a
    // same-generation refresh cannot rotate the old account's tokens underneath
    // the new login and cross-wire the stored session.
    await queueCredentialMutation(async () => {
      if (capturedGeneration === generation) {
        await tokenStore.clearSession();
      }
    });
    const response = await operation();
    const user = await persistAuthenticatedResponse(response, capturedGeneration);
    if (capturedGeneration === generation) {
      useSessionStore.setState({
        status: 'authenticated',
        user,
        authenticationError: null,
      });
    }
    return user;
  } catch (error) {
    if (capturedGeneration === generation) {
      useSessionStore.setState({
        status: 'anonymous',
        user: null,
        authenticationError: error,
      });
    }
    throw error;
  }
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  status: 'anonymous',
  user: null,
  authenticationError: null,
  bootstrapped: false,

  bootstrap: async () => {
    if (get().status !== 'anonymous' || get().bootstrapped) {
      return;
    }
    try {
      await runBootstrap(set);
    } finally {
      set({ bootstrapped: true });
      if (BUILD_TRACK === 'global') void get().reportTimezone();
    }
  },

  login: (input) => authenticate(() => loginRequest(input)),
  register: (input) => authenticate(() => registerRequest(input)),

  loginWithEmail: async (input) => {
    const user = await authenticate(() => emailLogin(input));
    await get().reportTimezone();
    return user;
  },
  registerWithEmail: (input) => authenticateWithTimezone((timezone) => emailRegister({ ...input, timezone })),
  loginWithGoogle: (input) => authenticateWithTimezone((timezone) => googleSignIn({ ...input, timezone })),
  reportTimezone: () => reportSessionTimezone(),

  logout: async () => {
    ++generation;
    cancelRefresh();
    set({ status: 'anonymous', user: null, authenticationError: null });
    await queueCredentialMutation(tokenStore.clearSession);
  },
}));

async function runBootstrap(
  set: (partial: Partial<SessionStore>) => void,
): Promise<void> {
  {
    const capturedGeneration = generation;
    set({ status: 'authenticating', user: null, authenticationError: null });
    let storedRefreshToken: string | null = null;
    let cachedUser: User | null = null;
    try {
      [storedRefreshToken, cachedUser] = await Promise.all([
        tokenStore.getRefreshToken(),
        tokenStore.getCachedUser(),
      ]);
    } catch {
      // A broken SecureStore must not strand the app on the loading screen —
      // fail open to the login screen.
      if (capturedGeneration === generation) {
        set({ status: 'anonymous', user: null });
      }
      return;
    }

    if (capturedGeneration !== generation) {
      return;
    }

    if (!storedRefreshToken || !cachedUser) {
      await queueCredentialMutation(tokenStore.clearSession).catch(() => undefined);
      if (capturedGeneration === generation) {
        set({ status: 'anonymous', user: null });
      }
      return;
    }

    try {
      await refreshAccessToken();
      if (capturedGeneration === generation) {
        set({ status: 'authenticated', user: cachedUser });
      }
    } catch (error) {
      if (capturedGeneration !== generation) {
        return;
      }

      if (shouldRetainCachedSession(error)) {
        set({ status: 'authenticated', user: cachedUser });
        return;
      }
      // Non-transient failure (backend verdict or missing credentials): the
      // stored session is dead — clear it, fail closed. A failing clear must
      // still land us on the login screen, never a stuck spinner.
      await queueCredentialMutation(async () => {
        if (capturedGeneration === generation) {
          await tokenStore.clearSession();
        }
      }).catch(() => undefined);
      if (capturedGeneration === generation) {
        set({ status: 'anonymous', user: null });
      }
    }
  }
}

export async function authenticatedRequest<T = unknown>(
  path: string,
  options: Omit<ApiRequestOptions<T>, 'accessToken'> = {},
): Promise<T> {
  const requestGeneration = generation;
  const rejectedToken = await getAccessToken();
  if (requestGeneration !== generation) {
    throw new StaleSessionError();
  }

  try {
    const result = await apiRequest(path, { ...options, accessToken: rejectedToken });
    // A response that crosses a logout/login boundary belongs to the previous
    // account and must never reach the caller (or the query cache).
    if (requestGeneration !== generation) {
      throw new StaleSessionError();
    }
    return result;
  } catch (error) {
    if (!isUnauthorizedError(error)) {
      throw error;
    }
  }

  if (requestGeneration !== generation) {
    throw new StaleSessionError();
  }

  let retryToken: string;
  try {
    const storedToken = await tokenStore.getAccessToken();
    retryToken =
      storedToken && storedToken !== rejectedToken
        ? storedToken
        : await refreshAccessToken();
  } catch (error) {
    if (requestGeneration === generation && isInvalidCredentialError(error)) {
      await useSessionStore.getState().logout();
    }
    throw error;
  }

  if (requestGeneration !== generation) {
    throw new StaleSessionError();
  }

  try {
    const result = await apiRequest(path, { ...options, accessToken: retryToken });
    if (requestGeneration !== generation) {
      throw new StaleSessionError();
    }
    return result;
  } catch (error) {
    if (requestGeneration === generation && isUnauthorizedError(error)) {
      await useSessionStore.getState().logout();
    }
    throw error;
  }
}

export function resetSessionForTests(): void {
  cancelRefresh();
  generation = 0;
  timezoneFlight = null;
  credentialMutationQueue = Promise.resolve();
  useSessionStore.setState({
    status: 'anonymous',
    user: null,
    authenticationError: null,
    bootstrapped: false,
  });
}

async function authenticateWithTimezone(operation: (timezone: string) => Promise<AuthResponse>): Promise<User> {
  const timezone = deviceTimezone();
  return authenticate(async () => {
    const response = await operation(timezone);
    // The successful request already reported this value. Persistence failure
    // must not turn successful authentication into a sign-in error.
    await timezoneStore.setLastReported(response.user.id, timezone).catch(() => undefined);
    return response;
  });
}

export async function patchTimezone(timezone: string): Promise<void> {
  await authenticatedRequest('/me/timezone', { method: 'PATCH', body: { timezone } });
}

let timezoneFlight: { generation: number; promise: Promise<void> } | null = null;
function reportSessionTimezone(): Promise<void> {
  const session = useSessionStore.getState();
  if (BUILD_TRACK !== 'global' || session.status !== 'authenticated' || !session.user) return Promise.resolve();
  const capturedGeneration = generation;
  if (timezoneFlight?.generation === capturedGeneration) return timezoneFlight.promise;
  const userId = session.user.id;
  const promise = (async () => {
    try {
      const timezone = deviceTimezone();
      const lastReported = await timezoneStore.getLastReported(userId);
      if (capturedGeneration !== generation || timezone === lastReported) return;
      await patchTimezone(timezone);
      if (capturedGeneration === generation) await timezoneStore.setLastReported(userId, timezone);
    } catch {
      // Best effort: retry on the next foreground transition.
    }
  })();
  const flight = { generation: capturedGeneration, promise };
  timezoneFlight = flight;
  void promise.finally(() => { if (timezoneFlight === flight) timezoneFlight = null; });
  return promise;
}
