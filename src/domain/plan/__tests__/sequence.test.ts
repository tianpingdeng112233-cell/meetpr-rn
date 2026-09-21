import { test, expect } from '@jest/globals';
import {
  workoutDayState,
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
test('upcoming day is read-only regardless of date and only latest gym-day completion can undo', () => {
  const now = new Date(2026, 8, 5, 12);
  const days = [
    day('a', { completed_at: now.toISOString() }),
    day('b', { completed_at: now.toISOString() }),
    day('c'),
    day('d'),
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
