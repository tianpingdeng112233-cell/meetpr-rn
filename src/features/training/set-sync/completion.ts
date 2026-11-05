import type { completionVideoSummary } from '../video-upload/completion-delivery';
import { SerialTaskQueue } from '../serial-task-queue';
import { storageQueue, systemClock, type SetSyncQueue, type SyncClock, type SyncStorage } from './queue';

export type CompletionConditions = { setsSynchronized: boolean; videosDelivered: boolean };
export type VideoCompletionContext = { sets: { stableSetId: string; setLogId?: string | null }[]; exerciseIds: string[] };
export type VideoCompletionIntent = VideoCompletionContext & { heldAt: number; timedOut?: boolean };
type GateDay = { completed: boolean; released: boolean; video?: VideoCompletionIntent };
type CompletionVideos = {
  summary(dayId: string, context: VideoCompletionContext): ReturnType<typeof completionVideoSummary>;
  timeout(dayId: string, count: number): Promise<void>;
  delivered(dayId: string, count: number): Promise<void>;
};

/** Shared with 101: only this durable gate may issue the completion request. */
export class CompletionGate {
  readonly ready: Promise<void>;
  private days: Record<string, GateDay> = {};
  private serial = new SerialTaskQueue();
  private writes: SerialTaskQueue;
  private disposed = false;
  private key: string;
  private revision = 0;
  private listeners = new Set<() => void>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  snapshot = () => this.revision;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private emit() { this.revision++; this.listeners.forEach(fn => fn()); }
  videoIntent(dayId: string) { return this.days[dayId]?.released ? this.days[dayId].video : undefined; }
  constructor(userId: string, private storage: SyncStorage, private complete: (dayId: string) => Promise<unknown>, private videos?: CompletionVideos, private clock: SyncClock = systemClock) {
    this.key = `training.completion-gate.v1.${userId}`;
    this.writes = storageQueue(storage, this.key);
    this.ready = this.writes.enqueue(async () => {
      const raw = await storage.getItem(this.key);
      if (!raw) return;
      const stored: Record<string, GateDay> = JSON.parse(raw);
      this.days = Object.fromEntries(Object.entries(stored).filter(([, day]) => !day.completed));
      this.emit();
      if (Object.keys(this.days).length !== Object.keys(stored).length) {
        await storage.setItem(this.key, JSON.stringify(this.days));
      }
    });
  }
  dispose() { this.disposed = true; this.timers.forEach(timer => this.clock.clearTimeout(timer)); this.timers.clear(); }
  pendingDays() { return Object.keys(this.days).filter(day => this.days[day].released && !this.days[day].completed); }
  async arm(dayId: string, video?: VideoCompletionIntent) {
    await this.ready;
    return this.serial.enqueue(async () => {
      if (this.disposed) return;
      if (!this.days[dayId]) { this.days[dayId] = { completed: false, released: false, ...(video ? { video } : {}) }; await this.persist(); }
      else if (video && !this.days[dayId].video) { this.days[dayId].video = video; await this.persist(); }
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
    return this.serial.enqueue(async () => { if (this.disposed) return; delete this.days[dayId]; this.clearTimer(dayId); await this.persist(); });
  }
  async updateConditions(dayId: string, conditions: CompletionConditions): Promise<void> {
    await this.ready;
    return this.serial.enqueue(async () => {
      const day = this.days[dayId];
      if (this.disposed || !day || !day.released || day.completed) return;
      await this.checkTimeout(dayId);
      const summary = day.video && this.videos?.summary(dayId, day.video);
      if (!conditions.setsSynchronized || !conditions.videosDelivered || (summary && !summary.delivered)) return;
      await this.complete(dayId);
      if (this.disposed) return;
      delete this.days[dayId];
      this.clearTimer(dayId);
      await this.persist();
      if (summary) await this.videos?.delivered(dayId, summary.total).catch(() => {});
    });
  }
  async updateVideoContext(dayId: string, context: VideoCompletionContext) {
    await this.ready;
    return this.serial.enqueue(async () => {
      const day = this.days[dayId];
      if (this.disposed || !day?.video || JSON.stringify({ sets: day.video.sets, exerciseIds: day.video.exerciseIds }) === JSON.stringify(context)) return;
      day.video = { ...day.video, ...context }; await this.persist();
    });
  }
  private clearTimer(dayId: string) {
    const timer = this.timers.get(dayId); if (timer) this.clock.clearTimeout(timer); this.timers.delete(dayId);
  }
  private async checkTimeout(dayId: string) {
    const intent = this.days[dayId]?.video;
    if (this.disposed || !intent || intent.timedOut || !this.videos) return;
    this.clearTimer(dayId);
    const remaining = intent.heldAt + 30 * 60_000 - this.clock.now();
    if (remaining > 0) {
      this.timers.set(dayId, this.clock.setTimeout(() => { void this.serial.enqueue(() => this.checkTimeout(dayId)).catch(() => {}); }, remaining));
      return;
    }
    const summary = this.videos.summary(dayId, intent);
    if (!summary.undelivered) return;
    intent.timedOut = true; await this.persist();
    await this.videos.timeout(dayId, summary.undelivered).catch(() => {});
  }
  private persist() {
    this.emit();
    const value = JSON.stringify(this.days);
    return this.writes.enqueue(() => this.storage.setItem(this.key, value));
  }
}

export type SetCompletionState = 'idle' | 'syncing' | 'failed' | 'reward';
export class SetCompletionCoordinator {
  private state: SetCompletionState = 'idle';
  private listeners = new Set<() => void>();
  private generation = 0;
  private preparingVideos = false;
  private timer?: ReturnType<typeof setTimeout>;
  private unsubscribe?: () => void;
  constructor(private queue: SetSyncQueue, private gate: CompletionGate, private callbacks: {
    reward: () => void; prepareVideos?: () => Promise<void>; videosDelivered: (dayId: string, context?: VideoCompletionContext) => boolean; error?: (error: unknown) => void;
  }, private clock: SyncClock = systemClock) {}
  snapshot = () => this.state;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private set(state: SetCompletionState) { this.state = state; this.listeners.forEach(fn => fn()); }
  private clear() { if (this.timer) this.clock.clearTimeout(this.timer); this.unsubscribe?.(); this.unsubscribe = undefined; }
  reset() { this.generation++; this.clear(); this.set('idle'); }
  async begin(dayId: string, retry = false, context?: VideoCompletionContext) {
    if (this.preparingVideos || this.state === 'syncing' || this.state === 'reward') return;
    const generation = ++this.generation;
    const heldAt = this.clock.now();
    this.preparingVideos = true;
    try { await this.queue.ready; await this.callbacks.prepareVideos?.(); }
    catch (error) { if (generation === this.generation) this.callbacks.error?.(error); return; }
    finally { this.preparingVideos = false; }
    if (generation !== this.generation) return;
    const reward = async () => {
      this.clear();
      await this.gate.arm(dayId, context && !this.callbacks.videosDelivered(dayId, context) ? { ...context, heldAt } : undefined);
      if (generation !== this.generation) return;
      this.set('reward'); this.callbacks.reward();
      try { await this.gate.release(dayId); await this.gate.updateConditions(dayId, { setsSynchronized: this.queue.pending(dayId).length === 0, videosDelivered: this.callbacks.videosDelivered(dayId, context) }); }
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
