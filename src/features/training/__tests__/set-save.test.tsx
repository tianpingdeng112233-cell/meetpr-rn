import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { E1RMRecorder } from '@/domain/e1rm';
import { trainingE1RMRepository } from '../storage';
import { STORAGE_KEYS } from '../constants';
import { WorkoutBody } from '../WorkoutBody';
import { EMPTY_VIDEO_UPLOAD } from '../video-upload/model';
import { useVideoUploadStore, resetVideoUploadStoreForTests } from '../video-upload/store';
import { SetEntrySheet } from '../SetEntrySheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toast } from '@/design/Toast';
import { RestTimer } from '../RestTimer';
import { writeRestPreference } from '@/features/settings/storage';
import type { SetLog, SetLogUpsertRequest } from '@/api/domains/sets';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, ActivityIndicator, AppState, Text, TextInput, type AppStateStatus } from 'react-native';
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
let mockFocused = false;
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: mockNavigate, push: mockPush }), useFocusEffect: (effect: () => void | (() => void)) => { jest.requireActual<typeof import('react')>('react').useEffect(() => mockFocused ? effect() : undefined, [effect, mockFocused]); } }));
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
  mockFocused = false;
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

test.each([false, true])('a saved PR is recorded and silently acknowledged without a banner (previous record: %s)', async (previousRecord) => {
  const exerciseId = plan.days[0].exercises[0].exercise_id;
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === '/exercises') return { exercises: [{ id: exerciseId, name: 'Bench press', name_en: 'Bench press', main_lift_family: 'bench', is_competition_lift: true, competition_stance: null }] } as never;
    return original(path, options);
  });
  if (previousRecord) {
    const prior = await new E1RMRecorder(trainingE1RMRepository).record({ studentId, exerciseId, setLogId: 'previous', family: 'bench', weightKg: 75, reps: 5, rpe: 8, completed: true, failed: false });
    await trainingE1RMRepository.acknowledgePR(prior!.id);
  }
  await openSet();
  await act(async () => { saveButton().props.onPress(); });
  const copy = renderer.root.findAllByType(Text).map(node => [node.props.children].flat().join('')).join(' ');
  expect(copy).not.toMatch(/🎉|First record|new e1RM/i);
  expect(await trainingE1RMRepository.unacknowledgedPRs(studentId)).toEqual([]);
  const points = await trainingE1RMRepository.fetchHistory(studentId, exerciseId);
  expect(points).toHaveLength(previousRecord ? 2 : 1);
  expect(points.some(point => point.setLogId === storedLogs[0].id && point.origin === 'logged')).toBe(true);
});

test('reentering Training silently drains all pending PRs at the replay time, leaving other accounts alone', async () => {
  const recorder = new E1RMRecorder(trainingE1RMRepository);
  for (const [owner, weight, log] of [[studentId, 75, 'old-first'], [studentId, 80, 'old-pr'], ['other', 80, 'other-pr']] as const) {
    await recorder.record({ studentId: owner, exerciseId: plan.days[0].exercises[0].exercise_id, setLogId: log, family: 'bench', weightKg: weight, reps: 5, rpe: 8, completed: true, failed: false });
  }
  expect(await trainingE1RMRepository.unacknowledgedPRs(studentId)).toHaveLength(2);
  mockFocused = true;
  jest.useFakeTimers();
  await act(async () => { renderer = create(<QueryClientProvider client={client}><TodayWorkoutView /></QueryClientProvider>); });
  await act(async () => { await jest.advanceTimersByTimeAsync(1499); });
  expect(await trainingE1RMRepository.unacknowledgedPRs(studentId)).toHaveLength(2);
  await act(async () => { await jest.advanceTimersByTimeAsync(1); });
  expect(renderer.root.findAllByType(Text).map(node => [node.props.children].flat().join('')).join(' ')).not.toMatch(/🎉|First record|new e1RM/i);
  expect(await trainingE1RMRepository.unacknowledgedPRs(studentId)).toEqual([]);
  expect(await trainingE1RMRepository.unacknowledgedPRs('other')).toHaveLength(1);
  await act(async () => { renderer.unmount(); });
  await act(async () => { renderer = create(<QueryClientProvider client={client}><TodayWorkoutView /></QueryClientProvider>); });
  await act(async () => { await jest.advanceTimersByTimeAsync(1500); });
  expect(renderer.root.findAllByType(Text).map(node => [node.props.children].flat().join('')).join(' ')).not.toMatch(/🎉|First record|new e1RM/i);
});

test('recording the next set closes the previous rest before returning to background', async () => {
  servedPlan = { ...plan, days: plan.days.map(day => ({ ...day, exercises: day.exercises.map(exercise => ({ ...exercise, sets: [exercise.sets[0], { ...exercise.sets[0], id: 'next-set', set_number: 2 }] })) })) };
  await openSet();
  await act(async () => saveButton().props.onPress());
  expect(renderer.root.findAllByType(Text).map(node => node.props.children)).toContain(t('student.restTimerOverlay.copy001'));
  const body = renderer.root.findByType(WorkoutBody);
  await act(async () => body.props.onRecord(body.props.drafts[1]));
  expect(renderer.root.findAllByType(Text).map(node => node.props.children)).not.toContain(t('student.restTimerOverlay.copy001'));
});


test.each([false, true])('a rest preference read cannot revive rest after leaving Training (return first: %s)', async returnFirst => {
  mockFocused = true;
  servedPlan = { ...plan, days: plan.days.map(day => ({ ...day, exercises: day.exercises.map(exercise => ({ ...exercise, sets: [exercise.sets[0], { ...exercise.sets[0], id: 'next-set', set_number: 2 }] })) })) };
  await openSet();
  let release!: () => void;
  let reading!: () => void;
  const enteredRead = new Promise<void>(resolve => { reading = resolve; });
  const original = jest.mocked(AsyncStorage.getItem).getMockImplementation()!;
  jest.spyOn(AsyncStorage, 'getItem').mockImplementation(async key => {
    if (key === `restTimer.preference.${studentId}`) {
      reading();
      await new Promise<void>(resolve => { release = resolve; });
    }
    return original(key);
  });
  let save: Promise<void>;
  await act(async () => { save = saveButton().props.onPress(); await enteredRead; });
  mockFocused = false;
  await act(async () => renderer.update(<QueryClientProvider client={client}><TodayWorkoutView /></QueryClientProvider>));
  if (returnFirst) {
    mockFocused = true;
    await act(async () => renderer.update(<QueryClientProvider client={client}><TodayWorkoutView /></QueryClientProvider>));
  }
  await act(async () => { release(); await save; });
  jest.mocked(AsyncStorage.getItem).mockImplementation(original);
  expect(renderer.root.findAllByType(Text).map(node => node.props.children)).not.toContain(t('student.restTimerOverlay.copy001'));
});


test.each(['Competition Deadlift', undefined])('saved set supplies its exercise name to the background rest notification (%s)', async name => {
  servedPlan = { ...plan, days: plan.days.map(day => ({ ...day, exercises: day.exercises.map(exercise => ({ ...exercise, sets: [exercise.sets[0], { ...exercise.sets[0], id: 'next-set', set_number: 2 }] })) })) };
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === '/exercises' && name) return { exercises: [{ id: plan.days[0].exercises[0].exercise_id, name, name_en: name, main_lift_family: null, is_competition_lift: false, competition_stance: null }] } as never;
    return original(path, options);
  });
  const native = { show: jest.fn(), hide: jest.fn(), isPermissionGranted: () => true };
  jest.spyOn(jest.requireMock<typeof import('expo-modules-core')>('expo-modules-core'), 'requireOptionalNativeModule').mockReturnValue(native);
  const listeners = new Set<(state: AppStateStatus) => void>();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
    listeners.add(listener);
    return { remove: () => { listeners.delete(listener); } };
  });
  await AsyncStorage.setItem(STORAGE_KEYS.restExplanation(studentId), 'true');
  await openSet();
  await act(async () => saveButton().props.onPress());
  act(() => listeners.forEach(listener => listener('background')));
  expect(native.show).toHaveBeenLastCalledWith(expect.any(Number), name ?? '', expect.objectContaining({ title: 'Rest between sets' }));
});


const accessoryButton = (label: string) => renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label)[0];
const accessoryInput = (label: string) => renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label)!;
function serveAccessories(rest: number | null = null) {
  jest.mocked(authenticatedRequest).mockClear();
  const exercise = plan.days[0].exercises[0];
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [{ ...exercise, sets: [
    { ...exercise.sets[0], rest_seconds: rest },
    { ...exercise.sets[0], id: 'second-set', set_number: 2, rest_seconds: rest },
  ] }, { ...exercise, id: 'next-exercise', exercise_id: 'next-lift', sort_order: 1, sets: [{ ...exercise.sets[0], id: 'next-lift-set', plan_exercise_id: 'next-exercise' }] }] }] };
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === '/exercises') return { exercises: [{ id: exercise.exercise_id, name: 'Leg press', name_en: 'Leg press', exercise_type: 'accessory', main_lift_family: null, is_competition_lift: false, competition_stance: null }] } as never;
    if (path === '/sets/log') {
      const body = options?.body as SetLogUpsertRequest;
      writes++;
      const log: SetLog = { id: `saved-${body.set_index}`, student_id: studentId, plan_exercise_id: exercise.id, exercise_id: exercise.exercise_id, set_index: body.set_index, weight_kg: body.weight_kg, reps: body.reps, rpe: body.rpe ?? null, completed: body.completed, failed: body.failed ?? false, assumed: false, adhoc: false, logged_date: '2026-09-21', logged_at: '2026-09-21T10:00:00Z' };
      storedLogs = [...storedLogs.filter(item => item.set_index !== log.set_index), log];
      return { id: log.id, logged_at: log.logged_at } as never;
    }
    return original(path, options);
  });
}
async function startAccessories() {
  await mount();
  await act(async () => renderer.root.findByType(WorkoutBody).props.onStart());
}
const setBodies = () => jest.mocked(authenticatedRequest).mock.calls.filter(([path]) => path === '/sets/log').map(([, options]) => options?.body as SetLogUpsertRequest);

test.each<[number | undefined, number | null, number]>([[undefined, null, 60], [90, null, 90], [90, 75, 75]])('accessory check saves ordinary data, prevents double taps and rests with preference %s / coach %s', async (accessory, rest, seconds) => {
  serveAccessories(rest);
  if (accessory !== undefined) await writeRestPreference(studentId, { mode: 'automatic', accessory });
  let release!: () => void;
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === '/sets/log' && writes === 0) await new Promise<void>(resolve => { release = resolve; });
    return original(path, options);
  });
  await startAccessories();
  await act(async () => accessoryInput('Set 2 weight').props.onChangeText('82,5'));
  await act(async () => accessoryButton('Complete set 2').props.onPress());
  expect(accessoryButton('Complete set 2').props.disabled).toBe(true);
  expect(renderer.root.findAllByType(ActivityIndicator).length).toBeGreaterThan(0);
  await act(async () => { release(); });
  expect(setBodies()).toEqual([{ plan_exercise_id: plan.days[0].exercises[0].id, set_index: 1, weight_kg: '82.5', reps: 5, rpe: null, completed: true, failed: false }]);
  expect(accessoryButton('Undo set 2')).toBeDefined();
  expect(renderer.root.findByType(RestTimer).props.durationSeconds).toBe(seconds);
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).not.toContain(t('student.restTimerExplanationView.copy001'));
  await act(async () => renderer.root.findByType(RestTimer).props.onClose());
  await act(async () => accessoryInput('Set 1 RPE').props.onChangeText('7.5'));
  await act(async () => accessoryButton('Complete set 1').props.onPress());
  expect(setBodies()[1]).toMatchObject({ set_index: 0, rpe: '7.5' });
  expect(renderer.root.findAllByType(RestTimer)).toHaveLength(0);
  expect(accessoryButton('Complete all as planned')).toBeUndefined();
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
});

test('an upgraded completed accessory row cancels with its exact kg value; edits overwrite in lb and save failures retain retry inputs', async () => {
  serveAccessories();
  storedLogs = [{ id: '80000000-0000-4000-8000-000000000000', student_id: studentId, plan_exercise_id: plan.days[0].exercises[0].id, exercise_id: plan.days[0].exercises[0].exercise_id, set_index: 0, weight_kg: '80.123', reps: 10, rpe: null, completed: true, failed: false, assumed: false, adhoc: false, logged_date: '2026-09-21', logged_at: '2026-09-21T10:00:00Z' }];
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  let failNext = false;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path.endsWith('/onboarding')) return { unit_preference: 'lb' } as never;
    if (path === '/sets/log' && failNext) { failNext = false; throw new Error('Offline'); }
    return original(path, options);
  });
  await startAccessories();
  expect(accessoryInput('Set 1 weight').props.value).toBe('176.6');
  await act(async () => accessoryButton('Undo set 1').props.onPress());
  expect(setBodies()[0]).toMatchObject({ completed: false, failed: false, weight_kg: '80.123', reps: 10, rpe: null });
  expect(accessoryButton('Complete set 1')).toBeDefined();
  expect(renderer.root.findAllByType(RestTimer)).toHaveLength(0);
  await act(async () => accessoryInput('Set 1 weight').props.onChangeText('55.1'));
  await act(async () => accessoryButton('Complete set 1').props.onPress());
  expect(setBodies()[1]).toMatchObject({ completed: true, weight_kg: '25' });
  await act(async () => accessoryInput('Set 1 reps').props.onChangeText('12'));
  expect(accessoryButton('Complete set 1')).toBeDefined();
  failNext = true;
  await act(async () => accessoryButton('Complete set 1').props.onPress());
  expect(Alert.alert).toHaveBeenCalledWith(t('student.setEntrySheet.copy010'), expect.any(String), expect.any(Array));
  expect(accessoryInput('Set 1 reps').props.value).toBe('12');
  expect(accessoryButton('Complete set 1').props.disabled).toBe(false);
  await act(async () => accessoryButton('Complete set 1').props.onPress());
  expect(setBodies()[3]).toEqual(setBodies()[2]);
  expect(setBodies()[3]).toMatchObject({ completed: true, failed: false, reps: 12 });
  expect(accessoryButton('Undo set 1')).toBeDefined();
  expect(renderer.root.findByType(RestTimer).props.durationSeconds).toBe(60);
});


test.each(['uploading', 'uploaded'] as const)('a completed accessory with %s video cannot be cancelled and explains how to manage it', async status => {
  serveAccessories();
  await startAccessories();
  await act(async () => accessoryButton('Complete set 1').props.onPress());
  await act(async () => { useVideoUploadStore.setState({ records: { [`${studentId}:${plan.days[0].exercises[0].sets[0].id}`]: { ...EMPTY_VIDEO_UPLOAD, status, localUri: 'file:///synthetic.mp4' } } }); });
  let toast!: ReactTestRenderer;
  await act(async () => { toast = create(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 640 }, insets: { top: 0, bottom: 0, left: 0, right: 0 } }}><Toast /></SafeAreaProvider>); });
  try {
    await act(async () => accessoryButton('Undo set 1').props.onPress());
    expect(writes).toBe(1);
    expect(accessoryButton('Undo set 1')).toBeDefined();
    expect(toast.root.findAllByType(Text).map(n => n.props.children)).toContain('This set has a video. Open the set to manage it');
  } finally { act(() => toast.unmount()); }
});

test.each([0, 1, 2])('complete all submits serially without rest, leaves %s empty rows and preserves successful saves on failure', async skipped => {
  serveAccessories();
  const exercise = servedPlan.days[0].exercises[0];
  for (let index = 0; index < skipped; index++) exercise.sets.push({ ...exercise.sets[0], id: `empty-${index}`, set_number: index + 3, intensity_mode: 'rpe', target_value: '8' });
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  let release!: () => void;
  let fail = skipped === 2;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === '/sets/log') {
      const body = options?.body as SetLogUpsertRequest;
      if (body.set_index === 0) await new Promise<void>(resolve => { release = resolve; });
      if (body.set_index === 1 && fail) { fail = false; throw new Error('Offline'); }
    }
    return original(path, options);
  });
  await startAccessories();
  await act(async () => accessoryInput('Set 1 RPE').props.onChangeText('7'));
  await act(async () => accessoryButton('Complete all as planned').props.onPress());
  expect(accessoryButton('Complete all as planned').props.disabled).toBe(true);
  expect(accessoryButton('Complete set 2').props.disabled).toBe(true);
  expect(setBodies().map(body => body.set_index)).toEqual([0]);
  await act(async () => release());
  expect(setBodies().map(body => body.set_index)).toEqual([0, 1]);
  expect(setBodies()[0]).toMatchObject({ completed: true, failed: false, rpe: '7' });
  expect(setBodies()[1]).toMatchObject({ completed: true, failed: false, rpe: null });
  expect(renderer.root.findAllByType(RestTimer)).toHaveLength(0);
  if (!skipped) {
    expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
    return;
  }
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).toContain(skipped === 1 ? '1 set still needs a weight' : '2 sets still need a weight');
  expect(accessoryButton('Undo set 1')).toBeDefined();
  if (skipped === 2) {
    expect(writes).toBe(1);
    expect(accessoryButton('Complete set 2')).toBeDefined();
    expect(Alert.alert).toHaveBeenCalled();
    await act(async () => accessoryButton('Complete all as planned').props.onPress());
    expect(setBodies().map(body => body.set_index)).toEqual([0, 1, 1]);
    expect(accessoryButton('Undo set 2')).toBeDefined();
  }
  for (let index = 0; index < skipped; index++) {
    await act(async () => accessoryInput(`Set ${index + 3} weight`).props.onChangeText('60'));
    const copy = renderer.root.findAllByType(Text).map(n => n.props.children);
    expect(copy).not.toContain('2 sets still need a weight');
    if (skipped - index === 2) expect(copy).toContain('1 set still needs a weight');
    else expect(copy).not.toContain('1 set still needs a weight');
  }
  await act(async () => accessoryButton('Complete all as planned').props.onPress());
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  expect(renderer.root.findAllByType(RestTimer)).toHaveLength(0);
});

test('two accessory checks queued before the first response still recognize the final unrecorded set', async () => {
  serveAccessories();
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  let release!: () => void;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === '/sets/log' && writes === 0) await new Promise<void>(resolve => { release = resolve; });
    return original(path, options);
  });
  await startAccessories();
  await act(async () => {
    accessoryButton('Complete set 1').props.onPress();
    accessoryButton('Complete set 1').props.onPress();
    accessoryButton('Complete set 2').props.onPress();
  });
  expect(setBodies()).toHaveLength(1);
  await act(async () => release());
  expect(setBodies().map(body => body.set_index)).toEqual([0, 1]);
  expect(renderer.root.findAllByType(RestTimer)).toHaveLength(0);
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
});

test('an accessory recorded through its full entry also uses accessory rest and skips the RPE explanation', async () => {
  serveAccessories();
  await openSet();
  await act(async () => saveButton().props.onPress());
  expect(renderer.root.findByType(RestTimer).props.durationSeconds).toBe(60);
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).not.toContain(t('student.restTimerExplanationView.copy001'));
});
