import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  AnalyticsEventEnvelopeSchema,
  type AnalyticsEventEnvelope,
} from './types';
import { createUUID, type UUIDFactory } from './uuid';

export const ANALYTICS_QUEUE_KEY = 'meetpr.analytics.event_queue';
export const ANALYTICS_DEFERRED_EVENT_IDS_KEY =
  'meetpr.analytics.deferred_event_ids';
export const ANALYTICS_OVERSIZE_STRIKES_KEY =
  'meetpr.analytics.oversize_strikes';
export const ANALYTICS_ANON_ID_KEY = 'meetpr.analytics.anon_id';
export const ANALYTICS_PRIVACY_NOTICE_KEY =
  'meetpr.analytics.privacy_notice_confirmed';

export type AnalyticsStorage = Pick<
  typeof AsyncStorage,
  'getItem' | 'setItem' | 'removeItem'
>;

export class AnalyticsQueue {
  private events: AnalyticsEventEnvelope[] = [];
  private deferredEventIds = new Set<string>();
  private oversizeStrikes = new Map<string, number>();
  private loaded = false;
  private operation = Promise.resolve();

  constructor(private readonly storage: AnalyticsStorage = AsyncStorage) {}

  async enqueue(event: AnalyticsEventEnvelope): Promise<void> {
    await this.exclusive(async () => {
      await this.load();
      this.events.push(event);
      await this.persist();
    });
  }

  async peek(limit = 50): Promise<AnalyticsEventEnvelope[]> {
    return this.exclusive(async () => {
      await this.load();
      const peeked: AnalyticsEventEnvelope[] = [];
      const boundedLimit = Math.max(0, limit);
      if (boundedLimit === 0) {
        return peeked;
      }
      for (const event of this.events) {
        if (!this.deferredEventIds.has(event.event_id)) {
          peeked.push(event);
        }
        if (peeked.length >= boundedLimit) {
          break;
        }
      }
      return peeked;
    });
  }

  async remove(eventIds: ReadonlySet<string>): Promise<void> {
    await this.exclusive(async () => {
      await this.load();
      this.events = this.events.filter((event) => !eventIds.has(event.event_id));
      for (const eventId of eventIds) {
        this.deferredEventIds.delete(eventId);
      }
      await this.persist();
    });
  }

  async defer(eventId: string): Promise<void> {
    await this.exclusive(async () => {
      await this.load();
      if (!this.events.some((event) => event.event_id === eventId)) {
        return;
      }
      this.deferredEventIds.add(eventId);
      await this.persist();
    });
  }

  /**
   * Registers one server-side 413 strike against a single event. Mirrors iOS:
   * the first strike re-queues the event at the tail; the second strike
   * (accumulated across flushes, persisted) isolates it permanently.
   */
  async strikeOversize(eventId: string): Promise<'requeued' | 'isolated'> {
    return this.exclusive(async () => {
      await this.load();
      const index = this.events.findIndex((event) => event.event_id === eventId);
      if (index === -1) {
        return 'isolated';
      }
      const strikes = (this.oversizeStrikes.get(eventId) ?? 0) + 1;
      this.oversizeStrikes.set(eventId, strikes);
      if (strikes >= 2) {
        this.deferredEventIds.add(eventId);
        await this.persist();
        return 'isolated';
      }
      const [struck] = this.events.splice(index, 1);
      this.events.push(struck);
      await this.persist();
      return 'requeued';
    });
  }

  async clear(): Promise<void> {
    await this.exclusive(async () => {
      this.loaded = true;
      this.events = [];
      this.deferredEventIds.clear();
      this.oversizeStrikes.clear();
      await Promise.all([
        this.storage.removeItem(ANALYTICS_QUEUE_KEY).catch(() => undefined),
        this.storage
          .removeItem(ANALYTICS_DEFERRED_EVENT_IDS_KEY)
          .catch(() => undefined),
        this.storage
          .removeItem(ANALYTICS_OVERSIZE_STRIKES_KEY)
          .catch(() => undefined),
      ]);
    });
  }

  async count(): Promise<number> {
    return this.exclusive(async () => {
      await this.load();
      return this.events.length;
    });
  }

  private async exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operation.then(operation, operation);
    this.operation = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async load(): Promise<void> {
    if (this.loaded) {
      return;
    }

    this.loaded = true;
    try {
      const serializedEvents = await this.storage.getItem(ANALYTICS_QUEUE_KEY);
      const parsedEvents = serializedEvents
        ? (JSON.parse(serializedEvents) as unknown)
        : [];
      this.events = Array.isArray(parsedEvents)
        ? parsedEvents.flatMap((candidate) => {
            const result = AnalyticsEventEnvelopeSchema.safeParse(candidate);
            return result.success ? [result.data] : [];
          })
        : [];
    } catch {
      this.events = [];
    }

    const queuedIds = new Set(this.events.map((event) => event.event_id));
    // Auxiliary indexes degrade independently: corrupt metadata must never
    // drop unconfirmed events from the primary queue.
    try {
      const serializedDeferredIds = await this.storage.getItem(
        ANALYTICS_DEFERRED_EVENT_IDS_KEY,
      );
      const parsedDeferredIds = serializedDeferredIds
        ? (JSON.parse(serializedDeferredIds) as unknown)
        : [];
      this.deferredEventIds = new Set(
        Array.isArray(parsedDeferredIds)
          ? parsedDeferredIds.filter(
              (candidate): candidate is string =>
                typeof candidate === 'string' && queuedIds.has(candidate),
            )
          : [],
      );
    } catch {
      this.deferredEventIds = new Set();
    }

    try {
      const serializedStrikes = await this.storage.getItem(
        ANALYTICS_OVERSIZE_STRIKES_KEY,
      );
      const parsedStrikes = serializedStrikes
        ? (JSON.parse(serializedStrikes) as unknown)
        : [];
      this.oversizeStrikes = new Map(
        Array.isArray(parsedStrikes)
          ? parsedStrikes.filter(
              (candidate): candidate is [string, number] =>
                Array.isArray(candidate) &&
                typeof candidate[0] === 'string' &&
                typeof candidate[1] === 'number' &&
                queuedIds.has(candidate[0]),
            )
          : [],
      );
    } catch {
      this.oversizeStrikes = new Map();
    }
  }

  private async persist(): Promise<void> {
    await Promise.all([
      this.storage
        .setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(this.events))
        .catch(() => undefined),
      this.storage
        .setItem(
          ANALYTICS_DEFERRED_EVENT_IDS_KEY,
          JSON.stringify([...this.deferredEventIds]),
        )
        .catch(() => undefined),
      this.storage
        .setItem(
          ANALYTICS_OVERSIZE_STRIKES_KEY,
          JSON.stringify([...this.oversizeStrikes.entries()]),
        )
        .catch(() => undefined),
    ]);
  }
}

export async function getOrCreateAnonId(
  storage: AnalyticsStorage = AsyncStorage,
  uuidFactory: UUIDFactory = createUUID,
): Promise<string> {
  const stored = await storage.getItem(ANALYTICS_ANON_ID_KEY).catch(() => null);
  if (stored) {
    return stored;
  }

  const anonId = uuidFactory();
  await storage.setItem(ANALYTICS_ANON_ID_KEY, anonId).catch(() => undefined);
  return anonId;
}

export async function isPrivacyNoticeConfirmed(
  storage: AnalyticsStorage = AsyncStorage,
): Promise<boolean> {
  return (
    (await storage.getItem(ANALYTICS_PRIVACY_NOTICE_KEY).catch(() => null)) ===
    'true'
  );
}

export async function persistPrivacyNoticeConfirmation(
  storage: AnalyticsStorage = AsyncStorage,
): Promise<void> {
  await storage.setItem(ANALYTICS_PRIVACY_NOTICE_KEY, 'true');
}
