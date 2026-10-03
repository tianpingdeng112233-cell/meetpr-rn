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


test('keeps a short vertical or diagonal start undecided until horizontal intent wins', () => {
  for (const start of [[0, 3], [0, 6], [0, 15], [23, 23]]) {
    let current: ScrubIntent = lockedIntent('idle', start[0], start[1]);
    expect(current).toBe('idle');
    current = lockedIntent(current, 110, start[1]);
    expect(current).toBe('scrub');
    expect(lockedIntent(current, 110, 200)).toBe('scrub');
  }
});

test('hands clearly vertical movement to the page and preserves taps and horizontal half-step scrubbing', () => {
  expect(intent(5.9, -5.9)).toBe('idle');
  expect(intent(6, 0)).toBe('scrub');
  expect(intent(-20, 4)).toBe('scrub');
  expect(intent(4, -40)).toBe('scroll');
  expect(lockedIntent('scroll', 90, 2)).toBe('scroll');
  expect(commitsOnRelease('scroll')).toBe(false);
  expect(commitsOnRelease('scrub')).toBe(false);
  expect(commitsOnRelease('idle')).toBe(true);
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
