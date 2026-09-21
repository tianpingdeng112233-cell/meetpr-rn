import { test, expect, jest } from '@jest/globals';
import { day, plan, set } from '@/domain/plan/test-fixtures';
import { synthesizeDrafts } from '../drafts';
import { QuickLogAttempt, localNoon, makeQuickLogPlan } from '../quick-log';

const exercise = { id: 'exercise', plan_day_id: 'day', exercise_id: 'squat', is_main_lift: true, sort_order: 0, notes: null, sets: [set({ id: 'one', target_value: '100' }), set({ id: 'two', set_number: 2, target_value: '100' })] };
const current = day('day', { exercises: [exercise] });
const cycle = plan([current]);
const make = () => makeQuickLogPlan({ plan: cycle, day: current, drafts: synthesizeDrafts(current, []), logs: [], now: new Date(2026, 8, 21, 10) });

test('quick-log writes actual-date rows then completes the captured day', async () => {
  const written: string[] = [];
  const completed: string[] = [];
  const attempt = new QuickLogAttempt({ persist: async (row, date) => { written.push(`${row.draft.setIndex}:${date}`); }, complete: async dayId => { completed.push(dayId); } });
  const input = { ...make(), selectedDate: '2026-09-19' };
  expect(await attempt.submit(input)).toEqual({ kind: 'completed' });
  expect(await attempt.submit(input)).toEqual({ kind: 'completed' });
  expect(written).toEqual(['0:2026-09-19', '1:2026-09-19']);
  expect(completed).toEqual(['day']);
});

test('partial failure preserves saved rows, freezes the submitted date and retries completion alone', async () => {
  const writes: string[] = [];
  let failSet = true;
  let failComplete = true;
  const attempt = new QuickLogAttempt({ persist: async (row, date) => { if (row.draft.setIndex === 1 && failSet) throw Error('Offline'); writes.push(`${row.draft.setIndex}:${date}`); }, complete: async () => { if (failComplete) throw Error('Offline'); } });
  const input = { ...make(), selectedDate: '2026-09-19' };
  expect(await attempt.submit(input)).toEqual({ kind: 'partialFailure', written: 1, remaining: 1 });
  expect(attempt.locked).toBe(true);
  failSet = false;
  expect(await attempt.submit({ ...input, selectedDate: '2026-09-20' })).toEqual({ kind: 'completionFailed' });
  failComplete = false;
  expect(await attempt.submit(input)).toEqual({ kind: 'completed' });
  expect(writes).toEqual(['0:2026-09-19', '1:2026-09-19']);
});

test('no selected rows and dates outside the training range never write or complete', async () => {
  const persist = jest.fn(async () => {}); const complete = jest.fn(async () => {});
  const attempt = new QuickLogAttempt({ persist, complete }); const input = make();
  expect(await attempt.submit({ ...input, rows: input.rows.map(row => ({ ...row, included: false })) })).toEqual({ kind: 'empty' });
  expect(await attempt.submit({ ...input, selectedDate: '2026-09-22' })).toEqual({ kind: 'invalid' });
  expect(await attempt.submit({ ...input, selectedDate: '2026-08-01' })).toEqual({ kind: 'invalid' });
  expect(persist).not.toHaveBeenCalled(); expect(complete).not.toHaveBeenCalled();
});


test('calendar-today remains today before the gym-day boundary and local noon survives DST dates', () => {
  const early = makeQuickLogPlan({ plan: cycle, day: current, drafts: synthesizeDrafts(current, []), logs: [], now: new Date(2026, 8, 21, 2) });
  expect(early.selectedDate).toBe('2026-09-21');
  expect(early.maximumDate).toBe('2026-09-21');
  for (const date of ['2026-03-29', '2026-10-25', '2026-11-01']) {
    const noon = localNoon(date);
    expect(noon.getHours()).toBe(12);
    expect(`${noon.getFullYear()}-${String(noon.getMonth() + 1).padStart(2, '0')}-${String(noon.getDate()).padStart(2, '0')}`).toBe(date);
  }
});
