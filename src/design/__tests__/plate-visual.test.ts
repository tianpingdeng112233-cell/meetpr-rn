import { expect, test } from '@jest/globals';
import { plateBreakdown, breakdownText, seDimensions } from '../plate-visual';

test('loads 175 kg with three 25 kg plates and one 2.5 kg plate per side', () => {
  expect(plateBreakdown(175, false)).toEqual([25, 25, 25, 2.5]);
});

test('clamps totals and allows collars without plates', () => {
  expect(plateBreakdown(22.5, true)).toEqual([]);
  expect(plateBreakdown(-10, false)).toEqual([]);
  expect(plateBreakdown(600, false)).toEqual([25, 25, 25, 25, 25, 25, 25, 25, 25, 15]);
  expect(plateBreakdown(22.38, false)).toEqual([1.25]);
});

test('aggregates plate sizes into the canonical breakdown line', () => {
  expect(breakdownText([25, 25, 25, 2.5])).toBe('25kg × 3 · 2.5kg × 1');
  expect(breakdownText([1.25])).toBe('1.25kg × 1');
  expect(breakdownText([])).toBe('');
});

test('uses all seven iOS seDimensions', () => {
  expect([25, 20, 15, 10, 5, 2.5, 1.25].map(seDimensions)).toEqual([
    { width: 11, height: 135 }, { width: 8, height: 135 },
    { width: 8, height: 120 }, { width: 8, height: 98 },
    { width: 8, height: 68 }, { width: 6, height: 57 }, { width: 5, height: 48 },
  ]);
});
