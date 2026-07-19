import { E1RM_MATH, E1RM_POLICY } from './constants';
import { createE1RMId } from './id';
import { isE1RMPointEligible } from './policy';
import type {
  E1RMHistoryPoint,
  E1RMIdFactory,
  E1RMSample,
  E1RMSeries,
  LiftFamily,
} from './types';

function sampleFromPoint(point: E1RMHistoryPoint): E1RMSample {
  return {
    sampleId: point.id,
    date: point.computedAt,
    valueKg: point.e1RMKg,
    winnerPointId: point.id,
    winnerOrigin: point.origin,
    winnerConfidence: point.confidence,
  };
}

export function eligibleE1RMPoints(
  points: readonly E1RMHistoryPoint[],
  family: LiftFamily | null,
): E1RMHistoryPoint[] {
  return points
    .filter((point) => isE1RMPointEligible(point, family))
    .sort((left, right) => left.computedAt.getTime() - right.computedAt.getTime());
}

export function trustedEligibleE1RMPoints(
  points: readonly E1RMHistoryPoint[],
  family: LiftFamily | null,
): E1RMHistoryPoint[] {
  return eligibleE1RMPoints(points, family).filter(
    (point) => point.confidence === 'normal',
  );
}

export function buildE1RMSeries(
  points: readonly E1RMHistoryPoint[],
  family: LiftFamily | null,
): E1RMSeries {
  const eligible = eligibleE1RMPoints(points, family);
  const trusted = eligible.filter((point) => point.confidence === 'normal');

  let recordValue = Number.NEGATIVE_INFINITY;
  const records = trusted.flatMap((point) => {
    if (point.e1RMKg <= recordValue) {
      return [];
    }
    recordValue = point.e1RMKg;
    return [sampleFromPoint(point)];
  });

  const rollingWindowMs =
    E1RM_POLICY.rollingWindowDays * E1RM_MATH.millisecondsPerDay;
  const smoothed = trusted.map((samplePoint) => {
    const windowStart = samplePoint.computedAt.getTime() - rollingWindowMs;
    const candidates = trusted.filter((candidate) => {
      const time = candidate.computedAt.getTime();
      // Inclusive start: a record exactly rollingWindowDays old still counts,
      // matching the >= semantics of the 90-day record trajectory window.
      return time >= windowStart && time <= samplePoint.computedAt.getTime();
    });
    const winner = candidates.reduce((currentWinner, candidate) => {
      if (candidate.e1RMKg > currentWinner.e1RMKg) {
        return candidate;
      }
      if (
        candidate.e1RMKg === currentWinner.e1RMKg &&
        candidate.computedAt.getTime() < currentWinner.computedAt.getTime()
      ) {
        return candidate;
      }
      return currentWinner;
    }, samplePoint);
    return {
      sampleId: samplePoint.id,
      date: samplePoint.computedAt,
      valueKg: winner.e1RMKg,
      winnerPointId: winner.id,
      winnerOrigin: winner.origin,
      winnerConfidence: winner.confidence,
    } satisfies E1RMSample;
  });

  const bestPoint = trusted.reduce<E1RMHistoryPoint | null>(
    (best, point) => (best === null || point.e1RMKg > best.e1RMKg ? point : best),
    null,
  );
  const lastPoint = trusted.length === 0 ? null : trusted[trusted.length - 1];
  return {
    smoothed,
    rawEligible: eligible.map(sampleFromPoint),
    records,
    best: bestPoint === null ? null : sampleFromPoint(bestPoint),
    last: lastPoint === null ? null : sampleFromPoint(lastPoint),
    currentKg: smoothed.length === 0 ? null : smoothed[smoothed.length - 1].valueKg,
  };
}

/** Dashboard/Growth headline: the latest all-time trusted record, not rolling current. */
export function displayPoint(series: E1RMSeries): E1RMSample | null {
  return series.records.length === 0 ? null : series.records[series.records.length - 1];
}

function continuationSample(
  record: E1RMSample,
  date: Date,
  usedIds: Set<string>,
  idFactory: E1RMIdFactory,
): E1RMSample {
  let sampleId = idFactory();
  while (usedIds.has(sampleId)) {
    sampleId = idFactory();
  }
  usedIds.add(sampleId);
  return { ...record, sampleId, date };
}

export interface RecordTrajectoryOptions {
  readonly windowStart?: Date | null;
  readonly extendedTo: Date;
  readonly idFactory?: E1RMIdFactory;
}

export function recordTrajectory(
  records: readonly E1RMSample[],
  { windowStart = null, extendedTo, idFactory = createE1RMId }: RecordTrajectoryOptions,
): E1RMSample[] {
  const sortedRecords = [...records].sort(
    (left, right) => left.date.getTime() - right.date.getTime(),
  );
  const latestRecord = sortedRecords[sortedRecords.length - 1];
  if (!latestRecord) {
    return [];
  }

  const usedIds = new Set(sortedRecords.map((record) => record.sampleId));
  let trajectory: E1RMSample[];
  if (windowStart === null) {
    trajectory = [...sortedRecords];
  } else {
    trajectory = sortedRecords.filter(
      (record) => record.date.getTime() >= windowStart.getTime(),
    );
    const establishedRecord = [...sortedRecords]
      .reverse()
      .find((record) => record.date.getTime() <= windowStart.getTime());
    if (
      establishedRecord &&
      establishedRecord.date.getTime() < windowStart.getTime()
    ) {
      trajectory.unshift(
        continuationSample(establishedRecord, windowStart, usedIds, idFactory),
      );
    }
  }

  if (
    latestRecord.date.getTime() < extendedTo.getTime() &&
    trajectory[trajectory.length - 1]?.date.getTime() !== extendedTo.getTime()
  ) {
    trajectory.push(continuationSample(latestRecord, extendedTo, usedIds, idFactory));
  }
  return trajectory;
}

/** Builds the release Dashboard/TrainingHistory 90-day record projection. */
export function ninetyDayRecordTrajectory(
  series: E1RMSeries,
  now: Date,
  idFactory: E1RMIdFactory = createE1RMId,
): E1RMSample[] {
  const windowStart = new Date(
    now.getTime() - E1RM_POLICY.chartWindowDays * E1RM_MATH.millisecondsPerDay,
  );
  return recordTrajectory(series.records, { windowStart, extendedTo: now, idFactory });
}
