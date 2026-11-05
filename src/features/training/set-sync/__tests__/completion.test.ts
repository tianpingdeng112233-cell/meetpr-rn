import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { CompletionGate, SetCompletionCoordinator } from '../completion';
import { SetSyncQueue, type SyncStorage } from '../queue';

const flush = async () => { for (let i = 0; i < 80; i++) await Promise.resolve(); };
function setup() {
  const data = new Map<string, string>();
  const storage: SyncStorage = { getItem: async k => data.get(k) ?? null, setItem: async (k, v) => { data.set(k, v); } };
  let send = async () => ({ id: 'server', logged_at: '2026-11-05T12:00:00Z' });
  const queue = new SetSyncQueue('alice', { storage, network: { isOnline: () => true, subscribe: () => () => {} }, send: () => send() });
  const complete = jest.fn(async () => {}); const reward = jest.fn();
  const gate = new CompletionGate('alice', storage, complete);
  let videos = true;
  const flow = new SetCompletionCoordinator(queue, gate, { reward, videosDelivered: () => videos });
  const enqueue = () => queue.enqueue({ stableSetId: 'one', dayId: 'day', exerciseId: 'squat', loggedDate: '2026-11-05', request: { plan_exercise_id: 'exercise', set_index: 0, weight_kg: '80', reps: 5, completed: true } });
  return { storage, queue, gate, flow, complete, reward, enqueue, send: (fn: typeof send) => { send = fn; }, videos: (value: boolean) => { videos = value; }, stop: () => { flow.reset(); queue.dispose(); } };
}
beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

test('successful completion removes the persisted day and later wakes cannot complete it again', async () => {
  const s = setup();
  await s.gate.arm('waiting'); await s.gate.release('waiting');
  await s.flow.begin('day'); await flush();
  expect(JSON.parse((await s.storage.getItem('training.completion-gate.v1.alice'))!)).toEqual({
    waiting: { completed: false, released: true },
  });
  await s.gate.updateConditions('day', { setsSynchronized: true, videosDelivered: true });
  expect(s.complete).toHaveBeenCalledTimes(1);
  await s.gate.forget('day'); await s.gate.arm('day'); await s.gate.release('day');
  await s.gate.updateConditions('day', { setsSynchronized: true, videosDelivered: true });
  expect(s.complete).toHaveBeenCalledTimes(2); s.stop();
});

test('restoring the gate prunes legacy completed days without losing waiting days', async () => {
  const s = setup(); await s.gate.ready;
  await s.storage.setItem('training.completion-gate.v1.alice', JSON.stringify({
    done: { completed: true, released: true }, waiting: { completed: false, released: true },
  }));
  const restored = new CompletionGate('alice', s.storage, s.complete); await restored.ready;
  expect(JSON.parse((await s.storage.getItem('training.completion-gate.v1.alice'))!)).toEqual({
    waiting: { completed: false, released: true },
  });
  expect(restored.pendingDays()).toEqual(['waiting']);
  await restored.updateConditions('done', { setsSynchronized: true, videosDelivered: true });
  expect(s.complete).not.toHaveBeenCalled(); restored.dispose(); s.stop();
});

test('empty queue rewards directly without flashing syncing and completes once', async () => {
  const s = setup(); await s.queue.ready; const states: string[] = []; s.flow.subscribe(() => states.push(s.flow.snapshot()));
  await s.flow.begin('day'); await s.flow.begin('day'); await flush();
  expect(states).not.toContain('syncing'); expect(s.reward).toHaveBeenCalledTimes(1); expect(s.complete).toHaveBeenCalledTimes(1); s.stop();
});

test('pending sets finish before reward and completion', async () => {
  const s = setup(); let finish!: (value: { id: string; logged_at: string }) => void;
  s.send(() => new Promise(resolve => { finish = resolve; })); await s.enqueue();
  void s.flow.begin('day'); await flush(); expect(s.flow.snapshot()).toBe('syncing'); expect(s.reward).not.toHaveBeenCalled();
  finish({ id: 'server', logged_at: '2026-11-05T12:00:00Z' }); await flush();
  expect(s.reward).toHaveBeenCalledTimes(1); expect(s.complete).toHaveBeenCalledTimes(1); s.stop();
});

test('20 seconds fails without reward or completion; late success does not celebrate', async () => {
  const s = setup(); let finish!: (value: { id: string; logged_at: string }) => void;
  s.send(() => new Promise(resolve => { finish = resolve; })); await s.enqueue(); void s.flow.begin('day'); await flush();
  await jest.advanceTimersByTimeAsync(19_999); expect(s.flow.snapshot()).toBe('syncing');
  await jest.advanceTimersByTimeAsync(1); expect(s.flow.snapshot()).toBe('failed');
  finish({ id: 'server', logged_at: '2026-11-05T12:00:00Z' }); await flush();
  expect(s.reward).not.toHaveBeenCalled(); expect(s.complete).not.toHaveBeenCalled(); s.stop();
});

test('4xx fails immediately and retry starts a new 20-second interval', async () => {
  const s = setup(); s.send(async () => { throw { status: 422 }; }); await s.enqueue(); await flush();
  await s.flow.begin('day'); expect(s.flow.snapshot()).toBe('failed');
  s.send(() => new Promise(() => {})); await s.flow.begin('day', true); await flush();
  await jest.advanceTimersByTimeAsync(19_999); expect(s.flow.snapshot()).toBe('syncing');
  await jest.advanceTimersByTimeAsync(1); expect(s.flow.snapshot()).toBe('failed'); expect(s.complete).not.toHaveBeenCalled(); s.stop();
});

test('reset on leaving restores the hold state and suppresses late rewards', async () => {
  const s = setup(); s.send(() => new Promise(() => {})); await s.enqueue(); await s.flow.begin('day');
  s.flow.reset(); expect(s.flow.snapshot()).toBe('idle'); await jest.advanceTimersByTimeAsync(20_000); expect(s.reward).not.toHaveBeenCalled(); s.stop();
});

test('gate waits for both inputs and survives rebuilding; concurrent wakes complete once', async () => {
  const s = setup(); s.videos(false); await s.flow.begin('day'); await flush();
  expect(s.reward).toHaveBeenCalledTimes(1); expect(s.complete).not.toHaveBeenCalled();
  const restored = new CompletionGate('alice', s.storage, s.complete); await restored.ready;
  await restored.updateConditions('day', { setsSynchronized: false, videosDelivered: true }); expect(s.complete).not.toHaveBeenCalled();
  await Promise.all([restored.updateConditions('day', { setsSynchronized: true, videosDelivered: true }), restored.updateConditions('day', { setsSynchronized: true, videosDelivered: true })]);
  expect(s.complete).toHaveBeenCalledTimes(1);
  const again = new CompletionGate('alice', s.storage, s.complete); await again.ready;
  await again.updateConditions('day', { setsSynchronized: true, videosDelivered: true }); expect(s.complete).toHaveBeenCalledTimes(1); s.stop();
});

test('a completion response from a logged-out instance cannot erase new completion intents', async () => {
  const s = setup(); let finish!: () => void;
  const old = new CompletionGate('alice', s.storage, () => new Promise<void>(resolve => { finish = resolve; }));
  await old.arm('day-a'); await old.release('day-a');
  const request = old.updateConditions('day-a', { setsSynchronized: true, videosDelivered: true }); await flush(); old.dispose();
  const fresh = new CompletionGate('alice', s.storage, async () => {}); await fresh.arm('day-b'); await fresh.release('day-b');
  finish(); await request;
  const restored = new CompletionGate('alice', s.storage, async () => {}); await restored.ready;
  expect(restored.pendingDays()).toContain('day-b'); fresh.dispose(); restored.dispose(); s.stop();
});

test('video wait survives restart, times out once from the hold, and completes once after both inputs arrive', async () => {
  const s = setup(); const timeout = jest.fn(async () => {}); const delivered = jest.fn(async () => {});
  let summary = { failed: 1, uploading: 1, done: 1, total: 3, undelivered: 2, delivered: false };
  const videos = { summary: () => summary, timeout, delivered };
  const context = { sets: [{ stableSetId: 'video' }], exerciseIds: ['exercise'], heldAt: Date.now() };
  const first = new CompletionGate('alice', s.storage, s.complete, videos);
  await first.arm('day', context); await first.release('day');
  await first.updateConditions('day', { setsSynchronized: true, videosDelivered: false });
  first.dispose();
  const restored = new CompletionGate('alice', s.storage, s.complete, videos); await restored.ready;
  await restored.updateConditions('day', { setsSynchronized: true, videosDelivered: false });
  await jest.advanceTimersByTimeAsync(30 * 60_000 - 1); expect(timeout).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(1); expect(timeout).toHaveBeenCalledWith('day', 2);
  expect(restored.pendingDays()).toEqual(['day']); expect(s.complete).not.toHaveBeenCalled();
  restored.dispose();
  const again = new CompletionGate('alice', s.storage, s.complete, videos); await again.ready;
  await again.updateConditions('day', { setsSynchronized: true, videosDelivered: false });
  await jest.advanceTimersByTimeAsync(30 * 60_000); expect(timeout).toHaveBeenCalledTimes(1);
  summary = { failed: 0, uploading: 0, done: 3, total: 3, undelivered: 0, delivered: true };
  await again.updateConditions('day', { setsSynchronized: false, videosDelivered: true }); expect(s.complete).not.toHaveBeenCalled();
  await Promise.all([again.updateConditions('day', { setsSynchronized: true, videosDelivered: true }), again.updateConditions('day', { setsSynchronized: true, videosDelivered: true })]);
  expect(s.complete).toHaveBeenCalledTimes(1); expect(delivered).toHaveBeenCalledWith('day', 3);
  expect(again.pendingDays()).toEqual([]); again.dispose(); s.stop();
});

test('retrying a failed completion after adding a video persists the new delivery wait', async () => {
  const s = setup(); await s.gate.arm('day'); await s.gate.release('day');
  await s.gate.arm('day', { heldAt: Date.now(), sets: [{ stableSetId: 'new-video' }], exerciseIds: ['exercise'] });
  const restored = new CompletionGate('alice', s.storage, s.complete); await restored.ready;
  expect(restored.videoIntent('day')?.sets).toEqual([{ stableSetId: 'new-video' }]);
  restored.dispose(); s.stop();
});
