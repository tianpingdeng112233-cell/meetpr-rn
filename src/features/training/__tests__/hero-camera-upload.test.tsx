import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import type { PlanDetail } from '@/api/domains/plans';
import type { SetLog } from '@/api/domains/sets';
import { authenticatedRequest, useSessionStore } from '@/api/session';
import { setLocaleOverride, t } from '@/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { SetEntrySheet } from '../SetEntrySheet';
import { TodayWorkoutView } from '../TodayWorkoutView';
import { CameraRecorder } from '../video-upload/CameraRecorder';
import { VIDEO_UPLOAD_CONSENT_KEY } from '../video-upload/model';
import { deleteLocalVideo } from '../video-upload/native';
import { resetVideoUploadStoreForTests, useVideoUploadStore } from '../video-upload/store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: () => () => {} }));
jest.mock('expo-router', () => ({ useRouter: () => ({}), useFocusEffect: () => {} }));
jest.mock('@/api/session', () => ({
  ...jest.requireActual<typeof import('@/api/session')>('@/api/session'),
  authenticatedRequest: jest.fn(),
}));
jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn() }));
jest.mock('expo-media-library', () => ({}));
jest.mock('react-native-compressor', () => ({}));
jest.mock('react-native-video', () => 'Video');
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView', Camera: {
    requestCameraPermissionsAsync: async () => ({ granted: true }),
    requestMicrophonePermissionsAsync: async () => ({ granted: true }),
  },
}));
// Native video I/O is the boundary; keep the real controls, manager and save queue.
jest.mock('../video-upload/native', () => ({
  ...jest.requireActual<typeof import('../video-upload/native')>('../video-upload/native'),
  hasTrainingCamera: async () => true,
  retainVideoSource: async (source: object) => ({ ...source, uri: 'file:///documents/captured.mp4' }),
  prepareTrainingVideo: async () => ({ localUri: 'file:///documents/captured.mp4', sizeBytes: 100 }),
  localVideoSize: () => 100,
  deleteLocalVideo: jest.fn(),
}));
jest.mock('expo-file-system', () => ({
  File: class {
    uri: string; size = 100; exists = true;
    constructor(...parts: (string | { uri: string })[]) { this.uri = parts.map(p => typeof p === 'string' ? p : p.uri).join('/'); }
    open() { return { offset: 0, readBytes: (size: number) => new Uint8Array(size), close() {} }; }
    write() {} delete() {}
  },
  Directory: class { uri = 'file:///cache/parts'; exists = false; create() {} },
  Paths: { cache: { uri: 'file:///cache' } },
}));
jest.mock('expo-file-system/legacy', () => ({
  FileSystemUploadType: { BINARY_CONTENT: 0 },
  createUploadTask: () => ({ uploadAsync: async () => ({ status: 200, headers: { ETag: 'etag' } }), cancelAsync: async () => {} }),
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
let profileResponse: Promise<unknown> | null = null;
let storedLogs: SetLog[] = [];
let writes = 0;

beforeEach(() => {
  jest.clearAllMocks();
  setLocaleOverride('en');
  profileResponse = null;
  storedLogs = []; writes = 0;
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  servedPlan = plan;
  useSessionStore.setState({ user: { id: studentId, phone: '', role: 'coached_student', created_at: plan.created_at } });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path.endsWith('/plans')) return { plans: [servedPlan] } as never;
    if (path === `/plans/${plan.id}`) return servedPlan as never;
    if (path === '/exercises') return { exercises: [{ id: plan.days[0].exercises[0].exercise_id, name: 'Squat', name_en: 'Squat', main_lift_family: 'squat', is_competition_lift: true, competition_stance: 'low_bar' }] } as never;
    if (path.endsWith('/onboarding')) return profileResponse as never;
    if (path.endsWith('/feedback')) return { items: [] } as never;
    if (path === '/sets/log') {
      writes += 1;
      const body = options?.body as { logged_date?: string; weight_kg: string; reps: number; rpe: string | null; set_index: number };
      storedLogs.push({ id: '80000000-0000-4000-8000-000000000000', student_id: studentId, plan_exercise_id: plan.days[0].exercises[0].id, exercise_id: plan.days[0].exercises[0].exercise_id, set_index: body.set_index, weight_kg: body.weight_kg, reps: body.reps, rpe: body.rpe, completed: true, failed: false, assumed: false, adhoc: false, logged_date: body.logged_date ?? '2026-09-21', logged_at: '2026-09-21T10:00:00Z' });
      return { id: storedLogs[0].id, logged_at: storedLogs[0].logged_at } as never;
    }
    if (path === '/uploads/initiate') return { attachment_id: '90000000-0000-4000-8000-000000000000', upload_id: 'upload', part_urls: [{ part_number: 1, url: 'https://upload.test/1' }] } as never;
    if (path.startsWith('/uploads/') && path.endsWith('/complete')) return { id: '90000000-0000-4000-8000-000000000000' } as never;
    if (path.includes('/sets')) return { logs: storedLogs } as never;
    if (path === '/bind-requests/mine') return { bind_request: null } as never;
    if (path.includes('/readiness')) return { checkin: null } as never;
    throw new Error(`Unexpected request: ${path}`);
  });
});

const mount = async () => {
  await act(async () => { renderer = create(<QueryClientProvider client={client}><SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}><TodayWorkoutView /></SafeAreaProvider></QueryClientProvider>); });
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

const record = () => useVideoUploadStore.getState().records[`${studentId}:${plan.days[0].exercises[0].sets[0].id}`];

const openCamera = async (week = 1) => {
  await AsyncStorage.setItem(VIDEO_UPLOAD_CONSENT_KEY, 'true');
  await mount();
  if (week === 2) await act(async () => renderer.root.findAll(node => node.props.accessibilityLabel === 'Next week' && node.props.onPress)[0].props.onPress());
  await act(async () => renderer.root.findAll(node => node.props.testID === `all-day-exercise-${plan.days[0].exercises[0].id}` && node.props.onPress)[0].props.onPress());
  await act(async () => renderer.root.findAll(node => node.props.accessibilityLabel === t('student.videoAttachmentV3Controls.copy001') && node.props.onPress)[0].props.onPress());
  expect(renderer.root.findAllByType(CameraRecorder)).toHaveLength(1);
};

test.each<['weight' | 'free_weight', number]>([['weight', 1], ['free_weight', 1], ['weight', 2], ['free_weight', 2]])('107 camera uploads with %s in W%s without opening set entry or requiring weight', async (mode, week) => {
  if (mode === 'free_weight') servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [{ ...plan.days[0].exercises[0], sets: [{ ...plan.days[0].exercises[0].sets[0], load_mode: mode, intensity_mode: null, target_value: null }] }] }] };
  if (week === 2) servedPlan = { ...servedPlan, days: [
    { ...plan.days[0], id: '40000000-0000-4000-8000-000000000001', exercises: [] },
    { ...servedPlan.days[0], week_number: 2 },
  ] };
  await openCamera(week);
  expect(renderer.root.findAllByType(SetEntrySheet)).toHaveLength(0);
  expect(renderer.root.findByType(CameraRecorder).props.onLibrary).toEqual(expect.any(Function));
  await act(async () => renderer.root.findByType(CameraRecorder).props.onUse('file:///cache/captured.mp4'));
  expect(record()).toMatchObject({ status: 'uploaded', errorMessage: null });
  expect(writes).toBe(1);
  expect(storedLogs[0]).toMatchObject({ weight_kg: mode === 'weight' ? '80' : null, reps: 5, rpe: null });
  expect(deleteLocalVideo).not.toHaveBeenCalledWith('file:///documents/captured.mp4');
});
