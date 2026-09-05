import { test, expect } from '@jest/globals';
import { planCardState, readinessRowState } from '../plan-card-state';
import type { ReadinessCheckin } from '@/api/domains/readiness';

test('plan card resolves loading, failed, empty and plan, including stale-plan failure', () => {
  expect(planCardState('idle', false)).toBe('loading');
  expect(planCardState('loading', true)).toBe('loading');
  expect(planCardState('failed', true)).toBe('failed');
  expect(planCardState('loaded', false)).toBe('empty');
  expect(planCardState('loaded', true)).toBe('plan');
});
test('only a successful empty readiness response means notFiled; errors are unavailable even with stale data', () => {
  const checkin: ReadinessCheckin = { id: 'checkin', student_id: 'student', checkin_date: '2026-09-05', sleep_quality: 5, mood: 4, stress: 3, muscle_fatigue: [], submitted_at: '2026-09-05T10:00:00Z', updated_at: '2026-09-05T10:00:00Z' };
  expect(readinessRowState({ status: 'success', data: { checkin: null } })).toEqual({ kind: 'notFiled' });
  expect(readinessRowState({ status: 'error', data: { checkin } })).toEqual({ kind: 'unavailable' });
  expect(readinessRowState({ status: 'pending' })).toEqual({ kind: 'unavailable' });
  expect(readinessRowState({ status: 'success', data: { checkin } })).toEqual({ kind: 'loaded', checkin });
});
