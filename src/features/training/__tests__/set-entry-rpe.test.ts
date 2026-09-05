import { expect, test } from '@jest/globals';
import { barHeight, isLit, snap, index, cellWidth, centerX, valueAtX, intent, lockedIntent, commitsOnRelease, type ScrubIntent } from '../set-entry-rpe';

test('snaps and clamps half steps and maps each stop to its index', () => {
  expect([8.2, 8.3, 8.5, 4, 11, 7.75].map(snap)).toEqual([8, 8.5, 8.5, 5, 10, 8]);
  expect([5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  expect(index(4)).toBe(0);
  expect(index(11)).toBe(10);
});


test('329 pt strip accounts for ten 3 pt gaps and hits the nearest center', () => {
  expect(cellWidth(329, 3)).toBeCloseTo(27.1818181818);
  expect(centerX(0, 329, 3)).toBeCloseTo(13.5909090909);
  expect(centerX(10, 329, 3)).toBeCloseTo(315.4090909091);
  const stops = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
  expect(stops.map((_, i) => valueAtX(centerX(i, 329, 3), 329, 3))).toEqual(stops);
  expect(stops.map(v => valueAtX(centerX(index(v), 329, 3), 329, 3))).toEqual(stops);
  expect(valueAtX(28.181818, 329, 3)).toBe(5);
  expect(valueAtX(29.181818, 329, 3)).toBe(5.5);
  expect(valueAtX((centerX(0, 329, 3) + centerX(1, 329, 3)) / 2, 329, 3)).toBe(5.5);
  expect([-20, 0, 329, 400].map(x => valueAtX(x, 329, 3))).toEqual([5, 5, 10, 10]);
  expect(valueAtX(20, 0, 3)).toBe(5);
  expect(valueAtX(20, 20, 3)).toBe(5);
  expect(valueAtX(20, 30, 3)).toBe(5);
  expect(centerX(5, 20, 3)).toBe(0);
});


test('locks intent at 6 pt, preserves scroll on return, and only commits taps on release', () => {
  expect(intent(5.9, -5.9)).toBe('idle');
  expect(intent(6, 0)).toBe('scrub');
  expect(intent(0, 6)).toBe('scroll');
  expect(intent(10, 10)).toBe('scrub');
  expect(intent(-20, 4)).toBe('scrub');
  expect(intent(4, -20)).toBe('scroll');
  expect(lockedIntent('scrub', 0, 90)).toBe('scrub');
  expect(lockedIntent('scrub', 0, 0)).toBe('scrub');
  expect(lockedIntent('scroll', 90, 2)).toBe('scroll');
  let current: ScrubIntent = 'idle';
  for (const [dx, dy] of [[1, 8], [1, 20], [0, 4], [0, 0]]) current = lockedIntent(current, dx, dy);
  expect(current).toBe('scroll');
  expect(commitsOnRelease(current)).toBe(false);
  expect(commitsOnRelease('scrub')).toBe(false);
  expect(commitsOnRelease('idle')).toBe(true);
  expect(lockedIntent(lockedIntent('idle', 2, 1), 18, 3)).toBe('scrub');
});


test('emphasizes the selected bar and lights all lower stops', () => {
  expect(barHeight(8.5, 8.5)).toBe(32);
  expect(barHeight(8, 8.5)).toBe(22);
  expect(barHeight(7.5, 8.5)).toBe(13);
  expect(barHeight(8, 8.2)).toBe(32);
  expect(isLit(8.5, 8.5)).toBe(true);
  expect(isLit(5, 8.5)).toBe(true);
  expect(isLit(9, 8.5)).toBe(false);
});
