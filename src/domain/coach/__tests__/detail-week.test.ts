import { test, expect } from '@jest/globals';
import { day, plan, set } from '@/domain/plan/test-fixtures';
import { projectCoachPlan } from '@/features/coach/roster/load-roster';
import { makeSummary, pairTrainingDays } from '../week-overview';
import { triageSignals } from '../triage';
import type { SetLog } from '@/api/domains/sets';
import { makeExecutionDays, makeOverview, weekStart, executionExercises, isExecutionDayComplete } from '../detail-week';

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

test('legacy days without settlement fields retain completed-set fallback and free logs do not increase completion', () => {
  const exercise = { id: 'a', plan_day_id: 'first', exercise_id: 'a', is_main_lift: true, sort_order: 0, notes: null, sets: [] };
  const cycle = plan([day('first', { completed_at: undefined, exercises: [exercise] }), day('second', { completed_at: undefined, day_of_week: 2, exercises: [{ ...exercise, id: 'b', plan_day_id: 'second' }] })]);
  const logs = [log('a', 'a', 0, '2026-09-07T01:00:00'), log('b', 'b', 0, '2026-09-08T10:00:00', false), log('free', 'other', 0, '2026-09-09T10:00:00')];
  expect(makeOverview(makeExecutionDays(cycle, logs, new Date(2026, 8, 7)), [])).toMatchObject({
    plannedTrainingDays: 2, completedTrainingDays: 1, latestActivityAt: '2026-09-09T10:00:00', latestFeedback: null,
  });
});

test('student-added exercises belong to plan_day_id rather than the logging date', () => {
  const added = (id: string, owner?: string | null): SetLog => ({ ...log(id, 'curl', 0, '2026-09-07T12:00:00'), adhoc: true, plan_exercise_id: null, plan_day_id: owner });
  const days = makeExecutionDays(plan([day('d2', { exercises: [{ id: 'planned', plan_day_id: 'd2', exercise_id: 'planned', is_main_lift: true, sort_order: 0, notes: null, sets: [] }] }), day('d4', { day_of_week: 4 })]), [added('d4-log', 'd4'), added('legacy'), added('unknown', 'missing')], new Date(2026, 8, 7));
  expect(days[0].logs.map(entry => entry.id)).toEqual(['legacy', 'unknown']);
  expect(days[3].logs.map(entry => entry.id)).toEqual(['d4-log']);
  expect(days.flatMap(entry => entry.logs)).toHaveLength(3);
  expect(makeExecutionDays(null, [added('free')], new Date(2026, 8, 7))[6].logs.map(entry => entry.id)).toEqual(['free']);
});


test('exercise cards sort and separate extra sets, count only prescription slots, and group student-added exercises', () => {
  const planned = { id: 'a', plan_day_id: 'd2', exercise_id: 'a', is_main_lift: true, sort_order: 0, notes: null, sets: [set(), set()] };
  const added = (id: string, exercise: string, index: number): SetLog => ({ ...log(id, exercise, index, '2026-09-07T12:00:00'), adhoc: true, plan_exercise_id: null, plan_day_id: 'd2' });
  const cards = executionExercises({ date: new Date(2026, 8, 7), planDay: day('d2', { exercises: [planned] }), logs: [log('extra3', 'a', 3, '2026-09-07T12:00:00'), added('curl1', 'curl', 1), log('p0', 'a', 0, '2026-09-07T12:00:00'), added('row0', 'row', 0), added('curl0', 'curl', 0), log('extra2', 'a', 2, '2026-09-07T12:00:00'), { ...added('legacy', 'curl', 2), plan_day_id: null }] });
  expect(cards.planned[0].prescribed.map(entry => entry.id)).toEqual(['p0']);
  expect(cards.planned[0].extra.map(entry => entry.id)).toEqual(['extra2', 'extra3']);
  expect(cards.added.map(card => [card.exerciseId, card.logs.map(entry => entry.id)])).toEqual([['curl', ['curl0', 'curl1']], ['row', ['row0']]]);
});

test('D4 settlement leaves D2 unfinished when only D4 has completed sets on the same date', () => {
  const exercise = (id: string, owner: string) => ({ id, plan_day_id: owner, exercise_id: id, is_main_lift: true, sort_order: 0, notes: null, sets: [set()] });
  const cycle = plan([day('d2', { exercises: [exercise('a', 'd2')] }), day('d4', { day_of_week: 4, exercises: [exercise('b', 'd4')], completed_at: '2026-09-07T12:00:00Z' })]);
  const days = makeExecutionDays(cycle, [log('d4-set', 'b', 0, '2026-09-07T12:00:00')], new Date(2026, 8, 7));
  expect(days[0].logs).toEqual([]);
  expect(days[3].logs.map(entry => entry.id)).toEqual(['d4-set']);
  expect(isExecutionDayComplete(days[0])).toBe(false);
  expect(isExecutionDayComplete(days[3])).toBe(true);
  expect(makeOverview(days, [])).toMatchObject({ plannedTrainingDays: 2, completedTrainingDays: 1 });
});

test.each(['planned', 'student-added'] as const)('R1 owned %s logs count as trained without settlement across coach views', kind => {
  const exercise = { id: 'a', plan_day_id: 'trained', exercise_id: 'a', is_main_lift: true, sort_order: 0, notes: null, sets: [set()] };
  const cycle = plan([day('trained', { exercises: [exercise] }), day('missed', { day_of_week: 2, exercises: [{ ...exercise, id: 'b' }] })]);
  const owned = { ...log('owned', 'a', 0, '2026-09-08T12:00:00'), ...(kind === 'student-added' ? { adhoc: true, plan_exercise_id: null, plan_day_id: 'trained' } : {}) };
  const now = new Date(2026, 8, 9);
  const days = makeExecutionDays(cycle, [owned], now);
  expect(days.map(isExecutionDayComplete).slice(0, 2)).toEqual([true, false]);
  expect(makeOverview(days, [])).toMatchObject({ completedTrainingDays: 1 });
  const projected = projectCoachPlan(cycle);
  const signals = triageSignals({ plan: projected, logs: [owned], feedback: [{ posted_at: owned.logged_at }], now });
  expect(signals).toEqual([]);
  const summary = makeSummary([{ student: { id: 's', displayName: 'S', status: 'active' }, lastActiveAt: null, triageSignals: signals, trainingDays: pairTrainingDays(projected, [owned]) }], now);
  expect(summary.rows[0].cells.slice(0, 2).map(cell => cell.kind)).toEqual(['completed', 'missed']);
  expect(summary.rows[0].group).toBe('active');
  expect(summary.completed).toBe(1);
});

test.each(['planned', 'student-added'] as const)('R2 off-window %s logs retain cross-week date-based completion', kind => {
  const exercise = (id: string, owner: string) => ({ id, plan_day_id: owner, exercise_id: id, is_main_lift: true, sort_order: 0, notes: null, sets: [set()] });
  const cycle = plan([day('old', { exercises: [exercise('old-ex', 'old')] }), day('visible', { week_number: 2, exercises: [exercise('new-ex', 'visible')] })]);
  const activity = { ...log('late', 'old-ex', 0, '2026-09-14T12:00:00'), ...(kind === 'student-added' ? { adhoc: true, plan_exercise_id: null, plan_day_id: 'old' } : {}) };
  const days = makeExecutionDays(cycle, [activity], new Date(2026, 8, 14));
  expect(days[0].logs.map(entry => entry.id)).toEqual(['late']);
  expect(days.flatMap(entry => entry.logs)).toHaveLength(1);
  expect(isExecutionDayComplete(days[0])).toBe(true);
  expect(makeOverview(days, [])).toMatchObject({ latestActivityAt: '2026-09-14T12:00:00', completedTrainingDays: 1 });
});

test('R2 latest activity uses all fetched logs even when none can appear in the seven-day window', () => {
  const cycle = plan([day('last', { week_number: 2 })]);
  const logs = [log('newer', 'removed-exercise', 0, '2026-09-28T12:00:00'), log('older', 'removed-exercise', 1, '2026-09-27T12:00:00')];
  const days = makeExecutionDays(cycle, logs, new Date(2026, 8, 28));
  expect(days.flatMap(entry => entry.logs)).toEqual([]);
  expect(makeOverview(days, [], logs).latestActivityAt).toBe('2026-09-28T12:00:00');
});

test('R1 settled days count as trained without any logs across coach views', () => {
  const exercise = { id: 'a', plan_day_id: 'done', exercise_id: 'a', is_main_lift: true, sort_order: 0, notes: null, sets: [set()] };
  const cycle = plan([day('done', { exercises: [exercise], completed_at: '2026-09-07T12:00:00Z' }), day('missed', { day_of_week: 2, exercises: [{ ...exercise, id: 'b' }] })]);
  const now = new Date(2026, 8, 9);
  const days = makeExecutionDays(cycle, [], now);
  expect(days.slice(0, 2).map(isExecutionDayComplete)).toEqual([true, false]);
  expect(makeOverview(days, []).completedTrainingDays).toBe(1);
  const projected = projectCoachPlan(cycle);
  expect(triageSignals({ plan: projected, logs: [], feedback: [], now })).toEqual([]);
  const summary = makeSummary([{ student: { id: 's', displayName: 'S', status: 'active' }, lastActiveAt: null, triageSignals: [], trainingDays: pairTrainingDays(projected, []) }], now);
  expect(summary.rows[0].cells.slice(0, 2).map(cell => cell.kind)).toEqual(['completed', 'missed']);
  expect(summary.completed).toBe(1);
});

test.each(['no-owner', 'removed-exercise'] as const)('R1/R2 legacy %s logs retain date fallback across coach views', kind => {
  const exercise = { id: 'a', plan_day_id: 'first', exercise_id: 'a', is_main_lift: true, sort_order: 0, notes: null, sets: [set()] };
  const cycle = plan([day('first', { exercises: [exercise] }), day('second', { day_of_week: 2, exercises: [{ ...exercise, id: 'b' }] })]);
  const legacy = { ...log('legacy', 'removed', 0, '2026-09-07T12:00:00'), ...(kind === 'no-owner' ? { adhoc: true, plan_exercise_id: null } : {}) };
  const now = new Date(2026, 8, 9);
  const days = makeExecutionDays(cycle, [legacy], now);
  expect(days[0].logs.map(entry => entry.id)).toEqual(['legacy']);
  expect(days[1].logs).toEqual([]);
  expect(makeOverview(days, []).completedTrainingDays).toBe(1);
  const projected = projectCoachPlan(cycle);
  const signals = triageSignals({ plan: projected, logs: [legacy], feedback: [{ posted_at: legacy.logged_at }], now });
  expect(signals).toEqual([]);
  const summary = makeSummary([{ student: { id: 's', displayName: 'S', status: 'active' }, lastActiveAt: null, triageSignals: signals, trainingDays: pairTrainingDays(projected, [legacy]) }], now);
  expect(summary.rows[0].cells.slice(0, 2).map(cell => cell.kind)).toEqual(['completed', 'missed']);
});

test.each(['planned', 'student-added'] as const)('round 2 cross-week %s logs preserve date-based training status in all coach views', kind => {
  const exercise = (id: string, owner: string) => ({ id, plan_day_id: owner, exercise_id: id, is_main_lift: true, sort_order: 0, notes: null, sets: [set()] });
  const cycle = plan([
    day('w2-d2', { week_number: 2, day_of_week: 2, exercises: [exercise('old-a', 'w2-d2')] }),
    day('w2-d4', { week_number: 2, day_of_week: 4, exercises: [exercise('old-b', 'w2-d4')] }),
    day('w4-d2', { week_number: 4, day_of_week: 2, exercises: [exercise('new-a', 'w4-d2')] }),
    day('w4-d4', { week_number: 4, day_of_week: 4, exercises: [exercise('new-b', 'w4-d4')] }),
  ], { plan_weeks: 4, end_date: '2026-10-04' });
  const logs = [
    { ...log('a', 'old-a', 0, '2026-09-29T12:00:00'), ...(kind === 'student-added' ? { adhoc: true, plan_exercise_id: null, plan_day_id: 'w2-d2' } : {}) },
    { ...log('b', 'old-b', 0, '2026-10-01T12:00:00'), ...(kind === 'student-added' ? { adhoc: true, plan_exercise_id: null, plan_day_id: 'w2-d4' } : {}) },
  ];
  const now = new Date(2026, 9, 2);
  const days = makeExecutionDays(cycle, logs, now);
  expect([days[1], days[3]].map(isExecutionDayComplete)).toEqual([true, true]);
  expect([days[1], days[3]].map(entry => entry.logs.map(log => log.id))).toEqual([['a'], ['b']]);
  expect(makeOverview(days, [], logs)).toMatchObject({ completedTrainingDays: 2, latestActivityAt: '2026-10-01T12:00:00' });
  const projected = projectCoachPlan(cycle);
  const signals = triageSignals({ plan: projected, logs, feedback: [{ posted_at: '2026-10-01T12:00:00' }], now });
  expect(signals).toEqual([]);
  const summary = makeSummary([{ student: { id: 's', displayName: 'S', status: 'active' }, lastActiveAt: null, triageSignals: signals, trainingDays: pairTrainingDays(projected, logs) }], now);
  expect([summary.rows[0].cells[1].kind, summary.rows[0].cells[3].kind]).toEqual(['completed', 'completed']);
  expect(summary.rows[0].group).toBe('active');
  expect(summary.completed).toBe(2);
});

test('round 2 same-plan-week ownership wins even when the owner is shifted outside the visible window', () => {
  const exercise = (id: string, owner: string) => ({ id, plan_day_id: owner, exercise_id: id, is_main_lift: true, sort_order: 0, notes: null, sets: [set()] });
  const cycle = plan([
    day('d2', { exercises: [exercise('a', 'd2')] }),
    day('d4', { day_of_week: 4, shifted_to_date: '2026-09-17', exercises: [exercise('b', 'd4')], completed_at: '2026-09-07T12:00:00Z' }),
  ]);
  const logs = [log('d4-log', 'b', 0, '2026-09-07T12:00:00')];
  const days = makeExecutionDays(cycle, logs, new Date(2026, 8, 7));
  expect(days[0].logs).toEqual([]);
  expect(isExecutionDayComplete(days[0])).toBe(false);
  expect(makeOverview(days, [], logs).latestActivityAt).toBe('2026-09-07T12:00:00');
});

test('round 2 cross-plan-week date fallback applies even when both owners are visible', () => {
  const exercise = (id: string, owner: string) => ({ id, plan_day_id: owner, exercise_id: id, is_main_lift: true, sort_order: 0, notes: null, sets: [set()] });
  const cycle = plan([
    day('old', { shifted_to_date: '2026-09-17', exercises: [exercise('old-ex', 'old')] }),
    day('current', { week_number: 2, exercises: [exercise('new-ex', 'current')] }),
  ]);
  const logs = [log('activity', 'old-ex', 0, '2026-09-14T12:00:00')];
  const days = makeExecutionDays(cycle, logs, new Date(2026, 8, 14));
  expect(days[0].logs.map(entry => entry.id)).toEqual(['activity']);
  expect(isExecutionDayComplete(days[0])).toBe(true);
  expect(days[3].logs.map(entry => entry.id)).toEqual(['activity']);
  expect(isExecutionDayComplete(days[3])).toBe(true);
});
