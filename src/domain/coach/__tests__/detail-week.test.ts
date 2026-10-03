import { test, expect } from '@jest/globals';
import { day, plan } from '@/domain/plan/test-fixtures';
import type { SetLog } from '@/api/domains/sets';
import { makeExecutionDays, makeOverview, weekStart } from '../detail-week';

test('the detail window stays in the first, current, or final plan week', () => {
  const cycle = plan([day('first'), day('last', { week_number: 2, day_of_week: 5 })]);
  expect(weekStart(cycle, new Date(2026, 8, 1))).toEqual(new Date(2026, 8, 7));
  expect(weekStart(cycle, new Date(2026, 8, 16))).toEqual(new Date(2026, 8, 14));
  expect(weekStart(cycle, new Date(2026, 9, 1))).toEqual(new Date(2026, 8, 14));
});

test('without a plan the window ends today and always fills seven local days', () => {
  const now = new Date(2026, 8, 5, 2);
  expect(weekStart(null, now)).toEqual(new Date(2026, 7, 30));
  const days = makeExecutionDays(null, [], now);
  expect(days).toHaveLength(7);
  expect(days[0]).toMatchObject({ date: new Date(2026, 7, 30), planDay: null, logs: [] });
  expect(days[6].date).toEqual(new Date(2026, 8, 5));
});

const log = (id: string, exercise: string, index: number, time: string, completed = true): SetLog => ({
  id, student_id: 'student', plan_exercise_id: exercise, exercise_id: exercise,
  set_index: index, weight_kg: '100', reps: 5, rpe: null, completed,
  failed: false, assumed: false, adhoc: false, logged_date: '2026-09-06', logged_at: time,
});
test('execution days sort the same exercise by set index and different exercises by time', () => {
  const logs = [log('a2', 'a', 2, '2026-09-07T10:00:00'), log('a0', 'a', 0, '2026-09-07T11:00:00'), log('b', 'b', 0, '2026-09-07T12:00:00')];
  const days = makeExecutionDays(plan([day('first')]), logs, new Date(2026, 8, 7));
  expect(days[0].logs.map(({ id }) => id)).toEqual(['a0', 'a2', 'b']);
  expect(days.slice(1).every((entry) => entry.planDay === null && entry.logs.length === 0)).toBe(true);
});

test('one completed set completes a planned training day, but free logs do not increase planned completion', () => {
  const exercise = { id: 'a', plan_day_id: 'first', exercise_id: 'a', is_main_lift: true, sort_order: 0, notes: null, sets: [] };
  const cycle = plan([day('first', { exercises: [exercise] }), day('second', { day_of_week: 2, exercises: [exercise] })]);
  const logs = [log('a', 'a', 0, '2026-09-07T01:00:00'), log('b', 'a', 0, '2026-09-08T10:00:00', false), log('free', 'other', 0, '2026-09-09T10:00:00')];
  expect(makeOverview(makeExecutionDays(cycle, logs, new Date(2026, 8, 7)), [])).toMatchObject({
    plannedTrainingDays: 2, completedTrainingDays: 1, latestActivityAt: '2026-09-09T10:00:00', latestFeedback: null,
  });
});
