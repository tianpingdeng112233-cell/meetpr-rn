import { expect, test } from '@jest/globals';
import { bodyWeightPresentation, bodyWeightRowValue } from '../body-weight-model';

const records = [
  { recorded_on: '2026-08-01', weight_kg: '84.00' },
  { recorded_on: '2026-11-07', weight_kg: '83.00' },
  { recorded_on: '2026-11-08', weight_kg: '82.25' },
];
const now = new Date(2026, 10, 8, 1);
test('weight presentation keeps latest headline, chronological curve points, reverse records and two-decimal delta', () => {
  const view = bodyWeightPresentation(records, '30', now);
  expect(view.current).toBe('82.25');
  expect(view.points.map(point => [point.recorded_on, point.weight_kg])).toEqual([['2026-11-07', '83.00'], ['2026-11-08', '82.25']]);
  expect(view.records.map(record => record.recorded_on)).toEqual(['2026-11-08', '2026-11-07', '2026-08-01']);
  expect(view.delta).toBe('−0.75');
  expect(view.hasToday).toBe(true);
  expect(view.state).toBe('chart');
  expect(bodyWeightPresentation(records, 'all', now).delta).toBe('−1.75');
});

test('menu latest value uses two decimals; empty or unavailable records use a dash', () => {
  expect(bodyWeightRowValue([...records].reverse())).toBe('82.25 kg');
  expect(bodyWeightRowValue([records[1]])).toBe('83.00 kg');
  expect(bodyWeightRowValue([])).toBe('—');
  expect(bodyWeightRowValue(undefined)).toBe('—');
});

test('empty, single, out-of-range and constant records retain their distinct presentation', () => {
  expect(bodyWeightPresentation([], '30', now)).toMatchObject({ state: 'empty', current: '—', points: [], records: [], hasToday: false, delta: null });
  expect(bodyWeightPresentation([records[1]], '30', now)).toMatchObject({ state: 'single', current: '83.00', points: [records[1]], hasToday: false, delta: null });
  expect(bodyWeightPresentation([records[0]], '90', now)).toMatchObject({ state: 'range-empty', current: '84.00', points: [], delta: null });
  expect(bodyWeightPresentation([records[1], { ...records[2], weight_kg: '83.00' }], '30', now)).toMatchObject({ state: 'chart', delta: '+0.00' });
});
