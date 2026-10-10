import { expect, test } from '@jest/globals';
import type { PlanSet } from '@/api/domains/plans';
import type { SetLog } from '@/api/domains/sets';
import { day, set } from '@/domain/plan/test-fixtures';
import { synthesizeDrafts } from '../drafts';
import { accessoryRows, accessoryRowWritable, accessoryLogRequest, rowsToCompleteAll, isAccessoryExercise } from '../accessory-quick-log';

test.each<[string | null | undefined, boolean]>([
  ['accessory', true], ['main_lift', false], ['main_lift_variation', false],
  ['unknown', false], [null, false], [undefined, false],
])('catalog type %s is accessory: %s', (type, expected) => {
  expect(isAccessoryExercise(type)).toBe(expected);
});

const exercise = { id: 'exercise', plan_day_id: 'day', exercise_id: 'row', is_main_lift: true, sort_order: 0, notes: null, sets: [] };
function drafts(prescriptions: Partial<PlanSet>[], logs: SetLog[] = []) {
  return synthesizeDrafts(day('day', { exercises: [{ ...exercise, sets: prescriptions.map((value, index) =>
    set({ id: `set-${index}`, set_number: index + 1, target_value: '25', target_reps: 12, ...value })) }] }), logs);
}
function log(overrides: Partial<SetLog> = {}): SetLog {
  return { id: 'log', student_id: 'student', plan_exercise_id: 'exercise', exercise_id: 'row', set_index: 0,
    weight_kg: '30.00', reps: 10, rpe: '7.5', completed: true, failed: false, assumed: false, adhoc: false,
    logged_date: '2026-10-08', logged_at: '2026-10-08T12:00:00Z', ...overrides };
}

test('fixed prescriptions prefill each row without inventing previous logs or student RPE', () => {
  const rows = accessoryRows({ drafts: drafts([{}, { load_mode: 'fixed_weight', target_weight: '27.5' }]), previousLogs: [], unit: 'kg' });
  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({ stableSetId: 'set-0', setIndex: 0, status: 'pending', hasVideo: false,
    weightText: '25', weightPlaceholder: '', repsText: '12', rpeText: '', rpePlaceholder: '',
    isBodyweight: false, previous: null, extraNote: null, unit: 'kg' });
  expect(rows[1]).toMatchObject({ stableSetId: 'set-1', setIndex: 1, weightText: '27.5' });
});

test('RPE, RIR and range prescriptions leave weight empty and match previous logs by set index', () => {
  const rows = accessoryRows({ drafts: drafts([
    { intensity_mode: 'rpe', target_value: '8.0' },
    { load_mode: 'rir', rir_target: 2 },
    { load_mode: 'weight_range', weight_low: '20', weight_high: '30' },
  ]), previousLogs: [log({ set_index: 1, weight_kg: '35', reps: 8 }), log()], unit: 'kg' });
  expect(rows[0]).toMatchObject({ weightText: '', weightPlaceholder: '30', rpeText: '', rpePlaceholder: '8', previous: { weightText: '30', reps: 10 } });
  expect(rows[1]).toMatchObject({ weightText: '', weightPlaceholder: '35', rpeText: '', rpePlaceholder: { kind: 'rir', value: 2 }, previous: { weightText: '35', reps: 8 } });
  expect(rows[2]).toMatchObject({ weightText: '', weightPlaceholder: '', rpePlaceholder: '', previous: null });
});

test('existing complete, failed and cancelled logs override prescriptions and carry caller video flags', () => {
  const input = drafts([
    { intensity_mode: 'rpe', target_value: '8' }, {}, {},
  ], [log(), log({ set_index: 1, completed: false, failed: true, rpe: null, reps: 0 }),
    log({ set_index: 2, completed: false, weight_kg: '22.5', rpe: '0' })]);
  const rows = accessoryRows({ drafts: input, previousLogs: [], unit: 'kg', videoById: { 'set-0': true } });
  expect(rows[0]).toMatchObject({ status: 'complete', hasVideo: true, weightText: '30', repsText: '10', rpeText: '7.5', rpePlaceholder: '8' });
  expect(rows[1]).toMatchObject({ status: 'failed', hasVideo: false, weightText: '30', repsText: '0', rpeText: '' });
  expect(rows[2]).toMatchObject({ status: 'pending', weightText: '22.5', repsText: '10', rpeText: '0' });
});

test.each<[string | null, boolean, string | null]>([
  ['自重', true, null], ['  BODYWEIGHT tempo 3-1-1  ', true, null],
  ['  tempo 3-1-1  ', false, '  tempo 3-1-1  '], ['  ', false, null], [null, false, null],
])('group note %s controls bodyweight and the extra note', (coach_note, isBodyweight, extraNote) => {
  const [row] = accessoryRows({ drafts: drafts([{ coach_note }], [log()]), previousLogs: [], unit: 'kg' });
  expect(row).toMatchObject({ isBodyweight, extraNote, weightText: isBodyweight ? 'BW' : '30' });
});

test('lb rows convert prescriptions, saved weights and previous weights with existing metric formatting', () => {
  const rows = accessoryRows({ drafts: drafts([{}, {}, { target_value: '0' }], [log({ set_index: 1 })]),
    previousLogs: [log({ weight_kg: '20' }), log({ set_index: 2, weight_kg: '0' })], unit: 'lb' });
  expect(rows[0]).toMatchObject({ weightText: '55.1', weightPlaceholder: '44.1', previous: { weightText: '44.1', reps: 10 } });
  expect(rows[1]).toMatchObject({ weightText: '66.1' });
  expect(rows[2]).toMatchObject({ weightText: '0', weightPlaceholder: '0' });
});

const validEdit = { weightText: '25', repsText: '12', rpeText: '' };
test.each<[keyof typeof validEdit, string, boolean]>([
  ['weightText', '', false], ['weightText', '  ', false], ['weightText', '-0.1', false],
  ['weightText', 'Infinity', false], ['weightText', 'NaN', false], ['weightText', 'abc', false],
  ['weightText', '0', true], ['weightText', '2.5', true], ['weightText', '2,5', false],
  ['repsText', '', false], ['repsText', '0', false], ['repsText', '1', true], ['repsText', '99', true],
  ['repsText', '100', false], ['repsText', '1.5', false], ['repsText', 'Infinity', false],
  ['rpeText', '', true], ['rpeText', '0', true], ['rpeText', '10', true], ['rpeText', '7.5', true],
  ['rpeText', '-0.1', false], ['rpeText', '10.1', false], ['rpeText', 'NaN', false], ['rpeText', 'Infinity', false],
  ['rpeText', ' ', true],
])('writability of %s=%s matches quick-log validation', (field, value, writable) => {
  const [row] = accessoryRows({ drafts: drafts([{}]), previousLogs: [], unit: 'kg' });
  expect(accessoryRowWritable(row, { ...validEdit, [field]: value })).toEqual({ writable, invalidFields: writable ? [] : [field] });
});

test('bodyweight ignores weight validation but reports every invalid reps/RPE field', () => {
  const [row] = accessoryRows({ drafts: drafts([{ coach_note: 'bodyweight' }]), previousLogs: [], unit: 'kg' });
  expect(accessoryRowWritable(row, { ...validEdit, weightText: 'BW' })).toEqual({ writable: true, invalidFields: [] });
  expect(accessoryRowWritable(row, { weightText: 'invalid', repsText: '0', rpeText: '11' }))
    .toEqual({ writable: false, invalidFields: ['repsText', 'rpeText'] });
});

test.each<[string, string | null]>([['', null], ['8.5', '8.5'], ['0', '0']])('complete request uses edited values and RPE %s, like set-save', (rpeText, rpe) => {
  const [row] = accessoryRows({ drafts: drafts([{}]), previousLogs: [], unit: 'kg' });
  expect(accessoryLogRequest(row, { weightText: '27.50', repsText: '9', rpeText }, { planExerciseId: 'exercise', loggedDate: '2026-10-09' }))
    .toEqual({ plan_exercise_id: 'exercise', set_index: 0, logged_date: '2026-10-09', weight_kg: '27.5', reps: 9, rpe, completed: true, failed: false });
  expect(accessoryLogRequest(row, validEdit, { planExerciseId: 'exercise' })).not.toHaveProperty('logged_date');
});

test('cancel preserves exact stored kg/reps/RPE even when the displayed lb values were rounded or edited', () => {
  const [row] = accessoryRows({ drafts: drafts([{}], [log({ weight_kg: '32.25' })]), previousLogs: [], unit: 'lb' });
  expect(accessoryLogRequest(row, { ...validEdit, weightText: '99', repsText: '99' }, { planExerciseId: 'exercise', action: 'cancel' }))
    .toEqual({ plan_exercise_id: 'exercise', set_index: 0, weight_kg: '32.25', reps: 10, rpe: '7.5', completed: false, failed: false });
  expect(accessoryLogRequest(row, validEdit, { planExerciseId: 'exercise' })).toMatchObject({ completed: true, failed: false });
  expect(() => accessoryLogRequest({ ...row, hasVideo: true }, validEdit, { planExerciseId: 'exercise', action: 'cancel' }))
    .toThrow('Cannot cancel this set');
});

test('requests write bodyweight as zero and convert lb to kg using the existing rounded metric conversion', () => {
  const [bodyweight, weighted] = accessoryRows({ drafts: drafts([{ coach_note: '自重' }, {}]), previousLogs: [], unit: 'lb' });
  expect(accessoryLogRequest(bodyweight, { ...validEdit, weightText: 'BW' }, { planExerciseId: 'exercise' }).weight_kg).toBe('0');
  expect(accessoryLogRequest(weighted, { ...validEdit, weightText: '55.1' }, { planExerciseId: 'exercise' }).weight_kg).toBe('25');
  expect(accessoryLogRequest(weighted, { ...validEdit, weightText: '0' }, { planExerciseId: 'exercise' }).weight_kg).toBe('0');
  expect(accessoryLogRequest(weighted, { ...validEdit, weightText: '1e2' }, { planExerciseId: 'exercise' }).weight_kg).toBe('45.4');
  expect(() => accessoryLogRequest(weighted, { ...validEdit, weightText: '' }, { planExerciseId: 'exercise' })).toThrow('Invalid set input');
});

test('complete-all selects only valid pending rows in set order and returns every skipped pending row', () => {
  const rows = accessoryRows({ drafts: drafts([{}, {}, { intensity_mode: 'rpe', target_value: '8' }, {}, {}, {}],
    [log({ set_index: 0 }), log({ set_index: 3, failed: true, completed: false })]), previousLogs: [], unit: 'kg' });
  const editedById = { 'set-4': { ...validEdit, repsText: '100' }, 'set-5': { ...validEdit, weightText: '30' } };
  const result = rowsToCompleteAll([...rows].reverse(), editedById);
  expect(result.toWrite.map(row => row.stableSetId)).toEqual(['set-1', 'set-5']);
  expect(result.skipped.map(row => row.stableSetId)).toEqual(['set-2', 'set-4']);
  expect(rowsToCompleteAll([rows[2]], { 'set-2': validEdit }).toWrite).toEqual([rows[2]]);
  expect(rowsToCompleteAll([], {})).toEqual({ toWrite: [], skipped: [] });
  expect(rows.map(row => row.setIndex)).toEqual([0, 1, 2, 3, 4, 5]);
});

test('small finite lb inputs never become a different weight through exponent text sanitization', () => {
  const [row] = accessoryRows({ drafts: drafts([{}]), previousLogs: [], unit: 'lb' });
  for (const weightText of ['0.0000001', '1e-7']) {
    expect(accessoryRowWritable(row, { ...validEdit, weightText }).writable).toBe(true);
    expect(accessoryLogRequest(row, { ...validEdit, weightText }, { planExerciseId: 'exercise' }).weight_kg).toBe('0');
  }
});
