import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  E1RMConfidence,
  E1RMHistoryPoint,
  E1RMHistorySnapshot,
  E1RMRepository,
  PRBreakthroughEvent,
} from '@/domain/e1rm';

import { STORAGE_KEYS } from './constants';
import type { SessionReview } from './model';

type StoredE1RM = {
  revision?: number;
  points: (Omit<E1RMHistoryPoint, 'computedAt'> & { computedAt: string })[];
  prs: (
    Omit<PRBreakthroughEvent, 'occurredAt' | 'acknowledgedAt'> & {
      occurredAt: string;
      acknowledgedAt: string | null;
    }
  )[];
};

async function readE1RM(): Promise<StoredE1RM> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.e1rm);
  if (raw === null) return { points: [], prs: [] };
  // Never turn an unreadable existing store into an empty store that a repair can overwrite.
  const value = JSON.parse(raw) as Partial<StoredE1RM> | null;
  if (!value || !Array.isArray(value.points) || !Array.isArray(value.prs) ||
      (value.revision !== undefined && (!Number.isSafeInteger(value.revision) || value.revision < 0))) {
    throw new Error('Invalid e1RM store');
  }
  return { ...value, points: value.points, prs: value.prs, revision: value.revision ?? 0 };
}

function hydratePoint(
  point: StoredE1RM['points'][number],
): E1RMHistoryPoint {
  return { ...point, computedAt: new Date(point.computedAt) };
}

function hydratePR(pr: StoredE1RM['prs'][number]): PRBreakthroughEvent {
  return {
    ...pr,
    occurredAt: new Date(pr.occurredAt),
    acknowledgedAt: pr.acknowledgedAt ? new Date(pr.acknowledgedAt) : null,
  };
}

function dehydratePoint(
  point: E1RMHistoryPoint,
): StoredE1RM['points'][number] {
  return { ...point, computedAt: point.computedAt.toISOString() };
}

function dehydratePR(
  pr: PRBreakthroughEvent,
): StoredE1RM['prs'][number] {
  return {
    ...pr,
    occurredAt: pr.occurredAt.toISOString(),
    acknowledgedAt: pr.acknowledgedAt?.toISOString() ?? null,
  };
}

let mutationChain: Promise<void> = Promise.resolve();

function mutate(
  operation: (stored: StoredE1RM) => void | false | Promise<void | false>,
): Promise<void> {
  const task = mutationChain.then(async () => {
    const stored = await readE1RM();
    if (await operation(stored) === false) return;
    stored.revision = (stored.revision ?? 0) + 1;
    await AsyncStorage.setItem(STORAGE_KEYS.e1rm, JSON.stringify(stored));
  });
  mutationChain = task.catch(() => undefined);
  return task;
}

export class AsyncStorageE1RMRepository implements E1RMRepository {
  async historySnapshot(studentId: string): Promise<E1RMHistorySnapshot> {
    await mutationChain;
    const stored = await readE1RM();
    return {
      points: stored.points.filter(point => point.studentId === studentId).map(hydratePoint),
      revision: stored.revision ?? 0,
    };
  }

  async replaceHistoryIfUnchanged(
    studentId: string,
    points: readonly E1RMHistoryPoint[],
    revision: number,
  ): Promise<boolean> {
    let replaced = false;
    await mutate(stored => {
      if ((stored.revision ?? 0) !== revision) return false;
      stored.points = [
        ...stored.points.filter(point => point.studentId !== studentId),
        ...points.filter(point => point.studentId === studentId).map(dehydratePoint),
      ];
      replaced = true;
    });
    return replaced;
  }

  async recordPoint(point: E1RMHistoryPoint): Promise<void> {
    await mutate((stored) => {
      stored.points.push(dehydratePoint(point));
    });
  }

  async upsertPoint(point: E1RMHistoryPoint): Promise<E1RMHistoryPoint> {
    let result = point;
    await mutate((stored) => {
      const index = stored.points.findIndex(
        (candidate) =>
          candidate.studentId === point.studentId &&
          candidate.setLogId === point.setLogId,
      );
      if (index < 0) {
        stored.points.push(dehydratePoint(point));
        return;
      }
      result = { ...point, id: stored.points[index].id };
      stored.points[index] = dehydratePoint(result);
    });
    return result;
  }

  async updatePointConfidence(
    studentId: string,
    pointIds: ReadonlySet<string>,
    confidence: E1RMConfidence,
  ): Promise<void> {
    await mutate((stored) => {
      stored.points = stored.points.map((point) =>
        point.studentId === studentId &&
        point.origin === 'imported' &&
        pointIds.has(point.id)
          ? { ...point, confidence }
          : point,
      );
    });
  }

  async replaceHistory(
    studentId: string,
    points: readonly E1RMHistoryPoint[],
  ): Promise<void> {
    await mutate((stored) => {
      stored.points = [
        ...stored.points.filter((point) => point.studentId !== studentId),
        ...points
          .filter((point) => point.studentId === studentId)
          .map(dehydratePoint),
      ];
      stored.prs = stored.prs.filter((event) => event.studentId !== studentId);
    });
  }

  async fetchHistory(
    studentId: string,
    exerciseId: string,
  ): Promise<E1RMHistoryPoint[]> {
    const stored = await readE1RM();
    return stored.points
      .map(hydratePoint)
      .filter(
        (point) =>
          point.studentId === studentId && point.exerciseId === exerciseId,
      )
      .sort((a, b) => a.computedAt.getTime() - b.computedAt.getTime());
  }

  async fetchHistories(
    studentId: string,
    exerciseIds: readonly string[],
  ): Promise<Map<string, E1RMHistoryPoint[]>> {
    const histories = new Map<string, E1RMHistoryPoint[]>();
    await Promise.all(
      exerciseIds.map(async (exerciseId) => {
        histories.set(exerciseId, await this.fetchHistory(studentId, exerciseId));
      }),
    );
    return histories;
  }

  async maxBefore(
    studentId: string,
    exerciseId: string,
    before: Date,
    excludingImportedSetLogId: string | null = null,
  ): Promise<number | null> {
    const history = await this.fetchHistory(studentId, exerciseId);
    const candidates = history.filter(
      (point) =>
        point.computedAt < before &&
        point.confidence === 'normal' &&
        !(point.origin === 'imported' && point.setLogId === excludingImportedSetLogId),
    );
    return candidates.length
      ? Math.max(...candidates.map((point) => point.e1RMKg))
      : null;
  }

  async recordPR(event: PRBreakthroughEvent): Promise<void> {
    await mutate((stored) => {
      stored.prs.push(dehydratePR(event));
    });
  }

  async unacknowledgedPRs(studentId: string): Promise<PRBreakthroughEvent[]> {
    const stored = await readE1RM();
    return stored.prs
      .map(hydratePR)
      .filter((event) => event.studentId === studentId && !event.acknowledgedAt)
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  }

  async acknowledgePR(eventId: string, acknowledgedAt = new Date()): Promise<void> {
    await mutate((stored) => {
      stored.prs = stored.prs.map((event) =>
        event.id === eventId
          ? { ...event, acknowledgedAt: acknowledgedAt.toISOString() }
          : event,
      );
    });
  }
}

export const trainingE1RMRepository = new AsyncStorageE1RMRepository();

export async function readBoolean(key: string, fallback = false): Promise<boolean> {
  const value = await AsyncStorage.getItem(key);
  return value === null ? fallback : value === 'true';
}

export async function writeBoolean(key: string, value: boolean): Promise<void> {
  await AsyncStorage.setItem(key, String(value));
}

export async function readNumber(key: string): Promise<number | null> {
  const value = await AsyncStorage.getItem(key);
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function readReview(
  studentId: string,
  date: string,
): Promise<SessionReview | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.review(studentId, date));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionReview;
  } catch {
    return null;
  }
}

export async function writeReview(
  studentId: string,
  date: string,
  review: SessionReview,
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.review(studentId, date),
    JSON.stringify(review),
  );
}
