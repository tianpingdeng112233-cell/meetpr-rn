import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AppState, type AppStateStatus } from 'react-native';

import { getAccessToken } from '@/api/token-store';

import {
  ANALYTICS_DEFERRED_EVENT_IDS_KEY,
  ANALYTICS_OVERSIZE_STRIKES_KEY,
  ANALYTICS_PRIVACY_NOTICE_KEY,
  ANALYTICS_QUEUE_KEY,
  ANALYTICS_FLUSH_INTERVAL_MS,
  ANALYTICS_MAX_REQUEST_BYTES,
  ANALYTICS_RETRY_DELAYS_MS,
  ANALYTICS_SESSION_TIMEOUT_MS,
  AnalyticsEvent,
  type AnalyticsEventEnvelope,
  AnalyticsQueue,
  AnalyticsScreen,
  configure,
  confirmPrivacyNotice,
  createBatchEnvelope,
  EventFlusher,
  fnv1a64,
  getOrCreateAnonId,
  isSampledIn,
  resetAnalyticsForTests,
  samplingBucket,
  track,
} from '..';

jest.mock('@react-native-async-storage/async-storage', () => {
  // Jest hoists this factory before the imported `jest` binding is initialized.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-async-storage/async-storage/jest/async-storage-mock');
});
jest.mock('@react-native-community/netinfo', () => {
  // Jest hoists this factory before the imported `jest` binding is initialized.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-community/netinfo/jest/netinfo-mock');
});
jest.mock('@/api/token-store', () => ({
  getAccessToken: jest.fn(),
}));

const mockedStorage = jest.mocked(AsyncStorage);
const mockedNetInfo = jest.mocked(NetInfo);
const mockedGetAccessToken = jest.mocked(getAccessToken);
const storedValues = new Map<string, string>();

function event(
  sequence: number,
  overrides: Partial<AnalyticsEventEnvelope> = {},
): AnalyticsEventEnvelope {
  return {
    event_id: `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
    session_id: '10000000-0000-4000-8000-000000000000',
    seq: sequence,
    name: AnalyticsEvent.AppOpen,
    props: { cold: true },
    schema_version: 1,
    ts_client: '2026-07-19T12:00:00.000Z',
    ...overrides,
  };
}

function response(status: number, body: unknown = {}): Response {
  return {
    status,
    json: async () => body,
  } as Response;
}

type FlusherOverrides = Partial<ConstructorParameters<typeof EventFlusher>[0]>;

function makeFlusher(
  queue: AnalyticsQueue,
  fetchImplementation: typeof fetch,
  overrides: FlusherOverrides = {},
): EventFlusher {
  return new EventFlusher({
    queue,
    baseUrl: 'https://example.com',
    anonId: '20000000-0000-4000-8000-000000000000',
    appVersion: '1.0.0',
    build: '10',
    privacyGateOpen: true,
    fetch: fetchImplementation,
    makeClientError: (code) =>
      event(999, {
        name: AnalyticsEvent.ClientError,
        props: { domain: 'network', code, screen: AnalyticsScreen.Dashboard },
      }),
    ...overrides,
  });
}

async function resolveConfig(flusher: EventFlusher): Promise<void> {
  await flusher.fetchConfig();
}

beforeEach(async () => {
  storedValues.clear();
  mockedStorage.getItem.mockImplementation(async (key) => storedValues.get(key) ?? null);
  mockedStorage.setItem.mockImplementation(async (key, value) => {
    storedValues.set(key, value);
  });
  mockedStorage.removeItem.mockImplementation(async (key) => {
    storedValues.delete(key);
  });
  mockedGetAccessToken.mockResolvedValue(null);
});

afterEach(() => {
  resetAnalyticsForTests();
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

test('batch envelope has the exact wire shape and an explicit android platform', () => {
  expect(
    createBatchEnvelope(
      {
        anon_id: 'anon-id',
        app_version: '1.2.3',
        build: '42',
      },
      [event(0)],
    ),
  ).toEqual({
    anon_id: 'anon-id',
    app_version: '1.2.3',
    build: '42',
    platform: 'android',
    events: [event(0)],
  });
});

test('413 recursively bisects a multi-event batch until acknowledged', async () => {
  const queue = new AnalyticsQueue();
  await Promise.all([0, 1, 2, 3].map((sequence) => queue.enqueue(event(sequence))));
  const postedBatchSizes: number[] = [];
  const fetchImplementation = jest.fn<typeof fetch>(async (input, init) => {
    if (String(input).endsWith('/events/config')) {
      return response(200, { enabled: true, sample_rate: 1 });
    }
    const events = (JSON.parse(String(init?.body)) as { events: unknown[] }).events;
    postedBatchSizes.push(events.length);
    return response(events.length > 1 ? 413 : 204);
  });
  const flusher = makeFlusher(queue, fetchImplementation);
  await resolveConfig(flusher);

  await flusher.flush();

  expect(postedBatchSizes).toEqual([4, 2, 1, 1, 2, 1, 1]);
  expect(await queue.count()).toBe(0);
});

test('429 uses the exact retry backoff sequence and retains an unacknowledged event', async () => {
  jest.useFakeTimers();
  const queue = new AnalyticsQueue();
  await queue.enqueue(event(0));
  const delays: number[] = [];
  let postAttempts = 0;
  const fetchImplementation = jest.fn<typeof fetch>(async (input) => {
    if (String(input).endsWith('/events/config')) {
      return response(200, { enabled: true, sample_rate: 1 });
    }
    postAttempts += 1;
    return response(429);
  });
  const flusher = makeFlusher(queue, fetchImplementation, {
    sleep: (milliseconds) => {
      delays.push(milliseconds);
      return new Promise((resolve) => setTimeout(resolve, milliseconds));
    },
  });
  await resolveConfig(flusher);

  const flush = flusher.flush();
  await jest.runAllTimersAsync();
  await flush;

  expect(delays).toEqual(ANALYTICS_RETRY_DELAYS_MS);
  expect(postAttempts).toBe(5);
  expect(await queue.count()).toBe(1);
});

describe('FNV-1a sampling', () => {
  test('matches the standard FNV vector and the iOS UUID bucket golden value', () => {
    expect(fnv1a64('hello')).toBe(0xa430d84680aabd0bn);
    const anonId = '550e8400-e29b-41d4-a716-446655440000';

    // Cross-platform golden vector: iOS UUID.uuidString hashes the normalized
    // uppercase UTF-8 bytes and places this UUID in bucket 6392 / 10_000.
    expect(samplingBucket(anonId)).toBe(6_392);
    expect(isSampledIn(anonId, 0.6392)).toBe(false);
    expect(isSampledIn(anonId, 0.6393)).toBe(true);
    expect(isSampledIn(anonId.toUpperCase(), 0.6393)).toBe(true);
  });
});

test('a closed privacy gate never sends queued events', async () => {
  const queue = new AnalyticsQueue();
  await queue.enqueue(event(0));
  let posts = 0;
  const fetchImplementation = jest.fn<typeof fetch>(async (input) => {
    if (String(input).endsWith('/events/config')) {
      return response(200, { enabled: true, sample_rate: 1 });
    }
    posts += 1;
    return response(204);
  });
  const flusher = makeFlusher(queue, fetchImplementation, {
    privacyGateOpen: false,
  });
  await resolveConfig(flusher);

  await flusher.flush();

  expect(posts).toBe(0);
  expect(await queue.count()).toBe(1);
});

test('the AsyncStorage queue survives a new queue instance', async () => {
  const firstQueue = new AnalyticsQueue();
  await firstQueue.enqueue(event(0));
  await firstQueue.enqueue(event(1));

  const reloadedQueue = new AnalyticsQueue();

  expect(await reloadedQueue.peek()).toEqual([event(0), event(1)]);
});

test('queue storage validates each element and drops malformed JSON records', async () => {
  storedValues.set(
    ANALYTICS_QUEUE_KEY,
    JSON.stringify([event(0), null, { ...event(1), seq: -1 }, { arbitrary: true }]),
  );

  expect(await new AnalyticsQueue().peek()).toEqual([event(0)]);
});

test('corrupt auxiliary indexes degrade alone and never drop queued events', async () => {
  storedValues.set(ANALYTICS_QUEUE_KEY, JSON.stringify([event(0)]));
  storedValues.set(ANALYTICS_DEFERRED_EVENT_IDS_KEY, '{not json');
  storedValues.set(ANALYTICS_OVERSIZE_STRIKES_KEY, '[[broken');

  const queue = new AnalyticsQueue();
  expect(await queue.peek()).toEqual([event(0)]);
  expect(await queue.count()).toBe(1);
});

test('anon_id is generated once and reused for the installation', async () => {
  const uuidFactory = jest
    .fn<() => string>()
    .mockReturnValueOnce('40000000-0000-4000-8000-000000000000')
    .mockReturnValueOnce('unexpected-second-id');

  expect(await getOrCreateAnonId(mockedStorage, uuidFactory)).toBe(
    '40000000-0000-4000-8000-000000000000',
  );
  expect(await getOrCreateAnonId(mockedStorage, uuidFactory)).toBe(
    '40000000-0000-4000-8000-000000000000',
  );
  expect(uuidFactory).toHaveBeenCalledTimes(1);
});

test('a local single event over 1 MiB is replaced by client_error without a request', async () => {
  const queue = new AnalyticsQueue();
  await queue.enqueue(
    event(0, {
      props: { payload: '测'.repeat(ANALYTICS_MAX_REQUEST_BYTES) },
    }),
  );
  let posts = 0;
  const fetchImplementation = jest.fn<typeof fetch>(async (input) => {
    if (String(input).endsWith('/events/config')) {
      return response(200, { enabled: true, sample_rate: 1 });
    }
    posts += 1;
    return response(204);
  });
  const flusher = makeFlusher(queue, fetchImplementation);
  await resolveConfig(flusher);

  await flusher.flush();

  expect(posts).toBe(0);
  expect((await queue.peek()).map(({ name }) => name)).toEqual([
    AnalyticsEvent.ClientError,
  ]);
});

test('a server-side single-event 413 is persistently isolated from later flushes', async () => {
  const queue = new AnalyticsQueue();
  const blocked = event(0);
  const following = event(1);
  await queue.enqueue(blocked);
  await queue.enqueue(following);
  const postedIds: string[][] = [];
  let followingAttempts = 0;
  const fetchImplementation = jest.fn<typeof fetch>(async (input, init) => {
    if (String(input).endsWith('/events/config')) {
      return response(200, { enabled: true, sample_rate: 1 });
    }
    const events = (JSON.parse(String(init?.body)) as {
      events: AnalyticsEventEnvelope[];
    }).events;
    postedIds.push(events.map(({ event_id }) => event_id));
    if (events.length > 1 || events[0].event_id === blocked.event_id) {
      return response(413);
    }
    followingAttempts += 1;
    return response(followingAttempts === 1 ? 400 : 204);
  });
  const flusher = makeFlusher(queue, fetchImplementation);
  await resolveConfig(flusher);

  // Flush 1: bisect; blocked takes strike 1 (single request, no same-flush
  // retries) and is re-queued at the tail.
  await flusher.flush();
  expect(postedIds).toEqual([
    [blocked.event_id, following.event_id],
    [blocked.event_id],
    [following.event_id],
  ]);
  expect((await queue.peek()).map(({ event_id }) => event_id)).toEqual([
    following.event_id,
    blocked.event_id,
  ]);

  // Flush 2 (fresh queue instance = restart): strike 2 isolates blocked.
  const reloadedQueue = new AnalyticsQueue();
  const nextFlusher = makeFlusher(reloadedQueue, fetchImplementation);
  await resolveConfig(nextFlusher);
  await nextFlusher.flush();
  expect(JSON.parse(storedValues.get(ANALYTICS_DEFERRED_EVENT_IDS_KEY) ?? '[]')).toEqual([
    blocked.event_id,
  ]);

  // Flush 3: the poisoned event is never selected again; following drains.
  const countBeforeFinalFlush = postedIds.length;
  await nextFlusher.flush();
  await nextFlusher.flush();
  const finalPosts = postedIds.slice(countBeforeFinalFlush);
  expect(finalPosts.every((ids) => !ids.includes(blocked.event_id))).toBe(true);
  expect(await reloadedQueue.peek()).toEqual([]);
  expect(await reloadedQueue.count()).toBe(1);
});

test('flush truncates a batch at 50 events', async () => {
  const queue = new AnalyticsQueue();
  for (let sequence = 0; sequence < 51; sequence += 1) {
    await queue.enqueue(event(sequence));
  }
  const postedBatchSizes: number[] = [];
  const fetchImplementation = jest.fn<typeof fetch>(async (input, init) => {
    if (String(input).endsWith('/events/config')) {
      return response(200, { enabled: true, sample_rate: 1 });
    }
    postedBatchSizes.push(
      (JSON.parse(String(init?.body)) as { events: unknown[] }).events.length,
    );
    return response(204);
  });
  const flusher = makeFlusher(queue, fetchImplementation);
  await resolveConfig(flusher);

  await flusher.flush();

  expect(postedBatchSizes).toEqual([50]);
  expect(await queue.peek()).toEqual([event(50)]);
});

test('the 30-second periodic trigger flushes, while enqueue itself does not', async () => {
  jest.useFakeTimers();
  storedValues.set(ANALYTICS_PRIVACY_NOTICE_KEY, 'true');
  let posts = 0;
  const fetchImplementation = jest.fn<typeof fetch>(async (input) => {
    if (String(input).endsWith('/events/config')) {
      return response(200, { enabled: true, sample_rate: 1 });
    }
    posts += 1;
    return response(204);
  });
  await configure({ fetch: fetchImplementation });

  await track(AnalyticsEvent.AppOpen, { cold: true });
  expect(posts).toBe(0);
  await jest.advanceTimersByTimeAsync(ANALYTICS_FLUSH_INTERVAL_MS - 1);
  expect(posts).toBe(0);
  await jest.advanceTimersByTimeAsync(1);
  expect(posts).toBe(1);
});

test('an unreachable-to-reachable network edge triggers a flush', async () => {
  jest.useFakeTimers();
  storedValues.set(ANALYTICS_PRIVACY_NOTICE_KEY, 'true');
  let networkListener: ((state: NetInfoState) => void) | undefined;
  mockedNetInfo.addEventListener.mockImplementation((listener) => {
    networkListener = listener;
    return jest.fn();
  });
  let markPostStarted: (() => void) | undefined;
  const postStarted = new Promise<void>((resolve) => {
    markPostStarted = resolve;
  });
  let posts = 0;
  const fetchImplementation = jest.fn<typeof fetch>(async (input) => {
    if (String(input).endsWith('/events/config')) {
      return response(200, { enabled: true, sample_rate: 1 });
    }
    posts += 1;
    markPostStarted?.();
    return response(204);
  });
  await configure({ fetch: fetchImplementation });
  await track(AnalyticsEvent.AppOpen, { cold: true });

  networkListener?.({ isConnected: false, isInternetReachable: false } as NetInfoState);
  networkListener?.({ isConnected: true, isInternetReachable: true } as NetInfoState);
  await postStarted;

  expect(posts).toBe(1);
});

test('configured batches read the current stored access token for the request header', async () => {
  jest.useFakeTimers();
  storedValues.set(ANALYTICS_PRIVACY_NOTICE_KEY, 'true');
  mockedGetAccessToken.mockResolvedValue('stored-access-token');
  let postHeaders: HeadersInit | undefined;
  const fetchImplementation = jest.fn<typeof fetch>(async (input, init) => {
    if (String(input).endsWith('/events/config')) {
      return response(200, { enabled: true, sample_rate: 1 });
    }
    postHeaders = init?.headers;
    return response(204);
  });
  await configure({ fetch: fetchImplementation });
  await track(AnalyticsEvent.AppOpen, { cold: true });

  await confirmPrivacyNotice({ waitForFlush: true });

  expect(mockedGetAccessToken).toHaveBeenCalledTimes(1);
  expect(postHeaders).toMatchObject({
    authorization: 'Bearer stored-access-token',
  });
});

test('5xx uses the full backoff sequence while a non-retry status is attempted once', async () => {
  jest.useFakeTimers();
  const retryQueue = new AnalyticsQueue();
  await retryQueue.enqueue(event(0));
  const delays: number[] = [];
  let retryPosts = 0;
  const retryFetch = jest.fn<typeof fetch>(async (input) => {
    if (String(input).endsWith('/events/config')) {
      return response(200, { enabled: true, sample_rate: 1 });
    }
    retryPosts += 1;
    return response(503);
  });
  const retryFlusher = makeFlusher(retryQueue, retryFetch, {
    sleep: (milliseconds) => {
      delays.push(milliseconds);
      return new Promise((resolve) => setTimeout(resolve, milliseconds));
    },
  });
  await resolveConfig(retryFlusher);

  const retryFlush = retryFlusher.flush();
  await jest.runAllTimersAsync();
  await retryFlush;

  expect(delays).toEqual(ANALYTICS_RETRY_DELAYS_MS);
  expect(retryPosts).toBe(5);
  await retryQueue.clear();

  const nonRetryQueue = new AnalyticsQueue();
  await nonRetryQueue.enqueue(event(1));
  let nonRetryPosts = 0;
  const nonRetryFetch = jest.fn<typeof fetch>(async (input) => {
    if (String(input).endsWith('/events/config')) {
      return response(200, { enabled: true, sample_rate: 1 });
    }
    nonRetryPosts += 1;
    return response(422);
  });
  const nonRetryFlusher = makeFlusher(nonRetryQueue, nonRetryFetch);
  await resolveConfig(nonRetryFlusher);
  await nonRetryFlusher.flush();

  expect(nonRetryPosts).toBe(1);
  expect(await nonRetryQueue.count()).toBe(1);
});

test.each([200, 201, 400])('only 204 dequeues events, not status %i', async (status) => {
  const queue = new AnalyticsQueue();
  await queue.enqueue(event(status));
  const fetchImplementation = jest.fn<typeof fetch>(async (input) =>
    String(input).endsWith('/events/config')
      ? response(200, { enabled: true, sample_rate: 1 })
      : response(status),
  );
  const flusher = makeFlusher(queue, fetchImplementation);
  await resolveConfig(flusher);

  await flusher.flush();

  expect(await queue.count()).toBe(1);
});

test('204 dequeues acknowledged events', async () => {
  const queue = new AnalyticsQueue();
  await queue.enqueue(event(0));
  const fetchImplementation = jest.fn<typeof fetch>(async (input) =>
    String(input).endsWith('/events/config')
      ? response(200, { enabled: true, sample_rate: 1 })
      : response(204),
  );
  const flusher = makeFlusher(queue, fetchImplementation);
  await resolveConfig(flusher);
  await flusher.flush();

  expect(await queue.count()).toBe(0);
});

test('concurrent flush calls share one in-flight request', async () => {
  const queue = new AnalyticsQueue();
  await queue.enqueue(event(0));
  let resolvePost: ((value: Response) => void) | undefined;
  let markPostStarted: (() => void) | undefined;
  const postStarted = new Promise<void>((resolve) => {
    markPostStarted = resolve;
  });
  let posts = 0;
  const fetchImplementation = jest.fn<typeof fetch>(async (input) => {
    if (String(input).endsWith('/events/config')) {
      return response(200, { enabled: true, sample_rate: 1 });
    }
    posts += 1;
    markPostStarted?.();
    return new Promise<Response>((resolve) => {
      resolvePost = resolve;
    });
  });
  const flusher = makeFlusher(queue, fetchImplementation);
  await resolveConfig(flusher);

  const first = flusher.flush();
  const second = flusher.flush();
  await postStarted;
  expect(first).toBe(second);
  expect(posts).toBe(1);
  resolvePost?.(response(204));
  await Promise.all([first, second]);
  expect(await queue.count()).toBe(0);
});

test('privacy confirmation persists and is the trigger that releases queued events', async () => {
  jest.useFakeTimers();
  let configGets = 0;
  let posts = 0;
  const fetchImplementation = jest.fn<typeof fetch>(async (input) => {
    if (String(input).endsWith('/events/config')) {
      configGets += 1;
      return response(200, { enabled: true, sample_rate: 1 });
    }
    posts += 1;
    return response(204);
  });
  const configured = await configure({ fetch: fetchImplementation });

  await track(AnalyticsEvent.AppOpen, { cold: true });
  await jest.advanceTimersByTimeAsync(ANALYTICS_FLUSH_INTERVAL_MS);
  expect(configured.privacyNoticeConfirmed).toBe(false);
  expect(configGets).toBe(1);
  expect(posts).toBe(0);

  await confirmPrivacyNotice({ waitForFlush: true });

  expect(storedValues.get(ANALYTICS_PRIVACY_NOTICE_KEY)).toBe('true');
  expect(posts).toBe(1);
});

test('config failure is fail-open and collection continues', async () => {
  jest.useFakeTimers();
  storedValues.set(ANALYTICS_PRIVACY_NOTICE_KEY, 'true');
  let calls = 0;
  const fetchImplementation = jest.fn<typeof fetch>(async () => {
    calls += 1;
    if (calls === 1) {
      throw new Error('config unavailable');
    }
    return response(204);
  });

  const configured = await configure({ fetch: fetchImplementation });
  await track(AnalyticsEvent.AppOpen, { cold: true });
  await jest.advanceTimersByTimeAsync(ANALYTICS_FLUSH_INTERVAL_MS);

  expect(configured.enabled).toBe(true);
  expect(calls).toBe(2);
});

test('30-minute background boundary resets session and seq, while shorter gaps preserve both', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-07-19T12:00:00.000Z'));
  storedValues.set(ANALYTICS_PRIVACY_NOTICE_KEY, 'true');
  let appStateListener: ((state: AppStateStatus) => void) | undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener;
    return { remove: jest.fn() };
  });
  const ids = [
    'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA',
    '11111111-1111-4111-8111-111111111111',
    'E0000000-0000-4000-8000-000000000000',
    'E0000000-0000-4000-8000-000000000001',
    '22222222-2222-4222-8222-222222222222',
    'E0000000-0000-4000-8000-000000000002',
  ];
  const fetchImplementation = jest.fn<typeof fetch>(async (input) =>
    String(input).endsWith('/events/config')
      ? response(200, { enabled: true, sample_rate: 1 })
      : response(200),
  );
  await configure({
    fetch: fetchImplementation,
    now: () => new Date(Date.now()),
    uuidFactory: () => ids.shift() ?? 'FFFFFFFF-FFFF-4FFF-8FFF-FFFFFFFFFFFF',
  });

  await track(AnalyticsEvent.AppOpen, { cold: true });
  appStateListener?.('background');
  await jest.advanceTimersByTimeAsync(ANALYTICS_SESSION_TIMEOUT_MS - 1);
  appStateListener?.('active');
  await track(AnalyticsEvent.ScreenView, { screen: AnalyticsScreen.Dashboard });

  appStateListener?.('background');
  await jest.advanceTimersByTimeAsync(ANALYTICS_SESSION_TIMEOUT_MS);
  appStateListener?.('active');
  await track(AnalyticsEvent.AppOpen, { cold: false });

  const queued = await new AnalyticsQueue().peek();
  expect(queued.map(({ session_id, seq }) => [session_id, seq])).toEqual([
    ['11111111-1111-4111-8111-111111111111', 0],
    ['11111111-1111-4111-8111-111111111111', 1],
    ['22222222-2222-4222-8222-222222222222', 0],
  ]);
});
