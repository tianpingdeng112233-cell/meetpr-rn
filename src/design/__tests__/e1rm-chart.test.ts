import { expect, test } from '@jest/globals';
import { lineSegments, monotonePath, symbolRadius, xTicks, yDomain, yTicks } from '../e1rm-chart';

test('Swift Charts symbol area 36 produces a radius of approximately 3.39 points', () => {
  expect(symbolRadius(36)).toBeCloseTo(3.39, 2);
});

test('Y domain pads the measured range with a five kilogram minimum', () => {
  expect(yDomain([100, 120])).toEqual([95, 125]);
  expect(yDomain([100, 200])).toEqual([85, 215]);
  expect(yDomain([])).toEqual([0, 100]);
});

test('monotone paths handle one, two and three samples and turn without overshoot', () => {
  const points = [{ x: 0, y: 10 }, { x: 30, y: 40 }, { x: 60, y: 10 }];
  for (const count of [1, 2, 3]) expect(monotonePath(points.slice(0, count))).toMatch(/^M/);
  expect(monotonePath(points)).toBe('M 0 10 C 10 20 20 40 30 40 C 40 40 50 20 60 10');
  expect(monotonePath([])).toBe('');
  expect(monotonePath([{ x: 0, y: 10 }, { x: 0, y: 20 }, { x: 30, y: 40 }])).not.toMatch(/NaN|Infinity/);
});

test('line segments retain shared curve tangents and stepEnd holds until the next sample', () => {
  const points = [{ x: 0, y: 10 }, { x: 30, y: 40 }, { x: 60, y: 10 }];
  expect(lineSegments(points, 'curve')).toEqual([
    'M 0 10 C 10 20 20 40 30 40',
    'M 30 40 C 40 40 50 20 60 10',
  ]);
  expect(lineSegments(points.slice(0, 2), 'step')).toEqual(['M 0 10 H 30 V 40']);
});

test('X ticks select four actual dates including both ends, without duplicating sparse dates', () => {
  const dates = Array.from({ length: 7 }, (_, index) => new Date(2026, 8, index + 1));
  expect(xTicks(dates, 4)).toEqual([dates[0], dates[2], dates[4], dates[6]]);
  expect(xTicks([dates[0], dates[0]], 4)).toEqual([dates[0]]);
  expect(xTicks([], 4)).toEqual([]);
});

test('Y ticks use three or four readable integers inside the padded domain', () => {
  for (const domain of [yDomain([100, 120]), yDomain([100, 200]), yDomain([]), yDomain([102.3])]) {
    const ticks = yTicks(domain);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    expect(ticks.length).toBeLessThanOrEqual(4);
    expect(ticks.every((tick) => Number.isInteger(tick) && tick >= domain[0] && tick <= domain[1])).toBe(true);
  }
  expect(yTicks([95, 125])).toEqual([100, 110, 120]);
});
