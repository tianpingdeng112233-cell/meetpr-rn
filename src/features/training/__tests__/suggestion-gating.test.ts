import { setLocaleOverride } from '@/i18n';
import { test, expect, beforeEach, afterEach } from '@jest/globals';
import { weightSuggestionOutcome, entryPrefill } from '../suggestion-gating';
import { set } from '@/domain/plan/test-fixtures';
beforeEach(() => setLocaleOverride('en'));
afterEach(() => setLocaleOverride(null));
const input = {
  exercise: {
    id: 'ex',
    plan_day_id: 'day',
    exercise_id: 'squat',
    is_main_lift: true,
    sort_order: 2,
    notes: null,
    sets: [],
  },
  priorDrafts: [],
  sameDayLogs: [],
  historyLogs: [],
  e1RMKg: 200,
  registeredOneRMKg: 200,
  family: 'squat' as const,
};
test('pct resolves its anchor, ignoring legacy projection', () =>
  expect(
    weightSuggestionOutcome({
      ...input,
      planSet: set({ load_mode: 'pct', target_pct: '75' }),
    }).suggestion?.weightKg,
  ).toBe(150));
test.each(['rir', 'rpe_range', 'weight_range'] as const)(
  '%s quietly disables suggestions',
  (load_mode) =>
    expect(
      weightSuggestionOutcome({
        ...input,
        planSet: set({ load_mode, intensity_mode: 'rpe', target_value: '8' }),
      }),
    ).toMatchObject({ suggestion: null, reason: null }),
);
test.each([
  set({ load_mode: 'rpe', target_rpe: '8' }),
  set({ intensity_mode: 'rpe', target_value: '8' }),
])('rpe and legacy retain RTS path', (planSet) =>
  expect(
    weightSuggestionOutcome({ ...input, planSet }).suggestion?.weightKg,
  ).toBeGreaterThan(0),
);
test('target weight blocks any suggestion', () =>
  expect(
    weightSuggestionOutcome({
      ...input,
      planSet: set({
        load_mode: 'pct',
        target_pct: '75',
        target_weight: '170',
      }),
    }).suggestion,
  ).toBeNull());
test('new intensity-only prefill is empty except resolved percentage; explicit zero is faithful', () => {
  expect(
    entryPrefill(set({ load_mode: 'rpe', target_rpe: '8' }), null, {
      weightKg: 150,
      label: 'RTS',
    }),
  ).toBe('');
  expect(
    entryPrefill(set({ load_mode: 'pct', target_pct: '75' }), null, {
      weightKg: 150,
      label: '%',
    }),
  ).toBe('150');
  expect(
    entryPrefill(
      set({ load_mode: 'fixed_weight', target_weight: '0' }),
      null,
      null,
    ),
  ).toBe('0');
});
test('legacy prefill retains the main-lift empty-bar floor and accessory zero', () => {
  expect(
    entryPrefill(
      set({ intensity_mode: 'rpe', target_value: '8' }),
      null,
      null,
      true,
    ),
  ).toBe('20');
  expect(
    entryPrefill(
      set({ intensity_mode: 'rpe', target_value: '8' }),
      null,
      null,
      false,
    ),
  ).toBe('0');
  expect(
    entryPrefill(
      set({ intensity_mode: 'weight', target_value: '10' }),
      '15',
      null,
      true,
    ),
  ).toBe('20');
});
test('missing RPE and invalid reps have their own reasons; sub-6 RPE never estimates', () => {
  expect(
    weightSuggestionOutcome({ ...input, planSet: set({ load_mode: 'rpe' }) })
      .reason,
  ).toBe('This prescription has no RPE');
  expect(
    weightSuggestionOutcome({
      ...input,
      planSet: set({ load_mode: 'rpe', target_rpe: '8', target_reps: 13 }),
    }).reason,
  ).toBe('Prescription reps must be between 1 and 12');
  expect(
    weightSuggestionOutcome({
      ...input,
      planSet: set({ load_mode: 'rpe', target_rpe: '5.5' }),
    }).suggestion,
  ).toBeNull();
});
