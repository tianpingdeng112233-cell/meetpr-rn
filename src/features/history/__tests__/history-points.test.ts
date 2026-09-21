import { expect, test } from '@jest/globals';
import { InMemoryE1RMRepository, type E1RMHistoryPoint } from '@/domain/e1rm';
import { loadGrowthHistory } from '../history-points';
import { buildGrowthCurves, growthSnapshot } from '../model';
import type { SetLog } from '@/api/domains';

test('growth displays stored points even when their source logs are missing, retaining equal-valued days', async () => {
  const points: E1RMHistoryPoint[] = ['2026-09-10', '2026-09-12', '2026-09-14'].map((date, index) => ({
    id: `saved-${index}`, studentId: 'student', exerciseId: 'squat', setLogId: `missing-${index}`,
    computedAt: new Date(`${date}T12:00:00Z`), e1RMKg: index === 2 ? 195 : 190,
    sourceWeightKg: 152, sourceReps: 5, sourceRPE: 8, confidence: 'normal', origin: 'imported',
  }));
  const repository = new InMemoryE1RMRepository(points);
  const families = new Map([['squat', 'squat' as const]]);
  const saved = await loadGrowthHistory(repository, 'student', [], families);
  const curves = buildGrowthCurves([], families, new Date('2026-09-21'), saved);
  const snapshot = growthSnapshot(curves.squat, 'all');
  expect(snapshot.samples.map(sample => sample.winnerPointId)).toEqual(['saved-0', 'saved-1', 'saved-2']);
  expect(snapshot.samples.map(sample => sample.valueKg)).toEqual([190, 190, 195]);
  expect(snapshot.currentKg).toBe(195);
});

test('imported server calibration retains both RPE sources and an existing saved point is never recalculated', async () => {
  const log: SetLog = { id: 'log', student_id: 'student', plan_exercise_id: null, exercise_id: 'squat', set_index: 0,
    weight_kg: '152', reps: 5, rpe: '9', coach_rpe: '8', completed: true, failed: false, assumed: false, adhoc: true,
    logged_date: '2026-09-14', logged_at: '2026-09-14T12:00:00Z' };
  const repository = new InMemoryE1RMRepository();
  const families = new Map([['squat', 'squat' as const]]);
  const points = await loadGrowthHistory(repository, 'student', [log], families);
  expect(points[0].e1RMKg).toBeCloseTo(194.8718, 4);
  expect(points[0].sourceRPE).toBe(9);
  expect(points[0].sourceCoachRPE).toBe(8);
  const reloaded = await loadGrowthHistory(repository, 'student', [{ ...log, weight_kg: '200' }], families);
  expect(reloaded[0]).toEqual(points[0]);
});

test('a coach-calibrated stored point participates using its effective RPE without rewriting the saved value', () => {
  const point: E1RMHistoryPoint = {
    id: 'calibrated', studentId: 'student', exerciseId: 'squat', setLogId: 'log',
    computedAt: new Date('2026-09-14T12:00:00Z'), e1RMKg: 190,
    sourceWeightKg: 152, sourceReps: 5, sourceRPE: 6, sourceCoachRPE: 8, confidence: 'normal', origin: 'logged',
  };
  const curves = buildGrowthCurves([], new Map([['squat', 'squat']]), new Date('2026-09-21'), [point]);
  expect(growthSnapshot(curves.squat, 'all').currentKg).toBe(190);
});
