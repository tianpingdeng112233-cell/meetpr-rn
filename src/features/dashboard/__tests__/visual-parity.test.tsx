import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import { authenticatedRequest, useSessionStore } from '@/api/session';
import type { PlanDetail } from '@/api/domains/plans';
import { setLocaleOverride, t } from '@/i18n';
import { DashboardScreen } from '../DashboardScreen';
import { TodayWorkoutView } from '@/features/training/TodayWorkoutView';

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
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: mockNavigate }), useFocusEffect: () => {} }));
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

beforeEach(() => {
  mockNavigate.mockClear();
  setLocaleOverride('en');
  servedPlan = plan;
  useSessionStore.setState({ user: { id: studentId, phone: '', role: 'coached_student', created_at: plan.created_at } });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path.endsWith('/plans')) return { plans: [servedPlan] } as never;
    if (path === `/plans/${plan.id}`) return servedPlan as never;
    if (path === '/exercises') return { exercises: [] } as never;
    if (path.endsWith('/onboarding')) return null as never;
    if (path.endsWith('/feedback')) return { items: [] } as never;
    if (path.includes('/sets')) return { logs: [] } as never;
    if (path === '/bind-requests/mine') return { bind_request: { status: 'accepted', coach_id: '20000000-0000-4000-8000-000000000000', coach_display_name: 'Alex' } } as never;
    if (path === '/conversations') return (options?.method === 'POST' ? { conversation: { id: '80000000-0000-4000-8000-000000000000', other_party: { id: '20000000-0000-4000-8000-000000000000', display_name: 'Alex' }, unread_count: 0 } } : { conversations: [] }) as never;
    if (path.includes('/readiness')) return { checkin: null } as never;
    throw new Error(`Unexpected request: ${path}`);
  });
});

test.each(['list', 'recording'] as const)('the training tab in %s mode renders no eyebrows and only the list hero has a title', async (mode) => {
  if (mode === 'recording') servedPlan = { ...plan, days: plan.days.map((day) => ({ ...day, completed_at: '2026-09-01T12:00:00Z' })) };
  await act(async () => {
    renderer = create(<QueryClientProvider client={client}><TodayWorkoutView /></QueryClientProvider>);
  });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
  const copy = renderer.root.findAllByType(Text).map((node) => node.props.children).join(' ').toLowerCase();
  expect(copy).toContain('plan summary');
  const text = renderer.root.findAllByType(Text).map((node) =>
    [node.props.children].flat().join(''));
  const stripIndex = text.indexOf(t('student.dashboardWeekCalendar.copy013'));
  expect(stripIndex).toBeGreaterThan(-1);
  expect(text).toContain(t('student.dashboardWeekCalendar.copy014'));
  expect(stripIndex).toBeLessThan(text.indexOf(t('student.trainingCalendarView.copy001')));
  expect(stripIndex).toBeLessThan(text.indexOf(t(mode === 'list'
    ? 'student.todayWorkoutScreen.copy017'
    : 'student.todayWorkoutScreen.copy024')));
  const heroTitles = renderer.root.findAllByType(Text).filter((node) => node.props.children === "Today's workout");
  expect(heroTitles).toHaveLength(mode === 'list' ? 1 : 0);
  const queryAllByTestId = (testID: string) => renderer.root.findAllByProps({ testID });
  expect(queryAllByTestId('eyebrow')).toHaveLength(0);
});
afterEach(() => {
  act(() => renderer?.unmount());
  client.clear();
  useSessionStore.setState({ user: null });
  setLocaleOverride(null);
});

test('Dashboard places the date immediately after the mark in one left-aligned row', async () => {
  await act(async () => {
    renderer = create(<QueryClientProvider client={client}><DashboardScreen /></QueryClientProvider>);
  });
  const row = renderer.root.find((node) => typeof node.type === 'string' && node.props.testID === 'dashboard-brand-date-row');
  expect(StyleSheet.flatten(row.props.style)).toMatchObject({ flexDirection: 'row', gap: 10 });
  expect(StyleSheet.flatten(row.props.style).justifyContent).not.toBe('space-between');
  expect(row.children.map((child) => typeof child === 'string' ? child : child.props.testID))
    .toEqual(['dashboard-mark', 'dashboard-date']);
});

test('the loaded Dashboard renders section copy without ornamental eyebrows', async () => {
  await act(async () => {
    renderer = create(<QueryClientProvider client={client}><DashboardScreen /></QueryClientProvider>);
  });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
  const queryAllByTestId = (testID: string) => renderer.root.findAllByProps({ testID });
  expect(renderer.root.findAllByType(Text).map((node) => node.props.children).join(' ').toLowerCase()).toContain('weekly progress');
  expect(queryAllByTestId('eyebrow')).toHaveLength(0);
});

test.each([{ name: 'Dashboard', Component: DashboardScreen }, { name: 'Training', Component: TodayWorkoutView }])('$name header opens the bound coach chat', async ({ Component }) => {
  await act(async () => { renderer = create(<QueryClientProvider client={client}><Component /></QueryClientProvider>); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  await act(async () => { renderer.root.findAllByProps({ accessibilityLabel: t('student.todayWorkoutScreen.copy007') })[0].props.onPress(); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/(student)/chat', params: { conversationId: '80000000-0000-4000-8000-000000000000', coachName: 'Alex' } });
});
