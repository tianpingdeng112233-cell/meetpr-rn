import { describe, expect, test } from '@jest/globals';

import {
  E1RMRecorder,
  InMemoryE1RMRepository,
  buildE1RMSeries,
  displayPoint,
  ninetyDayRecordTrajectory,
} from '..';
import type {
  E1RMConfidence,
  E1RMHistoryPoint,
  E1RMRecorderInput,
  PRBreakthroughEvent,
} from '..';

const studentId = 'student-1';
const exerciseId = 'exercise-1';
const now = new Date('2026-07-19T12:00:00.000Z');
const dayMs = 86_400_000;

let fixtureSequence = 0;

function fixtureId(): string {
  fixtureSequence += 1;
  return `fixture-${fixtureSequence}`;
}

function point({
  e1RMKg,
  daysAgo = 1,
  reps = 1,
  rpe = 10,
  confidence = 'normal',
  setLogId = fixtureId(),
  origin = 'logged',
}: {
  e1RMKg: number;
  daysAgo?: number;
  reps?: number;
  rpe?: number | null;
  confidence?: E1RMConfidence;
  setLogId?: string;
  origin?: 'logged' | 'imported';
}): E1RMHistoryPoint {
  return {
    id: fixtureId(),
    studentId,
    exerciseId,
    setLogId,
    computedAt: new Date(now.getTime() - daysAgo * dayMs),
    e1RMKg,
    sourceWeightKg: e1RMKg,
    sourceReps: reps,
    sourceRPE: rpe,
    confidence,
    origin,
  };
}

function input(
  weightKg: number,
  overrides: Partial<E1RMRecorderInput> = {},
): E1RMRecorderInput {
  return {
    studentId,
    exerciseId,
    family: 'squat',
    setLogId: fixtureId(),
    weightKg,
    reps: 1,
    rpe: 10,
    completed: true,
    failed: false,
    ...overrides,
  };
}

function recorder(seed: readonly E1RMHistoryPoint[] = []) {
  const repository = new InMemoryE1RMRepository(seed);
  return {
    repository,
    recorder: new E1RMRecorder(repository, { now: () => now, idFactory: fixtureId }),
  };
}

describe('E1RMRecorder PR policy', () => {
  test('records the first trusted point as the first PR', async () => {
    const context = recorder();
    const event = await context.recorder.record(input(100));

    expect(event).toMatchObject({
      breakthroughE1RMKg: 100,
      previousMaxE1RMKg: 0,
      acknowledgedAt: null,
    });
    expect(await context.repository.fetchHistory(studentId, exerciseId)).toHaveLength(1);
    expect(await context.repository.unacknowledgedPRs(studentId)).toHaveLength(1);
  });

  test('persists a point inside the noise band without emitting PR', async () => {
    const context = recorder([point({ e1RMKg: 200 })]);
    const event = await context.recorder.record(input(204));

    expect(event).toBeNull();
    expect(await context.repository.fetchHistory(studentId, exerciseId)).toHaveLength(2);
  });

  test('emits a normal improvement clearing the noise band', async () => {
    const context = recorder([point({ e1RMKg: 200 })]);
    const event = await context.recorder.record(input(208));

    expect(event).toMatchObject({
      previousMaxE1RMKg: 200,
      breakthroughE1RMKg: 208,
    });
  });

  test('stores soft and hard anomalous jumps as low confidence without PR', async () => {
    const softContext = recorder([point({ e1RMKg: 200 })]);
    const hardContext = recorder([point({ e1RMKg: 200 })]);

    expect(await softContext.recorder.record(input(225))).toBeNull();
    expect(await hardContext.recorder.record(input(250))).toBeNull();
    expect((await softContext.repository.fetchHistory(studentId, exerciseId)).at(-1)?.confidence).toBe(
      'low',
    );
    expect((await hardContext.repository.fetchHistory(studentId, exerciseId)).at(-1)?.confidence).toBe(
      'low',
    );
    expect(await softContext.repository.unacknowledgedPRs(studentId)).toEqual([]);
    expect(await hardContext.repository.unacknowledgedPRs(studentId)).toEqual([]);
  });

  test('low confidence history cannot poison the next PR baseline', async () => {
    const context = recorder([point({ e1RMKg: 200 })]);
    await context.recorder.record(input(350));
    const realPR = await context.recorder.record(input(208));

    expect(realPR?.previousMaxE1RMKg).toBe(200);
    expect(realPR?.breakthroughE1RMKg).toBe(208);
  });

  test('ineligible or invalid sets produce neither point nor PR', async () => {
    const context = recorder();
    expect(await context.recorder.record(input(100, { completed: false }))).toBeNull();
    expect(await context.recorder.record(input(100, { failed: true }))).toBeNull();
    expect(await context.recorder.record(input(100, { reps: 5, rpe: 6 }))).toBeNull();
    expect(
      await context.recorder.record(input(100, { family: 'deadlift', reps: 6, rpe: 9 })),
    ).toBeNull();
    expect(await context.recorder.record(input(0))).toBeNull();
    expect(await context.repository.fetchHistory(studentId, exerciseId)).toEqual([]);
  });

  test('an explicit prior low confidence stays quarantined', async () => {
    const context = recorder();
    expect(
      await context.recorder.record(input(100, { priorConfidence: 'low' })),
    ).toBeNull();
    expect((await context.repository.fetchHistory(studentId, exerciseId))[0].confidence).toBe(
      'low',
    );
  });
});

describe('E1RMSeries projections', () => {
  test('keeps records strict, rolling 28-day max, and all-time record display point', () => {
    const oldRecord = point({ e1RMKg: 180, daysAgo: 60, reps: 5, rpe: 8 });
    const recentValley = point({ e1RMKg: 175, daysAgo: 1, reps: 5, rpe: 8 });
    const series = buildE1RMSeries([recentValley, oldRecord], 'squat');

    expect(series.records.map((sample) => sample.valueKg)).toEqual([180]);
    expect(series.last?.valueKg).toBe(175);
    expect(series.currentKg).toBe(175);
    expect(displayPoint(series)?.winnerPointId).toBe(oldRecord.id);
    expect(displayPoint(series)?.valueKg).toBe(180);
  });

  test('holds a rolling winner inside 28 days and excludes a low-confidence spike', () => {
    const winner = point({ e1RMKg: 185, daysAgo: 20, reps: 5, rpe: 8 });
    const valley = point({ e1RMKg: 175, daysAgo: 10, reps: 5, rpe: 8 });
    const low = point({
      e1RMKg: 320,
      daysAgo: 1,
      reps: 3,
      rpe: 8.5,
      confidence: 'low',
    });
    const series = buildE1RMSeries([winner, valley, low], 'squat');

    expect(series.smoothed.map((sample) => sample.valueKg)).toEqual([185, 185]);
    expect(series.rawEligible.map((sample) => sample.valueKg)).toEqual([185, 175, 320]);
    expect(series.best?.valueKg).toBe(185);
    expect(series.records.map((sample) => sample.valueKg)).toEqual([185]);
  });

  test('projects the trusted record trajectory through the 90-day window', () => {
    const allTime = point({ e1RMKg: 100, daysAgo: 200, reps: 5, rpe: 8 });
    const preWindow = point({ e1RMKg: 140, daysAgo: 100, reps: 5, rpe: 8 });
    const inWindow = point({ e1RMKg: 150, daysAgo: 10, reps: 5, rpe: 8 });
    const series = buildE1RMSeries([inWindow, allTime, preWindow], 'squat');
    const trajectory = ninetyDayRecordTrajectory(series, now, fixtureId);

    expect(trajectory.map((sample) => sample.valueKg)).toEqual([140, 150, 150]);
    expect(trajectory[0].date).toEqual(new Date(now.getTime() - 90 * dayMs));
    expect(trajectory[0].winnerPointId).toBe(preWindow.id);
    expect(trajectory.at(-1)?.date).toEqual(now);
    expect(new Set(trajectory.map((sample) => sample.sampleId)).size).toBe(3);
  });

  test('removes legacy points that fail current eligibility', () => {
    const valid = point({ e1RMKg: 180, daysAgo: 5, reps: 5, rpe: 8 });
    const invalidSpike = point({ e1RMKg: 220, daysAgo: 1, reps: 12, rpe: 10 });
    const series = buildE1RMSeries([valid, invalidSpike], 'squat');

    expect(series.rawEligible.map((sample) => sample.valueKg)).toEqual([180]);
    expect(displayPoint(series)?.valueKg).toBe(180);
  });
});

describe('InMemoryE1RMRepository contract', () => {
  test('sorts history and upserts one set identity with a stable point id', async () => {
    const repository = new InMemoryE1RMRepository();
    const sharedSetLogId = fixtureId();
    const imported = point({
      e1RMKg: 165,
      daysAgo: 3,
      setLogId: sharedSetLogId,
      origin: 'imported',
    });
    const newer = point({ e1RMKg: 170, daysAgo: 1 });
    await repository.recordPoint(newer);
    const inserted = await repository.upsertPoint(imported);

    const replacement: E1RMHistoryPoint = {
      ...imported,
      id: fixtureId(),
      exerciseId: 'exercise-2',
      e1RMKg: 172,
      origin: 'logged',
    };
    const stored = await repository.upsertPoint(replacement);

    expect(stored.id).toBe(inserted.id);
    expect(await repository.fetchHistory(studentId, exerciseId)).toEqual([newer]);
    expect((await repository.fetchHistory(studentId, 'exercise-2'))[0]).toEqual(stored);
  });

  test('replacing one student history also discards only that student PRs', async () => {
    const otherStudentId = 'student-2';
    const event = (id: string, owner: string): PRBreakthroughEvent => ({
      id,
      studentId: owner,
      exerciseId,
      pointId: fixtureId(),
      breakthroughE1RMKg: 100,
      previousMaxE1RMKg: 90,
      occurredAt: now,
      acknowledgedAt: null,
    });
    const repository = new InMemoryE1RMRepository(
      [point({ e1RMKg: 100 })],
      [event('pr-1', studentId), event('pr-2', otherStudentId)],
    );

    await repository.replaceHistory(studentId, []);

    expect(await repository.fetchHistory(studentId, exerciseId)).toEqual([]);
    expect(await repository.unacknowledgedPRs(studentId)).toEqual([]);
    expect(await repository.unacknowledgedPRs(otherStudentId)).toHaveLength(1);
  });
});
