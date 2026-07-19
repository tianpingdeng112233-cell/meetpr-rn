import { z } from 'zod';

import { isSampledIn } from './sampling';
import { AnalyticsQueue } from './storage';
import {
  AnalyticsEvent,
  type AnalyticsConfig,
  type AnalyticsEventEnvelope,
  createBatchEnvelope,
} from './types';

export const ANALYTICS_BATCH_SIZE = 50;
export const ANALYTICS_FLUSH_INTERVAL_MS = 30_000;
export const ANALYTICS_MAX_REQUEST_BYTES = 1_048_576;
export const ANALYTICS_RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000] as const;

const AnalyticsConfigSchema = z.object({
  enabled: z.boolean(),
  sample_rate: z.number().min(0).max(1),
});

type Fetch = typeof globalThis.fetch;
type Sleep = (milliseconds: number) => Promise<void>;

export type EventFlusherOptions = {
  queue: AnalyticsQueue;
  baseUrl: string;
  anonId: string;
  appVersion: string;
  build: string;
  privacyGateOpen?: boolean;
  fetch?: Fetch;
  accessTokenProvider?: () => Promise<string | null | undefined>;
  sleep?: Sleep;
  retryDelaysMs?: readonly number[];
  makeClientError: (code: number) => AnalyticsEventEnvelope;
};

function utf8ByteLength(value: string): number {
  let length = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    length += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return length;
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class EventFlusher {
  private readonly baseUrl: string;
  private readonly fetchImplementation: Fetch;
  private readonly sleep: Sleep;
  private readonly retryDelaysMs: readonly number[];
  private privacyGateOpen: boolean;
  private enabled = true;
  private sampledIn = true;
  private configResolved = false;
  private flushFlight: Promise<void> | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly options: EventFlusherOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetchImplementation = options.fetch ?? globalThis.fetch;
    this.sleep = options.sleep ?? defaultSleep;
    this.retryDelaysMs = options.retryDelaysMs ?? ANALYTICS_RETRY_DELAYS_MS;
    this.privacyGateOpen = options.privacyGateOpen ?? false;
  }

  start(): void {
    if (this.interval) {
      return;
    }
    this.interval = setInterval(() => {
      void this.flush();
    }, ANALYTICS_FLUSH_INTERVAL_MS);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async fetchConfig(): Promise<AnalyticsConfig> {
    let config: AnalyticsConfig = { enabled: true, sample_rate: 1 };
    try {
      const response = await this.fetchImplementation(`${this.baseUrl}/events/config`, {
        method: 'GET',
        headers: { accept: 'application/json' },
      });
      if (response.status === 200) {
        const parsed = AnalyticsConfigSchema.safeParse(await response.json());
        if (parsed.success) {
          config = parsed.data;
        }
      }
    } catch {
      // Fail open: an observability endpoint must never disable the product.
    } finally {
      this.configResolved = true;
    }

    this.enabled = config.enabled;
    this.sampledIn = isSampledIn(this.options.anonId, config.sample_rate);
    if (!this.enabled || !this.sampledIn) {
      await this.options.queue.clear().catch(() => undefined);
    }
    return config;
  }

  setPrivacyGate(open: boolean): void {
    this.privacyGateOpen = open;
  }

  isCollectionEnabled(): boolean {
    return this.enabled && this.sampledIn;
  }

  flush(): Promise<void> {
    if (this.flushFlight) {
      return this.flushFlight;
    }

    this.flushFlight = this.performFlush()
      .catch(() => undefined)
      .finally(() => {
        this.flushFlight = null;
      });
    return this.flushFlight;
  }

  private async performFlush(): Promise<void> {
    if (
      !this.privacyGateOpen ||
      !this.configResolved ||
      !this.enabled ||
      !this.sampledIn
    ) {
      return;
    }

    const events = await this.options.queue.peek(ANALYTICS_BATCH_SIZE);
    if (events.length > 0) {
      await this.sendEvents(events);
    }
  }

  private async sendEvents(events: AnalyticsEventEnvelope[]): Promise<void> {
    const batch = createBatchEnvelope(
      {
        anon_id: this.options.anonId,
        app_version: this.options.appVersion,
        build: this.options.build,
      },
      events,
    );
    const body = JSON.stringify(batch);

    if (events.length === 1 && utf8ByteLength(body) > ANALYTICS_MAX_REQUEST_BYTES) {
      await this.options.queue.remove(new Set([events[0].event_id]));
      if (events[0].name !== AnalyticsEvent.ClientError) {
        await this.options.queue.enqueue(this.options.makeClientError(413));
      }
      return;
    }

    const status = await this.postWithRetry(body);
    if (status === 204) {
      await this.options.queue.remove(new Set(events.map((event) => event.event_id)));
      return;
    }

    if (status === 413 && events.length > 1) {
      const midpoint = Math.floor(events.length / 2);
      await this.sendEvents(events.slice(0, midpoint));
      await this.sendEvents(events.slice(midpoint));
      return;
    }

    if (status === 413) {
      // iOS semantics: strikes accumulate across flushes (persisted); the
      // first 413 re-queues the event at the tail, the second isolates it.
      // No immediate same-flush retries.
      await this.options.queue.strikeOversize(events[0].event_id);
    }
  }

  private async postWithRetry(body: string): Promise<number | null> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        const token = await this.options.accessTokenProvider?.();
        const headers: Record<string, string> = {
          accept: 'application/json',
          'content-type': 'application/json',
        };
        if (token) {
          headers.authorization = `Bearer ${token}`;
        }
        const response = await this.fetchImplementation(`${this.baseUrl}/events`, {
          method: 'POST',
          headers,
          body,
        });
        const retryable =
          response.status === 429 ||
          (response.status >= 500 && response.status <= 599);
        if (!retryable || attempt >= this.retryDelaysMs.length) {
          return response.status;
        }
      } catch {
        if (attempt >= this.retryDelaysMs.length) {
          return null;
        }
      }

      await this.sleep(this.retryDelaysMs[attempt]);
    }
  }
}
