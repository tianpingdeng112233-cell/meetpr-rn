import { expect, test } from '@jest/globals';
import { weightStripModel } from '../weight-strip-model';

test('strip follows local today and active meets independently of the selected training day', () => {
  const base = { today: '2026-11-10', settingOn: false, todayRecord: null, meet: null };
  expect(weightStripModel(base)).toEqual({ kind: 'hidden' });
  expect(weightStripModel({ ...base, settingOn: true })).toMatchObject({ kind: 'weight', weight: null });
  expect(weightStripModel({ ...base, meet: { date: '2026-12-03' } })).toMatchObject({ kind: 'meet-weight', days: 23, weight: null });
  expect(weightStripModel({ ...base, meet: { date: '2026-11-10' }, todayRecord: { recorded_on: '2026-11-10', weight_kg: '77.00' } })).toMatchObject({ kind: 'meet-weight', days: 0, weight: '77.0' });
  expect(weightStripModel({ ...base, meet: { date: '2026-11-09' } })).toEqual({ kind: 'hidden' });
  expect(weightStripModel({ ...base, settingOn: true, todayRecord: { recorded_on: '2026-11-09', weight_kg: '78.00' } })).toMatchObject({ kind: 'weight', weight: null });
});
