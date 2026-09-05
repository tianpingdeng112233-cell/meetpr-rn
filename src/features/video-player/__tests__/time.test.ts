import { expect, test } from '@jest/globals';
import { seekTime, timeText } from '../time';
test('time floors seconds and never carries into hours', () => {
  expect([7.9, 74, 0, 5400].map(timeText)).toEqual(['0:07', '1:14', '0:00', '90:00']);
});
test('seek clamps both units including invalid positions and durations', () => {
  expect([-2, 0, 80, NaN, Infinity].map(seconds => seekTime({ seconds }, 60))).toEqual([0, 0, 60, 0, 0]);
  expect(seekTime({ milliseconds: 7900 }, 60)).toBe(7.9);
  expect([-1, 0, Infinity, NaN].map(duration => seekTime({ seconds: 7 }, duration))).toEqual([0, 0, 0, 0]);
});
