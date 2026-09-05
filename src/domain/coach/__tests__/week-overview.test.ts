import { expect, test } from '@jest/globals';
import { makeSummary, pairTrainingDays } from '../week-overview';
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
