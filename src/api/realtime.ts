import { z } from 'zod';

export type RealtimeEvent =
  | { type: 'hello' }
  | { type: 'chat.message'; conversationId: string; seq: number; senderId: string }
  | { type: 'chat.read'; conversationId: string; userId: string; lastReadSeq: number };
export type RealtimeState = 'connected' | 'disconnected';
export type RealtimeSocket = {
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  close(): void;
};
type SocketFactory = (url: string, protocols: undefined, options: { headers: Record<string, string> }) => RealtimeSocket;
function nativeSocket(...args: Parameters<SocketFactory>): RealtimeSocket {
  // The DOM global declaration omits RN's supported third constructor argument.
  const NativeWebSocket = WebSocket as unknown as new (...args: Parameters<SocketFactory>) => RealtimeSocket;
  return new NativeWebSocket(...args);
}
type RealtimeOptions = {
  baseUrl: string;
  accessToken: () => Promise<string>;
  socketFactory?: SocketFactory;
  sleep?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  jitter?: (maximumMilliseconds: number) => number;
};

const EventWireSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('hello') }),
  z.object({ type: z.literal('chat.message'), payload: z.object({ conversation_id: z.string(), seq: z.number().int(), sender_id: z.string() }) }),
  z.object({ type: z.literal('chat.read'), payload: z.object({ conversation_id: z.string(), user_id: z.string(), last_read_seq: z.number().int() }) }),
]);
function decodeEvent(data: unknown): RealtimeEvent | undefined {
  if (typeof data !== 'string') return;
  try {
    const event = EventWireSchema.parse(JSON.parse(data));
    switch (event.type) {
      case 'hello': return { type: 'hello' };
      case 'chat.message': return { type: event.type, conversationId: event.payload.conversation_id, seq: event.payload.seq, senderId: event.payload.sender_id };
      case 'chat.read': return { type: event.type, conversationId: event.payload.conversation_id, userId: event.payload.user_id, lastReadSeq: event.payload.last_read_seq };
    }
  } catch { return; }
}

function sleepUntilRetry(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); resolve(); };
    const timer = setTimeout(finish, milliseconds);
    signal.addEventListener('abort', finish, { once: true });
    if (signal.aborted) finish();
  });
}

export function createRealtimeClient({ baseUrl, accessToken, socketFactory = nativeSocket, sleep = sleepUntilRetry, jitter = maximum => Math.random() * maximum }: RealtimeOptions) {
  let state: RealtimeState = 'disconnected';
  let generation = 0;
  let desired = false;
  let cancellation: AbortController | undefined;
  const events = new Set<(event: RealtimeEvent) => void>();
  const states = new Set<(state: RealtimeState) => void>();
  function transition(next: RealtimeState) {
    if (state === next) return;
    if (__DEV__) console.debug('[realtime]', state, '->', next);
    state = next;
    states.forEach(listener => listener(state));
  }
  async function run(current: number, signal: AbortSignal) {
    let maximum = 1000;
    const isCurrent = () => current === generation && !signal.aborted;
    while (isCurrent()) {
      try {
        const token = await accessToken();
        if (!isCurrent()) return;
        const url = new URL(baseUrl);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        url.pathname = `${url.pathname.replace(/\/+$/, '')}/realtime`;
        const socket = socketFactory(url.toString(), undefined, { headers: { Authorization: `Bearer ${token}` } });
        await new Promise<void>(resolve => {
          let ended = false;
          const finish = () => {
            if (ended) return;
            ended = true;
            socket.onmessage = null; socket.onclose = null; socket.onerror = null;
            signal.removeEventListener('abort', finish);
            try { socket.close(); } catch { /* Transport failures use the same retry path. */ }
            resolve();
          };
          socket.onclose = finish;
          socket.onerror = finish;
          socket.onmessage = ({ data }) => {
            if (ended || !isCurrent()) return;
            const event = decodeEvent(data);
            if (!event) return;
            if (event.type === 'hello') {
              maximum = 1000;
              transition('connected');
            }
            if (isCurrent()) events.forEach(listener => { if (isCurrent()) listener(event); });
          };
          signal.addEventListener('abort', finish, { once: true });
          if (signal.aborted) finish();
        });
      } catch { /* Token, handshake and transport failures silently fall back to polling. */ }
      if (!isCurrent()) return;
      transition('disconnected');
      if (!isCurrent()) return;
      await sleep(jitter(maximum), signal);
      maximum = Math.min(maximum * 2, 30000);
    }
  }
  return {
    get state() { return state; },
    subscribe(listener: (event: RealtimeEvent) => void) { events.add(listener); return () => { events.delete(listener); }; },
    subscribeState(listener: (state: RealtimeState) => void) { states.add(listener); return () => { states.delete(listener); }; },
    connect() {
      if (desired) return;
      desired = true;
      cancellation = new AbortController();
      void run(++generation, cancellation.signal).catch(() => undefined);
    },
    disconnect() {
      desired = false;
      ++generation;
      const previous = cancellation;
      cancellation = undefined;
      transition('disconnected');
      previous?.abort();
    },
  };
}
