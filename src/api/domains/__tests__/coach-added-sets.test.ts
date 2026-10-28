import { expect, test } from '@jest/globals';
import { SetLogSchema } from '../sets';

const id = '10000000-0000-4000-8000-000000000001';
const row = { id, student_id: id, plan_exercise_id: null, exercise_id: id,
  set_index: 0, weight_kg: '20', reps: 10, rpe: null, completed: true,
  failed: false, assumed: false, adhoc: true, logged_date: '2026-09-07', logged_at: '2026-09-07T12:00:00Z' };

test('coach set schema retains plan_day_id and defaults an old backend response to null', () => {
  expect(SetLogSchema.parse({ ...row, plan_day_id: id })).toMatchObject({ plan_day_id: id });
  expect(SetLogSchema.parse(row)).toMatchObject({ plan_day_id: null });
  expect(SetLogSchema.parse({ ...row, plan_day_id: null })).toMatchObject({ plan_day_id: null });
});
