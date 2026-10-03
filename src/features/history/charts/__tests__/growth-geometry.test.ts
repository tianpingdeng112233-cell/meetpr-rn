import { expect, test } from '@jest/globals';

import { growthValueDomain, growthChartDateAxis, plotPoint, currentPointLabel, formingTrendGeometry, growthChartGeometry } from '../growth-geometry';

test('growth domain leaves more room below the recorded values than above', () => {
  expect(growthValueDomain([100, 120])).toEqual({ low: 92, high: 123.4 });
});

test('flat, sub-kilogram, and empty histories retain a finite padded domain', () => {
  expect(growthValueDomain([100])).toEqual({ low: 98.65, high: 101.12 });
  expect(growthValueDomain([100, 100.5])).toEqual({ low: 98.65, high: 101.62 });
  expect(growthValueDomain([])).toEqual({ low: -1.35, high: 1.12 });
});


test('date axis sorts the combined history and bisects its endpoints', () => {
  const start = new Date('2026-08-01T12:00:00Z');
  const end = new Date('2026-08-03T12:00:00Z');
  expect(growthChartDateAxis([end, start])).toEqual({ start, end, middle: new Date('2026-08-02T12:00:00Z') });
});

test('identical endpoint dates use one second and a half-second midpoint', () => {
  const start = new Date('2026-08-01T12:00:00Z');
  expect(growthChartDateAxis([start, start])).toEqual({
    start, middle: new Date('2026-08-01T12:00:00.500Z'), end: new Date('2026-08-01T12:00:01Z'),
  });
});


test('plot points map the date and value domain endpoints and clamp time', () => {
  const axis = growthChartDateAxis([new Date(0), new Date(2000)]);
  const domain = { low: 90, high: 130 };
  expect(plotPoint(new Date(0), 90, axis, domain)).toEqual({ x: 46, y: 84 });
  expect(plotPoint(new Date(2000), 130, axis, domain)).toEqual({ x: 300, y: 20 });
  expect(plotPoint(new Date(-1000), 110, axis, domain)).toEqual({ x: 46, y: 52 });
  expect(plotPoint(new Date(3000), 110, axis, domain)).toEqual({ x: 300, y: 52 });
});

test('plot duration has a one-second floor even for a collapsed or sub-second axis', () => {
  const start = new Date(0);
  const axis = { start, end: start, middle: start };
  expect(plotPoint(start, 110, axis, { low: 90, high: 130 })).toEqual({ x: 46, y: 52 });
  expect(plotPoint(new Date(500), 110, { ...axis, end: new Date(500) }, { low: 90, high: 130 })).toEqual({ x: 173, y: 52 });
});


test('current date label stays inside horizontal bounds and above peak endpoints', () => {
  expect(currentPointLabel({ x: 46, y: 84 })).toEqual({ x: 62, y: 76 });
  expect(currentPointLabel({ x: 300, y: 20 })).toEqual({ x: 286, y: 15 });
  expect(currentPointLabel({ x: 173, y: 52 })).toEqual({ x: 173, y: 44 });
});


test('forming slots follow proportional geometry with a single cubic ghost and a clamped recorded count', () => {
  const geometry = formingTrendGeometry(1000, 100, 2, 3, 103);
  [{ x: 194, y: 62 }, { x: 553, y: 42 }, { x: 912, y: 22 }].forEach((point, index) => {
    expect(geometry.points[index].x).toBeCloseTo(point.x);
    expect(geometry.points[index].y).toBeCloseTo(point.y);
  });
  expect(geometry.control1.x).toBeCloseTo(409.4);
  expect(geometry.control1.y).toBe(58);
  expect(geometry.control2.x).toBeCloseTo(682.24);
  expect(geometry.control2.y).toBeCloseTo(30);
  expect(geometry.visibleCount).toBe(2);
  expect(geometry.axisValues).toEqual([110, 100, 90]);
  expect(formingTrendGeometry(320, 68, 9, 3, null).visibleCount).toBe(3);
  expect(formingTrendGeometry(320, 68, 0, 3, null).axisValues).toBeNull();
});

test('empty date history has the deterministic epoch fallback used by iOS', () => {
  expect(growthChartDateAxis([])).toEqual({ start: new Date(0), middle: new Date(500), end: new Date(1000) });
});


test('fixed-size axis labels compensate for a wider mockup viewport', () => {
  expect(growthChartGeometry([], [], 640).axisFontSize).toBe(4.5);
});
