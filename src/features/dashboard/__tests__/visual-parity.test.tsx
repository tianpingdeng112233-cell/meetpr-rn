import AsyncStorage from '@react-native-async-storage/async-storage';
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import * as analytics from '@/analytics/client';
import { AnalyticsEvent } from '@/analytics/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Modal, StyleSheet, Text, TextInput } from 'react-native';
import { authenticatedRequest, useSessionStore } from '@/api/session';
import { FeedbackResponseSchema } from '@/api/domains/feedback';
import { bindKeys, type MineBindRequestResponse } from '@/api/domains/bind';
import type { OnboardingProfile } from '@/api/domains/onboarding';
import type { PlanDetail } from '@/api/domains/plans';
import { setLocaleOverride, t } from '@/i18n';
import ProfileRoute from '@/app/(student)/profile';
import { ProgressMenuRow } from '@/features/history/ProgressMenuRow';
import { ProfileEditor } from '@/features/profile/ProfileEditor';
import { useStudentTabsStore } from '@/features/student-tabs';
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
const mockFocusEffects = new Set<() => void>();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, navigate: mockNavigate }), useFocusEffect: (effect: () => void) => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  useEffect(() => { mockFocusEffects.add(effect); return () => { mockFocusEffects.delete(effect); }; }, [effect]);
}, useLocalSearchParams: () => mockProfileParams, useNavigation: () => mockNavigation }));
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
let servedBinding: MineBindRequestResponse['bind_request'];
let servedPlan: PlanDetail | null;
let servedFirstPlan: PlanDetail | null;
let servedProfile: OnboardingProfile | null;
let servedExercises: import('@/api/domains').Exercise[];
let feedbackItems: import('@/api/domains').FeedbackItem[];

const waitUntil = async (condition: () => boolean) => {
  for (let attempt = 0; attempt < 100 && !condition(); attempt += 1) {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  }
};

beforeEach(async () => {
  await AsyncStorage.clear();
  servedBinding = { id: '90000000-0000-4000-8000-000000000000', student_id: studentId, coach_id: '20000000-0000-4000-8000-000000000000', coach_display_name: 'Alex', status: 'accepted', responded_at: null, submitted_at: '2026-09-01T00:00:00Z', expired_at: '2026-09-08T00:00:00Z', invite_code_id: null, skip_evaluation: true, skip_reason: null };
  mockNavigate.mockClear();
  mockSetParams.mockClear();
  mockProfileParams = {};
  setLocaleOverride('en');
  servedPlan = plan;
  servedFirstPlan = null;
  servedExercises = [];
  servedProfile = null;
  feedbackItems = [];
  mockPush.mockClear();
  mockNavigate.mockClear();
  useSessionStore.setState({ user: { id: studentId, phone: '', role: 'coached_student', created_at: plan.created_at } });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  jest.mocked(authenticatedRequest).mockClear();
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path.endsWith('/plans')) return { plans: servedPlan ? [servedPlan] : [] } as never;
    if (servedFirstPlan && path === `/plans/${servedFirstPlan.id}`) return servedFirstPlan as never;
    if (path === `/plans/${plan.id}`) return servedPlan as never;
    if (path === '/exercises') return { exercises: servedExercises } as never;
    if (path.endsWith('/onboarding')) {
      if (options?.method === 'PUT' && servedProfile) servedProfile = { ...servedProfile, ...options.body as Partial<OnboardingProfile> };
      return servedProfile as never;
    }
    if (path.endsWith('/feedback')) return { items: feedbackItems } as never;
    if (path.endsWith('/videos')) return { videos: [{ id: 'video', exercise_name: 'Competition squat', set_index: 1 }] } as never;
    if (path.includes('/sets')) return { logs: [] } as never;
    if (path === '/bind-requests/mine') return { bind_request: servedBinding } as never;
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
  const loaded = () => mode === 'list'
    ? textCopy().includes("Today's workout")
    : renderer.root.findAllByProps({ testID: 'training.completedDay' }).length > 0;
  await waitUntil(loaded);
  expect(loaded()).toBe(true);
  // A completed day reuses the overview card layout, so it keeps the one title; no set hero either way.
  const heroTitles = renderer.root.findAllByType(Text).filter((node) => node.props.children === "Today's workout");
  expect(heroTitles).toHaveLength(1);
  if (mode === 'recording') expect(renderer.root.findAllByProps({ testID: 'workout-hero' })).toHaveLength(0);
  const queryAllByTestId = (testID: string) => renderer.root.findAllByProps({ testID });
  expect(queryAllByTestId('eyebrow')).toHaveLength(0);
});
afterEach(() => {
  act(() => renderer?.unmount());
  client.clear();
  useSessionStore.setState({ user: null });
  setLocaleOverride(null);
  jest.restoreAllMocks();
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
  await waitUntil(() => renderer.root.findAll(node =>
    node.props.accessibilityLabel === t('student.dashboardFeedbackCard.copy002', [1]) && typeof node.props.onPress === 'function').length > 0);
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
  await waitUntil(() => client.getQueryData<MineBindRequestResponse>(bindKeys.mine)?.bind_request?.status === 'accepted'
    && renderer.root.findAll(node => node.props.accessibilityLabel === t('student.todayWorkoutScreen.copy007')
      && typeof node.props.onPress === 'function' && !node.props.disabled).length > 0);
  await act(async () => { renderer.root.findAllByProps({ accessibilityLabel: t('student.todayWorkoutScreen.copy007') })[0].props.onPress(); });
  await waitUntil(() => mockNavigate.mock.calls.length > 0);
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
  await waitUntil(() => mockNavigate.mock.calls.length > 0);
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
  const weightLabel = hasValues ? t('student.dashboardProfileMetricsView.copy002', ['83.00 kg']) : t('student.dashboardProfileMetricsView.copy011');
  await waitUntil(() => renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === weightLabel).length > 0);
  if (hasValues) expect(renderer.root.findAllByType(Text).some(node => node.props.children === '83')).toBe(true);
  const weight = renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === weightLabel)[0];
  expect(weight).toBeDefined();
  await act(async () => weight.props.onPress());
  expect(mockNavigate).toHaveBeenLastCalledWith({ pathname: '/(student)/profile', params: { edit: 'weight', returnTo: 'today' } });
  mockProfileParams = { edit: 'weight', returnTo: 'today' };
  await act(async () => { renderer.update(<QueryClientProvider client={client}><ProfileRoute /></QueryClientProvider>); });
  expect(renderer.root.findByType(ProfileEditor).props.section).toBe('weight');
  if (hasValues) {
    expect(renderer.root.findAllByType(ProgressMenuRow).map(node => node.props.title)).toEqual(expect.arrayContaining(['About me', 'Meet', 'Note to coach']));
    const noteRow = renderer.root.findAllByType(ProgressMenuRow).find(node => node.props.title === 'Note to coach')!;
    expect(noteRow.props.value).toBe('Added');
    expect(renderer.root.findAllByType(ProgressMenuRow).find(node => node.props.title === 'About me')!.props.value).toBe('180 cm · 83.00 kg');
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
  await waitUntil(() => (!hasValues || renderer.root.findAll(node => node.props.accessibilityLabel === t('student.dashboardProfileMetricsView.copy002', ['84.00 kg'])).length > 0)
    && textCopy().includes(t('student.dashboardProfileMetricsView.copy003')));
  if (hasValues) expect(renderer.root.findAll(node => node.props.accessibilityLabel === t('student.dashboardProfileMetricsView.copy002', ['84.00 kg'])).length).toBeGreaterThan(0);
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


const textCopy = () => renderer.root.findAllByType(Text).map(node => [node.props.children].flat().join(''));
const loadDashboard = async () => {
  await act(async () => { renderer = create(<QueryClientProvider client={client}><DashboardScreen /></QueryClientProvider>); });
  for (let attempt = 0; attempt < 100 && !textCopy().includes('Weekly progress'); attempt += 1) {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  }
};

test('Today overview follows selection, hands off the selected day, and keeps the current start action', async () => {
  const first = plan.days[0];
  const bench = '60000000-0000-4000-8000-000000000001';
  const row = '60000000-0000-4000-8000-000000000002';
  servedExercises = [[first.exercises[0].exercise_id, 'Squat', 'squat'], [bench, 'Bench press', 'bench'], [row, 'Barbell row', null]].map(([id, name, family]) => ({
    id: id!, name: name!, name_en: name!, main_lift_family: family, is_competition_lift: true, competition_stance: null,
    exercise_type: family ? 'main' : 'accessory', muscle_groups: null, equipment: null, movement_pattern: null, created_by_coach_id: null, created_at: plan.created_at,
  })) as import('@/api/domains').Exercise[];
  const second = { ...first, id: '40000000-0000-4000-8000-000000000001', day_of_week: 2, sort_order: 1,
    exercises: [{ ...first.exercises[0], id: 'row', exercise_id: row, sort_order: 2, is_main_lift: false },
      { ...first.exercises[0], id: 'bench', exercise_id: bench, sort_order: 0 },
      { ...first.exercises[0], id: 'unknown', exercise_id: '60000000-0000-4000-8000-000000000099', sort_order: 1, is_main_lift: false }] };
  servedPlan = { ...plan, days: [first, second] };
  await loadDashboard();
  const overview = () => renderer.root.findAll(node => node.props.testID === 'today-day-overview' && typeof node.props.onPress === 'function')[0];
  expect(overview()).toBeDefined();
  expect(textCopy()).toContain("Today's session");
  const day2 = renderer.root.findAll(node => node.props.accessibilityLabel?.startsWith('W1D2 ') && typeof node.props.onPress === 'function')[0];
  await act(async () => day2.props.onPress());
  expect(overview().props.accessibilityRole).toBe('button');
  expect(overview().findAllByType(Text).map(node => node.props.children)).toEqual(expect.arrayContaining(['Bench press day', 'Upcoming', '3 exercises · 3 sets', 'Bench press · Barbell row']));
  expect(overview().findAllByType(Text).find(node => node.props.children === 'Bench press · Barbell row')?.props.numberOfLines).toBe(1);
  expect(textCopy()).toContain('W1D1');
  expect(textCopy()).toContain('Selected day · e1RM chart');
  const charts = renderer.root.findAllByType(Text).filter(node => node.props.children === 'Bench press');
  expect(charts).toHaveLength(1);
  expect(renderer.root.findAllByType(Text).filter(node => node.props.children === 'Squat')).toHaveLength(0);
  await act(async () => overview().props.onPress());
  expect(mockNavigate).toHaveBeenLastCalledWith('/(student)/training');
  expect(useStudentTabsStore.getState().trainingHandoff?.dayID).toBe(second.id);
  const start = renderer.root.findAll(node => node.props.label === 'Start training' && typeof node.props.onPress === 'function')[0];
  await act(async () => start.props.onPress());
  expect(useStudentTabsStore.getState().trainingHandoff?.dayID).toBe(first.id);
});

test('Today keeps the completed day overview and nutrition is a display-only accessible card', async () => {
  servedPlan = { ...plan, days: [{ ...plan.days[0], completed_at: new Date().toISOString() }] };
  await loadDashboard();
  const overview = renderer.root.findAll(node => node.props.testID === 'today-day-overview' && typeof node.props.onPress === 'function')[0];
  expect(overview).toBeDefined();
  expect(overview.findAllByType(Text).some(node => node.props.children === 'Completed')).toBe(true);
  const nutrition = renderer.root.findAll(node => node.props.accessibilityLabel === 'Nutrition, coming soon' && typeof node.type === 'string')[0];
  expect(nutrition).toBeDefined();
  expect(nutrition.props.onPress).toBeUndefined();
  expect(nutrition.findAll(node => typeof node.props.onPress === 'function')).toHaveLength(0);
  expect(textCopy()).toEqual(expect.arrayContaining(['Nutrition', 'Coming soon', 'Carbs', 'Protein', 'Fat', 'Fiber']));
});


test('Today overview uses singular exercise for one exercise and three sets', async () => {
  const day = plan.days[0];
  const exercise = day.exercises[0];
  servedPlan = { ...plan, days: [{ ...day, exercises: [{ ...exercise,
    sets: [1, 2, 3].map(number => ({ ...exercise.sets[0], id: `set-${number}`, set_number: number })),
  }] }] };
  await loadDashboard();
  const overview = renderer.root.findAll(node => node.props.testID === 'today-day-overview' && typeof node.props.onPress === 'function')[0];
  expect(overview.findAllByType(Text).map(node => node.props.children)).toContain('1 exercise · 3 sets');
});


test('Today overview uses singular set for three exercises and one set', async () => {
  const day = plan.days[0];
  const exercise = day.exercises[0];
  servedPlan = { ...plan, days: [{ ...day,
    exercises: [0, 1, 2].map(index => ({ ...exercise, id: `exercise-${index}`, sort_order: index, sets: index === 0 ? exercise.sets : [] })),
  }] };
  await loadDashboard();
  const overview = renderer.root.findAll(node => node.props.testID === 'today-day-overview' && typeof node.props.onPress === 'function')[0];
  expect(overview.findAllByType(Text).map(node => node.props.children)).toContain('3 exercises · 1 set');
});

const renderDashboard = async () => {
  await act(async () => { renderer = create(<QueryClientProvider client={client}><DashboardScreen /></QueryClientProvider>); });
};
const pressFirstRun = async (label: string) => {
  const button = renderer.root.findAll(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === label)[0];
  expect(button).toBeDefined();
  await act(async () => { await button.props.onPress(); });
};
test('a new binding waits without the old weekly promise and opens profile and meet editors', async () => {
  servedPlan = null;
  servedBinding = { ...servedBinding!, responded_at: '2026-09-01T00:00:00Z', first_run: { binding_plan_count: 0, has_settled_day: false, first_plan: null } };
  await renderDashboard();
  await waitUntil(() => textCopy().includes('Alex is building your first plan'));
  expect(textCopy()).toContain('Alex is building your first plan');
  expect(textCopy()).not.toContain(t('student.dashboardPlanWaitingState.copy006', [1]));
  expect(textCopy()).not.toContain(t('student.dashboardPlanWaitingState.copy004'));
  await pressFirstRun('Complete your profile');
  expect(mockNavigate).toHaveBeenLastCalledWith('/(student)/profile');
  await pressFirstRun('Add a meet date');
  expect(mockNavigate).toHaveBeenLastCalledWith({ pathname: '/(student)/profile', params: { edit: 'competition', returnTo: 'today' } });
});

test.each(['Dismiss first plan', 'Start W1D1'])('first plan %s restores the bottom button and remains dismissed after remount', async label => {
  const track = jest.spyOn(analytics, 'track');
  servedBinding = { ...servedBinding!, responded_at: '2026-09-01T00:00:00Z', first_run: { binding_plan_count: 0, has_settled_day: false, first_plan: null } };
  servedPlan = { ...plan, coach_id: servedBinding.coach_id, published_at: '2026-09-02T00:00:00Z', days: plan.days.map(day => ({ ...day, completed_at: null })) };
  servedFirstPlan = { ...servedPlan, id: '30000000-0000-4000-8000-000000000099', days: [
    { ...plan.days[0], id: '40000000-0000-4000-8000-000000000099', week_number: 2 },
    { ...plan.days[0], week_number: 1 },
  ] };
  servedBinding.first_run = { binding_plan_count: 2, has_settled_day: false, first_plan: {
    id: servedFirstPlan.id, published_at: '2026-09-02T00:00:00Z', plan_weeks: 6, day_count: 18, has_settled_day: false,
  } };
  await renderDashboard();
  await waitUntil(() => textCopy().includes('Alex published your first plan'));
  expect(textCopy()).toContain('Alex published your first plan');
  expect(textCopy()).toContain('W1 – W6 · 18 sessions');
  expect(jest.mocked(authenticatedRequest).mock.calls.map(([path]) => path)).not.toContain(`/plans/${servedFirstPlan.id}`);
  expect(textCopy()).not.toContain(t('student.dashboardPrimaryAction.copy001'));
  await pressFirstRun(label);
  expect(track).toHaveBeenCalledWith(AnalyticsEvent.FirstPlanViewed, { plan_id: servedFirstPlan.id });
  expect(track).toHaveBeenCalledWith(label === 'Start W1D1' ? AnalyticsEvent.FirstPlanStart : AnalyticsEvent.FirstPlanDismiss, { plan_id: servedFirstPlan.id });
  expect(textCopy()).not.toContain('Alex published your first plan');
  expect(textCopy()).toContain(t('student.dashboardPrimaryAction.copy001'));
  if (label === 'Start W1D1') {
    expect(mockNavigate).toHaveBeenLastCalledWith('/(student)/training');
    expect(useStudentTabsStore.getState().trainingHandoff).toMatchObject({ plan: { id: servedFirstPlan.id }, dayID: plan.days[0].id });
  }
  act(() => renderer.unmount());
  await renderDashboard();
  await waitUntil(() => textCopy().includes(t('student.dashboardPrimaryAction.copy001')));
  expect(textCopy()).not.toContain('Alex published your first plan');
});

test('a received zero-day plan keeps every original waiting-card string', async () => {
  servedBinding = { ...servedBinding!, responded_at: '2026-09-01T00:00:00Z', first_run: { binding_plan_count: 0, has_settled_day: false, first_plan: null } };
  servedPlan = { ...plan, coach_id: servedBinding.coach_id, published_at: '2026-09-02T00:00:00Z', days: [] };
  servedBinding.first_run = { binding_plan_count: 1, has_settled_day: false, first_plan: {
    id: plan.id, published_at: '2026-09-02T00:00:00Z', plan_weeks: 4, day_count: 0, has_settled_day: false,
  } };
  await renderDashboard();
  await waitUntil(() => textCopy().includes('Alex is programming W1 for you'));
  const copy = textCopy();
  for (const text of ['Alex is programming W1 for you', "Based on this week's RPE and completion · Usually published Sun 21:00  before publishing", 'Message coach', 'Weekly summary · W1', 'Training completed', 'Weekly volume', 'New PR']) expect(copy).toContain(text);
  expect(copy).not.toContain('While you wait');
  const start = renderer.root.findAll(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === 'Start W1D1')[0];
  expect(start.props.disabled).toBe(true);
});
test('new waiting guidance hides Add a meet date when the profile already has one', async () => {
  servedBinding = { ...servedBinding!, responded_at: '2026-09-01T00:00:00Z', first_run: { binding_plan_count: 0, has_settled_day: false, first_plan: null } };
  servedPlan = null;
  servedProfile = { competition_date: '2027-01-01', is_competing: true } as OnboardingProfile;
  await renderDashboard();
  await waitUntil(() => textCopy().includes('While you wait'));
  expect(textCopy()).toContain('Complete your profile');
  expect(textCopy()).not.toContain('Add a meet date');
});

test('Traditional Chinese meet guidance keeps competition intentions distinct from a training plan', async () => {
  setLocaleOverride('zh-Hant');
  servedBinding = { ...servedBinding!, responded_at: '2026-09-01T00:00:00Z', first_run: { binding_plan_count: 0, has_settled_day: false, first_plan: null } };
  servedPlan = null;
  await renderDashboard();
  await waitUntil(() => textCopy().includes('等課表的時候'));
  expect(textCopy()).toContain('有比賽計畫？教練會按比賽日來排');
});

test.each([undefined, null, {
  binding_plan_count: 1, has_settled_day: true,
  first_plan: { id: plan.id, published_at: '2026-09-02T00:00:00Z', plan_weeks: 4, day_count: 12, has_settled_day: true },
}])('unknown metadata or a hidden completed plan keeps the original waiting card: %j', async first_run => {
  servedPlan = null;
  servedBinding = { ...servedBinding!, first_run };
  await renderDashboard();
  await waitUntil(() => textCopy().includes('Weekly summary · W1'));
  expect(textCopy()).toContain('Alex is programming W1 for you');
  expect(textCopy()).not.toContain('Alex published your first plan');
  expect(textCopy()).not.toContain('While you wait');
  expect(jest.mocked(authenticatedRequest).mock.calls.filter(([path]) => path.startsWith('/plans/'))).toHaveLength(0);
});

test('a settled first plan hides the card even while the current plan is still unstarted', async () => {
  servedBinding = { ...servedBinding!, first_run: {
    binding_plan_count: 2, has_settled_day: true,
    first_plan: { id: '30000000-0000-4000-8000-000000000099', published_at: '2026-09-02T00:00:00Z', plan_weeks: 4, day_count: 12, has_settled_day: true },
  } };
  await renderDashboard();
  await waitUntil(() => textCopy().includes(t('student.dashboardPrimaryAction.copy001')));
  expect(textCopy()).not.toContain('Alex published your first plan');
  expect(jest.mocked(authenticatedRequest).mock.calls.map(([path]) => path)).not.toContain('/plans/30000000-0000-4000-8000-000000000099');
});

test.each(['unavailable', 'empty'] as const)('first plan detail %s keeps the card open and allows retry', async failure => {
  const firstId = '30000000-0000-4000-8000-000000000099';
  servedFirstPlan = failure === 'empty' ? { ...plan, id: firstId, days: [] } : null;
  servedBinding = { ...servedBinding!, first_run: { binding_plan_count: 2, has_settled_day: false, first_plan: {
    id: firstId, published_at: '2026-09-02T00:00:00Z', plan_weeks: 4, day_count: 12, has_settled_day: false,
  } } };
  await renderDashboard();
  await waitUntil(() => textCopy().includes('Alex published your first plan'));
  await pressFirstRun('Start W1D1');
  expect(textCopy()).toContain('Alex published your first plan');
  expect(await AsyncStorage.getItem(`onboarding.firstPlanDismissed.${studentId}.${servedBinding.id}`)).toBeNull();
  expect(mockNavigate).not.toHaveBeenCalled();
  servedFirstPlan = { ...plan, id: firstId };
  await pressFirstRun('Start W1D1');
  expect(textCopy()).not.toContain('Alex published your first plan');
  expect(useStudentTabsStore.getState().trainingHandoff).toMatchObject({ plan: { id: firstId }, dayID: plan.days[0].id });
});


test('returning from chat refreshes first_run and shows a newly published first plan', async () => {
  servedPlan = null;
  servedBinding = { ...servedBinding!, first_run: { binding_plan_count: 0, has_settled_day: false, first_plan: null } };
  await renderDashboard();
  await waitUntil(() => textCopy().includes('While you wait'));
  servedPlan = plan;
  servedBinding = { ...servedBinding, first_run: { binding_plan_count: 1, has_settled_day: false, first_plan: {
    id: plan.id, published_at: '2026-09-02T00:00:00Z', plan_weeks: 4, day_count: 12, has_settled_day: false,
  } } };
  await act(async () => { for (const effect of [...mockFocusEffects]) effect(); });
  await waitUntil(() => textCopy().includes('Alex published your first plan'));
  expect(textCopy()).toContain('Alex published your first plan');
});

test('settling a first training day refreshes first_run through the existing plan revision', async () => {
  servedBinding = { ...servedBinding!, first_run: { binding_plan_count: 1, has_settled_day: false, first_plan: {
    id: plan.id, published_at: '2026-09-02T00:00:00Z', plan_weeks: 4, day_count: 12, has_settled_day: false,
  } } };
  await renderDashboard();
  await waitUntil(() => textCopy().includes('Alex published your first plan'));
  servedBinding = { ...servedBinding, first_run: { ...servedBinding.first_run!, has_settled_day: true, first_plan: {
    ...servedBinding.first_run!.first_plan!, has_settled_day: true,
  } } };
  await act(async () => { useStudentTabsStore.getState().bumpCompletionRevision(); });
  await waitUntil(() => !textCopy().includes('Alex published your first plan'));
  expect(textCopy()).not.toContain('Alex published your first plan');
});
