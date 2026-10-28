import { test, expect } from '@jest/globals';
import {
  workoutDayState,
  defaultTrainingDay,
  canWriteTrainingDay,
  canUndoCompletion,
  weekDayOrdinals,
  dayCode,
  completedToday,
  cursorDay,
  currentWeekDays,
  dayAfter,
  progressSegments,
  recommendedDate,
  selectCurrentPlan,
  sequenceDays,
  planLogRange,
} from '../sequence';
import { day, plan } from '../test-fixtures';

const done = '2026-09-05T12:00:00Z';
test('orders by week, weekday, sort order and id, without mutating input', () => {
  const days = [
    day('z', { week_number: 2 }),
    day('b'),
    day('a'),
    day('c', { sort_order: 1 }),
    day('d', { day_of_week: 2 }),
  ];
  expect(sequenceDays(days).map((d) => d.id)).toEqual([
    'a',
    'b',
    'c',
    'd',
    'z',
  ]);
  expect(days[0].id).toBe('z');
});
test('cursor is first uncompleted, advances across weeks, and all complete has no cursor', () => {
  const days = [
    day('a', { completed_at: done }),
    day('b', { week_number: 2 }),
    day('c', { week_number: 2, day_of_week: 2 }),
  ];
  expect(cursorDay(days)?.id).toBe('b');
  expect(currentWeekDays(days).map((d) => d.id)).toEqual(['b', 'c']);
  expect(cursorDay(days.map((d) => ({ ...d, completed_at: done })))).toBeNull();
  expect(cursorDay([])).toBeNull();
  expect(dayAfter(days, 'a')?.id).toBe('b');
  expect(dayAfter(days, 'c')).toBeNull();
});
test('progress is completion-led with done/current/upcoming segments', () => {
  expect(
    progressSegments([
      day('a', { completed_at: done }),
      day('b'),
      day('c'),
    ]).map((s) => s.state),
  ).toEqual(['done', 'current', 'upcoming']);
});
test('completedToday uses device wall-clock 04:00 and the last sequence completion', () => {
  const yesterday = new Date(2026, 8, 4, 20).toISOString();
  const boundary = new Date(2026, 8, 5, 4).toISOString();
  const days = [
    day('a', { completed_at: yesterday }),
    day('b', { completed_at: boundary }),
  ];
  expect(completedToday(days, new Date(2026, 8, 5, 3, 59))?.id).toBe('a');
  expect(completedToday(days, new Date(2026, 8, 5, 4))?.id).toBe('b');
  expect(
    completedToday(
      [day('a', { completed_at: yesterday })],
      new Date(2026, 8, 5, 4),
    ),
  ).toBeNull();
});
test.each([
  [null, '2026-09-07'],
  [1, '2026-09-07'],
  [4, '2026-09-10'],
] as [number | null, string][])(
  'recommended date anchors D1 at weekday %s',
  (anchor, expected) => {
    expect(
      recommendedDate(
        plan([], { anchor_weekday: anchor }),
        day('a'),
      ),
    ).toBe(expected);
  },
);
test('recommended dates advance by week/day and logs cover the full cycle padded one day', () => {
  const p = plan([day('a'), day('b', { week_number: 2, day_of_week: 3 })]);
  expect(recommendedDate(p, p.days[1])).toBe('2026-09-16');
  expect(planLogRange(p, new Date(2026, 8, 7, 12))).toEqual({
    from: '2026-09-01',
    to: '2026-09-17',
    scope: 'plan',
  });
});
test('selects published_at newest, breaking ties by created_at then id, ignoring calendar', () => {
  const a = plan([], { id: 'a', published_at: '2026-09-03T00:00:00Z' });
  const b = plan([], {
    id: 'b',
    published_at: '2026-09-02T00:00:00Z',
    created_at: '2026-09-04T00:00:00Z',
  });
  expect(selectCurrentPlan([b, a])?.id).toBe('a');
  expect(
    selectCurrentPlan([
      a,
      { ...a, id: 'c', created_at: '2026-09-04T00:00:00Z' },
    ])?.id,
  ).toBe('c');
  expect(selectCurrentPlan([a, { ...a, id: 'z' }])?.id).toBe('z');
  expect(selectCurrentPlan([{ ...a, status: 'draft' }])).toBeNull();
});
test('other weeks are read-only and only latest gym-day completion can undo', () => {
  const now = new Date(2026, 8, 5, 12);
  const days = [
    day('a', { completed_at: now.toISOString() }),
    day('b', { completed_at: now.toISOString() }),
    day('c'),
    day('d', { week_number: 2 }),
  ];
  expect(workoutDayState(days, days[0], now)).toEqual({
    kind: 'completed',
    canUndo: false,
  });
  expect(workoutDayState(days, days[1], now)).toEqual({
    kind: 'completed',
    canUndo: true,
  });
  expect(workoutDayState(days, days[2], now)).toEqual({ kind: 'current' });
  expect(workoutDayState(days, days[3], now)).toMatchObject({
    kind: 'upcoming',
    previousDay: { id: 'c' },
  });
});
test('published instants with different UTC offsets are compared as instants', () => {
  expect(
    selectCurrentPlan([
      plan([], { id: 'a', published_at: '2026-09-05T11:00:00+02:00' }),
      plan([], { id: 'b', published_at: '2026-09-05T10:00:00Z' }),
    ])?.id,
  ).toBe('b');
});
test('progress segments show only the cursor week after crossing a week boundary', () => {
  expect(
    progressSegments([
      day('a', { completed_at: done }),
      day('b', { week_number: 2 }),
      day('c', { week_number: 2, day_of_week: 2 }),
    ]).map((segment) => [segment.day.id, segment.state]),
  ).toEqual([
    ['b', 'current'],
    ['c', 'upcoming'],
  ]);
});

test('coach shifts change recommendation without moving the cursor and log windows retain backfills and late training', () => {
  const p = plan([day('a', { shifted_to_date: '2026-09-10' }), day('b', { day_of_week: 2 })]);
  expect(recommendedDate(p, p.days[0])).toBe('2026-09-10');
  expect(cursorDay(p.days)?.id).toBe('a');
  expect(planLogRange(p, new Date(2026, 8, 21, 12))).toEqual({ from: '2026-09-01', to: '2026-09-22', scope: 'plan' });
});

test('weekly labels count completed training days, not weekday slots, and reorder after insertion', () => {
  const days = [day('sun', { day_of_week: 7 }), day('tue', { day_of_week: 2, completed_at: done }), day('sat', { day_of_week: 6 }), day('thu', { day_of_week: 4 })];
  expect([...weekDayOrdinals(days)]).toEqual([['tue', 1], ['thu', 2], ['sat', 3], ['sun', 4]]);
  expect(days.map(d => dayCode(d, days))).toEqual(['W1D4', 'W1D1', 'W1D3', 'W1D2']);
  const expanded = [...days, day('mon')];
  expect(days.map(d => dayCode(d, expanded))).toEqual(['W1D5', 'W1D2', 'W1D4', 'W1D3']);
  expect(weekDayOrdinals([]).size).toBe(0);
  expect([...weekDayOrdinals([days[1], days[1], days[3]])]).toEqual([['tue', 1], ['thu', 2]]);
});


test('every unsettled day in the cursor week is writable, other weeks and unpublished plans are not', () => {
  const days = [day('past', { completed_at: done }), day('d2', { week_number: 2 }), day('d4', { week_number: 2, day_of_week: 4 }), day('next', { week_number: 3 })];
  expect(workoutDayState(days, days[2])).toEqual({ kind: 'current' });
  expect(days.map(d => canWriteTrainingDay(plan(days), d.id))).toEqual([false, true, true, false]);
  expect(canWriteTrainingDay(plan(days, { status: 'paused' }), 'd4')).toBe(false);
  expect(canWriteTrainingDay(plan(days), 'missing')).toBe(false);
});

test('default returns to latest real log in the gym-day and resets across 04:00', () => {
  const days = [day('d2', { exercises: [{ id: 'e2', plan_day_id: 'd2', exercise_id: 'squat', is_main_lift: true, sort_order: 0, notes: null, sets: [] }] }), day('d4', { day_of_week: 4 })];
  const logs = [
    { plan_exercise_id: 'e2', plan_day_id: null, logged_date: '2026-10-14', logged_at: new Date(2026, 9, 14, 18).toISOString(), assumed: false, completed: true, failed: false },
    { plan_exercise_id: null, plan_day_id: 'd4', logged_date: '2026-10-14', logged_at: new Date(2026, 9, 14, 19).toISOString(), assumed: false, completed: true, failed: false },
  ];
  expect(defaultTrainingDay(days, logs, new Date(2026, 9, 15, 3, 59))?.id).toBe('d4');
  expect(defaultTrainingDay(days, logs, new Date(2026, 9, 15, 4))?.id).toBe('d2');
  expect(defaultTrainingDay(days, logs.map(l => ({ ...l, assumed: true })), new Date(2026, 9, 14, 20))?.id).toBe('d2');
  expect(defaultTrainingDay([days[0], { ...days[1], completed_at: done }], logs, new Date(2026, 9, 14, 20))?.id).toBe('d2');
});

test('out-of-order completion can only undo the latest actual completion', () => {
  const now = new Date(2026, 9, 14, 20);
  const days = [day('d2', { completed_at: new Date(2026, 9, 14, 19).toISOString() }), day('d4', { day_of_week: 4, completed_at: new Date(2026, 9, 14, 18).toISOString() })];
  expect(completedToday(days, now)?.id).toBe('d2');
  expect(canUndoCompletion(days, 'd2', now)).toBe(true);
  expect(canUndoCompletion(days, 'd4', now)).toBe(false);
});
