import type {
  E1RMConfidence,
  E1RMHistoryPoint,
  PRBreakthroughEvent,
} from './types';

/**
 * Local-first persistence seam. W1 screens can bind this contract to a durable
 * adapter later without changing recorder/series logic.
 */
export interface E1RMHistorySnapshot {
  readonly points: readonly E1RMHistoryPoint[];
  readonly revision: number;
}

export interface E1RMRepository {
  historySnapshot(studentId: string): Promise<E1RMHistorySnapshot>;
  /** Atomic student history replacement; retains all PR events and rejects stale snapshots. */
  replaceHistoryIfUnchanged(
    studentId: string,
    points: readonly E1RMHistoryPoint[],
    revision: number,
  ): Promise<boolean>;
  recordPoint(point: E1RMHistoryPoint): Promise<void>;
  upsertPoint(point: E1RMHistoryPoint): Promise<E1RMHistoryPoint>;
  updatePointConfidence(
    studentId: string,
    pointIds: ReadonlySet<string>,
    confidence: E1RMConfidence,
  ): Promise<void>;
  replaceHistory(studentId: string, points: readonly E1RMHistoryPoint[]): Promise<void>;
  fetchHistory(studentId: string, exerciseId: string): Promise<E1RMHistoryPoint[]>;
  fetchHistories(
    studentId: string,
    exerciseIds: readonly string[],
  ): Promise<Map<string, E1RMHistoryPoint[]>>;
  maxBefore(
    studentId: string,
    exerciseId: string,
    before: Date,
    excludingImportedSetLogId?: string | null,
  ): Promise<number | null>;
  recordPR(event: PRBreakthroughEvent): Promise<void>;
  unacknowledgedPRs(studentId: string): Promise<PRBreakthroughEvent[]>;
  acknowledgePR(eventId: string, acknowledgedAt?: Date): Promise<void>;
}

export class InMemoryE1RMRepository implements E1RMRepository {
  private revision = 0;
  private points: E1RMHistoryPoint[];
  private prEvents: PRBreakthroughEvent[];

  constructor(
    seedPoints: readonly E1RMHistoryPoint[] = [],
    seedPRs: readonly PRBreakthroughEvent[] = [],
  ) {
    this.points = [...seedPoints];
    this.prEvents = [...seedPRs];
  }

  async historySnapshot(studentId: string): Promise<E1RMHistorySnapshot> {
    return { points: this.points.filter(point => point.studentId === studentId), revision: this.revision };
  }

  async replaceHistoryIfUnchanged(
    studentId: string,
    points: readonly E1RMHistoryPoint[],
    revision: number,
  ): Promise<boolean> {
    if (revision !== this.revision) return false;
    this.points = [
      ...this.points.filter(point => point.studentId !== studentId),
      ...points.filter(point => point.studentId === studentId),
    ];
    this.revision += 1;
    return true;
  }

  async recordPoint(point: E1RMHistoryPoint): Promise<void> {
    this.revision += 1;
    this.points.push(point);
  }

  async upsertPoint(point: E1RMHistoryPoint): Promise<E1RMHistoryPoint> {
    this.revision += 1;
    const existingIndex = this.points.findIndex(
      (candidate) =>
        candidate.studentId === point.studentId && candidate.setLogId === point.setLogId,
    );
    if (existingIndex < 0) {
      this.points.push(point);
      return point;
    }

    const replacement = { ...point, id: this.points[existingIndex].id };
    this.points[existingIndex] = replacement;
    return replacement;
  }

  async updatePointConfidence(
    studentId: string,
    pointIds: ReadonlySet<string>,
    confidence: E1RMConfidence,
  ): Promise<void> {
    this.revision += 1;
    this.points = this.points.map((point) =>
      point.studentId === studentId &&
      point.origin === 'imported' &&
      pointIds.has(point.id)
        ? { ...point, confidence }
        : point,
    );
  }

  async replaceHistory(
    studentId: string,
    replacement: readonly E1RMHistoryPoint[],
  ): Promise<void> {
    this.points = [
      ...this.points.filter((point) => point.studentId !== studentId),
      ...replacement.filter((point) => point.studentId === studentId),
    ];
    this.revision += 1;
    this.prEvents = this.prEvents.filter((event) => event.studentId !== studentId);
  }

  async fetchHistory(studentId: string, exerciseId: string): Promise<E1RMHistoryPoint[]> {
    return this.points
      .filter(
        (point) => point.studentId === studentId && point.exerciseId === exerciseId,
      )
      .sort((left, right) => left.computedAt.getTime() - right.computedAt.getTime());
  }

  async fetchHistories(
    studentId: string,
    exerciseIds: readonly string[],
  ): Promise<Map<string, E1RMHistoryPoint[]>> {
    const histories = new Map<string, E1RMHistoryPoint[]>();
    for (const exerciseId of exerciseIds) {
      histories.set(exerciseId, await this.fetchHistory(studentId, exerciseId));
    }
    return histories;
  }

  async maxBefore(
    studentId: string,
    exerciseId: string,
    before: Date,
    excludingImportedSetLogId: string | null = null,
  ): Promise<number | null> {
    const candidates = this.points.filter(
      (point) =>
        point.studentId === studentId &&
        point.exerciseId === exerciseId &&
        point.computedAt.getTime() < before.getTime() &&
        point.confidence === 'normal' &&
        !(
          point.origin === 'imported' && point.setLogId === excludingImportedSetLogId
        ),
    );
    return candidates.length === 0
      ? null
      : Math.max(...candidates.map((point) => point.e1RMKg));
  }

  async recordPR(event: PRBreakthroughEvent): Promise<void> {
    this.revision += 1;
    this.prEvents.push(event);
  }

  async unacknowledgedPRs(studentId: string): Promise<PRBreakthroughEvent[]> {
    return this.prEvents
      .filter((event) => event.studentId === studentId && event.acknowledgedAt === null)
      .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
  }

  async acknowledgePR(eventId: string, acknowledgedAt = new Date()): Promise<void> {
    this.revision += 1;
    this.prEvents = this.prEvents.map((event) =>
      event.id === eventId ? { ...event, acknowledgedAt } : event,
    );
  }
}
