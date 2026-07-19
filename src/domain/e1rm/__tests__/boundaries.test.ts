import { describe, expect, test } from '@jest/globals';

import { E1RMRecorder, InMemoryE1RMRepository, buildE1RMSeries } from '..';
import type { E1RMConfidence, E1RMHistoryPoint } from '..';

const studentId = 'student-1';
const exerciseId = 'exercise-1';
const now = new Date('2026-07-19T12:00:00.000Z');
const dayMs = 86_400_000;

let sequence = 0;
function nextId(): string {
  sequence += 1;
  return `boundary-${sequence}`;
}

function point({
  e1RMKg,
  daysAgo,
  confidence = 'normal' as E1RMConfidence,
}: {
  e1RMKg: number;
  daysAgo: number;
  confidence?: E1RMConfidence;
}): E1RMHistoryPoint {
  return {
    id: nextId(),
    studentId,
    exerciseId,
    setLogId: nextId(),
    computedAt: new Date(now.getTime() - daysAgo * dayMs),
    e1RMKg,
    sourceWeightKg: e1RMKg,
    sourceReps: 1,
    sourceRPE: 10,
    confidence,
    origin: 'logged',
  };
}

describe('PR boundary semantics', () => {
  test('a tiny first trusted record is still an unconditional PR', async () => {
    const repository = new InMemoryE1RMRepository();
    const recorder = new E1RMRecorder(repository, { idFactory: nextId, now: () => now });

    const event = await recorder.record({
      studentId,
      exerciseId,
      setLogId: nextId(),
      weightKg: 0.4,
      reps: 1,
      rpe: 10,
      completed: true,
      failed: false,
      family: 'squat',
    });

    expect(event).not.toBeNull();
    expect(event?.previousMaxE1RMKg).toBe(0);
  });

  test('an improvement inside the noise band over an existing record is not a PR', async () => {
    const base = {
      studentId,
      exerciseId,
      reps: 1,
      rpe: 10,
      completed: true,
      failed: false,
      family: 'squat' as const,
    };

    // Non-PR points still enter history and raise previousMax, so each edge
    // case gets its own fresh baseline of exactly 100kg.
    // noise band = max(0.5, 100 * 0.03) = 3kg; <= semantics: 103 is NOT a PR.
    const cases: { weightKg: number; isPR: boolean }[] = [
      { weightKg: 102, isPR: false },
      { weightKg: 103, isPR: false },
      { weightKg: 103.5, isPR: true },
    ];
    for (const edge of cases) {
      const freshRepository = new InMemoryE1RMRepository();
      const freshRecorder = new E1RMRecorder(freshRepository, {
        idFactory: nextId,
        now: () => now,
      });
      const first = await freshRecorder.record({ ...base, setLogId: nextId(), weightKg: 100 });
      expect(first).not.toBeNull();

      const followUp = await freshRecorder.record({
        ...base,
        setLogId: nextId(),
        weightKg: edge.weightKg,
      });
      if (edge.isPR) {
        expect(followUp).not.toBeNull();
        expect(followUp?.previousMaxE1RMKg).toBe(100);
      } else {
        expect(followUp).toBeNull();
      }
    }
  });
});

describe('rolling window boundary', () => {
  test('a record exactly 28 days old is still inside the smoothed window', () => {
    const oldHigh = point({ e1RMKg: 150, daysAgo: 28 });
    const todayLow = point({ e1RMKg: 100, daysAgo: 0 });

    const series = buildE1RMSeries([oldHigh, todayLow], 'squat');
    const todaySample = series.smoothed.at(-1);

    expect(todaySample?.valueKg).toBe(150);
    expect(todaySample?.winnerPointId).toBe(oldHigh.id);
  });
});
