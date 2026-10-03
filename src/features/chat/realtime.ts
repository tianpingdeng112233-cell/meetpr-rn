import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { API_BASE_URL } from '@/api/client';
import { getAccessToken, useSessionStore } from '@/api/session';
import { createRealtimeClient, type RealtimeEvent, type RealtimeState } from '@/api/realtime';
import { hashKey, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { CONVERSATION_POLL_MS, createRefreshQueue } from './conversation-model';

type SessionChannel = { userId: string; client: ReturnType<typeof createRealtimeClient> };
let channel: SessionChannel | undefined;
let state: RealtimeState = 'disconnected';
let detach: (() => void) | undefined;
const observers = new Set<() => void>();
const events = new Set<(event: RealtimeEvent) => void>();
function publish() { observers.forEach(listener => listener()); }
function teardown() {
  detach?.(); detach = undefined;
  channel?.client.disconnect();
  channel = undefined;
  events.clear();
  state = 'disconnected';
  publish();
}

/** One transport per authenticated user; React observers outlive session event subscriptions. */
export const chatRealtime = {
  get state() { return state; },
  get channel() { return channel; },
  observe(listener: () => void) { observers.add(listener); return () => { observers.delete(listener); }; },
  subscribe(listener: (event: RealtimeEvent) => void) { events.add(listener); return () => { events.delete(listener); }; },
  start() {
    let foreground = AppState.currentState === 'active';
    function update() {
      const session = useSessionStore.getState();
      const userId = session.status === 'authenticated' ? session.user?.id : undefined;
      if (channel?.userId !== userId) teardown();
      if (!userId) return;
      if (!channel) {
        const client = createRealtimeClient({ baseUrl: API_BASE_URL, accessToken: getAccessToken });
        channel = { userId, client };
        const stopEvents = client.subscribe(event => events.forEach(listener => listener(event)));
        const stopState = client.subscribeState(next => { state = next; publish(); });
        detach = () => { stopEvents(); stopState(); };
        publish();
      }
      if (foreground) channel.client.connect();
      else channel.client.disconnect();
    }
    const stopSession = useSessionStore.subscribe(update);
    const appState = AppState.addEventListener('change', next => { foreground = next === 'active'; update(); });
    update();
    return () => { stopSession(); appState.remove(); teardown(); };
  },
};

export function useChatRealtimeLifecycle() {
  useEffect(() => chatRealtime.start(), []);
}

export function useChatRealtime() {
  const current = useSyncExternalStore(chatRealtime.observe, () => chatRealtime.channel);
  const connectionState = useSyncExternalStore(chatRealtime.observe, () => chatRealtime.state);
  const userId = useSessionStore(session => session.user?.id);
  const subscribe = useCallback((listener: (event: RealtimeEvent) => void) => {
    let attached: SessionChannel | undefined;
    let unsubscribe = () => {};
    const attach = () => {
      if (attached === chatRealtime.channel) return;
      unsubscribe();
      attached = chatRealtime.channel;
      unsubscribe = attached?.userId === userId ? chatRealtime.subscribe(listener) : () => {};
    };
    const stopObserving = chatRealtime.observe(attach);
    attach();
    return () => { stopObserving(); unsubscribe(); };
  }, [userId]);
  return { connected: current?.userId === userId && connectionState === 'connected', subscribe };
}

/** Focus owns this subscription; state transitions only replace the polling timer. */
export function startConversationRealtime({ subscribe, receive, refresh }: {
  subscribe: (listener: (event: RealtimeEvent) => void) => () => void;
  receive: (event: RealtimeEvent) => Promise<unknown>;
  refresh: (force?: boolean) => void;
}) {
  let timer: ReturnType<typeof setInterval> | undefined;
  let previous: RealtimeState | undefined;
  function updatePolling() {
    if (previous === chatRealtime.state) return;
    previous = chatRealtime.state;
    clearInterval(timer);
    if (previous === 'disconnected') timer = setInterval(() => refresh(), CONVERSATION_POLL_MS);
  }
  const stopEvents = subscribe(event => { void receive(event).catch(() => undefined); });
  const stopState = chatRealtime.observe(updatePolling);
  const appState = AppState.addEventListener('change', next => { if (next === 'active') refresh(true); });
  updatePolling();
  return () => { stopEvents(); stopState(); appState.remove(); clearInterval(timer); };
}

// A badge and its inbox may observe the same query. They share one event worker.
const inboxWorkers = new WeakMap<QueryClient, Map<string, { users: number; stop(): void }>>();
export function useRealtimeInboxRefresh(userId: string, enabled: boolean, queryKey: QueryKey) {
  const client = useQueryClient();
  const { subscribe } = useChatRealtime();
  const key = hashKey(queryKey);
  useEffect(() => {
    if (!enabled) return;
    let workers = inboxWorkers.get(client);
    if (!workers) { workers = new Map(); inboxWorkers.set(client, workers); }
    let worker = workers.get(key);
    if (!worker) {
      const filters = { queryKey: JSON.parse(key) as QueryKey, exact: true, type: 'active' as const };
      const queue = createRefreshQueue(() => client.refetchQueries(filters, { cancelRefetch: false }));
      const refresh = () => {
        // Adopt an existing initial load/poll before requesting its trailing pass.
        if (!queue.refreshing && client.isFetching(filters)) void queue.refresh().catch(() => undefined);
        void queue.refresh().catch(() => undefined);
      };
      const unsubscribe = subscribe(event => {
        if (event.type === 'chat.message' || (event.type === 'chat.read' && event.userId !== userId)) refresh();
      });
      const appState = AppState.addEventListener('change', next => {
        // Mark disabled student queries stale too: React enables them after this notification.
        if (next === 'active') void client.invalidateQueries({ queryKey: filters.queryKey, exact: true }, { cancelRefetch: false });
      });
      worker = { users: 0, stop() { queue.stop(); unsubscribe(); appState.remove(); } };
      workers.set(key, worker);
    }
    worker.users++;
    return () => {
      if (--worker.users === 0) { worker.stop(); workers.delete(key); }
    };
  }, [client, key, enabled, subscribe, userId]);
}
