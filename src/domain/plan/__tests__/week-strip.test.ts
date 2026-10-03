import { expect, test } from '@jest/globals';
import { day, plan } from '../test-fixtures';
import { trainingWeekStrip } from '../week-strip';

const done = '2026-09-07T12:00:00Z';
const days = [
  day('future', { week_number: 3, day_of_week: 4 }),
  day('current', { week_number: 2, day_of_week: 4 }),
  day('past', { completed_at: done }),
  day('earlier', { week_number: 2, day_of_week: 2, completed_at: done }),
  day('later', { week_number: 2, day_of_week: 6 }),
];

test('defaults to the current week and keeps selection independent of day progress', () => {
  const strip = trainingWeekStrip(plan(days));
  expect(strip.weeks.map(week => [week.number, week.status, week.completed, week.cells.length]))
    .toEqual([[1, 'completed', 1, 1], [2, 'current', 1, 3], [3, 'upcoming', 0, 1]]);
  expect(strip.week?.number).toBe(2);
  expect(strip.selectedDay?.id).toBe('current');
  expect(strip.showBackToToday).toBe(false);
  expect(strip.week?.cells.map(cell => [cell.day.id, cell.ordinal, cell.status, cell.isCurrent, cell.isSelected]))
    .toEqual([
      ['earlier', 1, 'done', false, false],
      ['current', 2, 'current', true, true],
      ['later', 3, 'upcoming', false, false],
    ]);
  const selected = trainingWeekStrip(plan(days), 'later');
  expect(selected.showBackToToday).toBe(true);
  expect(selected.week?.cells.map(cell => [cell.isCurrent, cell.isSelected]))
    .toEqual([[false, false], [true, false], [false, true]]);
});

test('week navigation selects the first day except when returning to the current week and stops at both ends', () => {
  const current = trainingWeekStrip(plan(days));
  expect(current.previousDayID).toBe('past');
  expect(current.nextDayID).toBe('future');
  const first = trainingWeekStrip(plan(days), current.previousDayID);
  expect(first.previousDayID).toBeNull();
  expect(first.nextDayID).toBe('current');
  const last = trainingWeekStrip(plan(days), current.nextDayID);
  expect(last.previousDayID).toBe('current');
  expect(last.nextDayID).toBeNull();
  expect(last.showBackToToday).toBe(true);
  expect(trainingWeekStrip(plan(days), last.previousDayID).selectedDay?.id).toBe('current');
  const expanded = [...days, day('future-first', { week_number: 3, day_of_week: 2 })];
  expect(trainingWeekStrip(plan(expanded)).nextDayID).toBe('future-first');
});

test('week indicators identify viewed and current weeks, and disappear above eight weeks', () => {
  expect(trainingWeekStrip(plan(days), 'future').indicators).toEqual([
    { number: 1, isSelected: false, isCurrent: false },
    { number: 2, isSelected: false, isCurrent: true },
    { number: 3, isSelected: true, isCurrent: false },
  ]);
  const eight = Array.from({ length: 8 }, (_, index) => day(`w${index}`, { week_number: index + 1 }));
  expect(trainingWeekStrip(plan(eight)).indicators).toHaveLength(8);
  expect(trainingWeekStrip(plan([...eight, day('ninth', { week_number: 9 })])).indicators).toEqual([]);
});

test('empty and completed plans and removed selections keep a safe default without a false current day', () => {
  expect(trainingWeekStrip(plan([]))).toMatchObject({ weeks: [], selectedDay: null, week: null, previousDayID: null, nextDayID: null, showBackToToday: false });
  expect(trainingWeekStrip(plan(days), 'removed').selectedDay?.id).toBe('current');
  const finished = trainingWeekStrip(plan(days.map(item => ({ ...item, completed_at: done }))));
  expect(finished.selectedDay?.id).toBe('future');
  expect(finished.weeks.every(week => week.status === 'completed')).toBe(true);
  expect(finished.weeks.flatMap(week => week.cells).every(cell => !cell.isCurrent && cell.status === 'done')).toBe(true);
  expect(trainingWeekStrip(plan(days.map(item => item.id === 'current' ? { ...item, completed_at: done } : item))).selectedDay?.id).toBe('later');
});

test('four training days produce seven calendar cells starting at the first recommended date', () => {
  const strip = trainingWeekStrip(plan([
    day('tue', { day_of_week: 2, completed_at: done }),
    day('thu', { day_of_week: 4 }),
    day('sat', { day_of_week: 6 }),
    day('sun', { day_of_week: 7 }),
  ]));
  expect(strip.week?.calendarCells.map(cell => [cell.kind, cell.date, cell.weekday])).toEqual([
    ['training', '2026-09-08', 2],
    ['rest', '2026-09-09', 3],
    ['training', '2026-09-10', 4],
    ['rest', '2026-09-11', 5],
    ['training', '2026-09-12', 6],
    ['training', '2026-09-13', 0],
    ['rest', '2026-09-14', 1],
  ]);
  expect(strip.week?.calendarCells.filter(cell => cell.kind === 'training')).toMatchObject([
    { day: { id: 'tue' }, ordinal: 1, status: 'done', isCurrent: false, isSelected: false },
    { day: { id: 'thu' }, ordinal: 2, status: 'current', isCurrent: true, isSelected: true },
    { day: { id: 'sat' }, ordinal: 3, status: 'upcoming', isCurrent: false, isSelected: false },
    { day: { id: 'sun' }, ordinal: 4, status: 'upcoming', isCurrent: false, isSelected: false },
  ]);
});

test('a shifted final training day extends the calendar beyond seven days', () => {
  const strip = trainingWeekStrip(plan([
    day('first'), day('last', { day_of_week: 5, shifted_to_date: '2026-09-15' }),
  ]));
  expect(strip.week?.calendarCells.map(cell => [cell.kind, cell.date])).toEqual([
    ['training', '2026-09-07'], ['rest', '2026-09-08'], ['rest', '2026-09-09'],
    ['rest', '2026-09-10'], ['rest', '2026-09-11'], ['rest', '2026-09-12'],
    ['rest', '2026-09-13'], ['rest', '2026-09-14'], ['training', '2026-09-15'],
  ]);
});

test('two training days shifted to the same date each keep an adjacent selectable cell', () => {
  const strip = trainingWeekStrip(plan([
    day('second', { day_of_week: 4 }),
    day('first', { day_of_week: 2, shifted_to_date: '2026-09-10', completed_at: done }),
  ]), 'first');
  expect(strip.week?.calendarCells.map(cell => cell.kind === 'training'
    ? [cell.date, cell.day.id, cell.ordinal, cell.isCurrent, cell.isSelected]
    : [cell.date, 'rest'])).toEqual([
    ['2026-09-10', 'first', 1, false, true],
    ['2026-09-10', 'second', 2, true, false],
    ['2026-09-11', 'rest'], ['2026-09-12', 'rest'], ['2026-09-13', 'rest'],
    ['2026-09-14', 'rest'], ['2026-09-15', 'rest'], ['2026-09-16', 'rest'],
  ]);
});

test('seven training days fill the calendar with no rest cells across a month and DST boundary', () => {
  const strip = trainingWeekStrip(plan(
    [1, 2, 3, 4, 5, 6, 7].map(weekday => day(`d${weekday}`, { day_of_week: weekday })),
    { start_date: '2026-10-25', anchor_weekday: 3 },
  ));
  expect(strip.week?.calendarCells.map(cell => [cell.kind, cell.date, cell.weekday])).toEqual([
    ['training', '2026-10-28', 3], ['training', '2026-10-29', 4],
    ['training', '2026-10-30', 5], ['training', '2026-10-31', 6],
    ['training', '2026-11-01', 0], ['training', '2026-11-02', 1],
    ['training', '2026-11-03', 2],
  ]);
});
