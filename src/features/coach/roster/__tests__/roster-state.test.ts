import { expect, jest, test } from '@jest/globals';
import { completionColor, isAbnormal, resolveRosterState, bindErrorKey } from '../roster-state';
import { CoachStudentsResponseSchema, coachRepository } from '@/api/domains/coach';
import { ApiError } from '@/api/client';
import { loadRosterRows } from '../load-roster';
import { QueryClient } from '@tanstack/react-query';
import { plan } from '@/domain/plan/test-fixtures';
import { CoachDataModel } from '../../CoachDataModel';
const row = { student: { id: 's', displayName: 'S', status: 'active' }, lastActiveAt: null, trainingDays: [], triageSignals: [] };
test('roster state keeps failure as rows for its outer overlay', () => {
  expect(['idle', 'loading', 'loaded', 'failed'].map(state => resolveRosterState(state as 'idle', [], ''))).toEqual(['loading', 'loading', 'emptyRoster', 'rows']);
  expect(resolveRosterState('loaded', [], ' a ')).toBe('noMatches');
  expect(resolveRosterState('loaded', [row], '')).toBe('rows');
  expect(resolveRosterState('loaded', [], '  ')).toBe('emptyRoster');
});
test('abnormal grouping accepts signals or explicit abnormal status and color thresholds are inclusive', () => {
  expect(isAbnormal(row)).toBe(false);
  expect(isAbnormal({ ...row, triageSignals: [{ kind: 'awaitingReply' }] })).toBe(true);
  expect(isAbnormal({ ...row, student: { ...row.student, status: 'abnormal' } })).toBe(true);
  expect([0, 64, 65, 84, 85, 100].map(completionColor)).toEqual(['danger', 'danger', 'gold500', 'gold500', 'success', 'success']);
});
test('bind errors map processed, expired, already bound, and network failures', () => {
  expect(['BIND_REQUEST_NOT_FOUND', 'BIND_REQUEST_NOT_PENDING', 'BIND_REQUEST_EXPIRED', 'BIND_ALREADY_BOUND', 'OTHER'].map(code => bindErrorKey(new ApiError('backend', code, { code: code as 'BIND_REQUEST_NOT_FOUND', status: 409 })))).toEqual(['coach.bind.error.processed', 'coach.bind.error.processed', 'coach.bind.error.expired', 'coach.bind.error.alreadyBound', 'coach.bind.error.network']);
});
// The transport boundary observes the real serialized mutation body.
jest.mock('@/api/session', () => ({ authenticatedRequest: (path: string, options: object) => jest.requireActual<typeof import('@/api/client')>('@/api/client').apiRequest(path, options) }));
test('accept always skips evaluation and reject sends a strictly empty body', async () => {
  const original = global.fetch;
  const fetchMock = jest.fn<typeof fetch>().mockResolvedValue({ ok: true, status: 200, text: async () => '{}' } as Response);
  global.fetch = fetchMock;
  try {
    const id = '11111111-1111-4111-8111-111111111111';
    await coachRepository.accept(id);
    await coachRepository.reject(id);
    expect(fetchMock.mock.calls.map(([, options]) => JSON.parse(options?.body as string))).toEqual([{ skip_evaluation: true }, {}]);
    expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([`/coach/bind-requests/${id}/accept`, `/coach/bind-requests/${id}/reject`]);
  } finally { global.fetch = original; }
});
test('student summaries accept nested profiles and legacy flat profiles', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const result = CoachStudentsResponseSchema.parse({ students: [{ id, profile: { user_id: id, display_name: 'New', created_at: '2026-09-01T00:00:00Z' }, extra: 'ignored' }, { user_id: id, display_name: 'Old', created_at: '2026-09-01T00:00:00Z' }] });
  expect(result.students.map(student => [student.id, student.displayName, student.status])).toEqual([[id, 'New', 'active'], [id, 'Old', 'active']]);
});
test('roster limits active students to four, preserves order and degrades one failed student', async () => {
  let active = 0;
  let peak = 0;
  const students = Array.from({ length: 9 }, (_, i) => ({ id: String(i), displayName: String(i), status: 'active', evaluationEndAt: null }));
  const readers = {
    plan: async (id: string) => { active++; peak = Math.max(peak, active); await new Promise(resolve => setTimeout(resolve, 2)); active--; if (id === '1') throw new Error('offline'); return plan(); },
    logs: async () => ({ logs: [] }), feedback: async () => ({ items: [] }),
  };
  const rows = await loadRosterRows(students, new Date(2026, 8, 9), new QueryClient(), readers);
  expect(peak).toBe(4);
  expect(rows.map(row => row.student.id)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8']);
  expect(rows[1]).toMatchObject({ trainingDays: [], triageSignals: [], lastActiveAt: null });
});
test('4xx refresh completes before banner and stale queue responses cannot resurrect accepted requests', async () => {
  const application = { id: 'a', studentId: 's', displayName: 'Amy', submittedAt: new Date(0), expiredAt: new Date(1), onboarding: null };
  let finishRefresh: ((items: typeof application[]) => void) | undefined;
  let queueReads = 0;
  const model = new CoachDataModel({ roster: async () => [], queue: async () => ++queueReads === 1 ? [application] : new Promise(resolve => { finishRefresh = resolve; }), accept: async () => {}, reject: async () => { throw new ApiError('backend', 'expired', { status: 410, code: 'BIND_REQUEST_EXPIRED' }); } }, new Date(2026, 8, 9));
  await model.loadIfNeeded();
  const stale = model.refreshQueue();
  await model.accept(application);
  finishRefresh?.([application]);
  await stale;
  expect(model.getSnapshot().applications).toEqual([]);
  const rejected = model.reject(application);
  await Promise.resolve();
  expect(model.getSnapshot().banner).toBeNull();
  finishRefresh?.([]);
  await rejected;
  expect(model.getSnapshot().banner).toBe('coach.bind.error.expired');
});
test('accept during an older roster fetch performs a new fetch after the mutation', async () => {
  let resolveOld: ((rows: typeof row[]) => void) | undefined;
  let reads = 0;
  const model = new CoachDataModel({ roster: async () => ++reads === 1 ? new Promise(resolve => { resolveOld = resolve; }) : [row], queue: async () => [], accept: async () => {}, reject: async () => {} }, new Date(2026, 8, 9));
  const loading = model.loadIfNeeded();
  const accepting = model.accept({ id: 'a', studentId: 's', displayName: 'S', submittedAt: new Date(0), expiredAt: new Date(1), onboarding: null });
  await Promise.resolve();
  resolveOld?.([]);
  await Promise.all([loading, accepting]);
  expect(model.getSnapshot().rows).toEqual([row]);
});
test('cached plans and logs paint while their network revalidation is pending', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const cache = new QueryClient();
  cache.setQueryData(['plans', 'student', id], { plans: [] });
  cache.setQueryData(['set-logs', id, '2026-09-02', '2026-09-10', 'plan'], { logs: [] });
  const original = global.fetch;
  let releasePlans: ((response: Response) => void) | undefined;
  const response = (body: object) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) } as Response);
  global.fetch = jest.fn<typeof fetch>(async url => String(url).endsWith('/plans') ? new Promise(resolve => { releasePlans = resolve; }) : response(String(url).includes('/feedback') ? { items: [] } : { logs: [] }));
  let painted: unknown;
  let result: Promise<unknown> | undefined;
  try {
    result = loadRosterRows([{ id, displayName: 'Cached', status: 'active', evaluationEndAt: null }], new Date(2026, 8, 9), cache, undefined, rows => { painted = rows; });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(painted).toEqual([expect.objectContaining({ student: expect.objectContaining({ displayName: 'Cached' }) })]);
    releasePlans?.(response({ plans: [] }));
    await result;
  } finally {
    releasePlans?.(response({ plans: [] }));
    await result;
    global.fetch = original;
    cache.clear();
  }
});
test('same-day clock advances recompute reply signals; day change refreshes the roster', async () => {
  const start = new Date(2026, 8, 9, 12);
  const inputRow = { ...row, triageInput: { plan: null, logs: [{ completed: true, logged_at: new Date(2026, 8, 6, 12).toISOString() }], feedback: [] }, triageSignals: [{ kind: 'awaitingReply' as const }] };
  const dates: string[] = [];
  const model = new CoachDataModel({ roster: async now => { dates.push(now.toISOString()); return [inputRow]; }, queue: async () => [], accept: async () => {}, reject: async () => {} }, start);
  await model.loadIfNeeded();
  model.advanceClock(new Date(2026, 8, 9, 13));
  expect(model.getSnapshot().rows[0].triageSignals).toEqual([]);
  expect(dates).toHaveLength(1);
  model.advanceClock(new Date(2026, 8, 10));
  await model.refreshRoster();
  expect(dates).toHaveLength(2);
  expect(model.getSnapshot().rows[0].triageSignals).toEqual([]);
});
