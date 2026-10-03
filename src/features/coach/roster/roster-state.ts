import { ApiError } from '@/api/client';
import type { RosterRow } from '@/domain/coach/week-overview';
export type RosterLoadState = 'idle' | 'loading' | 'loaded' | 'failed';
export function resolveRosterState(state: RosterLoadState, filteredRows: readonly RosterRow[], search: string) {
  if (state === 'idle' || state === 'loading') return 'loading';
  if (state === 'failed' || filteredRows.length) return 'rows';
  return search.trim() ? 'noMatches' : 'emptyRoster';
}
export function isAbnormal(row: RosterRow): boolean {
  return row.triageSignals.length > 0 || row.student.status === 'abnormal';
}
export function completionColor(percentage: number): 'success' | 'gold500' | 'danger' {
  return percentage >= 85 ? 'success' : percentage >= 65 ? 'gold500' : 'danger';
}

export function bindErrorKey(error: unknown) {
  const code = error instanceof ApiError ? error.code : undefined;
  if (code === 'BIND_REQUEST_NOT_FOUND' || code === 'BIND_REQUEST_NOT_PENDING') return 'coach.bind.error.processed';
  if (code === 'BIND_REQUEST_EXPIRED') return 'coach.bind.error.expired';
  if (code === 'BIND_ALREADY_BOUND') return 'coach.bind.error.alreadyBound';
  return 'coach.bind.error.network';
}
