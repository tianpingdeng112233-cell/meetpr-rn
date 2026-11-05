import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { SetSyncQueue, type PendingSet, type SyncStorage } from '../queue';
import { overlaySetLogs } from '../overlay';

const request = { plan_exercise_id: 'exercise', set_index: 0, weight_kg: '80', reps: 5, rpe: '8', completed: true };
const input = (stableSetId = 'one', dayId = 'day') => ({ stableSetId, dayId, exerciseId: 'squat', request, loggedDate: '2026-11-05' });
const flush = async () => { for (let i = 0; i < 60; i++) await Promise.resolve(); };
function setup() {
  const data = new Map<string, string>();
  const storage: SyncStorage = { getItem: async key => data.get(key) ?? null, setItem: async (key, value) => { data.set(key, value); } };
  let online = true;
  const listeners = new Set<() => void>();
  const network = { isOnline: () => online, subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; } };
  const send = jest.fn(async (entry: PendingSet) => ({ id: `server-${entry.stableSetId}`, logged_at: '2026-11-05T12:00:00Z' }));
  const queues: SetSyncQueue[] = [];
  const create = (user = 'alice') => { const q = new SetSyncQueue(user, { storage, send, network }); queues.push(q); return q; };
  return { storage, send, create, offline: () => { online = false; }, reconnect: () => { online = true; listeners.forEach(fn => fn()); }, stop: () => queues.forEach(q => q.dispose()) };
}
beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date('2026-11-05T12:00:00Z')); });
afterEach(() => { jest.useRealTimers(); });

test.each(['2026-11-05T12:00:00Z', '2026-11-05T13:00:00Z'])('server snapshot at %s retires its receipt durably without changing the overlay', async loggedAt => {
  const s = setup(); const q = s.create(); await q.ready;
  await q.enqueue(input()); await flush();
  const receipt = q.snapshot().confirmed.one;
  const server = [{ ...receipt.log, logged_at: loggedAt }];
  const before = overlaySetLogs(server, q.snapshot());
  await q.reconcileServerLogs(server);
  expect(q.snapshot().confirmed).toEqual({});
  expect(overlaySetLogs(server, q.snapshot())).toEqual(before);
  q.dispose(); const restored = s.create(); await restored.ready;
  expect(restored.snapshot().confirmed).toEqual({}); s.stop();
});

test('stale and unrelated snapshots retain receipts, including deletion protection', async () => {
  const s = setup(); const q = s.create(); await q.ready;
  await q.enqueue(input()); await flush();
  const log = q.snapshot().confirmed.one.log;
  await q.reconcileServerLogs([{ ...log, logged_at: '2026-11-05T11:00:00Z', weight_kg: '60' }]);
  await q.reconcileServerLogs([{ ...log, id: 'other', plan_exercise_id: 'other' }]);
  expect(overlaySetLogs([], q.snapshot())).toEqual([log]);
  await q.remove({ stableSetId: 'one', dayId: 'day', log }); await flush();
  await q.reconcileServerLogs([log]);
  expect(q.snapshot().confirmed.one.remove).toBe(true);
  expect(overlaySetLogs([log], q.snapshot())).toEqual([]); s.stop();
});

test.each(['restore', 'refresh', 'wake'])('receipts older than 14 calendar days are pruned on %s, retaining the boundary and pending writes', async trigger => {
  jest.setSystemTime(new Date('2026-11-04T12:00:00'));
  const s = setup(); let q = s.create(); await q.ready;
  await q.enqueue({ ...input('expired'), loggedDate: '2026-10-21' });
  await q.enqueue({ ...input('boundary'), loggedDate: '2026-10-22', request: { ...request, set_index: 1 } }); await flush();
  const server = Object.values(q.snapshot().confirmed).map(entry => entry.log);
  s.offline();
  await q.enqueue({ ...input('unsent'), loggedDate: '2026-10-01', request: { ...request, set_index: 2 } });
  const before = overlaySetLogs(server, q.snapshot()).sort((a, b) => a.set_index - b.set_index);
  // The records were retained while still within the window; time then advances.
  jest.setSystemTime(new Date('2026-11-05T12:00:00'));
  if (trigger === 'restore') { q.dispose(); q = s.create(); await q.ready; }
  if (trigger === 'refresh') await q.reconcileServerLogs([]);
  if (trigger === 'wake') { await q.sendNow(); await flush(); }
  expect(Object.keys(q.snapshot().confirmed)).toEqual(['boundary']);
  expect(q.pending()).toHaveLength(1);
  const after = overlaySetLogs(server, q.snapshot()).sort((a, b) => a.set_index - b.set_index);
  expect(after).toEqual(before);
  expect(Object.keys(JSON.parse((await s.storage.getItem('training.set-sync.v1.alice'))!).confirmed)).toEqual(['boundary']);
  q.dispose(); const restored = s.create(); await restored.ready;
  expect(Object.keys(restored.snapshot().confirmed)).toEqual(['boundary']); s.stop();
});

test('a snapshot arriving during confirmation storage cannot strand a video waiting for the server id', async () => {
  const s = setup();
  let finishSend!: (value: { id: string; logged_at: string }) => void;
  s.send.mockImplementationOnce(() => new Promise(resolve => { finishSend = resolve; }));
  const q = s.create(); await q.ready; await q.enqueue(input()); await flush();
  let received: string | undefined;
  const waiting = q.waitForSet('one').then(id => { received = id; }, () => {});
  const write = s.storage.setItem;
  let finishWrite!: () => void;
  let blocked = false;
  s.storage.setItem = async (key, value) => {
    if (!blocked && JSON.parse(value).confirmed.one) {
      blocked = true;
      await new Promise<void>(resolve => { finishWrite = resolve; });
    }
    await write(key, value);
  };
  finishSend({ id: 'server-one', logged_at: '2026-11-05T12:00:00Z' }); await flush();
  expect(blocked).toBe(true);
  const pruning = q.reconcileServerLogs([q.snapshot().confirmed.one.log]); await flush();
  finishWrite(); await pruning; await flush();
  const result = received;
  s.stop(); await waiting;
  expect(result).toBe('server-one');
});

test('sends in order and keeps other rows local while the first request hangs', async () => {
  const s = setup(); let finish!: (value: { id: string; logged_at: string }) => void;
  s.send.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const q = s.create(); await q.ready;
  await q.enqueue(input()); await q.enqueue(input('two')); await flush();
  expect(q.pending()).toHaveLength(2); expect(s.send).toHaveBeenCalledTimes(1);
  finish({ id: 'first', logged_at: '2026-11-05T12:00:00Z' }); await flush();
  expect(s.send.mock.calls.map(([entry]) => entry.stableSetId)).toEqual(['one', 'two']);
  expect(q.pending()).toHaveLength(0); s.stop();
});

test('retries transport errors without rolling back and network recovery bypasses backoff', async () => {
  const s = setup(); s.send.mockRejectedValueOnce(new Error('offline'));
  const q = s.create(); await q.ready; await q.enqueue(input()); await flush();
  expect(overlaySetLogs([], q.snapshot()).map(log => log.completed)).toEqual([true]);
  expect(s.send).toHaveBeenCalledTimes(1);
  s.reconnect(); await flush(); expect(s.send).toHaveBeenCalledTimes(2); expect(q.pending()).toHaveLength(0); s.stop();
});

test('same set finishes with the latest values after check, edit and uncheck', async () => {
  const s = setup(); s.offline(); const q = s.create(); await q.ready;
  await q.enqueue(input()); await q.enqueue({ ...input(), request: { ...request, weight_kg: '90' } });
  await q.enqueue({ ...input(), request: { ...request, weight_kg: '90', completed: false } });
  s.reconnect(); await flush();
  expect(s.send.mock.calls.at(-1)?.[0].request).toMatchObject({ weight_kg: '90', completed: false }); s.stop();
});

test('4xx stops retries, remains visible locally, and explicit retry resends', async () => {
  const s = setup(); s.send.mockRejectedValueOnce({ status: 422 }); const q = s.create(); await q.ready;
  await q.enqueue(input()); await flush(); expect(q.pending()[0].status).toBe('failed');
  await jest.advanceTimersByTimeAsync(120_000); s.reconnect(); await flush(); expect(s.send).toHaveBeenCalledTimes(1);
  q.sendNow('day', true); await flush(); expect(q.pending()).toHaveLength(0); s.stop();
});

test('sendNow prioritizes its day ahead of an older backed-off day', async () => {
  const s = setup(); s.send.mockRejectedValueOnce(new Error('timeout')); const q = s.create(); await q.ready;
  await q.enqueue(input('old', 'old-day')); await flush(); await q.enqueue(input('today')); await flush();
  q.sendNow('day'); await flush(); expect(s.send.mock.calls[1][0].stableSetId).toBe('today'); s.stop();
});

test('storage rebuild preserves pending edits and isolates accounts', async () => {
  const s = setup(); s.offline(); const first = s.create(); await first.ready; await first.enqueue(input()); first.dispose();
  const bob = s.create('bob'); await bob.ready; expect(bob.pending()).toEqual([]);
  const restored = s.create(); await restored.ready; expect(restored.pending()).toHaveLength(1);
  expect(overlaySetLogs([], restored.snapshot())[0]).toMatchObject({ completed: true, student_id: 'alice' });
  s.reconnect(); await flush(); expect(s.send).toHaveBeenCalledTimes(1); s.stop();
});

test('overlay keeps check, changed numbers and uncheck across stale refreshes; delete stays deleted', async () => {
  const s = setup(); s.offline(); const q = s.create(); await q.ready;
  await q.enqueue(input()); const stale = overlaySetLogs([], q.snapshot());
  await q.enqueue({ ...input(), request: { ...request, weight_kg: '95', reps: 3, completed: false } });
  expect(overlaySetLogs(stale, q.snapshot())).toMatchObject([{ weight_kg: '95', reps: 3, completed: false }]);
  await q.remove({ stableSetId: 'one', dayId: 'day', log: stale[0] });
  expect(overlaySetLogs(stale, q.snapshot())).toEqual([]);
  s.reconnect(); await flush(); expect(q.pending()).toHaveLength(0); s.stop();
});

test('408 and 5xx retry automatically with exponential backoff', async () => {
  const s = setup(); s.send.mockRejectedValueOnce({ status: 408 }).mockRejectedValueOnce({ status: 503 });
  const q = s.create(); await q.ready; await q.enqueue(input()); await flush();
  await jest.advanceTimersByTimeAsync(1000); expect(s.send).toHaveBeenCalledTimes(2);
  await jest.advanceTimersByTimeAsync(1999); expect(s.send).toHaveBeenCalledTimes(2);
  await jest.advanceTimersByTimeAsync(1); expect(s.send).toHaveBeenCalledTimes(3); s.stop();
});

test('new extra rows survive restart before their first completed entry and can be removed locally', async () => {
  const s = setup(); s.offline(); const q = s.create(); await q.ready;
  const draft = { stableSetId: 'extra', kind: 'extra', exercise: { plan_day_id: 'day' } } as import('../../model').WorkoutSetDraft;
  await q.saveDraft(draft); q.dispose();
  const restored = s.create(); await restored.ready; expect(restored.snapshot().drafts?.extra).toMatchObject({ stableSetId: 'extra' });
  await restored.discardDraft('extra'); expect(restored.snapshot().drafts?.extra).toBeUndefined(); s.stop();
});

test('recording an extra row retires its redundant draft durably without losing the pending set', async () => {
  const s = setup(); s.offline(); const q = s.create(); await q.ready;
  const draft = { stableSetId: 'extra', kind: 'extra', exercise: { plan_day_id: 'day' } } as import('../../model').WorkoutSetDraft;
  await q.saveDraft(draft);
  await q.enqueue(input('extra'));
  expect(q.snapshot().drafts?.extra).toBeUndefined();
  q.dispose(); const restored = s.create(); await restored.ready;
  expect(restored.snapshot().drafts?.extra).toBeUndefined();
  expect(overlaySetLogs([], restored.snapshot())).toMatchObject([{ completed: true }]);
  s.reconnect(); await flush();
  await restored.reconcileServerLogs([restored.snapshot().confirmed.extra.log]);
  expect(restored.snapshot().drafts?.extra).toBeUndefined(); s.stop();
});

test('restoring an older outbox removes recorded drafts but preserves unfilled rows', async () => {
  const s = setup(); s.offline(); const q = s.create(); await q.ready;
  await q.enqueue(input('recorded'));
  const draft = { stableSetId: 'recorded', kind: 'extra', exercise: { plan_day_id: 'day' } } as import('../../model').WorkoutSetDraft;
  await q.saveDraft(draft);
  await q.saveDraft({ ...draft, stableSetId: 'unfilled' });
  q.dispose(); const restored = s.create(); await restored.ready;
  expect(Object.keys(restored.snapshot().drafts ?? {})).toEqual(['unfilled']);
  expect(restored.pending()).toHaveLength(1); s.stop();
});

test('a new unfilled row reusing a deleted slot survives restart and stale server reconciliation', async () => {
  const s = setup(); const q = s.create(); await q.ready;
  await q.enqueue(input('extra')); await flush();
  const log = q.snapshot().confirmed.extra.log;
  await q.remove({ stableSetId: 'extra', dayId: 'day', log }); await flush();
  await q.discardDraft('extra');
  const draft = { stableSetId: 'extra', kind: 'extra', setIndex: 0, exercise: { id: 'exercise', plan_day_id: 'day' } } as import('../../model').WorkoutSetDraft;
  await q.saveDraft(draft);
  q.dispose(); const restored = s.create(); await restored.ready;
  expect(restored.snapshot().drafts?.extra).toEqual(draft);
  await restored.reconcileServerLogs([log]);
  expect(restored.snapshot().drafts?.extra).toEqual(draft); s.stop();
});

test('a converted set keeps the allocated added index when an edit was already queued', async () => {
  const s = setup(); s.offline(); const q = s.create(); await q.ready;
  // Inject the sender boundary, including its durable identity rewrite.
  s.send.mockImplementationOnce(async (entry, ...args: unknown[]) => {
    const replace = args[0] as (request: typeof entry.request) => Promise<void>;
    await replace({ exercise_id: 'squat', plan_day_id: 'day', logged_date: '2026-11-05', set_index: 4, weight_kg: '80', reps: 5, completed: true });
    return { id: 'converted', logged_at: '2026-11-05T12:00:00Z' };
  });
  await q.enqueue(input()); await q.enqueue({ ...input(), request: { ...request, weight_kg: '90' } }); s.reconnect(); await flush();
  expect(s.send.mock.calls[1][0].request).toMatchObject({ exercise_id: 'squat', set_index: 4, weight_kg: '90' });
  expect(s.send.mock.calls[1][0].request).not.toHaveProperty('plan_exercise_id'); s.stop();
});

test('foreground sendNow during hydration cannot overwrite a stored outbox', async () => {
  const s = setup(); s.offline(); const q = s.create(); await q.ready; await q.enqueue(input()); q.dispose();
  let finish!: (value: string | null) => void;
  const key = 'training.set-sync.v1.alice'; const raw = await s.storage.getItem(key);
  const restored = new SetSyncQueue('alice', { storage: { ...s.storage, getItem: () => new Promise(resolve => { finish = resolve; }) }, send: s.send, network: { isOnline: () => false, subscribe: () => () => {} } });
  void restored.sendNow(); await flush(); expect(await s.storage.getItem(key)).toBe(raw);
  finish(raw); await restored.ready; await flush(); expect(restored.pending()).toHaveLength(1); restored.dispose(); s.stop();
});

test('leaving an account releases video waiters while retaining its pending set', async () => {
  const s = setup(); s.offline(); const q = s.create(); await q.ready; await q.enqueue(input());
  const waiting = q.waitForSet('one'); await flush();
  const outcome = expect(waiting).rejects.toThrow('Set sync stopped'); q.dispose(); await outcome;
  expect(q.pending()).toHaveLength(1); s.stop();
});

test('an old account response cannot overwrite a newly logged-in account outbox', async () => {
  const s = setup(); let finish!: (value: { id: string; logged_at: string }) => void;
  s.send.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const old = s.create(); await old.ready; await old.enqueue(input()); await flush(); old.dispose();
  s.offline(); const fresh = s.create(); await fresh.ready; await fresh.enqueue(input('new-set'));
  finish({ id: 'old-server', logged_at: '2026-11-05T12:00:00Z' }); await flush();
  fresh.dispose(); const restored = s.create(); await restored.ready;
  expect(restored.pending().map(entry => entry.stableSetId)).toEqual(['one', 'new-set']); s.stop();
});
