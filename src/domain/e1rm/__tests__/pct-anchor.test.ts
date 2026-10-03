import { test, expect } from '@jest/globals';
import { resolvePctAnchor, type PctAnchorInput } from '../pct-anchor';
const input: PctAnchorInput = {
  percentage: 72.5,
  anchor: 'registered_1rm',
  family: 'squat',
  registeredOneRMKg: 200,
  currentE1RMKg: 220,
  exerciseId: 'squat',
  sortOrder: 2,
  sameDaySets: [],
};
test.each([
  ['registered_1rm', 145],
  ['e1rm', 157.5],
] as [PctAnchorInput['anchor'], number][])(
  'resolves %s with 2.5 kg floor',
  (anchor, kg) =>
    expect(resolvePctAnchor({ ...input, anchor }).resolvedKg).toBe(kg),
);
test('top set is max eligible earlier exercise block, not a later/failed/zero-rep/different lift', () => {
  const good = {
    exerciseId: 'squat',
    sortOrder: 1,
    weightKg: 180,
    reps: 1,
    completed: true,
    failed: false,
  };
  expect(
    resolvePctAnchor({
      ...input,
      anchor: 'top_set',
      sameDaySets: [
        good,
        { ...good, weightKg: 190 },
        { ...good, weightKg: 300, sortOrder: 2 },
        { ...good, weightKg: 300, failed: true },
        { ...good, weightKg: 300, reps: 0 },
        { ...good, weightKg: 300, exerciseId: 'bench' },
      ],
    }),
  ).toMatchObject({ resolvedKg: 137.5, anchorKg: 190, source: 'top_set' });
});
test.each([
  [{ family: null }, 'unsupportedExercise'],
  [{ registeredOneRMKg: null }, 'missingRegisteredOneRM'],
  [{ anchor: 'top_set' }, 'topSetNotCompleted'],
] as [Partial<PctAnchorInput>, string][])(
  'explains unresolved %j',
  (fields, reason) =>
    expect(resolvePctAnchor({ ...input, ...fields })).toMatchObject({
      resolvedKg: null,
      reason,
    }),
);
test('e1RM falls back to registered, then unresolved', () => {
  expect(
    resolvePctAnchor({ ...input, anchor: 'e1rm', currentE1RMKg: null }),
  ).toMatchObject({ resolvedKg: 145, source: 'fallbackToRegisteredOneRM' });
  expect(
    resolvePctAnchor({
      ...input,
      anchor: 'e1rm',
      currentE1RMKg: null,
      registeredOneRMKg: null,
    }).reason,
  ).toBe('missingRegisteredOneRM');
});
test.each([0, -1, 0.1])(
  'non-positive rounded weight is null (%s percent)',
  (percentage) =>
    expect(resolvePctAnchor({ ...input, percentage }).resolvedKg).toBeNull(),
);
