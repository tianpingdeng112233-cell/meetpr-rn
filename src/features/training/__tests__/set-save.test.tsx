import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { ApiError } from '@/api/client';
import type { PlanDetail } from '@/api/domains/plans';
import type { SetLog, SetLogUpsertRequest } from '@/api/domains/sets';
import { authenticatedRequest, useSessionStore } from '@/api/session';
import { E1RMRecorder } from '@/domain/e1rm';
import { TodayWorkoutView } from '@/features/training/TodayWorkoutView';
import { setLocaleOverride, t } from '@/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert, Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AllDayBody } from '../AllDayBody';
import { HoldToCompleteButton } from '../HoldToCompleteButton';
import type { WorkoutSetDraft } from '../model';
import { accountSetSync } from '../set-sync/runtime';
import { trainingE1RMRepository } from '../storage';
import { StudentExercisePicker } from '../StudentExercisePicker';
import { TrainingWeekStrip } from '../TrainingWeekStrip';
import { EMPTY_VIDEO_UPLOAD } from '../video-upload/model';
import { resetVideoUploadStoreForTests, useVideoUploadStore } from '../video-upload/store';

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


const openSet = mount;
const saveFirst = async () => { const body = renderer.root.findByType(AllDayBody); await act(async () => body.props.onSave({ ...body.props.sheet.exercises[0].rows[0], rpeText: '8' })); };
const loadFailedTitle = () => renderer.root.findAll(node => node.type === Text && node.props.children === t('student.todayWorkoutScreen.copy001'));

test('102: an already loaded workout survives an offline cold start with its pending completed set', async () => {
  const base = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === '/exercises') return { exercises: [{ id: plan.days[0].exercises[0].exercise_id, name: '哑铃推举', name_en: 'Dumbbell press', exercise_type: 'accessory', main_lift_family: null, is_competition_lift: false, competition_stance: null, muscle_groups: [], equipment: [], movement_pattern: null, created_by_coach_id: null, created_at: plan.created_at }] } as never;
    if (path.endsWith('/onboarding')) return { unit_preference: 'lb' } as never;
    return base(path, options);
  });
  await mount();
  const body = () => renderer.root.findByType(AllDayBody);
  const draft = body().props.sheet.exercises.flatMap((block: { rows: WorkoutSetDraft[] }) => block.rows)[0];
  jest.mocked(authenticatedRequest).mockRejectedValue(new ApiError('network', 'Offline'));
  await act(async () => body().props.onSave({ ...draft, weightText: '90', repsText: '5', rpeText: '8' }));
  expect(body().props.sheet.exercises.flatMap((block: { rows: WorkoutSetDraft[] }) => block.rows)[0].sourceLog.completed).toBe(true);
  act(() => renderer.unmount()); client.clear();
  useSessionStore.setState({ user: null });
  useSessionStore.setState({ user: { id: studentId, phone: '', role: 'coached_student', created_at: plan.created_at } });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  await mount();
  expect(renderer.root.findAllByType(AllDayBody)).toHaveLength(1);
  expect(body().props.sheet.exercises.flatMap((block: { rows: WorkoutSetDraft[] }) => block.rows)[0]).toMatchObject({ sourceLog: { completed: true }, weightText: '90' });

  expect(body().props.exerciseName(draft.exercise.exercise_id)).toBe('Dumbbell press');
  act(() => renderer.unmount()); client.clear();
  useSessionStore.setState({ user: { id: '10000000-0000-4000-8000-000000000001', phone: '', role: 'coached_student', created_at: plan.created_at } });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  await mount();
  expect(renderer.root.findAllByType(AllDayBody)).toHaveLength(0);
  expect(loadFailedTitle().length).toBeGreaterThan(0);
});

test('102: an offline student-added accessory keeps its catalog metadata after cold start', async () => {
  const exerciseId = '60000000-0000-4000-8000-000000000009';
  const base = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === '/exercises') return { exercises: [{ id: exerciseId, name: '绳索下压', name_en: 'Cable pushdown', exercise_type: 'accessory', main_lift_family: null, is_competition_lift: false, competition_stance: null, muscle_groups: [], equipment: [], movement_pattern: null, created_by_coach_id: null, created_at: plan.created_at }] } as never;
    return base(path, options);
  });
  await mount();
  const body = () => renderer.root.findByType(AllDayBody);
  jest.mocked(authenticatedRequest).mockRejectedValue(new ApiError('network', 'Offline'));
  await act(async () => body().props.onAddExercise());
  await act(async () => renderer.root.findByType(StudentExercisePicker).props.onSelect(exerciseId));
  const added = body().props.sheet.exercises.flatMap((block: { rows: WorkoutSetDraft[] }) => block.rows).find((draft: { kind?: string }) => draft.kind === 'added');
  await act(async () => body().props.onSave({ ...added, weightText: '12.5', repsText: '12', rpeText: '2', effortKind: 'rir' }));
  act(() => renderer.unmount()); client.clear();
  useSessionStore.setState({ user: null });
  useSessionStore.setState({ user: { id: studentId, phone: '', role: 'coached_student', created_at: plan.created_at } });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  await mount();
  expect(body().props.sheet.exercises.flatMap((block: { rows: WorkoutSetDraft[] }) => block.rows).find((draft: { kind?: string }) => draft.kind === 'added')).toMatchObject({ sourceLog: { completed: true, actual_rir: 2 }, weightText: '12.5' });
  expect(body().props.exerciseName(exerciseId)).toBe('Cable pushdown');
});

test('a rate-limited background refetch keeps the loaded workout instead of replacing it with the load error', async () => {
  await mount();
  expect(renderer.root.findAllByType(AllDayBody)).toHaveLength(1);
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path.endsWith('/plans') || path === `/plans/${plan.id}` || (path.includes('/sets') && path !== '/sets/log'))
      throw new ApiError('backend', 'Unexpected HTTP response 429', { status: 429 });
    return original(path, options);
  });
  await act(async () => { await client.refetchQueries(); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  expect(renderer.root.findAllByType(AllDayBody)).toHaveLength(1);
  expect(loadFailedTitle()).toHaveLength(0);
});
test('a first load that fails still shows the load error with retry', async () => {
  jest.mocked(authenticatedRequest).mockImplementation(async () => { throw new ApiError('backend', 'Unexpected HTTP response 429', { status: 429 }); });
  await mount();
  expect(loadFailedTitle()).toHaveLength(1);
  expect(renderer.root.findAllByType(AllDayBody)).toHaveLength(0);
});

test('Sending does not block the TodayWorkoutView save path or discard the attachment', async () => {
  const key = `${studentId}:${plan.days[0].exercises[0].sets[0].id}`;
  useVideoUploadStore.setState({ records: { [key]: { ...EMPTY_VIDEO_UPLOAD, status: 'uploading', localUri: 'file:///video.mp4' } } });
  await openSet();
  expect(useVideoUploadStore.getState().records[key].status).toBe('uploading');
  await saveFirst();
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
  await saveFirst();
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


test('in-week switch starts, logs and settles the selected day without changing the cursor day', async () => {
  const d4 = { ...plan.days[0], id: '40000000-0000-4000-8000-000000000004', day_of_week: 4,
    exercises: [{ ...plan.days[0].exercises[0], id: '50000000-0000-4000-8000-000000000004', plan_day_id: '40000000-0000-4000-8000-000000000004',
      sets: [{ ...plan.days[0].exercises[0].sets[0], id: '70000000-0000-4000-8000-000000000004' }] }] };
  servedPlan = { ...plan, days: [...plan.days, d4] };
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === `/plans/days/${d4.id}/complete`) {
      servedPlan = { ...servedPlan, days: servedPlan.days.map(day => day.id === d4.id ? { ...day, completed_at: new Date().toISOString() } : day) };
      return { id: 'completion', plan_day_id: d4.id, completed_at: new Date().toISOString() } as never;
    }
    return original(path, options);
  });
  await mount();
  await act(async () => { renderer.root.findByType(TrainingWeekStrip).props.onSelect(d4.id); });
  for (let i = 0; i < 3; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  let body = renderer.root.findByType(AllDayBody);
  expect(body.props.editable).toBe(true);
  expect(body.props.preview?.unlockMessage).toBeUndefined();

  body = renderer.root.findByType(AllDayBody);

  await saveFirst();
  expect(jest.mocked(authenticatedRequest).mock.calls.filter(([path]) => path === '/sets/log').at(-1)?.[1]?.body)
    .toMatchObject({ plan_exercise_id: d4.exercises[0].id, set_index: 0 });
  await act(async () => renderer.root.findByType(HoldToCompleteButton).props.onComplete());
  expect(jest.mocked(authenticatedRequest).mock.calls.some(([path]) => path.includes(d4.id) && path.endsWith('/complete'))).toBe(true);
  expect(servedPlan.days[0].completed_at).toBeUndefined();
});

test('extra and student-added saves retain their identities and card date across 04:00; deleting updates the visible day', async () => {
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  const requests: SetLogUpsertRequest[] = [];
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === '/sets/log') {
      const body = options!.body as SetLogUpsertRequest;
      requests.push(body);
      const id = `80000000-0000-4000-8000-${String(requests.length).padStart(12, '0')}`;
      const log: SetLog = { id, student_id: studentId, plan_exercise_id: 'plan_exercise_id' in body ? body.plan_exercise_id : null,
        plan_day_id: 'plan_day_id' in body ? body.plan_day_id : null,
        exercise_id: 'exercise_id' in body ? body.exercise_id : plan.days[0].exercises[0].exercise_id,
        set_index: body.set_index, weight_kg: body.weight_kg, reps: body.reps, rpe: body.rpe ?? null, actual_rir: body.actual_rir ?? null, completed: body.completed, failed: body.failed ?? false,
        adhoc: 'exercise_id' in body, assumed: false, logged_date: body.logged_date ?? '2026-10-14', logged_at: new Date().toISOString() };
      storedLogs.push(log);
      return { id, logged_at: log.logged_at } as never;
    }
    if (options?.method === 'DELETE') { storedLogs = storedLogs.filter(log => !path.endsWith(log.id)); return undefined as never; }
    return original(path, options);
  });
  await mount();
  const body = () => renderer.root.findByType(AllDayBody);

  await act(async () => body().props.onAddSet(plan.days[0].exercises[0]));
  const extra = body().props.sheet.exercises.flatMap((block: { rows: WorkoutSetDraft[] }) => block.rows).find((draft: { kind?: string }) => draft.kind === 'extra');
  expect(extra).toMatchObject({ setIndex: 1, weightText: '80', rpeText: '' });
  await act(async () => body().props.onSave({ ...extra, weightText: '85', repsText: '4' }));
  expect(requests[0]).toMatchObject({ plan_exercise_id: plan.days[0].exercises[0].id, set_index: 1 });
  expect(body().props.sheet.exercises.flatMap((block: { rows: WorkoutSetDraft[] }) => block.rows).filter((draft: { kind?: string; status: string }) => !draft.kind && draft.status === 'pending')).toHaveLength(1);
  await act(async () => body().props.onAddExercise());
  const picker = renderer.root.findByType(StudentExercisePicker);
  await act(async () => picker.props.onSelect('60000000-0000-4000-8000-000000000009'));
  let added = body().props.sheet.exercises.flatMap((block: { rows: WorkoutSetDraft[] }) => block.rows).find((draft: { kind?: string }) => draft.kind === 'added');
  jest.useFakeTimers({ now: new Date(2026, 9, 15, 3, 59) });
  await act(async () => body().props.onSave({ ...added, weightText: '12.5', repsText: '12' }));
  await act(async () => { await jest.advanceTimersByTimeAsync(50); });
  added = body().props.sheet.exercises.flatMap((block: { rows: WorkoutSetDraft[] }) => block.rows).find((draft: { kind?: string }) => draft.kind === 'added');
  await act(async () => body().props.onAddSet(added.exercise));
  jest.setSystemTime(new Date(2026, 9, 15, 4, 1));
  const second = body().props.sheet.exercises.flatMap((block: { rows: WorkoutSetDraft[] }) => block.rows).find((draft: { kind?: string; setIndex: number }) => draft.kind === 'added' && draft.setIndex === 1);
  await act(async () => body().props.onSave({ ...second, weightText: '12.5', repsText: '12' }));
  expect(requests.slice(1).map(request => request.logged_date)).toEqual(['2026-10-14', '2026-10-14']);
  await act(async () => body().props.onRemoveExercise(added.exercise));
  const confirm = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2]?.find(button => button.style === 'destructive');
  expect(confirm).toBeDefined();
  await act(async () => { confirm?.onPress?.(); });
  expect(body().props.sheet.exercises.flatMap((block: { rows: WorkoutSetDraft[] }) => block.rows).filter((draft: { kind?: string }) => draft.kind === 'added')).toHaveLength(0);
  expect(storedLogs).toHaveLength(1);
  await act(async () => body().props.onAddExercise());
  await act(async () => renderer.root.findByType(StudentExercisePicker).props.onSelect(added.exercise.exercise_id));
  const replacement = body().props.sheet.exercises.flatMap((block: { rows: WorkoutSetDraft[] }) => block.rows).find((draft: { kind?: string }) => draft.kind === 'added');
  await act(async () => body().props.onSave({ ...replacement, weightText: '10', repsText: '10' }));
  expect(requests.at(-1)?.logged_date).toBe('2026-10-15');
});

test('restored non-cursor selection stays on the open day across 04:00 and a new visit returns to the cursor', async () => {
  const d4 = { ...plan.days[0], id: '40000000-0000-4000-8000-000000000004', day_of_week: 4,
    exercises: [{ ...plan.days[0].exercises[0], id: '50000000-0000-4000-8000-000000000004', plan_day_id: '40000000-0000-4000-8000-000000000004' }] };
  servedPlan = { ...plan, days: [...plan.days, d4] };
  jest.useFakeTimers({ now: new Date(2026, 9, 15, 3, 59) });
  storedLogs = [{ id: '80000000-0000-4000-8000-000000000004', student_id: studentId, plan_exercise_id: d4.exercises[0].id, exercise_id: d4.exercises[0].exercise_id, set_index: 0, weight_kg: '80', reps: 5, rpe: null, completed: true, failed: false, assumed: false, adhoc: false, logged_date: '2026-10-14', logged_at: new Date(2026, 9, 14, 20).toISOString() }];
  await act(async () => { renderer = create(<QueryClientProvider client={client}><TodayWorkoutView /></QueryClientProvider>); });
  for (let i = 0; i < 3; i++) await act(async () => { await jest.advanceTimersByTimeAsync(50); });
  expect(renderer.root.findByType(TrainingWeekStrip).props.strip.selectedDay.id).toBe(d4.id);
  await act(async () => { await jest.advanceTimersByTimeAsync(120_000); });
  for (let i = 0; i < 3; i++) await act(async () => { await jest.advanceTimersByTimeAsync(50); });
  expect(renderer.root.findByType(TrainingWeekStrip).props.strip.selectedDay.id).toBe(d4.id);
  await act(async () => renderer.unmount());
  await act(async () => { renderer = create(<QueryClientProvider client={client}><TodayWorkoutView /></QueryClientProvider>); });
  for (let i = 0; i < 3; i++) await act(async () => { await jest.advanceTimersByTimeAsync(50); });
  expect(renderer.root.findByType(TrainingWeekStrip).props.strip.selectedDay.id).toBe(plan.days[0].id);
});

test('removing a student-added card keeps a rejected delete queued without restoring its rows', async () => {
  const base: SetLog = { id: '80000000-0000-4000-8000-000000000000', student_id: studentId, plan_exercise_id: null, plan_day_id: plan.days[0].id, exercise_id: '60000000-0000-4000-8000-000000000002', set_index: 0, weight_kg: '10', reps: 12, rpe: null, completed: true, failed: false, assumed: false, adhoc: true, logged_date: '2026-10-14', logged_at: '2026-10-14T11:00:00Z' };
  storedLogs = [base, { ...base, id: '80000000-0000-4000-8000-000000000001', set_index: 1 }, { ...base, id: '80000000-0000-4000-8000-000000000002', set_index: 2 }];
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  const deleted: string[] = [];
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (options?.method === 'DELETE') {
      deleted.push(path);
      if (deleted.length === 2) throw Object.assign(new ApiError('backend', 'Rated', { status: 409 }), { code: 'SET_HAS_COACH_FEEDBACK' });
      storedLogs = storedLogs.filter(log => !path.endsWith(log.id));
      return undefined as never;
    }
    return original(path, options);
  });
  await mount();
  const body = () => renderer.root.findByType(AllDayBody);
  const added = body().props.sheet.exercises.flatMap((block: { rows: WorkoutSetDraft[] }) => block.rows).find((draft: { kind?: string }) => draft.kind === 'added');
  await act(async () => body().props.onRemoveExercise(added.exercise));
  await act(async () => { jest.mocked(Alert.alert).mock.calls.at(-1)?.[2]?.find(button => button.style === 'destructive')?.onPress?.(); });
  expect(deleted).toEqual(['/sets/80000000-0000-4000-8000-000000000000', '/sets/80000000-0000-4000-8000-000000000001', '/sets/80000000-0000-4000-8000-000000000002']);
  expect(body().props.sheet.exercises.flatMap((block: { rows: WorkoutSetDraft[] }) => block.rows).filter((draft: { kind?: string }) => draft.kind === 'added').map((draft: { setIndex: number }) => draft.setIndex)).toEqual([]);
  expect(accountSetSync(studentId).queue.pending()).toMatchObject([{ status: 'failed', remove: true }]);
  expect(Alert.alert).toHaveBeenCalledTimes(1);
});


test('Training focus cycle preserves the pre-096 behavior of returning to the cursor', async () => {
  mockFocused = true;
  const past = { ...plan.days[0], completed_at: '2026-10-14T12:00:00Z' };
  const cursor = { ...plan.days[0], id: '40000000-0000-4000-8000-000000000002', day_of_week: 2,
    exercises: [{ ...plan.days[0].exercises[0], id: '50000000-0000-4000-8000-000000000002', plan_day_id: '40000000-0000-4000-8000-000000000002' }] };
  servedPlan = { ...plan, days: [past, cursor] };
  await mount();
  await act(async () => renderer.root.findByType(TrainingWeekStrip).props.onSelect(past.id));
  expect(renderer.root.findByType(TrainingWeekStrip).props.strip.selectedDay.id).toBe(past.id);
  // Expo Router blurs Training while feedback is open, then focuses it on back.
  mockFocused = false;
  await act(async () => renderer.update(<QueryClientProvider client={client}><TodayWorkoutView /></QueryClientProvider>));
  mockFocused = true;
  await act(async () => renderer.update(<QueryClientProvider client={client}><TodayWorkoutView /></QueryClientProvider>));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  expect(renderer.root.findByType(TrainingWeekStrip).props.strip.selectedDay.id).toBe(cursor.id);
});
