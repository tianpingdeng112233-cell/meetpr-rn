import { expect, test } from '@jest/globals';

import { MuscleFatigueSchema } from '@/api/domains/readiness';
import { READINESS_MUSCLES } from '../constants';

test('readiness muscle wire values follow the iOS whitelist in display order', () => {
  expect(READINESS_MUSCLES.map(([key]) => key)).toEqual([
    'quad', 'hamstring', 'glute', 'back', 'chest', 'shoulder', 'triceps', 'core',
  ]);
});

test('muscle fatigue accepts quad and rejects the old plural wire value', () => {
  expect(() => MuscleFatigueSchema.parse({ muscle_group: 'quads', severity: 1 })).toThrow();
  expect(MuscleFatigueSchema.parse({ muscle_group: 'quad', severity: 1 }))
    .toEqual({ muscle_group: 'quad', severity: 1 });
});
