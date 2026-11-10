import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import type { PlanDetail } from '@/api/domains/plans';
import type { SetLog } from '@/api/domains/sets';
import { authenticatedRequest, useSessionStore } from '@/api/session';
import { TodayWorkoutView } from '@/features/training/TodayWorkoutView';
import { setLocaleOverride, t } from '@/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert, Modal } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('expo-media-library', () => ({}));
jest.mock('react-native-compressor', () => ({}));
jest.mock('react-native-video', () => 'Video');

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-community/netinfo', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-community/netinfo/jest/netinfo-mock'));
const mockNavigate = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: mockNavigate, push: mockPush }), useFocusEffect: () => {} }));
jest.mock('@/api/session', () => ({
  ...jest.requireActual<typeof import('@/api/session')>('@/api/session'),
  authenticatedRequest: jest.fn(),
}));

const studentId = '10000000-0000-4000-8000-000000000000';
const plan: PlanDetail = {
  id: '30000000-0000-4000-8000-000000000000', coach_id: null, trainee_id: studentId,
  name: 'Strength', start_date: '2026-09-01', end_date: '2026-09-28', plan_weeks: 4,
  source: 'coach', source_template_id: null, status: 'published', kind: 'regular',
  created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z',
  total_shift_days: 0, latest_shift_created_at: null,
  days: [{ id: '40000000-0000-4000-8000-000000000000',
    plan_id: '30000000-0000-4000-8000-000000000000', day_of_week: 1, week_number: 1,
    sort_order: 0, shifted_to_date: null, exercises: [{
      id: '50000000-0000-4000-8000-000000000000', plan_day_id: '40000000-0000-4000-8000-000000000000',
      exercise_id: '60000000-0000-4000-8000-000000000000', is_main_lift: true, sort_order: 0, notes: null,
      sets: [{ id: '70000000-0000-4000-8000-000000000000', plan_exercise_id: '50000000-0000-4000-8000-000000000000',
        set_number: 1, target_reps: 5, target_reps_max: null, intensity_mode: 'weight', target_value: '80',
        set_type: 'working', rest_seconds: 120, coach_note: null, created_at: '2026-09-01T00:00:00Z' }],
    }] }],
};
let renderer: ReactTestRenderer;
let client: QueryClient;
let servedPlan: PlanDetail;
let failCompletion = false;
let storedLogs: SetLog[] = [];

beforeEach(() => {
  setLocaleOverride('en');
  mockNavigate.mockClear();
  mockPush.mockClear();
  failCompletion = false;
  storedLogs = [];
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  servedPlan = plan;
  useSessionStore.setState({ user: { id: studentId, phone: '', role: 'coached_student', created_at: plan.created_at } });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path.endsWith('/plans')) return { plans: [servedPlan] } as never;
    if (path === `/plans/${plan.id}`) return servedPlan as never;
    if (path === '/exercises') return { exercises: [] } as never;
    if (path.endsWith('/onboarding')) return null as never;
    if (path.endsWith('/feedback')) return { items: [] } as never;
    if (path === '/sets/log') {
      const body = options?.body as { logged_date?: string; weight_kg: string; reps: number; rpe: string | null; set_index: number };
      storedLogs.push({ id: '80000000-0000-4000-8000-000000000000', student_id: studentId, plan_exercise_id: plan.days[0].exercises[0].id, exercise_id: plan.days[0].exercises[0].exercise_id, set_index: body.set_index, weight_kg: body.weight_kg, reps: body.reps, rpe: body.rpe, completed: true, failed: false, assumed: false, adhoc: false, logged_date: body.logged_date ?? '2026-09-21', logged_at: '2026-09-21T10:00:00Z' });
      return { id: storedLogs[0].id, logged_at: storedLogs[0].logged_at } as never;
    }
    if (path.includes('/sets')) return { logs: storedLogs } as never;
    if (path.endsWith('/complete')) {
      if (failCompletion) throw new Error('Offline');
      servedPlan = { ...plan, days: plan.days.map(day => ({ ...day, completed_at: '2026-09-01T12:00:00Z' })) };
      return { id: 'completion', plan_day_id: plan.days[0].id, student_id: studentId, source: 'manual', completed_at: '2026-09-01T12:00:00Z' } as never;
    }
    if (path === '/bind-requests/mine') return { bind_request: null } as never;
    if (path.includes('/readiness')) return { checkin: null } as never;
    throw new Error(`Unexpected request: ${path}`);
  });
});

const mount = async () => {
  await act(async () => { renderer = create(<QueryClientProvider client={client}><TodayWorkoutView /></QueryClientProvider>); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
};
const press = async (label: string) => {
  await act(async () => { renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label)[0].props.onPress(); });
};
afterEach(async () => {
  act(() => renderer?.unmount());
  client.clear();
  useSessionStore.setState({ user: null });
  setLocaleOverride(null);
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

test('107 retired training entry points are unreachable and all exercise rows start collapsed', async () => {
  await mount();
  const labels = renderer.root.findAll(node => node.props.onPress).map(node => node.props.accessibilityLabel);
  expect(labels).not.toContain(t('student.trainingHistoryView.copy024'));
  expect(labels).not.toContain(t('student.todayWorkoutScreen.copy008'));
  expect(renderer.root.findAllByType(Modal)).toHaveLength(0);
  expect(labels).not.toContain('Edit set 1');
  const exerciseRows = renderer.root.findAll(node => node.props.testID?.startsWith('all-day-exercise-') && node.props.onPress);
  expect(exerciseRows.length).toBeGreaterThan(0);
  expect(exerciseRows.every(node => node.props.accessibilityState.expanded === false)).toBe(true);
});

test('107 a future week is read only and previous week returns to editable rows', async () => {
  servedPlan = { ...plan, days: [plan.days[0], { ...plan.days[0], id: '40000000-0000-4000-8000-000000000001', week_number: 2 }] };
  await mount();
  await press('Next week');
  await act(async () => renderer.root.findAll(node => node.props.testID?.startsWith('all-day-exercise-') && node.props.onPress)[0].props.onPress());
  expect(renderer.root.findAll(node => node.props.accessibilityLabel === 'Edit set 1' && node.props.disabled === true).length).toBeGreaterThan(0);
  expect(renderer.root.findAll(node => node.props.accessibilityLabel === 'Edit set 1' && node.props.disabled === false)).toHaveLength(0);
  await press('Previous week');
  await act(async () => renderer.root.findAll(node => node.props.testID?.startsWith('all-day-exercise-') && node.props.onPress)[0].props.onPress());
  expect(renderer.root.findAll(node => node.props.accessibilityLabel === 'Edit set 1' && node.props.disabled === false).length).toBeGreaterThan(0);
});
