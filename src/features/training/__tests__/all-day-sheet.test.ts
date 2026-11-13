import contract from '../__fixtures__/107-contract-provisional.json';
import { SetLogSchema, SetLogUpsertRequestSchema, WeightSuggestionsSchema } from '@/api/domains/sets';
import { isAsPrescribed } from '@/features/coach/student-detail/presentation';
import { expect, test } from '@jest/globals';
import { day, set } from '@/domain/plan/test-fixtures';
import type { SetLog } from '@/api/domains/sets';
import { addExtraDraft, addStudentExercise } from '../drafts';
import { buildAllDaySheet, completionWrites } from '../all-day-sheet';

const exercise = { id: 'exercise', plan_day_id: 'day', exercise_id: 'squat', sort_order: 0, is_main_lift: true, notes: null,
  sets: [set({ id: 'one', target_value: '100' }), set({ id: 'two', set_number: 2, intensity_mode: 'rpe', target_value: '8' }), set({ id: 'three', set_number: 3, intensity_mode: 'rpe', target_value: '7' })] };
const selected = day('day', { exercises: [exercise] });
const log: SetLog = { id: 'log', student_id: 'student', plan_exercise_id: 'exercise', exercise_id: 'squat', set_index: 0, weight_kg: '92.5', reps: 4, rpe: null, completed: true, failed: false, assumed: false, adhoc: false, logged_date: '2026-11-10', logged_at: '2026-11-10T12:00:00Z' };

test('all-day sheet preserves old actuals and prefills only RPE-only weights from the server suggestion', () => {
  const sheet = buildAllDaySheet(selected, [log], [{ plan_set_id: 'two', weight_kg: '110', source_set_log_id: 'prior', source_logged_date: '2026-11-03' }]);
  expect(sheet.exercises[0].rows.map(row => [row.weightText, row.repsText, row.rpeText])).toEqual([
    ['92.5', '4', ''], ['110', '5', '8'], ['', '5', '7'],
  ]);
  expect(sheet.exercises[0]).toMatchObject({ collapsed: true, node: 'current' });
});


test('completion writes every untouched group including null weight, and exercise completion also updates old records', () => {
  const sheet = buildAllDaySheet(selected, [log], []);
  expect(completionWrites(sheet).map(write => write.request)).toEqual([
    { plan_exercise_id: 'exercise', set_index: 1, weight_kg: null, reps: 5, rpe: '8', actual_rir: null, completed: true, failed: false },
    { plan_exercise_id: 'exercise', set_index: 2, weight_kg: null, reps: 5, rpe: '7', actual_rir: null, completed: true, failed: false },
  ]);
  expect(completionWrites(sheet, 'exercise')[0].request).toMatchObject({ weight_kg: '92.5', reps: 4, rpe: null });
  const checked = buildAllDaySheet(selected, [log], [], { completedExercises: new Set(['exercise']) });
  expect(checked.exercises[0]).toMatchObject({ collapsed: true, node: 'complete', lastSet: { stableSetId: 'three' } });
});

test('a deliberately empty recorded weight stays empty instead of restoring the prescription on upgrade', () => {
  const sheet = buildAllDaySheet(selected, [{ ...log, weight_kg: null }], []);
  expect(sheet.exercises[0].rows[0].weightText).toBe('');
});

test('coach as-prescribed matching accepts ranges and distinguishes empty weight from zero', () => {
  const ranged = set({ load_mode: 'weight_range', target_value: '0', weight_low: '90', weight_high: '100', target_reps: 4, target_reps_max: 6 });
  expect(isAsPrescribed(log, ranged)).toBe(true);
  expect(isAsPrescribed({ ...log, weight_kg: null }, ranged)).toBe(false);
  expect(isAsPrescribed({ ...log, weight_kg: null, reps: 5, rpe: '8' }, set({ intensity_mode: 'rpe', target_value: '8' }))).toBe(true);
});

test('107 provisional backend fixture preserves nullable logs and the suggestion wire shape', () => {
  const actual = SetLogSchema.parse(contract.nullLog);
  expect(actual.weight_kg).toBeNull();
  const suggestions = WeightSuggestionsSchema.parse(contract.suggestionsResponse).suggestions;
  const planned = day(contract.exerciseRef.plan_day_id, { exercises: [{ ...exercise, id: contract.exerciseRef.plan_exercise_id,
    sets: [set({ id: suggestions[0].plan_set_id, intensity_mode: 'rpe', target_value: '8' })] }] });
  expect(buildAllDaySheet(planned, [], suggestions).exercises[0].rows[0].weightText).toBe('92.5');
  expect(buildAllDaySheet(planned, [actual], suggestions).exercises[0].rows[0].weightText).toBe('');
  expect(SetLogUpsertRequestSchema.parse(completionWrites(buildAllDaySheet(planned, [], []))[0].request).weight_kg).toBeNull();
});


test('upgrade and exercise completion retain precise saved weight and effort', () => {
  const sheet = buildAllDaySheet(selected, [{ ...log, weight_kg: '92.25', rpe: '8.25' }], []);
  expect(completionWrites(sheet, 'exercise')[0].request).toMatchObject({ weight_kg: '92.25', rpe: '8.25' });
});

test('all exercises start collapsed while the first unfinished remains current, independent of viewing', () => {
  const second = { ...exercise, id: 'second', sort_order: 1 };
  const third = { ...exercise, id: 'third', exercise_id: 'bench', sort_order: 2 };
  const planned = day('day', { exercises: [exercise, second, third] });
  expect(buildAllDaySheet(planned, [], []).exercises.map(block => [block.collapsed, block.node, block.repeatName]))
    .toEqual([[true, 'current', false], [true, 'pending', true], [true, 'pending', false]]);
  const checked = new Set(['exercise']);
  expect(buildAllDaySheet(planned, [], [], { completedExercises: checked }).exercises.map(block => [block.collapsed, block.node]))
    .toEqual([[true, 'complete'], [true, 'current'], [true, 'pending']]);
  expect(buildAllDaySheet(planned, [], [], { completedExercises: checked, expandedExerciseId: 'exercise' }).exercises.map(block => [block.collapsed, block.node]))
    .toEqual([[false, 'complete'], [true, 'current'], [true, 'pending']]);
  expect(buildAllDaySheet(planned, [], [], { expandedExerciseId: null }).exercises.every(block => block.collapsed)).toBe(true);
});


test('zero required fields: null planned weights are saved, wholly empty added and extra rows are skipped', () => {
  const planned = day('day', { exercises: [{ ...exercise, sets: [set({ id: 'free', load_mode: 'free_weight' }), set({ id: 'rpe', set_number: 2, load_mode: 'rpe', target_rpe: '8' })] }] });
  const base = buildAllDaySheet(planned, [], []).exercises[0].rows;
  const added = addStudentExercise(planned, 'other', base)!;
  const extra = { ...addExtraDraft(planned.exercises[0], base)!, weightText: '', repsText: '', rpeText: '' };
  const sheet = buildAllDaySheet(planned, [], [], { drafts: [...base, added, extra] });
  expect(completionWrites(sheet).map(write => write.request)).toEqual([
    { plan_exercise_id: 'exercise', set_index: 0, weight_kg: null, reps: 5, rpe: null, actual_rir: null, completed: true, failed: false },
    { plan_exercise_id: 'exercise', set_index: 1, weight_kg: null, reps: 5, rpe: '8', actual_rir: null, completed: true, failed: false },
  ]);
  expect(completionWrites(sheet, added.exercise.id)).toEqual([]);
  expect(completionWrites(sheet, exercise.id)).toHaveLength(2);
  expect(completionWrites(buildAllDaySheet(day('empty'), [], []))).toEqual([]);
});

test('a completed day stays complete even if its local optional checks were never selected', () => {
  const sheet = buildAllDaySheet({ ...selected, completed_at: '2026-11-10T13:00:00Z' }, [], [], { completedExercises: new Set() });
  expect(sheet.exercises[0]).toMatchObject({ node: 'complete', collapsed: true });
  expect(buildAllDaySheet({ ...selected, completed_at: '2026-11-10T13:00:00Z' }, [], [], { expandedExerciseId: exercise.id }).exercises[0])
    .toMatchObject({ node: 'complete', collapsed: false });
});

test('empty effort follows coach then remembered exercise type, while actual values keep their type', () => {
  const withCoach = day('day', { exercises: [{ ...exercise, sets: [set({ id: 'one', load_mode: 'rir', rir_target: 2 }), set({ id: 'two', set_number: 2, target_value: '100' })] }] });
  const options = { effortPreferences: { squat: 'rir' as const } };
  const empty = buildAllDaySheet(withCoach, [log], [], options).exercises[0].rows;
  expect(empty.map(row => row.effortKind)).toEqual(['rir', 'rir']);
  const recorded = buildAllDaySheet(withCoach, [{ ...log, rpe: '8' }], [], options).exercises[0].rows[0];
  expect([recorded.effortKind, recorded.rpeText]).toEqual(['rpe', '8']);
  const coachRPE = day('day', { exercises: [{ ...exercise, sets: [set({ id: 'one', intensity_mode: 'rpe', target_value: '7' })] }] });
  expect(buildAllDaySheet(coachRPE, [log], [], options).exercises[0].rows[0].effortKind).toBe('rpe');
});

const accessoryHistory = (logs: SetLog[]) => ({
  logs, studentId: 'student', throughDate: '2026-11-13',
  isAccessory: (id: string) => id === 'row',
});
const accessoryDay = day('current-day', { exercises: [{ ...exercise, id: 'current-exercise',
  plan_day_id: 'current-day', exercise_id: 'row', sets: [0, 1, 2, 3].map(index => set({
    id: `accessory-${index}`, set_number: index + 1, intensity_mode: 'rpe', target_value: '8', target_reps: 12,
  })),
}] });
const previousLog = (index: number, weight: string | null): SetLog => ({ ...log, id: `history-${index}`,
  exercise_id: 'row', plan_exercise_id: 'other-plan-exercise', plan_day_id: 'other-plan-day',
  logged_date: '2026-11-09', logged_at: '2026-11-09T12:00:00Z', set_index: index,
  weight_kg: weight, reps: 10, rpe: '7',
});

test('109 accessory history fills corresponding weights across plans without matching reps or RPE', () => {
  const history = [previousLog(0, '20'), previousLog(1, '20'), previousLog(2, '17.5')];
  const rows = buildAllDaySheet(accessoryDay, [], [], { accessoryHistory: accessoryHistory(history) }).exercises[0].rows;
  expect(rows.map(row => [row.weightText, row.repsText, row.rpeText])).toEqual([
    ['20', '12', '8'], ['20', '12', '8'], ['17.5', '12', '8'], ['', '12', '8'],
  ]);
  expect(rows.map(row => row.weightPrefilledFromHistory)).toEqual([true, true, true, false]);
  expect(rows.map(row => row.sourceLog)).toEqual([null, null, null, null]);
});

test('109 selects a session before matching groups, preserves null and zero, and excludes invalid history', () => {
  const latest = { logged_date: '2026-11-13', logged_at: '2026-11-13T09:00:00Z', plan_exercise_id: 'today-earlier' };
  const invalid = [
    { failed: true }, { assumed: true }, { completed: false }, { student_id: 'someone-else' },
    { exercise_id: 'different' }, { logged_date: '2026-11-14' },
    { plan_exercise_id: 'current-exercise' }, { plan_day_id: 'current-day' },
  ].map(overrides => ({ ...previousLog(0, '99'), ...latest, logged_at: '2026-11-13T15:00:00Z', ...overrides }));
  const history = [previousLog(0, '20'), previousLog(1, '20'), previousLog(2, '17.5'),
    { ...previousLog(0, null), ...latest }, { ...previousLog(1, '0'), ...latest }, ...invalid];
  const rows = buildAllDaySheet(accessoryDay, [], [], { accessoryHistory: accessoryHistory(history) }).exercises[0].rows;
  expect(rows.map(row => row.weightText)).toEqual(['', '0', '', '']);
  expect(rows.map(row => row.previousWeightKg)).toEqual([null, 0, null, null]);
});

test('109 coach, recorded null, edited blank and excluded classifications retain their weight semantics', () => {
  const history = accessoryHistory([previousLog(0, '20')]);
  const configured = (patch: Parameters<typeof set>[0]) => ({ ...accessoryDay,
    exercises: [{ ...accessoryDay.exercises[0], sets: [set({ ...accessoryDay.exercises[0].sets[0], ...patch })] }] });
  expect(buildAllDaySheet(configured({ intensity_mode: 'weight', target_value: '22.5' }), [], [], { accessoryHistory: history })
    .exercises[0].rows[0].weightText).toBe('22.5');
  const actual = { ...previousLog(0, null), plan_exercise_id: 'current-exercise', plan_day_id: 'current-day' };
  expect(buildAllDaySheet(accessoryDay, [actual], [], { accessoryHistory: history }).exercises[0].rows[0].weightText).toBe('');
  expect(buildAllDaySheet(accessoryDay, [{ ...actual, weight_kg: '19' }], [], { accessoryHistory: history }).exercises[0].rows[0].weightText).toBe('19');
  for (const patch of [
    { load_mode: 'bodyweight' as const },
    { load_mode: 'pct' as const, target_pct: '70' },
    { load_mode: 'weight_range' as const, weight_low: '22.5', weight_high: '25' },
  ]) {
    const baseline = buildAllDaySheet(configured(patch), [], []).exercises[0].rows[0];
    const withHistory = buildAllDaySheet(configured(patch), [], [], { accessoryHistory: history }).exercises[0].rows[0];
    expect(withHistory.weightText).toBe(baseline.weightText);
    expect(withHistory.previousWeightKg).toBeUndefined();
    expect(withHistory.weightPrefilledFromHistory).toBeUndefined();
  }
  const baseline = buildAllDaySheet(accessoryDay, [], []).exercises[0].rows;
  for (const weightText of ['', '0', '22.5']) {
    const drafts = [{ ...baseline[0], weightText, weightEdited: true }, ...baseline.slice(1)];
    expect(buildAllDaySheet(accessoryDay, [], [], { drafts, accessoryHistory: history }).exercises[0].rows[0].weightText).toBe(weightText);
  }
  expect(buildAllDaySheet(accessoryDay, [], [], { accessoryHistory: { ...history, isAccessory: () => false } }).exercises[0].rows[0])
    .toMatchObject({ weightText: '' });
  // Legacy cache drafts have no provenance fields and still gain eligible history.
  expect(buildAllDaySheet(accessoryDay, [], [], { drafts: JSON.parse(JSON.stringify(baseline)), accessoryHistory: history })
    .exercises[0].rows[0].weightText).toBe('20');
});

test('109 excludes every current-day exercise slot even when planned logs omit plan_day_id', () => {
  const sameExerciseTwice = { ...accessoryDay, exercises: [accessoryDay.exercises[0],
    { ...accessoryDay.exercises[0], id: 'current-sibling', sort_order: 1 }] };
  for (const plan_day_id of [null, undefined]) {
    const siblingLog = { ...previousLog(0, '99'), plan_exercise_id: 'current-sibling', plan_day_id,
      logged_date: '2026-11-13', logged_at: '2026-11-13T12:00:00Z' };
    const sheet = buildAllDaySheet(sameExerciseTwice, [], [], {
      accessoryHistory: accessoryHistory([previousLog(0, '20'), siblingLog]),
    });
    expect(sheet.exercises.map(block => block.rows[0].weightText)).toEqual(['20', '20']);
  }
});
