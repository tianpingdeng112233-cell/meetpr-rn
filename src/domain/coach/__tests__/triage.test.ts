import { expect, test } from '@jest/globals';
import { triageSignals } from '../triage';
const now = new Date(2026, 8, 9, 12);
const day = (date: string) => ({ date: new Date(`${date}T00:00:00`), exercises: [{}] });
test('one missed day does not alert, two missed days do', () => {
  const input = { now, logs: [], feedback: [] };
  expect(triageSignals({ ...input, plan: { days: [day('2026-09-08')] } })).toEqual([]);
  expect(triageSignals({ ...input, plan: { days: [day('2026-09-07'), day('2026-09-08')] } })).toEqual([{ kind: 'notTrained', daysMissed: 2 }]);
});
test('lookback includes day minus seven and excludes today and day minus eight', () => {
  expect(triageSignals({ now, logs: [], feedback: [], plan: { days: ['2026-09-01', '2026-09-02', '2026-09-08', '2026-09-09'].map(day) } })).toEqual([{ kind: 'notTrained', daysMissed: 2 }]);
});
test('reply requires a recent completed log without equally recent feedback', () => {
  const input = { now, plan: null, feedback: [] };
  expect(triageSignals({ ...input, logs: [] })).toEqual([]);
  expect(triageSignals({ ...input, logs: [{ completed: true, logged_at: new Date(2026, 8, 6, 11, 59).toISOString() }] })).toEqual([]);
  const logs = [{ completed: true, logged_at: new Date(2026, 8, 6, 12).toISOString() }];
  expect(triageSignals({ ...input, logs })).toEqual([{ kind: 'awaitingReply' }]);
  expect(triageSignals({ ...input, logs, feedback: [{ posted_at: logs[0].logged_at }] })).toEqual([]);
  expect(triageSignals({ ...input, logs: [{ completed: false, logged_at: now.toISOString() }] })).toEqual([]);
  expect(triageSignals({ ...input, logs: [{ completed: true, logged_at: new Date(2026, 8, 10).toISOString() }] })).toEqual([]);
});
