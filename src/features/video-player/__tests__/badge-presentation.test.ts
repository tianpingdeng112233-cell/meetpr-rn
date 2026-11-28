import { expect, test } from '@jest/globals';
import { presentBadge } from '../badge-presentation';

const full = { exerciseName: ' Squat ', weightKg: 142.5, reps: 3, rpe: 8.5, setOrdinal: 2 };
test('replay includes the set while the same export omits it', () => {
  expect(presentBadge(full, 'playback')).toEqual({
    exerciseName: 'Squat', weightText: '142.5', reps: 3, rpeText: '8.5', setOrdinal: 2,
  });
  expect(presentBadge(full, 'export')?.setOrdinal).toBeNull();
});

test('missing RPE, bodyweight, RPE only and a long exercise name preserve the available values', () => {
  expect(presentBadge({ ...full, rpe: null }, 'playback')?.rpeText).toBeNull();
  expect(presentBadge({ reps: 8 }, 'playback')).toMatchObject({ weightText: null, reps: 8 });
  expect(presentBadge({ rpe: 7 }, 'playback')).toMatchObject({ weightText: null, reps: null, rpeText: '7' });
  const exerciseName = '暂停低杠深蹲（三秒）加阻力带'.repeat(4);
  expect(presentBadge({ exerciseName }, 'export')?.exerciseName).toBe(exerciseName);
});

test('set or coach alone cannot create a badge', () => {
  expect(presentBadge({ exerciseName: ' \n ', setOrdinal: 2, coachName: 'Coach' }, 'playback')).toBeNull();
  expect(presentBadge({}, 'export')).toBeNull();
});

test.each([[0, '0'], [100, '100'], [82.5, '82.5'], [1000, '1000'], [82.56, '82.6'], [NaN, null], [Infinity, null], [-Infinity, null]])('formats weight %s without grouping', (weightKg, weightText) => {
  expect(presentBadge({ weightKg: weightKg as number, reps: 0 }, 'export')?.weightText).toBe(weightText);
});
test.each([[8, '8'], [8.5, '8.5'], [NaN, null], [Infinity, null]])('formats RPE %s', (rpe, rpeText) => {
  expect(presentBadge({ rpe: rpe as number, reps: 0 }, 'export')?.rpeText).toBe(rpeText);
});
