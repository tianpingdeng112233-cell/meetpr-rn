import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import { AppState, type AppStateStatus } from 'react-native';

import { API_BASE_URL } from '@/api/client';
import { getAccessToken } from '@/api/token-store';

import { EventFlusher } from './flusher';
import {
  AnalyticsQueue,
  type AnalyticsStorage,
  getOrCreateAnonId,
  isPrivacyNoticeConfirmed,
  persistPrivacyNoticeConfirmation,
} from './storage';
import {
  AnalyticsEvent,
  type AnalyticsEventEnvelope,
  type AnalyticsProperties,
  AnalyticsScreen,
} from './types';
import { createUUID, type UUIDFactory } from './uuid';

type Fetch = typeof globalThis.fetch;

export type AnalyticsConfigureOptions = {
  baseUrl?: string;
  accessTokenProvider?: () => Promise<string | null | undefined>;
  storage?: AnalyticsStorage;
  fetch?: Fetch;
  uuidFactory?: UUIDFactory;
  now?: () => Date;
  appVersion?: string;
  build?: string;
  retryDelaysMs?: readonly number[];
  sleep?: (milliseconds: number) => Promise<void>;
};

export type AnalyticsConfigureResult = {
  anonId: string;
  privacyNoticeConfirmed: boolean;
  enabled: boolean;
};

type AnalyticsRuntime = {
  state: AnalyticsRuntimeState;
  flusher: EventFlusher;
  appStateSubscription: { remove: () => void };
  networkSubscription: () => void;
};

type AnalyticsRuntimeState = {
  queue: AnalyticsQueue;
  storage: AnalyticsStorage;
  sessionId: string;
  uuidFactory: UUIDFactory;
  now: () => Date;
  seq: number;
  lastScreen: AnalyticsScreen;
  appState: AppStateStatus;
  backgroundedAt: number | null;
};

export const ANALYTICS_SESSION_TIMEOUT_MS = 30 * 60 * 1_000;

let runtime: AnalyticsRuntime | null = null;

function resolveAppVersion(): string {
  return Constants.expoConfig?.version ?? 'unknown';
}

function resolveBuild(): string {
  const configuredVersionCode = Constants.expoConfig?.android?.versionCode;
  const embeddedVersionCode = Constants.platform?.android?.versionCode;
  return String(embeddedVersionCode ?? configuredVersionCode ?? 'unknown');
}

function nextEnvelope(
  current: AnalyticsRuntimeState,
  name: AnalyticsEvent,
  props: AnalyticsProperties,
): AnalyticsEventEnvelope {
  const event: AnalyticsEventEnvelope = {
    event_id: current.uuidFactory(),
    session_id: current.sessionId,
    seq: current.seq,
    name,
    props,
    schema_version: 1,
    ts_client: current.now().toISOString(),
  };
  current.seq += 1;
  return event;
}

export async function configure(
  options: AnalyticsConfigureOptions = {},
): Promise<AnalyticsConfigureResult> {
  runtime?.flusher.stop();
  runtime?.appStateSubscription.remove();
  runtime?.networkSubscription();

  const storage = options.storage ?? AsyncStorage;
  const uuidFactory = options.uuidFactory ?? createUUID;
  const now = options.now ?? (() => new Date());
  const queue = new AnalyticsQueue(storage);
  const anonId = await getOrCreateAnonId(storage, uuidFactory);
  const privacyNoticeConfirmed = await isPrivacyNoticeConfirmed(storage);
  const runtimeWithoutSubscription: AnalyticsRuntimeState = {
    queue,
    storage,
    sessionId: uuidFactory(),
    uuidFactory,
    now,
    seq: 0,
    lastScreen: AnalyticsScreen.Dashboard,
    appState: AppState.currentState,
    backgroundedAt: null,
  };

  const flusher = new EventFlusher({
    queue,
    baseUrl: options.baseUrl ?? API_BASE_URL,
    anonId,
    appVersion: options.appVersion ?? resolveAppVersion(),
    build: options.build ?? resolveBuild(),
    privacyGateOpen: privacyNoticeConfirmed,
    fetch: options.fetch,
    accessTokenProvider: options.accessTokenProvider ?? getAccessToken,
    retryDelaysMs: options.retryDelaysMs,
    sleep: options.sleep,
    makeClientError: (code) =>
      nextEnvelope(runtimeWithoutSubscription, AnalyticsEvent.ClientError, {
        domain: 'network',
        code,
        screen: runtimeWithoutSubscription.lastScreen,
      }),
  });

  const onAppStateChange = (state: AppStateStatus) => {
    const previousState = runtimeWithoutSubscription.appState;
    runtimeWithoutSubscription.appState = state;

    if (previousState === 'active' && state !== 'active') {
      runtimeWithoutSubscription.backgroundedAt = now().getTime();
      return;
    }

    if (previousState !== 'active' && state === 'active') {
      const backgroundedAt = runtimeWithoutSubscription.backgroundedAt;
      runtimeWithoutSubscription.backgroundedAt = null;
      if (
        backgroundedAt !== null &&
        now().getTime() - backgroundedAt >= ANALYTICS_SESSION_TIMEOUT_MS
      ) {
        runtimeWithoutSubscription.sessionId = uuidFactory();
        runtimeWithoutSubscription.seq = 0;
      }
      void flusher.flush();
    }
  };
  const appStateSubscription = AppState.addEventListener('change', onAppStateChange);
  let previousReachable: boolean | null = null;
  const networkSubscription = NetInfo.addEventListener((state: NetInfoState) => {
    const reachable = state.isInternetReachable ?? state.isConnected;
    if (previousReachable === false && reachable === true) {
      void flusher.flush();
    }
    if (reachable !== null) {
      previousReachable = reachable;
    }
  });
  runtime = {
    state: runtimeWithoutSubscription,
    flusher,
    appStateSubscription,
    networkSubscription,
  };

  const config = await flusher.fetchConfig();
  flusher.start();
  return {
    anonId,
    privacyNoticeConfirmed,
    enabled: config.enabled && flusher.isCollectionEnabled(),
  };
}

export async function track(
  name: AnalyticsEvent | AnalyticsScreen,
  props: AnalyticsProperties = {},
): Promise<void> {
  const current = runtime;
  if (!current || !current.flusher.isCollectionEnabled()) {
    return;
  }

  let eventName = name as AnalyticsEvent;
  let eventProps = props;
  if (Object.values(AnalyticsScreen).includes(name as AnalyticsScreen)) {
    current.state.lastScreen = name as AnalyticsScreen;
    eventName = AnalyticsEvent.ScreenView;
    eventProps = { screen: name as AnalyticsScreen };
  }

  try {
    await current.state.queue.enqueue(nextEnvelope(current.state, eventName, eventProps));
  } catch {
    // Analytics is best-effort and must never fail the feature that emitted it.
  }
}

export function screen(name: AnalyticsScreen): Promise<void> {
  return track(name);
}

export async function confirmPrivacyNotice(): Promise<void> {
  const current = runtime;
  const storage = current?.state.storage ?? AsyncStorage;
  await persistPrivacyNoticeConfirmation(storage);
  if (current) {
    current.flusher.setPrivacyGate(true);
    await current.flusher.flush();
  }
}

/** Immediate flush for the cold-start app_open path (iOS flushes right after
 * fetching config); regular track() calls never flush on their own. */
export async function flushNow(): Promise<void> {
  await runtime?.flusher.flush();
}

export function resetAnalyticsForTests(): void {
  runtime?.flusher.stop();
  runtime?.appStateSubscription.remove();
  runtime?.networkSubscription();
  runtime = null;
}
