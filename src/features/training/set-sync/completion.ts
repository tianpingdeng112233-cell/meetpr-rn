import { SerialTaskQueue } from '../serial-task-queue';
import { storageQueue, systemClock, type SetSyncQueue, type SyncClock, type SyncStorage } from './queue';

export type CompletionConditions = { setsSynchronized: boolean; videosDelivered: boolean };
type GateDay = { completed: boolean; released: boolean };

/** Shared with 101: only this durable gate may issue the completion request. */
export class CompletionGate {
  readonly ready: Promise<void>;
  private days: Record<string, GateDay> = {};
  private serial = new SerialTaskQueue();
  private writes: SerialTaskQueue;
  private disposed = false;
  private key: string;
  constructor(userId: string, private storage: SyncStorage, private complete: (dayId: string) => Promise<unknown>) {
    this.key = `training.completion-gate.v1.${userId}`;
    this.writes = storageQueue(storage, this.key);
    this.ready = this.writes.enqueue(async () => {
      const raw = await storage.getItem(this.key);
      if (!raw) return;
      const stored: Record<string, GateDay> = JSON.parse(raw);
      this.days = Object.fromEntries(Object.entries(stored).filter(([, day]) => !day.completed));
      if (Object.keys(this.days).length !== Object.keys(stored).length) {
        await storage.setItem(this.key, JSON.stringify(this.days));
      }
    });
  }
  dispose() { this.disposed = true; }
  pendingDays() { return Object.keys(this.days).filter(day => this.days[day].released && !this.days[day].completed); }
  async arm(dayId: string) {
    await this.ready;
    return this.serial.enqueue(async () => {
      if (this.disposed) return;
      if (!this.days[dayId]) { this.days[dayId] = { completed: false, released: false }; await this.persist(); }
    });
  }
  async release(dayId: string) {
    await this.ready;
    return this.serial.enqueue(async () => {
      if (this.disposed) return;
      if (this.days[dayId]) { this.days[dayId] = { ...this.days[dayId], released: true }; await this.persist(); }
    });
  }
  async forget(dayId: string) {
    await this.ready;
    return this.serial.enqueue(async () => { if (this.disposed) return; delete this.days[dayId]; await this.persist(); });
  }
  async updateConditions(dayId: string, conditions: CompletionConditions): Promise<void> {
    await this.ready;
    return this.serial.enqueue(async () => {
      const day = this.days[dayId];
      if (this.disposed || !day || !day.released || day.completed || !conditions.setsSynchronized || !conditions.videosDelivered) return;
      await this.complete(dayId);
      if (this.disposed) return;
      delete this.days[dayId];
      await this.persist();
    });
  }
  private persist() {
    const value = JSON.stringify(this.days);
    return this.writes.enqueue(() => this.storage.setItem(this.key, value));
  }
}

export type SetCompletionState = 'idle' | 'syncing' | 'failed' | 'reward';
export class SetCompletionCoordinator {
  private state: SetCompletionState = 'idle';
  private listeners = new Set<() => void>();
  private generation = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private unsubscribe?: () => void;
  constructor(private queue: SetSyncQueue, private gate: CompletionGate, private callbacks: {
    reward: () => void; videosDelivered: () => boolean; error?: (error: unknown) => void;
  }, private clock: SyncClock = systemClock) {}
  snapshot = () => this.state;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private set(state: SetCompletionState) { this.state = state; this.listeners.forEach(fn => fn()); }
  private clear() { if (this.timer) this.clock.clearTimeout(this.timer); this.unsubscribe?.(); this.unsubscribe = undefined; }
  reset() { this.generation++; this.clear(); this.set('idle'); }
  async begin(dayId: string, retry = false) {
    if (this.state === 'syncing' || this.state === 'reward') return;
    const generation = ++this.generation;
    await this.queue.ready;
    if (generation !== this.generation) return;
    const reward = async () => {
      this.clear();
      await this.gate.arm(dayId);
      if (generation !== this.generation) return;
      this.set('reward'); this.callbacks.reward();
      try { await this.gate.release(dayId); await this.gate.updateConditions(dayId, { setsSynchronized: this.queue.pending(dayId).length === 0, videosDelivered: this.callbacks.videosDelivered() }); }
      catch (error) { this.callbacks.error?.(error); this.set('idle'); }
    };
    if (!this.queue.pending(dayId).length) { await reward(); return; }
    if (!retry && this.queue.pending(dayId).some(entry => entry.status === 'failed')) { this.set('failed'); return; }
    this.set('syncing');
    await this.queue.sendNow(dayId, retry);
    if (generation !== this.generation) return;
    let finishing = false;
    const check = () => {
      if (generation !== this.generation || this.state !== 'syncing' || finishing) return;
      if (this.queue.pending(dayId).some(entry => entry.status === 'failed')) { this.clear(); this.set('failed'); return; }
      if (!this.queue.pending(dayId).length) { finishing = true; void reward().catch(error => { this.clear(); this.set('failed'); this.callbacks.error?.(error); }); }
    };
    this.unsubscribe = this.queue.subscribe(check);
    this.timer = this.clock.setTimeout(() => { this.clear(); this.set('failed'); }, 20_000);
    check();
  }
}
