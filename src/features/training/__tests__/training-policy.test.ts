import { beforeEach, afterEach, describe, expect, test } from '@jest/globals';

import { setLocaleOverride, t } from '@/i18n';
import type { PlanDay, PlanExercise, PlanSet } from '@/api/domains/plans';
import type { SetLog } from '@/api/domains/sets';

import { synthesizeDrafts } from '../drafts';
import {
  plateLoadout,
  gymDayText,
  historyRangeStart,
  resolveRestSeconds,
  currentRestExercise,
  rirCopy,
  selectWeightSuggestion,
} from '../policy';

const exercise: PlanExercise = {
  id: '10000000-0000-4000-8000-000000000001',
  plan_day_id: '10000000-0000-4000-8000-000000000002',
  exercise_id: '10000000-0000-4000-8000-000000000003',
  is_main_lift: true,
  sort_order: 0,
  notes: '控制下放',
  sets: [],
};

function planSet(overrides: Partial<PlanSet> = {}): PlanSet {
  return {
    id: '20000000-0000-4000-8000-000000000001',
    plan_exercise_id: exercise.id,
    set_number: 1,
    target_reps: 5,
    target_reps_max: null,
    intensity_mode: 'rpe',
    target_value: '8.0',
    set_type: 'working',
    rest_seconds: null,
    coach_note: null,
    created_at: '2026-07-19T08:00:00Z',
    ...overrides,
  };
}

function log(overrides: Partial<SetLog> = {}): SetLog {
  return {
    id: '30000000-0000-4000-8000-000000000001',
    student_id: '30000000-0000-4000-8000-000000000002',
    plan_exercise_id: exercise.id,
    exercise_id: exercise.exercise_id,
    set_index: 0,
    weight_kg: '100',
    reps: 5,
    rpe: '8.0',
    completed: true,
    failed: false,
    assumed: false,
    adhoc: false,
    logged_date: '2026-07-19',
    logged_at: '2026-07-19T08:00:00Z',
    ...overrides,
  };
}

describe('plan × log draft synthesis', () => {
  test('joins by plan exercise and zero-based set index while preserving stable plan set id', () => {
    const first = planSet();
    const second = planSet({
      id: '20000000-0000-4000-8000-000000000002',
      set_number: 2,
    });
    const day: PlanDay = {
      id: exercise.plan_day_id,
      plan_id: '40000000-0000-4000-8000-000000000001',
      day_of_week: 1,
      week_number: 1,
      sort_order: 0,
      shifted_to_date: null,
      exercises: [{ ...exercise, sets: [first, second] }],
    };

    const drafts = synthesizeDrafts(day, [log({ set_index: 1, failed: true, completed: false })]);

    expect(drafts.map((draft) => draft.stableSetId)).toEqual([first.id, second.id]);
    expect(drafts.map((draft) => draft.status)).toEqual(['pending', 'failed']);
    expect(drafts[1].weightText).toBe('100');
  });
});

describe('suggested-weight selector', () => {
  test('main lift prefers a completed same-prescription prior set', () => {
    const target = planSet({ id: '20000000-0000-4000-8000-000000000002' });
    const prior = synthesizeDrafts(
      {
        id: exercise.plan_day_id,
        plan_id: '40000000-0000-4000-8000-000000000001',
        day_of_week: 1,
        week_number: 1,
        sort_order: 0,
        shifted_to_date: null,
        exercises: [{ ...exercise, sets: [planSet()] }],
      },
      [log()],
    );
    expect(
      selectWeightSuggestion({
        planSet: target,
        exercise,
        priorDrafts: prior,
        sameDayLogs: [],
        historyLogs: [],
        e1RMKg: 200,
      }),
    ).toEqual({ weightKg: 100, label: '建议 · 同上组' });
  });

  test('main lift otherwise reverses e1RM and rounds down to 2.5 kg', () => {
    expect(
      selectWeightSuggestion({
        planSet: planSet(),
        exercise,
        priorDrafts: [],
        sameDayLogs: [],
        historyLogs: [],
        e1RMKg: 200,
      }),
    ).toEqual({ weightKg: 160, label: '建议 · 基于 e1RM 200' });
  });

  test('accessory prefers same-day recent log, then the 84-day history input', () => {
    const accessory = { ...exercise, is_main_lift: false };
    const sameDay = log({ weight_kg: '72.50', logged_at: '2026-07-19T10:00:00Z' });
    const historical = log({ weight_kg: '67.50', logged_date: '2026-06-19' });
    const input = {
      planSet: planSet(),
      exercise: accessory,
      priorDrafts: [],
      e1RMKg: 300,
    };

    expect(selectWeightSuggestion({ ...input, sameDayLogs: [sameDay], historyLogs: [historical] }))
      .toEqual({ weightKg: 72.5, label: '建议 · 上次重量' });
    expect(selectWeightSuggestion({ ...input, sameDayLogs: [], historyLogs: [historical] }))
      .toEqual({ weightKg: 67.5, label: '建议 · 上次重量' });
  });

  test('does not suggest when the prescription is not RPE-based', () => {
    expect(
      selectWeightSuggestion({
        planSet: planSet({ intensity_mode: 'weight', target_value: '150' }),
        exercise,
        priorDrafts: [],
        sameDayLogs: [log()],
        historyLogs: [log()],
        e1RMKg: 200,
      }),
    ).toBeNull();
  });
});

describe('rest, gym-day, and RIR policies', () => {
  test('coach duration wins over fixed main/accessory settings without RPE tiers', () => {
    const preference = { main: 210, accessory: 90, sound: true, vibration: true };
    expect(resolveRestSeconds({ prescribed: 75, preference, accessory: false })).toBe(75);
    expect(resolveRestSeconds({ prescribed: 75, preference, accessory: true })).toBe(75);
    expect(resolveRestSeconds({ prescribed: null, preference, accessory: false })).toBe(210);
    expect(resolveRestSeconds({ prescribed: null, preference, accessory: true })).toBe(90);
    expect(resolveRestSeconds({ prescribed: 1200, preference, accessory: false })).toBe(900);
    expect(resolveRestSeconds({ prescribed: 0, preference, accessory: true })).toBe(0);
  });

  test('04:00 is the local gym-day boundary', () => {
    const before = new Date(2026, 6, 19, 3, 59, 59);
    const atCutoff = new Date(2026, 6, 19, 4, 0, 0);
    expect(gymDayText(before)).toBe('2026-07-18');
    expect(gymDayText(atCutoff)).toBe('2026-07-19');
  });

  test.each([
    [5, '还剩 4–6 次', '4–6 reps left'],
    [5.5, '还剩 4–6 次', '4–6 reps left'],
    [6, '还剩 4–6 次', '4–6 reps left'],
    [6.5, '还剩 3–4 次', '3–4 reps left'],
    [7, '还剩 3 次', '3 reps left'],
    [7.5, '还剩 2–3 次', '2–3 reps left'],
    [8, '还剩 2 次', '2 reps left'],
    [8.5, '还剩 1–2 次', '1–2 reps left'],
    [9, '还剩 1 次', '1 rep left'],
    [9.5, '做不了下一次，但能再加点重', 'No more reps, but could add a little weight'],
    [10, '做不动了', "Couldn't do another rep"],
  ] as [number, string, string][])('maps RPE %s to the exact RIR copy', (rpe, zh, en) => {
    expect(rirCopy(rpe)).toBe(zh);
    setLocaleOverride('en');
    expect(rirCopy(rpe)).toBe(en);
  });

  test('snaps RIR copy to the nearest half step', () => {
    expect(rirCopy(7.8)).toBe('还剩 2 次');
  });

  test('includes the exact 84-day history boundary', () => {
    expect(historyRangeStart('2026-07-19')).toBe('2026-04-26');
  });
});

// Existing copy assertions pin the original Chinese presentation.
beforeEach(() => setLocaleOverride('zh'));
afterEach(() => setLocaleOverride(null));

test('cycle-wide draft synthesis chooses the newest real log for a stable set', () => {
  const day: PlanDay = { id: exercise.plan_day_id, plan_id: '40000000-0000-4000-8000-000000000001', day_of_week: 1, week_number: 1, sort_order: 0, shifted_to_date: null, exercises: [{ ...exercise, sets: [planSet()] }] };
  const drafts = synthesizeDrafts(day, [
    log({ logged_at: '2026-07-19T08:00:00Z', weight_kg: '100' }),
    log({ logged_at: '2026-07-20T08:00:00Z', weight_kg: '105' }),
    log({ logged_at: '2026-07-21T08:00:00Z', weight_kg: '200', assumed: true }),
  ]);
  expect(drafts[0].weightText).toBe('105');
});


test('plate loadout uses aggregated copy and canonical empty branches', () => {
  setLocaleOverride('en');
  expect(plateLoadout(100, false)).toEqual({ perSideKg: 40, detail: '25kg × 1 · 15kg × 1' });
  expect(plateLoadout(105, true)).toEqual({ perSideKg: 40, detail: '25kg × 1 · 15kg × 1 + 2.5 kg competition collars' });
  expect(plateLoadout(20, false).detail).toBe('Empty 20 kg bar');
  expect(plateLoadout(22.5, true).detail).toBe('2.5 kg competition collars only');
  expect(plateLoadout(21, false).detail).toBe('Empty 20 kg bar');
  expect(plateLoadout(600, false).perSideKg).toBe(240);
  expect(t('designSystem.numberPad.enterWeight')).toBe('Enter weight');
  expect(t('designSystem.action.confirm')).toBe('Confirm');
  expect(t('designSystem.plate.emptyBar')).toBe('Empty 20 kg bar');
});


test('current rest exercise is expanded, then highlighted, then last when all complete', () => {
  const first = { exercise: { ...exercise, id: 'first' }, collapsed: true, node: 'complete' as const };
  const second = { exercise: { ...exercise, id: 'second' }, collapsed: true, node: 'current' as const };
  expect(currentRestExercise([first, second])).toEqual(second.exercise);
  expect(currentRestExercise([{ ...first, collapsed: false }, second])).toEqual(first.exercise);
  expect(currentRestExercise([first, { ...second, node: 'complete' }])).toEqual(second.exercise);
  expect(currentRestExercise([])).toBeNull();
});
