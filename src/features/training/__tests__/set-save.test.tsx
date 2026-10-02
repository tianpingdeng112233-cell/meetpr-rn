import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutBody } from '../WorkoutBody';
import { EMPTY_VIDEO_UPLOAD } from '../video-upload/model';
import { useVideoUploadStore, resetVideoUploadStoreForTests } from '../video-upload/store';
import { SetEntrySheet } from '../SetEntrySheet';
import type { SetLog } from '@/api/domains/sets';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, ActivityIndicator, Text } from 'react-native';
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
let writes = 0;

beforeEach(() => {
  setLocaleOverride('en');
  mockNavigate.mockClear();
  mockPush.mockClear();
  failCompletion = false;
  storedLogs = []; writes = 0;
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
      writes += 1;
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
afterEach(async () => {
  act(() => renderer?.unmount());
  client.clear();
  resetVideoUploadStoreForTests();
  jest.useRealTimers();
  useSessionStore.setState({ user: null });
  setLocaleOverride(null);
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});


const openSet = async () => {
  await mount();
  await act(async () => { renderer.root.findByType(WorkoutBody).props.onRecord(renderer.root.findByType(WorkoutBody).props.drafts[0]); });
};
const saveButton = (failed = false) => renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.findAllByType(Text).some(text => text.props.children === t(failed ? 'student.setEntrySheet.copy009' : 'student.setEntrySheet.copy012')))[0];
test('a slow set save immediately disables both actions and shows progress until success', async () => {
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  let finish!: () => void;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === '/sets/log') await new Promise<void>(resolve => { finish = resolve; });
    return original(path, options);
  });
  await openSet();
  await act(async () => { saveButton().props.onPress(); });
  expect(saveButton().props.disabled).toBe(true);
  expect(saveButton(true).props.disabled).toBe(true);
  expect(renderer.root.findByType(SetEntrySheet).findAllByType(ActivityIndicator).length).toBeGreaterThan(0);
  await act(async () => { finish(); });
  expect(writes).toBe(1);
  expect(renderer.root.findAllByType(SetEntrySheet)).toHaveLength(0);
});

test.each(['failure', 'timeout'])('%s keeps the inputs and permits the same set to retry', async (mode) => {
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  let attempt = 0;
  const bodies: unknown[] = [];
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === '/sets/log') {
      bodies.push(options?.body);
      if (++attempt === 1) {
        if (mode === 'timeout') return new Promise(() => {});
        throw new Error('Offline');
      }
    }
    return original(path, options);
  });
  await openSet();
  jest.useFakeTimers();
  await act(async () => { saveButton(true).props.onPress(); });
  await act(async () => { await jest.advanceTimersByTimeAsync(30_001); });
  expect(Alert.alert).toHaveBeenCalled();
  expect(saveButton().props.disabled).toBe(false);
  await act(async () => { saveButton(true).props.onPress(); });
  expect(bodies[1]).toEqual(bodies[0]);
  expect(writes).toBe(1);
  expect(storedLogs[0]).toMatchObject({ weight_kg: '80', reps: 5, rpe: '8' });
  jest.useRealTimers();
});

test('Sending does not block the TodayWorkoutView save path or discard the attachment', async () => {
  const key = `${studentId}:${plan.days[0].exercises[0].sets[0].id}`;
  useVideoUploadStore.setState({ records: { [key]: { ...EMPTY_VIDEO_UPLOAD, status: 'uploading', localUri: 'file:///video.mp4' } } });
  await openSet();
  expect(useVideoUploadStore.getState().records[key].status).toBe('uploading');
  await act(async () => { saveButton().props.onPress(); });
  expect(writes).toBe(1);
  expect(useVideoUploadStore.getState().records[key].localUri).toBe('file:///video.mp4');
});
