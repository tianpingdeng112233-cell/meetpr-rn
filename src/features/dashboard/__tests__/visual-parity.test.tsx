import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Modal, StyleSheet, Text, TextInput } from 'react-native';
import { authenticatedRequest, useSessionStore } from '@/api/session';
import { FeedbackResponseSchema } from '@/api/domains/feedback';
import type { OnboardingProfile } from '@/api/domains/onboarding';
import type { PlanDetail } from '@/api/domains/plans';
import { setLocaleOverride, t } from '@/i18n';
import ProfileRoute from '@/app/(student)/profile';
import { ProfileEditor } from '@/features/profile/ProfileEditor';
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
const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
let mockProfileParams: { edit?: string; returnTo?: string } = {};
const mockNavigation = { setParams: mockSetParams };
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, navigate: mockNavigate }), useFocusEffect: () => {}, useLocalSearchParams: () => mockProfileParams, useNavigation: () => mockNavigation }));
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
let servedPlan: PlanDetail | null;
let servedProfile: OnboardingProfile | null;
let feedbackItems: import('@/api/domains').FeedbackItem[];

beforeEach(() => {
  mockNavigate.mockClear();
  mockSetParams.mockClear();
  mockProfileParams = {};
  setLocaleOverride('en');
  servedPlan = plan;
  servedProfile = null;
  feedbackItems = [];
  mockPush.mockClear();
  mockNavigate.mockClear();
  useSessionStore.setState({ user: { id: studentId, phone: '', role: 'coached_student', created_at: plan.created_at } });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path.endsWith('/plans')) return { plans: servedPlan ? [servedPlan] : [] } as never;
    if (path === `/plans/${plan.id}`) return servedPlan as never;
    if (path === '/exercises') return { exercises: [] } as never;
    if (path.endsWith('/onboarding')) {
      if (options?.method === 'PUT' && servedProfile) servedProfile = { ...servedProfile, ...options.body as Partial<OnboardingProfile> };
      return servedProfile as never;
    }
    if (path.endsWith('/feedback')) return { items: feedbackItems } as never;
    if (path.endsWith('/videos')) return { videos: [{ id: 'video', exercise_name: 'Competition squat', set_index: 1 }] } as never;
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
  jest.useRealTimers();
});

test('Dashboard history includes calendar-today quick logs before the 04:00 gym-day boundary', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 8, 22, 2, 0));
  await act(async () => { renderer = create(<QueryClientProvider client={client}><DashboardScreen /></QueryClientProvider>); });
  await act(async () => { await jest.advanceTimersByTimeAsync(100); });
  const paths = jest.mocked(authenticatedRequest).mock.calls.map(([path]) => path);
  expect(paths).toContain(`/students/${studentId}/sets?from=1970-01-01&to=2026-09-23`);
});

test('Dashboard uses the embedded Global feedback English name rather than the legacy video list', async () => {
  feedbackItems = FeedbackResponseSchema.parse({ items: [{
    id: studentId, coach_id: studentId, student_id: studentId,
    day_date: '2026-09-22', plan_exercise_id: null, video_id: studentId,
    text: 'QA feedback', posted_at: '2026-09-22T06:22:45Z', read_at: null,
    video: { id: studentId, exercise_name: '竞技深蹲', exercise_name_en: 'Competition Squat', set_index: 0 },
  }] }).items;
  await act(async () => { renderer = create(<QueryClientProvider client={client}><DashboardScreen /></QueryClientProvider>); });
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (renderer.root.findAll(node => typeof node.type === 'string' && node.props.accessibilityLabel === 'Coach feedback, show all 1').length) break;
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  }
  const button = renderer.root.findAll(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === 'Coach feedback, show all 1')[0];
  await act(async () => button.props.onPress());
  const copy = renderer.root.findAllByType(Text).map(node => [node.props.children].flat().join(''));
  expect(copy).toContain('Competition Squat · Set 1');
  expect(copy).not.toContain('竞技深蹲 · Set 1');
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
  // Poll instead of a fixed 30 ms wait: the loaded copy depends on several async queries and flaked under load.
  const joinedText = () => renderer.root.findAllByType(Text).map((node) => node.props.children).join(' ').toLowerCase();
  for (let attempt = 0; attempt < 100 && !joinedText().includes('weekly progress'); attempt += 1) {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
  }
  const queryAllByTestId = (testID: string) => renderer.root.findAllByProps({ testID });
  expect(joinedText()).toContain('weekly progress');
  expect(queryAllByTestId('eyebrow')).toHaveLength(0);
});

test('Dashboard joins the existing video read and opens the selected feedback detail', async () => {
  const item = { id: '80000000-0000-4000-8000-000000000000', coach_id: 'coach', student_id: studentId,
    day_date: null, plan_exercise_id: null, video_id: 'video', text: 'Drive through your feet.',
    posted_at: '2026-09-04T12:00:00Z', read_at: null };
  feedbackItems = [item];
  await act(async () => {
    renderer = create(<QueryClientProvider client={client}><DashboardScreen /></QueryClientProvider>);
  });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  const button = (label: string) => renderer.root.find(node =>
    node.props.accessibilityLabel === label && typeof node.props.onPress === 'function');
  await act(async () => button(t('student.dashboardFeedbackCard.copy002', [1])).props.onPress());
  const label = renderer.root.findAllByType(Text).find(node => node.props.children === 'Competition squat · Set 2');
  expect(label).toBeDefined();
  let row = label!;
  while (typeof row.props.onPress !== 'function') row = row.parent!;
  await act(async () => row.props.onPress());
  expect(mockPush).toHaveBeenCalledWith(`/(student)/feedback/${item.id}`);
});

test.each([{ name: 'Dashboard', Component: DashboardScreen }, { name: 'Training', Component: TodayWorkoutView }])('$name header opens the bound coach chat', async ({ Component }) => {
  await act(async () => { renderer = create(<QueryClientProvider client={client}><Component /></QueryClientProvider>); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  await act(async () => { renderer.root.findAllByProps({ accessibilityLabel: t('student.todayWorkoutScreen.copy007') })[0].props.onPress(); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/(student)/chat', params: { conversationId: '80000000-0000-4000-8000-000000000000', coachName: 'Alex' } });
});


test('a bound student with no plan can message the coach from the Dashboard waiting card', async () => {
  servedPlan = null;
  await act(async () => { renderer = create(<QueryClientProvider client={client}><DashboardScreen /></QueryClientProvider>); });
  const messageLabel = () => renderer.root.findAllByType(Text).find(node => node.props.children === 'Message coach');
  for (let attempt = 0; attempt < 100 && !messageLabel(); attempt += 1) {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  }
  let button = messageLabel();
  expect(button).toBeDefined();
  while (button && typeof button.props.onPress !== 'function') button = button.parent ?? undefined;
  if (!button) throw new Error('Message coach must be actionable');
  const press = button.props.onPress;
  await act(async () => { await press(); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/(student)/chat', params: { conversationId: '80000000-0000-4000-8000-000000000000', coachName: 'Alex' } });
  expect(mockNavigate).not.toHaveBeenCalledWith('/(student)/feedback');
});

test.each([false, true])('Today metric cards open the existing Profile editors (has values: %s)', async (hasValues) => {
  if (hasValues) servedProfile = {
    user_id: '10000000-0000-4000-8000-000000000000', unit_preference: 'kg', gender: 'male',
    birth_date: '2000-01-01', height_cm: '180', weight_kg: '83', training_years: 3,
    squat_stance: 'high_bar', deadlift_style: 'conventional', bench_grip: 'standard',
    squat_1rm_kg: '200', bench_1rm_kg: '150', deadlift_1rm_kg: '250',
    training_days: ['mon', 'wed'], gym_tier: 'commercial', equipment_overrides: null,
    daily_life_intensity: 3, life_stress: 2, recovery_speed: 4, sleep_hours: 8,
    muscle_groups_to_strengthen: null, injury_notes: 'Existing injury', injury_areas: ['knee'],
    is_competing: true, competition_date: '2099-01-01', target_weight_class: '83', note_to_coach: 'Existing note',
    completed_at: null, created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z', upload_attachment_ids: [],
  };
  await act(async () => { renderer = create(<QueryClientProvider client={client}><DashboardScreen /></QueryClientProvider>); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  const weightLabel = hasValues ? t('student.dashboardProfileMetricsView.copy002', ['83 kg']) : t('student.dashboardProfileMetricsView.copy011');
  const weight = renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === weightLabel)[0];
  expect(weight).toBeDefined();
  await act(async () => weight.props.onPress());
  expect(mockNavigate).toHaveBeenLastCalledWith({ pathname: '/(student)/profile', params: { edit: 'basics', returnTo: 'today' } });
  mockProfileParams = { edit: 'basics', returnTo: 'today' };
  await act(async () => { renderer.update(<QueryClientProvider client={client}><ProfileRoute /></QueryClientProvider>); });
  expect(renderer.root.findByType(ProfileEditor).props.section).toBe('basics');
  if (hasValues) {
    await act(async () => { renderer.root.findAllByType(TextInput).find(node => node.props.value === '83')!.props.onChangeText('84'); });
    const save = renderer.root.findByType(ProfileEditor).findAll(node => typeof node.props.onPress === 'function' && node.props.label === t('student.profileCardsSection.copy013'))[0];
    await act(async () => { save.props.onPress(); });
    for (let attempt = 0; attempt < 30 && mockNavigate.mock.lastCall?.[0] !== '/(student)/today'; attempt += 1) {
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    }
  } else {
    await act(async () => { renderer.root.findByType(ProfileEditor).findByType(Modal).props.onRequestClose(); });
  }
  expect(mockNavigate).toHaveBeenLastCalledWith('/(student)/today');
  expect(mockSetParams).toHaveBeenCalledWith({ edit: undefined, returnTo: undefined });
  await act(async () => { renderer.update(<QueryClientProvider client={client}><DashboardScreen /></QueryClientProvider>); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  if (hasValues) expect(renderer.root.findAll(node => node.props.accessibilityLabel === t('student.dashboardProfileMetricsView.copy002', ['84 kg'])).length).toBeGreaterThan(0);
  const meetText = renderer.root.findAllByType(Text).find(node => node.props.children === t('student.dashboardProfileMetricsView.copy003'))!;
  let meetButton = meetText;
  while (meetButton.parent && (meetButton.props.accessibilityRole !== 'button' || typeof meetButton.props.onPress !== 'function')) meetButton = meetButton.parent;
  expect(meetButton.props.accessibilityRole).toBe('button');
  expect(meetButton.props.accessibilityLabel).toEqual(expect.any(String));
  await act(async () => meetButton.props.onPress());
  expect(mockNavigate).toHaveBeenLastCalledWith({ pathname: '/(student)/profile', params: { edit: 'competition', returnTo: 'today' } });
  mockProfileParams = { edit: 'competition', returnTo: 'today' };
  await act(async () => { renderer.update(<QueryClientProvider client={client}><ProfileRoute /></QueryClientProvider>); });
  expect(renderer.root.findByType(ProfileEditor).props.section).toBe('competition');
  const writes = jest.mocked(authenticatedRequest).mock.calls.filter(([, options]) => options?.method === 'PUT').length;
  await act(async () => { renderer.root.findByType(ProfileEditor).findByType(Modal).props.onRequestClose(); });
  expect(mockNavigate).toHaveBeenLastCalledWith('/(student)/today');
  expect(jest.mocked(authenticatedRequest).mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(writes);
});
