import { afterEach, expect, jest, test } from '@jest/globals';
import { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { resetSessionForTests } from '@/api/session';
import { day, plan, set } from '@/domain/plan/test-fixtures';
import { useStudentDetail } from '../use-student-detail';

jest.mock('expo-secure-store');
const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const studentId = id(1), planId = id(2), dayId = id(3), plannedId = id(4), exerciseId = id(5);
const cycle = plan([day(dayId, { plan_id: planId, exercises: [{ id: plannedId, exercise_id: exerciseId, plan_day_id: dayId, is_main_lift: true, notes: null, sort_order: 0, sets: [set({ id: id(6), plan_exercise_id: plannedId })] }] })], { id: planId, trainee_id: studentId });
const now = new Date(2026, 8, 7, 15);
const added = { id: id(7), student_id: studentId, plan_exercise_id: null, exercise_id: id(8), plan_day_id: dayId, set_index: 0, weight_kg: '20', reps: 8, rpe: null, completed: true, failed: false, assumed: false, adhoc: true, logged_date: '2026-09-07', logged_at: '2026-09-07T12:00:00Z' };
let renderer: ReactTestRenderer;
let client: QueryClient;
let model: ReturnType<typeof useStudentDetail>;
const originalFetch = globalThis.fetch;
afterEach(() => { act(() => renderer?.unmount()); client?.clear(); globalThis.fetch = originalFetch; jest.clearAllMocks(); });
function Probe() {
  const value = useStudentDetail(studentId, now, false);
  useEffect(() => { model = value; }, [value]);
  return null;
}
async function until(condition: () => boolean) {
  for (let i = 0; i < 100 && !condition(); i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); });
  expect(condition()).toBe(true);
}

test('coach detail requests scope=all and refresh drops deleted student-added logs with old-backend compatibility', async () => {
  resetSessionForTests();
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue('test-token');
  let logs: object[] = [added];
  const scopes: (string | null)[] = [];
  globalThis.fetch = jest.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    let body: unknown;
    let status = 200;
    if (url.pathname === '/coach/students') body = { students: [{ id: studentId, display_name: 'Student' }] };
    else if (url.pathname.endsWith('/sets')) { scopes.push(url.searchParams.get('scope')); body = { logs }; }
    else if (url.pathname === `/students/${studentId}/plans`) body = { plans: [cycle] };
    else if (url.pathname === `/plans/${planId}`) body = cycle;
    else if (url.pathname.endsWith('/feedback')) body = { items: [] };
    else if (url.pathname === '/exercises') body = { exercises: [] };
    else { status = 404; body = { error: 'NOT_FOUND' }; }
    return { ok: status === 200, status, text: async () => JSON.stringify(body) } as Response;
  }) as typeof fetch;
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  await act(async () => { renderer = create(<QueryClientProvider client={client}><Probe /></QueryClientProvider>); });
  await until(() => model.state !== 'loading');
  expect(model.state).toBe('loaded');
  expect(scopes).toEqual(['all']);
  expect(model.days[0].logs.map(log => log.id)).toEqual([id(7)]);
  logs = [];
  await act(async () => { await model.refresh(); });
  await until(() => model.days[0].logs.length === 0);
  expect(model.days[0].logs).toEqual([]);
  // An older backend ignores scope=all and returns ordinary rows without plan_day_id.
  const { plan_day_id: _owner, ...legacy } = added;
  logs = [{ ...legacy, adhoc: false, plan_exercise_id: plannedId, exercise_id: exerciseId }];
  await act(async () => { await model.refresh(); });
  await until(() => model.days[0].logs.length === 1);
  expect(model.state).toBe('loaded');
  expect(model.days[0].logs[0]).toMatchObject({ plan_day_id: null, plan_exercise_id: plannedId });
  expect(scopes).toEqual(['all', 'all', 'all']);
});
