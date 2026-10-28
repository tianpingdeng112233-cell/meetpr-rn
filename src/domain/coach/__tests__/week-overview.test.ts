import { expect, test } from '@jest/globals';
import { makeSummary, pairTrainingDays } from '../week-overview';
import { QueryClient } from '@tanstack/react-query';
import { projectCoachPlan, loadRosterRows } from '@/features/coach/roster/load-roster';
import { day, plan } from '@/domain/plan/test-fixtures';
const exercise = { id: 'a', plan_day_id: 'd2', exercise_id: 'a', is_main_lift: true, sort_order: 0, notes: null, sets: [] };
const now = new Date(2026, 8, 9, 12);
const date = (day: number) => new Date(2026, 8, day);
test('Monday calendar produces rest, completed, missed and upcoming cells with rounded completion', () => {
  const summary = makeSummary([{ student: { id: 'a', displayName: 'A', status: 'active' }, triageSignals: [], lastActiveAt: null,
    trainingDays: [{ date: date(7), completedLogDates: [new Date(2026, 8, 7, 10)] }, { date: date(8), completedLogDates: [] }, { date: date(10), completedLogDates: [] }] }], now);
  expect(summary.days[0]).toEqual(date(7));
  expect(summary.rows[0].cells.map(cell => cell.kind)).toEqual(['completed', 'missed', 'rest', 'upcoming', 'rest', 'rest', 'rest']);
  expect(summary).toMatchObject({ planned: 3, completed: 1, completionRate: 33, legend: [{ group: 'active', count: 1 }] });
});
test('ISO week belongs to the Thursday year across New Year', () => {
  expect(makeSummary([], new Date(2021, 0, 1)).isoWeek).toBe(53);
  expect(makeSummary([], new Date(2024, 11, 30)).isoWeek).toBe(1);
});
test('pairing includes exactly ±36 hours but same-day aggregation decides completion', () => {
  const planned = date(7);
  const logs = [-36, 0, 36, 36.001].map(hours => ({ completed: true, logged_at: new Date(planned.getTime() + hours * 3600000).toISOString() }));
  expect(pairTrainingDays({ days: [{ date: planned, exercises: [{}] }, { date: date(8), exercises: [] }] }, logs)).toEqual([{ date: planned, completedLogDates: logs.slice(0, 3).map(log => new Date(log.logged_at)) }]);
  const summary = makeSummary([{ student: { id: 'b', displayName: 'B', status: 'active' }, lastActiveAt: null, triageSignals: [{ kind: 'awaitingReply' }], trainingDays: [{ date: planned, completedLogDates: [new Date(2026, 8, 8)] }] }], now);
  expect(summary.rows[0].cells[0]).toEqual({ kind: 'missed', isAttention: true });
  expect(summary.legend).toEqual([{ group: 'attention', count: 1 }]);
  expect(makeSummary([], now).completionRate).toBe(0);
});

test('roster week cells use each day settlement rather than same-date logs for D2 and D4', () => {
  const projected = projectCoachPlan(plan([
    day('d2', { day_of_week: 2, exercises: [exercise], completed_at: null }),
    day('d4', { day_of_week: 4, exercises: [{ ...exercise, id: 'b' }], completed_at: '2026-09-08T12:00:00Z' }),
  ]));
  const logs = [{ completed: true, logged_at: '2026-09-08T12:00:00', plan_exercise_id: 'b' }];
  const summary = makeSummary([{ student: { id: 's', displayName: 'S', status: 'active' }, lastActiveAt: null, triageSignals: [], trainingDays: pairTrainingDays(projected, logs) }], now);
  expect(summary.rows[0].cells[1].kind).toBe('missed');
  expect(summary.rows[0].cells[3].kind).toBe('completed');
  expect(summary).toMatchObject({ completed: 1, planned: 2, completionRate: 50 });
});

test('R1 roster reads student-added logs with their day ownership', async () => {
  const cycle = plan([day('d2', { exercises: [exercise] }), day('d4', { day_of_week: 4, exercises: [{ ...exercise, id: 'b' }] })]);
  const cache = new QueryClient();
  try {
    const rows = await loadRosterRows([{ id: 's', displayName: 'S', status: 'active', evaluationEndAt: null }], now, cache, {
      plan: async () => cycle,
      logs: async (_id, range) => ({ logs: range.scope === 'all' ? [{ id: 'log', student_id: 's', plan_exercise_id: null, exercise_id: 'curl', plan_day_id: 'd4', set_index: 0, weight_kg: '20', reps: 10, rpe: null, completed: true, failed: false, assumed: false, adhoc: true, logged_date: '2026-09-07', logged_at: '2026-09-07T12:00:00' }] : [] }),
      feedback: async () => ({ items: [] }),
    });
    const summary = makeSummary(rows, now);
    expect(summary.rows[0].cells[0].kind).toBe('missed');
    expect(summary.rows[0].cells[3].kind).toBe('completed');
    expect(summary.completed).toBe(1);
  } finally { cache.clear(); }
});
