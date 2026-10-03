import type { ReadinessCheckin, ReadinessResponse } from '@/api/domains/readiness';
export type DetailLoadState = 'idle' | 'loading' | 'failed' | 'loaded';
export function planCardState(state: DetailLoadState, hasPlan: boolean): 'loading' | 'failed' | 'empty' | 'plan' {
  if (state === 'idle' || state === 'loading') return 'loading';
  if (state === 'failed') return 'failed';
  return hasPlan ? 'plan' : 'empty';
}
export type ReadinessRowState = { kind: 'loaded'; checkin: ReadinessCheckin } | { kind: 'notFiled' | 'unavailable' };
export function readinessRowState(result: { status: 'pending' | 'error' | 'success'; data?: ReadinessResponse }): ReadinessRowState {
  if (result.status !== 'success' || !result.data) return { kind: 'unavailable' };
  return result.data.checkin ? { kind: 'loaded', checkin: result.data.checkin } : { kind: 'notFiled' };
}
