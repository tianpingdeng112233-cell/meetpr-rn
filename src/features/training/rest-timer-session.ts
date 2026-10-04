import { TRAINING_LIMITS } from './constants';

/** Native calls are synchronous so foreground reconciliation cannot race a new rest. */
export type RestTimerNativeState = { endAtEpochMs: number | null; skipped: boolean };
export type RestTimerNotifications = {
  show(endAtEpochMs: number): void;
  hide(): void;
  consumeState(): RestTimerNativeState;
};

export class RestTimerSession {
  private endAt: number | null = null;
  private active = true;
  private permitted = false;
  private paused = false;
  private finished = false;

  constructor(private readonly notifications: RestTimerNotifications, private readonly now = Date.now) {}

  start(seconds: number) {
    this.endAt = this.now() + seconds * 1_000;
    this.finished = false;
    this.sync();
  }
  setPaused(paused: boolean) {
    this.paused = paused;
    this.sync();
  }
  close() {
    this.endAt = null;
    if (this.permitted) this.notifications.hide();
  }
  canTick() { return this.active && !this.paused && this.endAt !== null; }
  tick(): boolean {
    if (!this.active || this.paused || this.endAt === null || this.remainingSeconds() > 0 || this.finished) return false;
    this.finished = true;
    if (this.permitted) this.notifications.hide();
    return true;
  }
  private sync() {
    if (!this.permitted) return;
    if (this.paused || this.endAt === null || this.remainingSeconds() === 0) this.notifications.hide();
    else if (!this.active) this.notifications.show(this.endAt);
  }
  adjust(delta: number) {
    const seconds = Math.max(0, Math.min(TRAINING_LIMITS.restMaximumSeconds, this.remainingSeconds() + delta));
    this.endAt = this.now() + seconds * 1_000;
    this.finished = false;
    this.sync();
  }
  remainingSeconds() { return Math.max(0, Math.ceil(((this.endAt ?? this.now()) - this.now()) / 1_000)); }
  isClosed() { return this.endAt === null; }
  setActive(active: boolean, permitted: boolean) {
    if (active === this.active && permitted === this.permitted) return;
    if (active && !this.active && permitted) {
      const state = this.notifications.consumeState();
      if (state.skipped) this.endAt = null;
      else if (state.endAtEpochMs !== null) this.endAt = state.endAtEpochMs;
      this.notifications.hide();
    }
    this.active = active;
    this.permitted = permitted;
    if (!active && permitted && !this.paused && this.remainingSeconds() > 0) this.notifications.show(this.endAt!);
  }
}
