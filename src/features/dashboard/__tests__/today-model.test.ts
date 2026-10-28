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

const binding = {
  id: 'binding', student_id: 'student', coach_id: 'coach', coach_display_name: 'Alex',
  status: 'accepted' as const, responded_at: '2026-09-02T12:00:00Z',
  submitted_at: '2026-09-01T00:00:00Z', expired_at: '2026-09-08T00:00:00Z',
  invite_code_id: null, skip_evaluation: true, skip_reason: null,
};
const first = plan([day('a'), day('b')], { coach_id: 'coach' });
test('waiting uses the backend binding count even when completed plans are absent from the list', () => {
  const context = { request: { ...binding, first_run: { binding_plan_count: 0, has_settled_day: false, first_plan: null } }, firstPlanDismissed: false };
  expect(todayModel(null, now, [], context).waitingForFirstPlan).toBe(true);
  expect(todayModel(null, now, [], { ...context, request: { ...binding, first_run: { binding_plan_count: 1, has_settled_day: true, first_plan: null } } }).waitingForFirstPlan).toBe(false);
});

const firstPlan = { id: first.id, published_at: '2026-09-02T12:00:00Z', plan_weeks: 6, day_count: 18, has_settled_day: false };
const firstRun = { request: { ...binding, first_run: { binding_plan_count: 1, has_settled_day: false, first_plan: firstPlan } }, firstPlanDismissed: false };

test.each([undefined, null])('first_run %s preserves both waiting and active-plan presentation', first_run => {
  const context = { ...firstRun, request: { ...binding, first_run } };
  expect(todayModel(null, now, [], context)).toMatchObject({ waitingForFirstPlan: false, firstPlan: null });
  expect(todayModel(first, now, [first], context)).toMatchObject({ firstPlan: null, stickyStartDay: { id: 'a' } });
});

test('first plan card uses backend metadata and hides sticky start until dismissed', () => {
  expect(todayModel(first, now, [first], firstRun)).toMatchObject({ firstPlan, stickyStartDay: null });
  for (const firstPlanDismissed of [true, null]) {
    expect(todayModel(first, now, [first], { ...firstRun, firstPlanDismissed })).toMatchObject({ firstPlan: null, stickyStartDay: { id: 'a' } });
  }
});

test('a settled first plan never shows a card even when the visible plan has no settled days', () => {
  const context = { ...firstRun, request: { ...binding, first_run: {
    binding_plan_count: 2, has_settled_day: true, first_plan: { ...firstPlan, has_settled_day: true },
  } } };
  expect(todayModel(first, now, [first], context)).toMatchObject({ firstPlan: null, stickyStartDay: { id: 'a' }, waitingForFirstPlan: false });
});

test('first plan eligibility uses its own settlement flag, and requires an accepted binding', () => {
  const context = { ...firstRun, request: { ...firstRun.request, first_run: { ...firstRun.request.first_run, has_settled_day: true } } };
  expect(todayModel(first, now, [first], context).firstPlan).toEqual(firstPlan);
  expect(todayModel(first, now, [first], { ...context, request: { ...context.request, status: 'cancelled' } }).firstPlan).toBeNull();
});
