import AsyncStorage from '@react-native-async-storage/async-storage';
import { readReview } from '../storage';
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { useSetRefStagingStore } from '@/features/chat/set-ref-staging';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, Text, TextInput } from 'react-native';
import { authenticatedRequest, useSessionStore } from '@/api/session';
import type { PlanDetail } from '@/api/domains/plans';
import { setLocaleOverride, t } from '@/i18n';
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
let failCompletion = false;

beforeEach(() => {
  setLocaleOverride('en');
  mockNavigate.mockClear();
  failCompletion = false;
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  servedPlan = plan;
  useSessionStore.setState({ user: { id: studentId, phone: '', role: 'coached_student', created_at: plan.created_at } });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  jest.mocked(authenticatedRequest).mockImplementation(async (path) => {
    if (path.endsWith('/plans')) return { plans: [servedPlan] } as never;
    if (path === `/plans/${plan.id}`) return servedPlan as never;
    if (path === '/exercises') return { exercises: [] } as never;
    if (path.endsWith('/onboarding')) return null as never;
    if (path.endsWith('/feedback')) return { items: [] } as never;
    if (path.includes('/sets')) return { logs: [{ id: 'log', student_id: studentId, plan_exercise_id: plan.days[0].exercises[0].id, exercise_id: plan.days[0].exercises[0].exercise_id, set_index: 0, weight_kg: '80', reps: 5, rpe: '8', completed: true, failed: false, assumed: false, adhoc: false, logged_date: '2026-09-01', logged_at: '2026-09-01T12:00:00Z' }] } as never;
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
const copy = () => renderer.root.findAllByType(Text).map(node => [node.props.children].flat().join(''));
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

test('successful settlement opens celebration and direct finish persists review and navigates to Today', async () => {
  await mount();
  await act(async () => { renderer.root.findAllByProps({ accessibilityLabel: t('student.todayWorkoutScreen.copy022') })[0].props.onAccessibilityAction(); });
  expect(copy()).toContain(t('student.workoutCompletionFlowView.copy001'));
  await press(t('student.workoutCompletionFlowView.copy003'));
  expect(mockNavigate).toHaveBeenCalledWith('/(student)/today');
  expect(await readReview(studentId, plan.days[0].id)).toMatchObject({ completedAt: expect.stringMatching(/^\d{4}-/), reflection: { goal: '', achieved: '', improve: '' } });
  expect(copy()).not.toContain(t('student.workoutCompletionFlowView.copy001'));
});

test('completed-day banner opens review directly and reflection survives reopening', async () => {
  servedPlan = { ...plan, days: plan.days.map(day => ({ ...day, completed_at: '2026-09-01T12:00:00Z' })) };
  await mount();
  await press(t('student.dayCompletionBanner.copy003', [1]));
  expect(copy()).toContain(t('student.sessionSummaryView.copy003'));
  expect(copy()).not.toContain(t('student.workoutCompletionFlowView.copy001'));
  await act(async () => { renderer.root.findAllByType(TextInput)[0].props.onChangeText('Steady pace'); });
  expect((await readReview(studentId, plan.days[0].id))?.reflection.goal).toBe('Steady pace');
  await press(t('student.sessionSummaryView.copy002'));
  expect(mockNavigate).toHaveBeenCalledWith('/(student)/today');
  await press(t('student.dayCompletionBanner.copy003', [1]));
  expect(renderer.root.findAllByType(TextInput)[0].props.value).toBe('Steady pace');
});

test('failed settlement leaves the completion flow closed', async () => {
  failCompletion = true;
  await mount();
  await act(async () => { renderer.root.findAllByProps({ accessibilityLabel: t('student.todayWorkoutScreen.copy022') })[0].props.onAccessibilityAction(); });
  expect(Alert.alert).toHaveBeenCalled();
  expect(copy()).not.toContain(t('student.workoutCompletionFlowView.copy001'));
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(await readReview(studentId, plan.days[0].id)).toBeNull();
});

test('Ask coach opens the picker before navigating, then enters chat with a staged current set', async () => {
  const conversationId = '90000000-0000-4000-8000-000000000000';
  const coachId = '80000000-0000-4000-8000-000000000000';
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === '/bind-requests/mine') return { bind_request: { status: 'accepted', coach_id: coachId, coach_display_name: 'Alex' } } as never;
    if (path === '/conversations') return options?.method === 'POST'
      ? { conversation: { id: conversationId, other_party: { id: coachId, display_name: 'Alex' }, unread_count: 0 } } as never
      : { conversations: [] } as never;
    if (path.endsWith('/videos')) return { videos: [] } as never;
    if (path.includes('/sets?')) return { logs: [] } as never;
    return original(path, options);
  });
  await mount();
  expect(copy()).toContain(t('student.askCoach'));
  await press(t('student.askCoach'));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(copy()).toContain(t('chat.shareTodayTraining'));
  await press(t('chat.continueSelection'));
  await press(t('chat.continueToChat'));
  expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/(student)/chat', params: { conversationId, coachName: 'Alex' } });
  expect(useSetRefStagingStore.getState().intents[conversationId]).toMatchObject({ setRef: { source: 'planned', planSetId: plan.days[0].exercises[0].sets[0].id } });
});
test('Ask coach conversation failure uses the training share alert and stays on Training', async () => {
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === '/bind-requests/mine') return { bind_request: { status: 'accepted', coach_id: '80000000-0000-4000-8000-000000000000', coach_display_name: 'Alex' } } as never;
    if (path === '/conversations') { if (options?.method === 'POST') throw new Error('offline'); return { conversations: [] } as never; }
    if (path.endsWith('/videos')) return { videos: [] } as never;
    return original(path, options);
  });
  await mount(); await press(t('student.askCoach'));
  expect(Alert.alert).toHaveBeenCalledWith(t('student.trainingShareConversationFailed'));
  expect(mockNavigate).not.toHaveBeenCalled();
});
