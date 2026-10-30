import { expect, test } from '@jest/globals';
import { snapped, append } from '@/design/number-pad';
import { day, set } from '@/domain/plan/test-fixtures';
import { synthesizeDrafts } from '../drafts';
import { accessoryRows, accessoryLogRequest } from '../accessory-quick-log';
import { recordedEffort } from '../actual-effort';

test('RIR keypad preserves zero and two, accepts only an integer digit', () => {
  expect(snapped(0, 'rir')).toBe(0);
  expect(snapped(2, 'rir')).toBe(2);
  expect(snapped(12, 'rir')).toBe(9);
  expect(append('2', '.', 'rir')).toBe('2');
  expect(append('2', '2', 'rir')).toBe('2');
});

test('saved RIR survives draft reconstruction and cancellation without becoming RPE', () => {
  const exercise = { id: 'exercise', plan_day_id: 'day', exercise_id: 'row', is_main_lift: false, sort_order: 0, notes: null, sets: [set({load_mode: 'bodyweight', rir_target: 2})] };
  const log = { id: 'log', student_id: 'student', plan_exercise_id: 'exercise', exercise_id: 'row', set_index: 0, weight_kg: '20', reps: 10, rpe: null, actual_rir: 2, completed: true, failed: false, assumed: false, adhoc: false, logged_date: '2026-10-30', logged_at: '2026-10-30T12:00:00Z' };
  const draft = synthesizeDrafts(day('day', { exercises: [exercise] }), [log])[0];
  const row = accessoryRows({ drafts: [draft], previousLogs: [], unit: 'kg', allowsRIR: true })[0];
  expect(row).toMatchObject({ effortKind: 'rir', rpeText: '2' });
  expect(accessoryLogRequest(row, row, { planExerciseId: 'exercise', action: 'cancel' })).toMatchObject({rpe: null, actual_rir: 2, completed: false});
  expect(recordedEffort(log)).toBe('RIR 2');
});

test('saved empty effort never falls back to the coach RPE target', () => {
  const exercise = { id: 'exercise', plan_day_id: 'day', exercise_id: 'row', is_main_lift: false, sort_order: 0, notes: null, sets: [set({ intensity_mode: 'rpe', target_value: '8' })] };
  const log = { id: 'log', student_id: 'student', plan_exercise_id: 'exercise', exercise_id: 'row', set_index: 0, weight_kg: '20', reps: 10, rpe: null, actual_rir: null, completed: true, failed: false, assumed: false, adhoc: false, logged_date: '2026-10-30', logged_at: '2026-10-30T12:00:00Z' };
  const draft = synthesizeDrafts(day('day', { exercises: [exercise] }), [log])[0];
  expect(draft.rpeText).toBe('');
});
