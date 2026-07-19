import { calculateE1RM } from './calculator';
import { createE1RMId } from './id';
import {
  classifyE1RMAnomaly,
  isE1RMEligible,
  prNoiseBand,
} from './policy';
import type { E1RMRepository } from './repository';
import { trustedEligibleE1RMPoints } from './series';
import type {
  E1RMHistoryPoint,
  E1RMIdFactory,
  E1RMRecorderInput,
  PRBreakthroughEvent,
} from './types';

export interface E1RMRecorderOptions {
  readonly now?: () => Date;
  readonly idFactory?: E1RMIdFactory;
}

/** The single path from one completed set to history and an optional PR. */
export class E1RMRecorder {
  private readonly now: () => Date;
  private readonly idFactory: E1RMIdFactory;

  constructor(
    private readonly repository: E1RMRepository,
    { now = () => new Date(), idFactory = createE1RMId }: E1RMRecorderOptions = {},
  ) {
    this.now = now;
    this.idFactory = idFactory;
  }

  async record(input: E1RMRecorderInput): Promise<PRBreakthroughEvent | null> {
    if (
      !isE1RMEligible({
        completed: input.completed,
        failed: input.failed,
        reps: input.reps,
        rpe: input.rpe,
        family: input.family,
      })
    ) {
      return null;
    }

    const estimate = calculateE1RM(input.weightKg, input.reps, input.rpe);
    if (estimate === null) {
      return null;
    }

    try {
      const history = await this.repository.fetchHistory(input.studentId, input.exerciseId);
      const previousTrusted = trustedEligibleE1RMPoints(
        history.filter(
          (point) =>
            !(point.setLogId === input.setLogId && point.origin === 'imported'),
        ),
        input.family,
      );
      const previousMax =
        previousTrusted.length === 0
          ? null
          : Math.max(...previousTrusted.map((point) => point.e1RMKg));
      const verdict = classifyE1RMAnomaly(estimate, previousMax);
      const confidence =
        input.priorConfidence !== 'low' && verdict === 'normal' ? 'normal' : 'low';
      const point: E1RMHistoryPoint = {
        id: this.idFactory(),
        studentId: input.studentId,
        exerciseId: input.exerciseId,
        setLogId: input.setLogId,
        computedAt: this.now(),
        e1RMKg: estimate,
        sourceWeightKg: input.weightKg,
        sourceReps: input.reps,
        sourceRPE: input.rpe,
        confidence,
        origin: 'logged',
      };
      const storedPoint = await this.repository.upsertPoint(point);
      if (confidence !== 'normal') {
        return null;
      }

      return await this.recordPRIfCleared(storedPoint, previousMax);
    } catch {
      // e1RM persistence is best-effort and must never block canonical set logging.
      return null;
    }
  }

  private async recordPRIfCleared(
    point: E1RMHistoryPoint,
    previousMax: number | null,
  ): Promise<PRBreakthroughEvent | null> {
    // A first trusted record is always a PR ("第一个纪录点"); the noise band is
    // an improvement threshold over an existing record, not an entry bar.
    if (previousMax !== null && point.e1RMKg <= previousMax + prNoiseBand(previousMax)) {
      return null;
    }
    const baseline = previousMax ?? 0;

    const event: PRBreakthroughEvent = {
      id: this.idFactory(),
      studentId: point.studentId,
      exerciseId: point.exerciseId,
      pointId: point.id,
      breakthroughE1RMKg: point.e1RMKg,
      previousMaxE1RMKg: baseline,
      occurredAt: point.computedAt,
      acknowledgedAt: null,
    };
    await this.repository.recordPR(event);
    return event;
  }
}
