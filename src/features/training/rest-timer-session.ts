import AsyncStorage from "@/demo/storage";
import { TRAINING_LIMITS } from "./constants";

export type RestAlerts = { vibration: boolean; sound: boolean };
/** Native calls are synchronous so foreground reconciliation cannot race a new rest. */
export type RestTimerNativeState = {
  endAtEpochMs: number | null;
  skipped: boolean;
};
export type RestTimerNotifications = {
  show(endAtEpochMs: number, body: string, alerts: RestAlerts): void;
  hide(): void;
  consumeState(): RestTimerNativeState;
};
export type RestTimerSnapshot = {
  phase: "idle" | "running" | "done";
  remaining: number;
  total: number;
  body: string;
};

export class RestTimerSession {
  private listeners = new Set<(snapshot: RestTimerSnapshot) => void>();
  private published: RestTimerSnapshot | null = null;
  subscribe(listener: (snapshot: RestTimerSnapshot) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private publish() {
    const next = this.snapshot();
    const previous = this.published;
    if (
      previous &&
      next.phase === previous.phase &&
      next.remaining === previous.remaining &&
      next.total === previous.total &&
      next.body === previous.body
    )
      return;
    this.published = next;
    this.listeners.forEach((listener) => listener(next));
  }
  private body = "";
  private endAt: number | null = null;
  private total = 0;
  private doneAt: number | null = null;
  private active = true;
  private lastRemaining = 0;
  private permitted = false;
  private alerts: RestAlerts = { vibration: true, sound: true };

  constructor(
    private readonly notifications: RestTimerNotifications,
    private readonly now = Date.now,
  ) {}

  start(seconds: number, body = "") {
    this.body = body;
    this.total = Math.max(
      0,
      Math.min(TRAINING_LIMITS.restMaximumSeconds, seconds),
    );
    this.endAt = this.now() + this.total * 1_000;
    this.doneAt = null;
    this.lastRemaining = this.total + 1;
    this.sync();
    this.publish();
  }
  close() {
    this.endAt = null;
    this.doneAt = null;
    if (this.permitted) this.notifications.hide();
    this.publish();
  }
  completeToday() {
    this.close();
  }
  setAlerts(alerts: RestAlerts) {
    this.alerts = { vibration: alerts.vibration, sound: alerts.sound };
    this.sync();
  }
  tick(): RestAlerts {
    if (!this.active) return { vibration: false, sound: false };
    const remaining = this.remainingSeconds();
    const crossed =
      this.endAt !== null &&
      this.doneAt === null &&
      remaining < this.lastRemaining;
    const alert = {
      vibration:
        this.active && crossed && remaining <= 10 && this.alerts.vibration,
      sound: this.active && crossed && remaining === 0 && this.alerts.sound,
    };
    this.lastRemaining = remaining;
    if (
      this.endAt !== null &&
      this.remainingSeconds() === 0 &&
      this.doneAt === null
    ) {
      this.doneAt = this.endAt;
      if (this.active && this.permitted) this.notifications.hide();
    }
    if (this.doneAt !== null && this.now() - this.doneAt >= 3_000) this.close();
    this.publish();
    return alert;
  }
  snapshot(): RestTimerSnapshot {
    return {
      phase:
        this.endAt === null
          ? "idle"
          : this.doneAt === null
            ? "running"
            : "done",
      remaining: this.remainingSeconds(),
      total: this.total,
      body: this.body,
    };
  }
  private sync() {
    if (!this.permitted) return;
    if (this.endAt === null || this.remainingSeconds() === 0)
      this.notifications.hide();
    else if (!this.active)
      this.notifications.show(this.endAt, this.body, this.alerts);
  }
  adjust(delta: number) {
    if (this.endAt === null || this.doneAt !== null) return;
    const seconds = Math.max(
      0,
      Math.min(
        TRAINING_LIMITS.restMaximumSeconds,
        this.remainingSeconds() + delta,
      ),
    );
    this.total = Math.max(
      seconds,
      this.total + seconds - this.remainingSeconds(),
    );
    this.endAt = this.now() + seconds * 1_000;
    this.lastRemaining = seconds === 0 ? 1 : seconds;
    this.sync();
    this.publish();
  }
  remainingSeconds() {
    return Math.max(
      0,
      Math.ceil(((this.endAt ?? this.now()) - this.now()) / 1_000),
    );
  }
  setActive(active: boolean, permitted: boolean) {
    if (active === this.active && permitted === this.permitted) return;
    if (active && !this.active && permitted) {
      const state = this.notifications.consumeState();
      if (state.skipped) this.close();
      else if (state.endAtEpochMs !== null && this.endAt !== null) {
        this.total = Math.max(
          0,
          this.total + (state.endAtEpochMs - this.endAt) / 1_000,
        );
        this.endAt = state.endAtEpochMs;
      }
      this.notifications.hide();
    }
    if (active && !this.active) this.lastRemaining = this.remainingSeconds();
    this.active = active;
    this.permitted = permitted;
    this.sync();
    this.publish();
  }
}

/** Independent of the retired explanation marker: upgrades receive the new introduction. */
export class RestRingIntroduction {
  private constructor(
    private readonly studentId: string,
    private settingsSeen: boolean,
    private hintSeen: boolean,
  ) {}
  static async load(studentId: string) {
    const raw = await AsyncStorage.getItem(
      `meetpr.rest-ring.intro.v1.${studentId}`,
    );
    let saved: { settingsSeen?: boolean; hintSeen?: boolean } = {};
    try {
      saved = raw ? (JSON.parse(raw) ?? {}) : {};
    } catch {
      /* Treat corrupt flags as unseen. */
    }
    return new RestRingIntroduction(
      studentId,
      saved.settingsSeen === true,
      saved.hintSeen === true,
    );
  }
  snapshot() {
    return {
      settings: !this.settingsSeen,
      hint: this.settingsSeen && !this.hintSeen,
    };
  }
  async dismissSettings() {
    await this.save(true, this.hintSeen);
    this.settingsSeen = true;
  }
  async interact() {
    await this.save(this.settingsSeen, true);
    this.hintSeen = true;
  }
  private save(settingsSeen: boolean, hintSeen: boolean) {
    return AsyncStorage.setItem(
      `meetpr.rest-ring.intro.v1.${this.studentId}`,
      JSON.stringify({ settingsSeen, hintSeen }),
    );
  }
}
