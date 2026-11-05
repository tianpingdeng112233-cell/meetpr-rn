import type { SetLog, SetLogUpsertRequest, SetLogUpsertResponse } from '@/api/domains/sets';
import { localDateText } from '@/domain/plan/workout-date-policy';
import type { WorkoutSetDraft } from '../model';
import { SerialTaskQueue } from '../serial-task-queue';
import { sameSet } from './overlay';

export type SyncStorage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
export type SyncClock = { now(): number; setTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout>; clearTimeout(timer: ReturnType<typeof setTimeout>): void };
export const systemClock: SyncClock = { now: () => Date.now(), setTimeout: (fn, delay) => setTimeout(fn, delay), clearTimeout: timer => clearTimeout(timer) };
export type SetWrite = { stableSetId: string; dayId: string; exerciseId: string; loggedDate: string; request: SetLogUpsertRequest };
export type PendingSet = Omit<SetWrite, 'request'> & {
  id: number; request?: SetLogUpsertRequest; log: SetLog; remove: boolean;
  status: 'pending' | 'failed'; attempts: number; retryAt: number;
};
export type SetSyncSnapshot = { drafts?: Readonly<Record<string, WorkoutSetDraft>>; pending: readonly PendingSet[]; confirmed: Readonly<Record<string, PendingSet>> };
export type SetSender = (entry: PendingSet, replaceRequest: (request: SetLogUpsertRequest) => Promise<void>) => Promise<SetLogUpsertResponse | void>;
export type QueueDependencies = {
  storage: SyncStorage; send: SetSender; clock?: SyncClock;
  network: { isOnline(): boolean; subscribe(listener: () => void): () => void };
  isActive?: () => boolean;
};
const storageQueues = new WeakMap<SyncStorage, Map<string, SerialTaskQueue>>();
export function storageQueue(storage: SyncStorage, key: string) {
  let accounts = storageQueues.get(storage);
  if (!accounts) { accounts = new Map(); storageQueues.set(storage, accounts); }
  let queue = accounts.get(key);
  if (!queue) { queue = new SerialTaskQueue(); accounts.set(key, queue); }
  return queue;
}
const empty = (): SetSyncSnapshot => ({ pending: [], confirmed: {} });
export const isLocalSetId = (id: string) => id.startsWith('local:');

/** One durable outbox per account. The existing serial queue owns all sends. */
export class SetSyncQueue {
  readonly ready: Promise<void>;
  private state = empty();
  private listeners = new Set<() => void>();
  private writes: SerialTaskQueue;
  private waiters = new Set<() => void>();
  private sends = new SerialTaskQueue();
  private scheduled = false;
  private confirmingSetId?: string;
  private disposed = false;
  private timer?: ReturnType<typeof setTimeout>;
  private priorityDay?: string;
  private sequence = 0;
  private clock: SyncClock;
  private unsubscribe: () => void;
  private key: string;
  constructor(readonly userId: string, private deps: QueueDependencies) {
    this.key = `training.set-sync.v1.${userId}`;
    this.clock = deps.clock ?? systemClock;
    this.writes = storageQueue(deps.storage, this.key);
    this.ready = this.writes.enqueue(async () => {
      const raw = await deps.storage.getItem(this.key);
      if (raw) {
        const stored = JSON.parse(raw) as SetSyncSnapshot;
        // Reject unknown/corrupt storage rather than replacing the user's outbox.
        if (!Array.isArray(stored.pending) || !stored.confirmed) throw new Error('Invalid set sync storage');
        this.state = stored;
        this.sequence = Math.max(0, ...stored.pending.map(entry => entry.id), ...Object.values(stored.confirmed).map(entry => entry.id));
      }
      const retiredDrafts = this.pruneRecordedDrafts();
      if (this.pruneReceipts() || retiredDrafts) await deps.storage.setItem(this.key, JSON.stringify(this.state));
      this.emit(); this.kick();
    });
    this.unsubscribe = deps.network.subscribe(() => { if (deps.network.isOnline()) this.sendNow(); });
  }
  snapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  pending = (dayId?: string) => this.state.pending.filter(entry => !dayId || entry.dayId === dayId);
  async reconcileServerLogs(server: readonly SetLog[]) {
    await this.ready;
    if (this.disposed) return;
    const retiredDrafts = this.pruneRecordedDrafts(server);
    if (this.pruneReceipts(server) || retiredDrafts) { await this.persist(); this.emit(); }
  }
  private pruneRecordedDrafts(server: readonly SetLog[] = []): boolean {
    const drafts = { ...this.state.drafts };
    for (const [id, draft] of Object.entries(drafts)) {
      const latest = this.state.pending.findLast(entry => entry.stableSetId === id) ?? this.state.confirmed[id];
      const recorded = latest ? !latest.remove : server.some(log =>
        log.student_id === this.userId && log.set_index === draft.setIndex &&
        (draft.kind === 'added'
          ? log.adhoc && log.exercise_id === draft.exercise.exercise_id && log.plan_day_id === draft.exercise.plan_day_id
          : log.plan_exercise_id === draft.exercise.id));
      if (recorded) delete drafts[id];
    }
    if (Object.keys(drafts).length === Object.keys(this.state.drafts ?? {}).length) return false;
    this.state = { ...this.state, drafts };
    return true;
  }
  private pruneReceipts(server: readonly SetLog[] = []): boolean {
    const cutoff = new Date(this.clock.now());
    cutoff.setDate(cutoff.getDate() - 14);
    const oldestDate = localDateText(cutoff);
    const confirmed = Object.fromEntries(Object.entries(this.state.confirmed).filter(([stableSetId, entry]) => {
      if (stableSetId === this.confirmingSetId) return true;
      if (entry.log.logged_date < oldestDate) return false;
      if (entry.remove || this.state.pending.some(pending => pending.stableSetId === stableSetId)) return true;
      return !server.some(log => sameSet(log, entry) && Date.parse(log.logged_at) >= Date.parse(entry.log.logged_at));
    }));
    if (Object.keys(confirmed).length === Object.keys(this.state.confirmed).length) return false;
    this.state = { ...this.state, confirmed };
    return true;
  }
  private emit() { this.listeners.forEach(listener => listener()); }
  private persist() {
    const value = JSON.stringify(this.state);
    return this.writes.enqueue(() => this.deps.storage.setItem(this.key, value));
  }
  private update(entry: PendingSet) {
    this.state = { ...this.state, pending: this.state.pending.map(item => item.id === entry.id ? entry : item) };
    this.emit();
  }
  private retarget(request: SetLogUpsertRequest, previous?: PendingSet): SetLogUpsertRequest {
    if (!previous?.log.adhoc || !('plan_exercise_id' in request) || !previous.request || !('exercise_id' in previous.request)) return request;
    const { plan_exercise_id: _removed, ...fields } = request;
    return { ...fields, exercise_id: previous.exerciseId, plan_day_id: previous.dayId,
      logged_date: previous.loggedDate, set_index: previous.request.set_index };
  }
  async enqueue(input: SetWrite): Promise<SetLogUpsertResponse> {
    await this.ready;
    if (this.disposed) throw new Error('Set sync stopped');
    const previous = this.state.confirmed[input.stableSetId];
    // Once a removed prescription was converted, later edits retain its new identity.
    const request = this.retarget(input.request, previous);
    const log: SetLog = {
      id: previous && !previous.remove ? previous.log.id : `local:${input.stableSetId}`, student_id: this.userId,
      plan_exercise_id: 'plan_exercise_id' in request ? request.plan_exercise_id : null,
      plan_day_id: input.dayId, exercise_id: input.exerciseId, set_index: request.set_index,
      weight_kg: request.weight_kg, reps: request.reps, rpe: request.rpe ?? null, actual_rir: request.actual_rir ?? null,
      completed: request.completed, failed: request.failed ?? false, assumed: false, adhoc: 'exercise_id' in request,
      logged_date: input.loggedDate, logged_at: new Date(this.clock.now()).toISOString(),
    };
    const entry: PendingSet = { ...input, request, id: ++this.sequence, log, remove: false, status: 'pending', attempts: 0, retryAt: 0 };
    this.state = { ...this.state, pending: [...this.state.pending, entry] };
    this.pruneRecordedDrafts(); this.emit();
    await this.persist(); this.kick();
    return { id: log.id, logged_at: log.logged_at };
  }
  async saveDraft(draft: WorkoutSetDraft) {
    await this.ready;
    if (this.disposed) throw new Error('Set sync stopped');
    this.state = { ...this.state, drafts: { ...this.state.drafts, [draft.stableSetId]: draft } };
    this.emit(); await this.persist();
  }
  async discardDraft(stableSetId: string) {
    await this.ready;
    if (this.disposed) throw new Error('Set sync stopped');
    const drafts = { ...this.state.drafts }; delete drafts[stableSetId];
    this.state = { ...this.state, drafts }; this.emit(); await this.persist();
  }
  async remove(input: { stableSetId: string; dayId: string; log: SetLog }) {
    await this.ready;
    if (this.disposed) throw new Error('Set sync stopped');
    const entry: PendingSet = { ...input, exerciseId: input.log.exercise_id, loggedDate: input.log.logged_date,
      id: ++this.sequence, remove: true, status: 'pending', attempts: 0, retryAt: 0 };
    this.state = { ...this.state, pending: [...this.state.pending, entry] }; this.emit();
    await this.persist(); this.kick();
  }
  async sendNow(dayId?: string, retryFailed = false) {
    await this.ready;
    if (this.disposed) return;
    this.pruneReceipts();
    this.priorityDay = dayId;
    this.state = { ...this.state, pending: this.state.pending.map(entry => (!dayId || entry.dayId === dayId) && (retryFailed || entry.status !== 'failed')
      ? { ...entry, retryAt: 0, status: 'pending' } : entry) };
    this.emit();
    void this.persist().then(() => this.kick()).catch(() => { /* Keep the outbox in memory; never send before a durable write. */ });
  }
  async waitForSet(stableSetId: string, signal?: AbortSignal): Promise<string> {
    await this.ready;
    if (this.disposed || signal?.aborted) throw new Error('Set sync stopped');
    return new Promise((resolve, reject) => {
      const cleanup = () => { unsubscribe(); this.waiters.delete(stop); signal?.removeEventListener('abort', stop); };
      const stop = () => { cleanup(); reject(new Error('Set sync stopped')); };
      const check = () => {
        if (this.pending().some(entry => entry.stableSetId === stableSetId)) return;
        const entry = this.state.confirmed[stableSetId];
        if (entry && !entry.remove) { cleanup(); resolve(entry.log.id); }
      };
      const unsubscribe = this.subscribe(check);
      this.waiters.add(stop); signal?.addEventListener('abort', stop, { once: true }); check();
    });
  }
  private kick() {
    if (this.disposed || this.scheduled || !this.deps.network.isOnline() || this.deps.isActive?.() === false) return;
    if (this.timer) this.clock.clearTimeout(this.timer);
    this.scheduled = true;
    void this.sends.enqueue(() => this.drain()).catch(() => {
      // Disk errors retain pending data and can be retried on the next wakeup.
    }).finally(() => { this.scheduled = false; });
  }
  private async drain() {
    await this.ready;
    while (!this.disposed && this.deps.network.isOnline() && this.deps.isActive?.() !== false) {
      const candidates = this.state.pending.filter((entry, index, entries) => entry.status !== 'failed' &&
        !entries.slice(0, index).some(older => older.stableSetId === entry.stableSetId));
      const entry = candidates.find(item => item.dayId === this.priorityDay) ?? candidates[0];
      if (!entry) return;
      const delay = entry.retryAt - this.clock.now();
      if (delay > 0) { this.timer = this.clock.setTimeout(() => this.kick(), delay); return; }
      await this.persist();
      if (this.disposed || this.deps.isActive?.() === false) return;
      let sending = { ...entry };
      const confirmed = this.state.confirmed[entry.stableSetId];
      if (!entry.remove && entry.request) {
        const request = this.retarget(entry.request, confirmed);
        if (request !== entry.request) {
          if (this.disposed || this.deps.isActive?.() === false) throw new Error('Set sync stopped');
          sending = { ...sending, request, log: { ...sending.log, plan_exercise_id: null, adhoc: true, set_index: request.set_index } };
          this.update(sending); await this.persist();
        }
      }
      if (entry.remove && confirmed) sending = { ...sending, log: confirmed.log };
      try {
        const response = sending.remove && isLocalSetId(sending.log.id) ? undefined : await this.deps.send(sending, async request => {
          if (this.disposed || this.deps.isActive?.() === false) throw new Error('Set sync stopped');
          sending = { ...sending, request, log: { ...sending.log, plan_exercise_id: null, adhoc: true, set_index: request.set_index } };
          this.update(sending); await this.persist();
        });
        if (this.disposed || this.deps.isActive?.() === false) return;
        const saved = { ...sending, log: response ? { ...sending.log, ...response } : sending.log };
        this.confirmingSetId = entry.stableSetId;
        this.state = { ...this.state, pending: this.state.pending.filter(item => item.id !== entry.id), confirmed: { ...this.state.confirmed, [entry.stableSetId]: saved } };
        // Keep the receipt until its durable success has reached video waiters.
        try { await this.persist(); this.emit(); }
        finally { this.confirmingSetId = undefined; }
      } catch (error) {
        if (this.disposed || this.deps.isActive?.() === false) return;
        const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 0;
        const failed = status >= 400 && status < 500 && status !== 408 && status !== 429;
        const attempts = entry.attempts + 1;
        this.update({ ...sending, status: failed ? 'failed' : 'pending', attempts, retryAt: this.clock.now() + Math.min(60_000, 1000 * 2 ** Math.min(attempts - 1, 6)) });
        await this.persist();
      }
    }
  }
  dispose() { this.disposed = true; this.waiters.forEach(stop => stop()); this.unsubscribe(); if (this.timer) this.clock.clearTimeout(this.timer); }
}
