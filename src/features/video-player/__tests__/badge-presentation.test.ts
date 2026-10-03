import { expect, test } from '@jest/globals';
import { presentBadge } from '../badge-presentation';

test('trims names and hides missing or blank strings', () => {
  expect(presentBadge({ exerciseName: '' }).exerciseName).toBeNull();
  expect(presentBadge({ exerciseName: ' \n ', coachName: '' })).toMatchObject({ exerciseName: null, coachName: null });
  expect(presentBadge({ exerciseName: ' Squat ', coachName: ' Coach ' })).toMatchObject({ exerciseName: 'Squat', coachName: 'Coach' });
});

test.each([[100, '100'], [82.5, '82.5'], [1000, '1000'], [82.56, '82.6'], [NaN, null], [Infinity, null], [-Infinity, null]])('formats weight %s without grouping', (weightKg, weightText) => {
  expect(presentBadge({ weightKg: weightKg as number }).weightText).toBe(weightText);
});
test.each([[8, '8'], [8.5, '8.5'], [NaN, null], [Infinity, null]])('formats RPE %s', (rpe, rpeText) => {
  expect(presentBadge({ rpe: rpe as number }).rpeText).toBe(rpeText);
});
test('load is present for weight or reps, including zero, and ordinals pass through', () => {
  expect(presentBadge({})).toMatchObject({ weightText: null, rpeText: null, reps: null, hasLoad: false, setOrdinal: null });
  expect(presentBadge({ weightKg: 0 })).toMatchObject({ hasLoad: true, weightText: '0' });
  expect(presentBadge({ reps: 0 })).toMatchObject({ hasLoad: true, reps: 0 });
  expect(presentBadge({ weightKg: 100, reps: 5, setOrdinal: 2 })).toMatchObject({ hasLoad: true, setOrdinal: 2 });
  expect(presentBadge({ setOrdinal: 0 }).setOrdinal).toBe(0);
});
