import { expect, jest, test } from '@jest/globals';
import type { ChatMessage } from '@/api/domains/chat';
import { createChatVideoOutbox, type ChatVideoDraft } from '../chat-video-outbox';
const draft: ChatVideoDraft = { clientId: 'stable', ownerId: 'student', coachId: 'coach', conversationId: 'conversation', uri: 'file:///video.mp4', sizeBytes: 100, contentType: 'video/mp4', durationSeconds: 24, width: 100, height: 200 };
const message = { id: 'message', seq: 1, client_id: 'stable' } as ChatMessage;
test('failed video remains available across subscribers and retries with the same client id', async () => {
  const send = jest.fn<(draft: ChatVideoDraft, signal: AbortSignal, progress: (value: number) => void) => Promise<ChatMessage>>()
    .mockRejectedValueOnce(new Error('Offline')).mockImplementationOnce(async (_draft, _signal, progress) => { progress(0.5); return message; });
  const removeFile = jest.fn<(uri: string) => void>();
  const outbox = createChatVideoOutbox({ send, removeFile });
  outbox.setContext('student', 'coach');
  const unsubscribe = outbox.subscribe(() => {});
  await outbox.enqueue(draft);
  unsubscribe();
  expect(outbox.getSnapshot()[0]).toMatchObject({ draft, state: 'failed' });
  expect(removeFile).not.toHaveBeenCalled();
  await outbox.retry('stable');
  expect(send.mock.calls.map(call => call[0].clientId)).toEqual(['stable', 'stable']);
  expect(outbox.getSnapshot()[0]).toMatchObject({ state: 'confirmed', message });
  expect(removeFile).toHaveBeenCalledWith(draft.uri);
});

test('a full byte transfer remains sending until its message is confirmed', async () => {
  let confirm!: (message: ChatMessage) => void;
  const outbox = createChatVideoOutbox({ send: async (_draft, _signal, progress) => { progress(1); return new Promise(resolve => { confirm = resolve; }); }, removeFile: () => {} });
  outbox.setContext('student', 'coach');
  const sending = outbox.enqueue(draft);
  await Promise.resolve();
  expect(outbox.getSnapshot()[0]).toMatchObject({ progress: 1, state: 'sending' });
  confirm(message); await sending;
  expect(outbox.getSnapshot()[0].state).toBe('confirmed');
});

test('switching coach cancels delivery, removes the local source, and ignores late success', async () => {
  let finish!: (message: ChatMessage) => void;
  let signal!: AbortSignal;
  const removeFile = jest.fn<(uri: string) => void>();
  const outbox = createChatVideoOutbox({ send: async (_draft, input) => { signal = input; return new Promise(resolve => { finish = resolve; }); }, removeFile });
  outbox.setContext('student', 'coach');
  const sending = outbox.enqueue(draft);
  await Promise.resolve();
  outbox.setContext('student', 'new-coach');
  expect(signal.aborted).toBe(true);
  expect(outbox.getSnapshot()).toEqual([]);
  finish(message); await sending;
  expect(outbox.getSnapshot()).toEqual([]);
  expect(removeFile).toHaveBeenCalledWith(draft.uri);
});

test('a confirmed video cannot be sent a second time by duplicate taps', async () => {
  const send = jest.fn<() => Promise<ChatMessage>>().mockResolvedValue(message);
  const outbox = createChatVideoOutbox({ send, removeFile: () => {} });
  outbox.setContext('student', 'coach');
  await outbox.enqueue(draft); await outbox.enqueue(draft);
  expect(send).toHaveBeenCalledTimes(1);
});

test('history confirms a lost POST response and releases its retained source', async () => {
  const removeFile = jest.fn<(uri: string) => void>();
  const outbox = createChatVideoOutbox({ send: async () => { throw new Error('Lost response'); }, removeFile });
  outbox.setContext('student', 'coach'); await outbox.enqueue(draft);
  outbox.acknowledge([{ ...message, conversation_id: 'conversation' }]);
  expect(outbox.getSnapshot()).toEqual([]);
  expect(removeFile).toHaveBeenCalledWith(draft.uri);
});
