import { expect, test } from '@jest/globals';
import type { E1RMHistoryPoint } from '@/domain/e1rm';
import { growthSourceDetail } from '../source-detail';

const point: E1RMHistoryPoint = {
  id: 'point', studentId: 'student', exerciseId: 'squat', setLogId: 'deleted-log',
  computedAt: new Date('2026-09-12T10:00:00Z'), e1RMKg: 194.8717948718,
  sourceWeightKg: 152, sourceReps: 5, sourceRPE: 8, confidence: 'normal', origin: 'logged',
};

test('a saved estimate keeps its value and calculation when the original set has disappeared', () => {
  const detail = growthSourceDetail(point, [], new Map([['squat', 'Squat']]));
  expect(detail.point.e1RMKg).toBe(194.8717948718);
  expect(detail.exerciseName).toBe('Squat');
  expect(detail.setNumber).toBeNull();
  expect(detail.calculation).toEqual({ kind: 'rts', intensity: 0.78, rpe: 8 });
});

test('a historical result that cannot be reproduced stays explicitly unexplained', () => {
  expect(growthSourceDetail({ ...point, e1RMKg: 250 }, [], new Map()).calculation).toEqual({ kind: 'unavailable' });
  expect(growthSourceDetail({ ...point, sourceRPE: null, e1RMKg: 177.3333333333 }, [], new Map()).calculation).toEqual({ kind: 'epley' });
});

test('coach calibration explains the saved result without replacing student RPE', () => {
  const detail = growthSourceDetail({ ...point, sourceRPE: 9, sourceCoachRPE: 8 }, [], new Map());
  expect(detail.point.sourceRPE).toBe(9);
  expect(detail.calculation).toEqual({ kind: 'rts', intensity: 0.78, rpe: 8 });
});
