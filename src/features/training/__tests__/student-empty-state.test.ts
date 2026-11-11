import { expect, test } from '@jest/globals';
import { day, plan } from '@/domain/plan/test-fixtures';
import { studentEmptyState } from '../student-empty-state';
test('training distinguishes first plan, next unpublished week, and whole plan completion', () => {
  expect(studentEmptyState(null)).toEqual({ kind: 'first' });
  expect(studentEmptyState(plan([day('d')]))).toBeNull();
  const days = [day('a', { week_number: 3, completed_at: '2026-11-09T10:00:00Z' }), day('b', { week_number: 3, completed_at: '2026-11-09T11:00:00Z' })];
  expect(studentEmptyState(plan(days, { plan_weeks: 8 }))).toEqual({ kind: 'next', week: 4, previousWeek: 3, sessions: 2 });
  expect(studentEmptyState(plan(days, { plan_weeks: 3 }))).toEqual({ kind: 'completed', weeks: 3 });
});
