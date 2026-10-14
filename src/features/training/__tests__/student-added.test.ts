import { expect, test } from '@jest/globals';
import type { SetLog } from '@/api/domains/sets';
import { day, set } from '@/domain/plan/test-fixtures';
import { addExtraDraft, synthesizeDrafts, studentAddedDrafts, addStudentExercise, addStudentSet, studentAddedLogRequest } from '../drafts';
import { accessoryRows, rowsToCompleteAll, accessoryLogRequest } from '../accessory-quick-log';
import { setProgressSegments, needsSetResult } from '../exercise-progress';

const exercise = { id: 'exercise', plan_day_id: 'day', exercise_id: 'squat', is_main_lift: true, sort_order: 0, notes: null, sets: [set({ id: 'one', target_value: '100' }), set({ id: 'two', set_number: 2, target_value: '110' }), set({ id: 'three', set_number: 3, target_value: '120' })] };
const selected = day('day', { exercises: [exercise] });
const log = (index: number, patch: Partial<SetLog> = {}): SetLog => ({ id: `log-${index}`, student_id: 'student', plan_exercise_id: 'exercise', exercise_id: 'squat', set_index: index, weight_kg: '130', reps: 4, rpe: '7', completed: true, failed: false, assumed: false, adhoc: false, logged_date: '2026-10-14', logged_at: '2026-10-14T12:00:00Z', ...patch });

test('extra rows merge after prescriptions with stable identities and never replace missing prescription results', () => {
  const drafts = synthesizeDrafts(selected, [log(0), log(1), log(3)]);
  expect(drafts).toHaveLength(4);
  expect(drafts[3]).toMatchObject({ kind: 'extra', setIndex: 3, weightText: '130', repsText: '4' });
  expect(setProgressSegments(drafts)).toEqual(['complete', 'complete', 'current']);
  expect(drafts.filter(needsSetResult).map(d => d.stableSetId)).toEqual(['three']);
  const extra = addExtraDraft(exercise, drafts)!;
  expect(extra).toMatchObject({ kind: 'extra', setIndex: 4, weightText: '130', repsText: '4', rpeText: '' });
  expect(extra.planSet.rest_seconds).toBeNull();
  const restored = synthesizeDrafts(selected, [log(4)]).find(d => d.setIndex === 4)!;
  expect(restored.stableSetId).toBe(extra.stableSetId);
  const rows = accessoryRows({ drafts: [...drafts, extra], previousLogs: [], unit: 'kg' });
  expect(rowsToCompleteAll(rows, {}).toWrite.map(row => row.setIndex)).toEqual([2]);
  expect(accessoryLogRequest(rows[4], rows[4], { planExerciseId: exercise.id })).toMatchObject({ plan_exercise_id: 'exercise', set_index: 4, weight_kg: '130', reps: 4, rpe: null });
});


test('extra prefill falls back to the last prescription and stops at ten additional rows', () => {
  let rows = synthesizeDrafts(selected, []);
  const first = addExtraDraft(exercise, rows)!;
  expect(first).toMatchObject({ weightText: '120', repsText: '5', rpeText: '' });
  for (let i = 0; i < 10; i++) rows = [...rows, addExtraDraft(exercise, rows)!];
  expect(addExtraDraft(exercise, rows)).toBeNull();
  const rpeExercise = { ...exercise, sets: [set({ intensity_mode: 'rpe', target_value: '8' })] };
  expect(addExtraDraft(rpeExercise, synthesizeDrafts(day('day', { exercises: [rpeExercise] }), []))?.weightText).toBe('');
});

test('student-added cards hydrate by training day and pin every group to the first logged gym-day', () => {
  const logs = [log(0, { plan_exercise_id: null, plan_day_id: 'day', adhoc: true }), log(1, { plan_exercise_id: null, plan_day_id: 'other', adhoc: true })];
  const rows = studentAddedDrafts('day', logs);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ kind: 'added', loggedDate: '2026-10-14', setIndex: 0 });
  const second = addStudentSet(rows[0].exercise, rows)!;
  const row = accessoryRows({ drafts: [second], previousLogs: [log(1)], unit: 'kg' })[0];
  expect(studentAddedLogRequest(second, row, { weightText: '12.5', repsText: '12', rpeText: '' }, 'complete', '2026-10-15'))
    .toEqual({ exercise_id: 'squat', plan_day_id: 'day', logged_date: '2026-10-14', set_index: 1, weight_kg: '12.5', reps: 12, rpe: null, completed: true, failed: false });
  expect(studentAddedLogRequest(rows[0], accessoryRows({ drafts: rows, previousLogs: [], unit: 'kg' })[0], rows[0], 'cancel', '2026-10-15'))
    .toMatchObject({ completed: false, logged_date: '2026-10-14', weight_kg: '130' });
  expect(studentAddedDrafts('other', logs)).toHaveLength(1);
});

test('student-added exercise and set limits are ten and cannot duplicate a planned or already added exercise', () => {
  let rows = studentAddedDrafts('day', []);
  expect(addStudentExercise(selected, 'squat', rows)).toBeNull();
  for (let i = 0; i < 10; i++) rows.push(addStudentExercise(selected, `accessory-${i}`, rows)!);
  expect(addStudentExercise(selected, 'accessory-0', rows)).toBeNull();
  expect(addStudentExercise(selected, 'eleventh', rows)).toBeNull();
  for (let i = 1; i < 10; i++) rows.push(addStudentSet(rows[0].exercise, rows)!);
  expect(addStudentSet(rows[0].exercise, rows)).toBeNull();
});
