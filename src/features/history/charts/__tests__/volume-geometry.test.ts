import { expect, test } from '@jest/globals';

import { volumeScale, compactVolume, rpeY, volumeCenterX, volumeDateLabel, volumeChartGeometry } from '../volume-geometry';

test.each([
  [400, 500, 500], [2500, 1000, 3000], [12000, 5000, 15000],
  [2000, 500, 2000], [10000, 1000, 10000], [0, 500, 500],
])('volume %s uses increment %s and maximum %s', (maximum, increment, volumeMax) => {
  expect(volumeScale(maximum)).toEqual({ increment, volumeMax });
});


test.each([[500, '500'], [1000, '1k'], [1500, '1.5k']])('volume tick %s is displayed as %s', (value, label) => {
  expect(compactVolume(value)).toBe(label);
});


test.each([[5, 92], [7.5, 55], [10, 18], [3, 92], [12, 18]])('RPE %s maps independently to y=%s with clamping', (rpe, y) => {
  expect(rpeY(rpe)).toBe(y);
});


test('one bucket is centered; multiple buckets span the first and last bar slots', () => {
  expect(volumeCenterX(0, 1)).toBe(168);
  expect([0, 1, 2].map(index => volumeCenterX(index, 3))).toEqual([58, 168, 278]);
});


test('date slots use DD/MM and retain alternating invisible labels', () => {
  expect([0, 1, 2, 3, 4, 5].map(index => volumeDateLabel('2026-08-03', index))).toEqual([
    { text: '03/08', opacity: 1 }, { text: '03/08', opacity: 0 },
    { text: '03/08', opacity: 1 }, { text: '03/08', opacity: 0 },
    { text: '03/08', opacity: 1 }, { text: '03/08', opacity: 0 },
  ]);
});


test('volume tick and date fonts keep their point sizes as the canvas grows', () => {
  const geometry = volumeChartGeometry([], 640);
  expect(geometry.axisFontSize).toBe(4.5);
  expect(geometry.dateFontSize).toBe(4);
});
