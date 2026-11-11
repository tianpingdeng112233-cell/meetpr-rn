import { describe, expect, test } from '@jest/globals';
import { set } from '@/domain/plan/test-fixtures';
import type { PlanSet } from '@/api/domains/plans';
import { summarizeExercise as summarize, type ExerciseSummaryOptions } from '../exercise-summary';

const summarizeExercise = (sets: Parameters<typeof summarize>[0], logs: Parameters<typeof summarize>[1], suggestions: Parameters<typeof summarize>[2], options: ExerciseSummaryOptions = {}) => summarize(sets, logs, suggestions, { labels: { bodyweight: '自重', freeWeight: '自选', topSet: '顶组', unrecorded: '未记录' }, ...options });

const sets = (count: number, fields: Partial<PlanSet>) => Array.from({ length: count }, (_, index) => set({ ...fields, id: `set-${index}`, set_number: index + 1 }));

describe('107 one-line prescription table', () => {
  test('uniform weight: 4×8 130', () => {
    expect(summarizeExercise(sets(4, { target_reps: 8, target_value: '130' }), [], [])).toEqual([
      { setsReps: '4×8', load: '130', loadParts: [{ text: '130', changed: false }], repsChanged: false, short: false, loadChanged: false, intensityOnly: false },
    ]);
  });
});

test('per-set weights compress only consecutive equal weights', () => {
  const planned = sets(3, { target_reps: 3, target_value: '135' });
  planned[2].target_value = '120';
  expect(summarizeExercise(planned, [], [])).toMatchObject([{ setsReps: '3×3', load: '135×2 / 120' }]);
});
test('different rep sections keep weights paired in prescription order', () => {
  const planned = [set({ target_reps: 1, target_value: '150' }), ...sets(3, { target_reps: 3, target_value: '135' }).map(s => ({ ...s, set_number: s.set_number + 1 }))];
  expect(summarizeExercise(planned, [], [])).toMatchObject([{ setsReps: '1×1', load: '150' }, { setsReps: '3×3', load: '135' }]);
});

test.each([
  ['weight range', 4, { target_reps: 5, load_mode: 'weight_range', weight_low: '100', weight_high: '110' }, '4×5', '100–110'],
  ['rep range', 3, { target_reps: 8, target_reps_max: 10, target_value: '60' }, '3×8–10', '60'],
  ['AMRAP', 1, { target_reps: 5, set_type: 'amrap', target_value: '100' }, '1×5+', '100'],
  ['bodyweight', 3, { target_reps: 10, load_mode: 'bodyweight' }, '3×10', '自重'],
  ['bodyweight plus load', 3, { target_reps: 8, load_mode: 'bodyweight', target_weight: '10' }, '3×8', '自重+10'],
] satisfies [string, number, Partial<PlanSet>, string, string][])('%s preserves the written prescription', (_, count, fields, setsReps, load) => {
  expect(summarizeExercise(sets(count, fields), [], [])).toMatchObject([{ setsReps, load }]);
});

test.each([
  ['free weight and effort', 4, { target_reps: 12, load_mode: 'free_weight', target_rpe: '8' }, '4×12', '自选 · RPE 8'],
  ['uniform RPE', 3, { target_reps: 5, load_mode: 'rpe', target_rpe: '8' }, '3×5', 'RPE 8'],
  ['RPE range', 3, { target_reps: 5, load_mode: 'rpe_range', rpe_low: '7', rpe_high: '8' }, '3×5', 'RPE 7–8'],
  ['RIR', 3, { target_reps: 10, load_mode: 'rir', rir_target: 2 }, '3×10', 'RIR 2'],
] satisfies [string, number, Partial<PlanSet>, string, string][])('%s uses the intensity style', (_, count, fields, setsReps, load) => {
  expect(summarizeExercise(sets(count, fields), [], [])).toMatchObject([{ setsReps, load, intensityOnly: true }]);
});
test('2A varying RPE stays verbatim even when historical weight suggestions exist', () => {
  const planned = sets(4, { target_reps: 12, load_mode: 'rpe' }).map((s, i) => ({ ...s, target_rpe: ['6', '7', '8', '8'][i] }));
  expect(summarizeExercise(planned, [], planned.map(s => ({ plan_set_id: s.id, weight_kg: '100' }))))
    .toMatchObject([{ setsReps: '4×12', load: 'RPE 6/7/8/8', intensityOnly: true }]);
});
test('1A weight plus uniform RPE keeps both; varying RPE is only in expanded sets', () => {
  const planned = sets(4, { target_reps: 5, load_mode: 'fixed_weight', target_weight: '100', target_rpe: '7' });
  expect(summarizeExercise(planned, [], [])).toMatchObject([{ setsReps: '4×5', load: '100 · RPE 7', intensityOnly: false }]);
  planned[1].target_rpe = '8';
  expect(summarizeExercise(planned, [], [])).toMatchObject([{ setsReps: '4×5', load: '100' }]);
});

test.each(['one_rm', 'e1rm'] as const)('percentage %s 107-6 shows only resolved weight, or percent if unresolved', anchor => {
  const planned = sets(5, { target_reps: 5, load_mode: 'pct', pct_anchor: anchor, target_pct: '75' });
  expect(summarizeExercise(planned, [], [])).toMatchObject([{ setsReps: '5×5', load: '75%', intensityOnly: true }]);
  expect(summarizeExercise(planned, [], planned.map(s => ({ plan_set_id: s.id, weight_kg: '112.5' }))))
    .toMatchObject([{ setsReps: '5×5', load: '112.5', intensityOnly: false }]);
});
test('top-set percent waits for the top set and then shows its calculated weight', () => {
  const planned = sets(3, { target_reps: 5, load_mode: 'pct', pct_anchor: 'top_set', target_pct: '60' });
  expect(summarizeExercise(planned, [], [])).toMatchObject([{ setsReps: '3×5', load: '60% 顶组' }]);
  expect(summarizeExercise(planned, [], planned.map(s => ({ plan_set_id: s.id, weight_kg: '90' }))))
    .toMatchObject([{ setsReps: '3×5', load: '90' }]);
});

const actual = (index: number, weight: string | null, reps: number, rpe: string | null = null) => ({ set_index: index, weight_kg: weight, reps, rpe });
test('student-added exercise shows unrecorded until entered, then its actual values', () => {
  expect(summarizeExercise([], [], [])).toMatchObject([{ setsReps: '', load: '未记录' }]);
  expect(summarizeExercise([], [actual(0, '20', 10), actual(1, '20', 10)], []))
    .toMatchObject([{ setsReps: '2×10', load: '20' }]);
});
test('recorded values override prescription and suggestions, flag edits and short reps, and preserve explicit nulls', () => {
  const planned = sets(3, { target_reps: 6, target_value: '100' });
  expect(summarizeExercise(planned, [actual(0, '90', 4), actual(1, null, 6)], []))
    .toMatchObject([
      { setsReps: '1×4/6', load: '90', short: true, repsChanged: true, loadChanged: true },
      { setsReps: '2×6', load: '— / 100', loadChanged: true },
    ]);
});
test('recorded RPE-only groups show actual weights and effort instead of the untouched RPE summary', () => {
  const planned = sets(2, { load_mode: 'rpe', target_rpe: '8' });
  expect(summarizeExercise(planned, [actual(0, '92.5', 5, '8'), actual(1, '92.5', 5, '8')], []))
    .toMatchObject([{ setsReps: '2×5', load: '92.5 · RPE 8', intensityOnly: false }]);
});
test('warmups count as ordinary sets and advanced settings do not appear', () => {
  const planned = sets(2, { target_reps: 8, target_value: '60', rest_seconds: 120 });
  planned[0].set_type = 'warmup';
  expect(summarizeExercise(planned, [], [])).toMatchObject([{ setsReps: '2×8', load: '60' }]);
});

test('weight unit follows the student preference while percent and RPE stay unchanged', () => {
  expect(summarizeExercise(sets(2, { target_reps: 5, target_value: '100' }), [], [], { unit: 'lb' }))
    .toMatchObject([{ setsReps: '2×5', load: '220.5' }]);
});

test('1A differing RPE across rep sections is omitted across the entire exercise', () => {
  const planned = [set({ set_number: 1, target_reps: 1, load_mode: 'fixed_weight', target_weight: '150', target_rpe: '8' }), set({ set_number: 2, target_reps: 3, load_mode: 'fixed_weight', target_weight: '135', target_rpe: '7' })];
  expect(summarizeExercise(planned, [], [])).toMatchObject([{ setsReps: '1×1', load: '150' }, { setsReps: '1×3', load: '135' }]);
});
test('only changed load tokens get emphasis when one set differs from the prescription', () => {
  expect(summarizeExercise(sets(3, { target_value: '100' }), [actual(1, '90', 5)], [])[0].loadParts).toEqual([
    { text: '100', changed: false }, { text: ' / ', changed: false },
    { text: '90', changed: true }, { text: ' / ', changed: false }, { text: '100', changed: false },
  ]);
});
