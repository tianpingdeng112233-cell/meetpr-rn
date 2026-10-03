import { expect, jest, test } from '@jest/globals';
import { createRealtimeClient, type RealtimeSocket } from '../realtime';

class FakeSocket implements RealtimeSocket {
  onmessage: RealtimeSocket['onmessage'] = null;
  onclose: RealtimeSocket['onclose'] = null;
  onerror: RealtimeSocket['onerror'] = null;
  close = jest.fn();
  frame(data: string) { this.onmessage?.({ data }); }
}
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function setup(baseUrl = 'https://api.example/api/') {
  const sockets: FakeSocket[] = [];
  const socketFactory = jest.fn(() => { const socket = new FakeSocket(); sockets.push(socket); return socket; });
  const sleeps: (() => void)[] = [];
  const sleep = jest.fn((_milliseconds: number, _signal: AbortSignal) => new Promise<void>(resolve => sleeps.push(resolve)));
  const client = createRealtimeClient({ baseUrl, accessToken: async () => 'test-token', socketFactory, sleep, jitter: max => max });
  return { client, sockets, socketFactory, sleep, sleeps };
}

test('appends realtime to the API path and authenticates; only hello establishes connected state', async () => {
  const { client, sockets, socketFactory } = setup();
  const states = jest.fn();
  client.subscribeState(states);
  client.connect(); client.connect();
  await flush();
  expect(socketFactory).toHaveBeenCalledTimes(1);
  expect(socketFactory).toHaveBeenCalledWith('wss://api.example/api/realtime', undefined, { headers: { Authorization: 'Bearer test-token' } });
  expect(client.state).toBe('disconnected');
  sockets[0].frame('{"type":"hello","payload":{}}');
  expect(client.state).toBe('connected');
  expect(states).toHaveBeenLastCalledWith('connected');
  client.disconnect();
  expect(client.state).toBe('disconnected');
  expect(sockets[0].close).toHaveBeenCalledTimes(1);
});

test('ignores malformed and future frames and converts message/read pointers to camel case', async () => {
  const { client, sockets } = setup();
  const listener = jest.fn();
  const unsubscribe = client.subscribe(listener);
  client.connect(); await flush();
  for (const frame of ['not json', 'null', '[]', '{"type":"future","payload":{}}', '{"type":"chat.message","payload":{}}', '{"type":"chat.read","payload":{"conversation_id":"c","user_id":"u","last_read_seq":"2"}}']) {
    expect(() => sockets[0].frame(frame)).not.toThrow();
  }
  expect(listener).not.toHaveBeenCalled();
  sockets[0].frame('{"type":"chat.message","payload":{"conversation_id":"c","seq":42,"sender_id":"s"}}');
  sockets[0].frame('{"type":"chat.read","payload":{"conversation_id":"c","user_id":"u","last_read_seq":41}}');
  expect(listener.mock.calls).toEqual([
    [{ type: 'chat.message', conversationId: 'c', seq: 42, senderId: 's' }],
    [{ type: 'chat.read', conversationId: 'c', userId: 'u', lastReadSeq: 41 }],
  ]);
  unsubscribe(); client.disconnect();
});

test('retries with capped exponential full jitter, resets after hello and cancels sleeping generations', async () => {
  const { client, sockets, sleep, sleeps } = setup('http://api.example');
  const events = jest.fn();
  client.subscribe(events);
  client.connect(); await flush();
  for (const maximum of [1000, 2000, 4000, 8000, 16000, 30000, 30000]) {
    sockets.at(-1)!.onclose?.(); await flush();
    expect(sleep).toHaveBeenLastCalledWith(maximum, expect.any(AbortSignal));
    sleeps.shift()!(); await flush();
  }
  const old = sockets.at(-1)!;
  const lateFrame = old.onmessage!;
  old.frame('{"type":"hello","payload":{}}');
  old.onerror?.(); await flush();
  expect(sleep).toHaveBeenLastCalledWith(1000, expect.any(AbortSignal));
  client.disconnect();
  const attempts = sockets.length;
  const waitSignal = jest.mocked(sleep).mock.calls.at(-1)![1];
  expect(waitSignal.aborted).toBe(true);
  sleeps.shift()!(); await flush();
  expect(sockets).toHaveLength(attempts);
  client.connect(); await flush();
  sockets.at(-1)!.frame('{"type":"hello","payload":{}}');
  const delivered = events.mock.calls.length;
  lateFrame({ data: '{"type":"hello","payload":{}}' });
  old.onclose?.();
  expect(events).toHaveBeenCalledTimes(delivered);
  expect(client.state).toBe('connected');
  client.disconnect();
});

test('a token lookup crossing disconnect cannot construct a socket in the next generation', async () => {
  let finish!: (token: string) => void;
  const accessToken = jest.fn<() => Promise<string>>().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue('new-token');
  const socketFactory = jest.fn(() => new FakeSocket());
  const client = createRealtimeClient({ baseUrl: 'http://api.example', accessToken, socketFactory });
  client.connect(); client.disconnect(); client.connect(); await flush();
  finish('old-token'); await flush();
  expect(socketFactory).toHaveBeenCalledTimes(1);
  expect(socketFactory).toHaveBeenCalledWith('ws://api.example/realtime', undefined, { headers: { Authorization: 'Bearer new-token' } });
  client.disconnect();
});

test('token and constructor failures retry silently; disconnect cancels the native sleep timer', async () => {
  jest.useFakeTimers();
  try {
    const accessToken = jest.fn<() => Promise<string>>().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('test-token');
    const socket = new FakeSocket();
    const socketFactory = jest.fn<() => FakeSocket>().mockImplementationOnce(() => { throw new Error('handshake failed'); }).mockImplementation(() => socket);
    const client = createRealtimeClient({ baseUrl: 'https://api.example', accessToken, socketFactory, jitter: max => max });
    client.connect(); await flush();
    expect(client.state).toBe('disconnected');
    await jest.advanceTimersByTimeAsync(1000);
    expect(socketFactory).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1999);
    expect(socketFactory).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(socketFactory).toHaveBeenCalledTimes(2);
    socket.onclose?.(); await flush();
    client.disconnect();
    expect(jest.getTimerCount()).toBe(0);
    await jest.advanceTimersByTimeAsync(30000);
    expect(socketFactory).toHaveBeenCalledTimes(2);
  } finally { jest.useRealTimers(); }
});
