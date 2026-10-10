import { expect, test } from '@jest/globals';

import type { OnboardingUpsertInput } from '@/api/domains/onboarding';

import { invalidMeetFields, meetPatch, removeMeetPatch } from '../meet';

test('saves only the three meet fields in an onboarding-compatible patch', () => {
  const patch: OnboardingUpsertInput = meetPatch({
    competitionDate: '2026-12-01', federation: 'IPF', weightClass: '83',
  });
  expect(patch).toEqual({
    is_competing: true, competition_date: '2026-12-01', target_weight_class: 'IPF · 83 kg',
  });
});

test('removes the meet by clearing exactly its three fields', () => {
  const patch: OnboardingUpsertInput = removeMeetPatch();
  expect(patch).toEqual({
    is_competing: false, competition_date: null, target_weight_class: null,
  });
});

const now = new Date(2026, 9, 9, 12);
const validMeet = { competitionDate: '2026-12-01', federation: 'IPF', weightClass: '83' };

test.each<[Parameters<typeof invalidMeetFields>[0], ReturnType<typeof invalidMeetFields>]>([
  [{ competitionDate: '' }, ['competitionDate']],
  [{ competitionDate: null }, ['competitionDate']],
  [{ competitionDate: undefined }, ['competitionDate']],
  [{ federation: null }, ['federation', 'weightClass']],
  [{ federation: undefined }, ['federation', 'weightClass']],
  [{ federation: '' }, ['federation', 'weightClass']],
  [{ federation: 'USPA' }, ['federation', 'weightClass']],
  [{ weightClass: '' }, ['weightClass']],
  [{ weightClass: null }, ['weightClass']],
  [{ weightClass: undefined }, ['weightClass']],
  [{ weightClass: '67.5' }, ['weightClass']],
  [{ competitionDate: '2026-10-08' }, ['competitionDate']],
  [{ competitionDate: '2036-10-10' }, ['competitionDate']],
  [{ competitionDate: '2027-02-29' }, ['competitionDate']],
  [{ competitionDate: '2027-13-01' }, ['competitionDate']],
  [{ competitionDate: '2027-2-01' }, ['competitionDate']],
  [{ competitionDate: 'invalid' }, ['competitionDate']],
  [{ competitionDate: '', federation: null, weightClass: '' }, ['competitionDate', 'federation', 'weightClass']],
])('reports missing or invalid meet fields for %j', (overrides, expected) => {
  expect(invalidMeetFields({ ...validMeet, ...overrides }, now)).toEqual(expected);
});

test.each(['2026-10-09', '2026-12-01', '2028-02-29', '2036-10-09'])(
  'accepts a complete meet on %s including date bounds', (competitionDate) => {
    expect(invalidMeetFields({ ...validMeet, competitionDate }, now)).toEqual([]);
  },
);

test('accepts a class from either sex table', () => {
  expect(invalidMeetFields({ ...validMeet, weightClass: '84+' }, now)).toEqual([]);
});

test('clamps the ten-year date bound for leap day', () => {
  const leapDay = new Date(2028, 1, 29, 12);
  expect(invalidMeetFields({ ...validMeet, competitionDate: '2038-02-28' }, leapDay)).toEqual([]);
  expect(invalidMeetFields({ ...validMeet, competitionDate: '2038-03-01' }, leapDay)).toEqual(['competitionDate']);
});
