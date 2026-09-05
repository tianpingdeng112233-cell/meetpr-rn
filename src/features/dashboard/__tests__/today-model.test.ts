import { test, expect } from '@jest/globals';
import { todayModel } from '../today-model';
import { day, plan } from '@/domain/plan/test-fixtures';
const now = new Date(2026, 8, 5, 12);
test('cursor action and sticky start transfer a day id; week cells are ordinal', () => {
  const model = todayModel(plan([day('a'), day('b')]), now);
  expect(model.action.kind).toBe('current');
  expect(model.stickyStartDay?.id).toBe('a');
  expect(model.segments.map((s) => s.state)).toEqual(['current', 'upcoming']);
});
test('today completed action hides sticky and previews next', () => {
  const model = todayModel(
    plan([day('a', { completed_at: now.toISOString() }), day('b')]),
    now,
  );
  expect(model.action).toMatchObject({
    kind: 'completed',
    day: { id: 'a' },
    nextDay: { id: 'b' },
    canUndo: true,
  });
  expect(model.stickyStartDay).toBeNull();
});
test('cycle completed precedes completedToday, no start CTA', () => {
  const model = todayModel(
    plan([day('a', { completed_at: now.toISOString() })]),
    now,
  );
  expect(model.action.kind).toBe('cycleCompleted');
  expect(model.stickyStartDay).toBeNull();
});
test('no plan and zero-day plan are waiting, with no CTA', () => {
  for (const p of [null, plan()]) {
    expect(todayModel(p, now)).toMatchObject({
      action: { kind: 'waiting' },
      stickyStartDay: null,
      segments: [],
    });
  }
});
