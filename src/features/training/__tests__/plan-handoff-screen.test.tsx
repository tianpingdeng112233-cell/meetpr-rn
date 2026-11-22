import { beforeEach, afterEach, test, expect, jest } from '@jest/globals';
import { useReminderPreference } from '@/features/settings/storage';
import { useHistoryViewModel } from '@/features/history/use-history';
import { useStudentPlanNotice } from '@/features/chat/open-coach-chat';
import { loadTodaySetRefCandidates } from '@/features/chat/SetRefSharePicker';
import { ChatExerciseNoteCard, exerciseNoteTitle } from '@/features/chat/ChatExerciseNoteCard';
import { fetchPendingVideos } from '@/features/coach/receiving/receiving-api';
import { loadRosterRows } from '@/features/coach/roster/load-roster';
import { useStudentDetail } from '@/features/coach/student-detail/use-student-detail';
import { accountSetSync, ensureVideoSet } from '../set-sync/runtime';
import { saveWorkoutSnapshot, readWorkoutSnapshot } from '../set-sync/workout-snapshot';
import { EMPTY_VIDEO_UPLOAD } from '../video-upload/model';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authenticatedRequest, useSessionStore } from '@/api/session';
import { useStudentTabsStore } from '@/features/student-tabs';
import { WorkoutCompletionFlowView } from '../CompletionControls';
import { TodayWorkoutView } from '../TodayWorkoutView';
import { planKeys, type PlanDetail } from '@/api/domains/plans';
import { setLocaleOverride, t } from '@/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { Alert, Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HoldToCompleteButton } from '../HoldToCompleteButton';
import { resetVideoUploadStoreForTests, useVideoUploadStore } from '../video-upload/store';
import { VideoAttachmentControls } from '../video-upload/VideoAttachmentControls';
import { BodyWeightSheet } from '@/features/history/BodyWeightSheet';
import { writeDailyWeight } from '@/features/settings/daily-weight';
import { CameraRecorder } from '../video-upload/CameraRecorder';
import { NumberPad } from '@/design/NumberPad';
import { AnalyticsEvent, track } from '@/analytics';
jest.mock('expo-media-library', () => ({}));
jest.mock('expo-camera', () => ({ CameraView: 'CameraView', Camera: { requestCameraPermissionsAsync: async () => ({ granted: true }), requestMicrophonePermissionsAsync: async () => ({ granted: true }), isAvailableAsync: async () => true } }));
jest.mock('react-native-compressor', () => ({}));
jest.mock('react-native-video', () => 'Video');
jest.mock('@/analytics', () => ({ ...jest.requireActual<typeof import('@/analytics')>('@/analytics'), track: jest.fn(async () => {}) }));

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-community/netinfo', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-community/netinfo/jest/netinfo-mock'));
const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: mockNavigate }), useFocusEffect: jest.fn() }));
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
const upcoming: PlanDetail = { ...plan, id: '30000000-0000-4000-8000-000000000001', name: 'Next block', start_date: '2026-10-01', days: plan.days.map(day => ({ ...day, id: '40000000-0000-4000-8000-000000000001', plan_id: '30000000-0000-4000-8000-000000000001', exercises: day.exercises.map(ex => ({ ...ex, id: '50000000-0000-4000-8000-000000000001', plan_day_id: '40000000-0000-4000-8000-000000000001', sets: ex.sets.map(set => ({ ...set, id: '70000000-0000-4000-8000-000000000001', plan_exercise_id: '50000000-0000-4000-8000-000000000001' })) })) })) };
let renderer: ReactTestRenderer;
let client: QueryClient;
let servedPlan: PlanDetail;
let failCompletion = false;
let currentPlanID = plan.id;

beforeEach(() => {
  jest.mocked(authenticatedRequest).mockClear();
  setLocaleOverride('en');
  mockNavigate.mockClear();
  jest.mocked(useFocusEffect).mockClear();
  failCompletion = false;
  currentPlanID = plan.id;
  useStudentTabsStore.setState({ trainingHandoff: null });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  servedPlan = plan;
  useSessionStore.setState({ user: { id: studentId, phone: '', role: 'coached_student', created_at: plan.created_at } });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path.endsWith('/plan-handoff')) return { current_plan_id: currentPlanID, plans: [servedPlan, upcoming].map((p, i) => ({ ...p, total_training_days: 1, completed_training_days: p.days.filter(d => d.completed_at).length, handoff_status: p.id === currentPlanID ? 'current' : i ? 'upcoming' : 'past' })) } as never;
    if (path === `/plans/${upcoming.id}`) return upcoming as never;
    if (path.endsWith('/plans?include_all=true')) return { plans: [servedPlan, upcoming] } as never;
    if (path === '/coach/students') return { students: [{ id: studentId, name: 'Student', displayName: 'Student', display_name: 'Student', status: 'active' }] } as never;
    if (path.endsWith('/videos')) return { videos: [] } as never;
    if (path.endsWith('/plans')) return { plans: [servedPlan] } as never;
    if (path === `/plans/${plan.id}`) return servedPlan as never;
    if (path === '/exercises') return { exercises: [] } as never;
    if (path.endsWith('/onboarding')) return null as never;
    if (path.endsWith('/feedback')) return { items: [] } as never;
    if (path === '/sets/log') return { id: '90000000-0000-4000-8000-000000000000', logged_at: new Date().toISOString() } as never;
    if (path.endsWith('/weight-suggestions')) return { suggestions: [] } as never;
    if (path.includes('/sets')) return { logs: [] } as never;
    if (path.endsWith('/complete')) {
      if (failCompletion) throw new Error('Offline');
      if (options?.method === 'DELETE') { servedPlan = plan; currentPlanID = plan.id; return undefined as never; }
      servedPlan = { ...plan, days: plan.days.map(day => ({ ...day, completed_at: new Date().toISOString() })) };
      currentPlanID = upcoming.id;
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
const expandFirst = async () => {
  await act(async () => renderer.root.findAll(node => node.props.testID === `all-day-exercise-${plan.days[0].exercises[0].id}` && node.props.onPress)[0].props.onPress());
};
const copy = () => renderer.root.findAllByType(Text).map(node => [node.props.children].flat().join(''));
const press = async (label: string) => {
  await act(async () => { renderer.root.findAll(node => node.props.onPress && node.props.accessibilityLabel === label)[0].props.onPress(); });
};
afterEach(async () => {
  act(() => renderer?.unmount());
  client.clear();
  useSessionStore.setState({ user: null });
  setLocaleOverride(null);
  jest.restoreAllMocks();
  jest.useRealTimers();
  await AsyncStorage.clear();
  resetVideoUploadStoreForTests();
});

test('110 previews the next cycle without record controls or writes and returns to the cursor', async () => {
  await mount();
  await press(t('student.trainingWeekStrip.next'));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  expect(copy()).toContain('Preview only');
  expect(copy()).toContain('New cycle');
  expect(renderer.root.findAllByType(HoldToCompleteButton)).toHaveLength(0);
  expect(renderer.root.findAllByType(VideoAttachmentControls)).toHaveLength(0);
  expect(renderer.root.findAllByType(NumberPad)).toHaveLength(0);
  expect(renderer.root.findAll(node => node.props.accessibilityRole === 'checkbox')).toHaveLength(0);
  expect(jest.mocked(authenticatedRequest).mock.calls.filter(([, options]) => options?.method && options.method !== 'GET')).toHaveLength(0);
  await press('Back to current training');
  expect(copy()).not.toContain('Preview only');
  expect(renderer.root.findAllByType(HoldToCompleteButton)).toHaveLength(1);
});

const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 35)); }); };
const enterTraining = async () => {
  await act(async () => { for (const [callback] of [...jest.mocked(useFocusEffect).mock.calls]) callback(); });
  await settle();
};
test('110 keeps the displayed cycle during refresh, then hands off on re-entry and dismisses its notice durably', async () => {
  await mount();
  servedPlan = { ...plan, days: plan.days.map(day => ({ ...day, completed_at: new Date().toISOString() })) };
  currentPlanID = upcoming.id;
  await act(async () => { await client.invalidateQueries({ queryKey: planKeys.all }); });
  await settle();
  expect(copy()).toContain('Strength · 4 weeks');
  await enterTraining();
  expect(copy()).toContain('Next block · 4 weeks');
  expect(copy()).toContain('Previous cycle complete. Your new cycle starts here.');
  await press('Dismiss cycle notice');
  expect(copy()).not.toContain('Previous cycle complete. Your new cycle starts here.');
  act(() => renderer.unmount());
  await mount();
  expect(copy()).not.toContain('Previous cycle complete. Your new cycle starts here.');
});

const assertCurrentDetail = () => {
  expect(authenticatedRequest).toHaveBeenCalledWith(`/plans/${plan.id}`, expect.anything());
  expect(authenticatedRequest).not.toHaveBeenCalledWith(`/plans/${upcoming.id}`, expect.anything());
};
const assertFullList = () => expect(authenticatedRequest).toHaveBeenCalledWith(`/students/${studentId}/plans?include_all=true`, expect.anything());
async function mountProbe(Probe: () => null) {
  await act(async () => { renderer = create(<QueryClientProvider client={client}><Probe /></QueryClientProvider>); });
  await settle(); await settle();
}
test('110 settings reminders read the current cycle', async () => {
  function Probe() { useReminderPreference(studentId); return null; }
  await mountProbe(Probe); assertCurrentDetail();
});
test('110 set sharing reads the current cycle', async () => {
  const candidates = await loadTodaySetRefCandidates(studentId);
  expect(candidates).toBeDefined(); assertCurrentDetail();
});
test('110 coach receiving reads the current cycle with coach identity', async () => {
  useSessionStore.setState({ user: { id: '10000000-0000-4000-8000-000000000002', phone: '', role: 'coach', created_at: plan.created_at } });
  await fetchPendingVideos(); assertCurrentDetail();
});
test('110 coach roster reads the current cycle with coach identity', async () => {
  useSessionStore.setState({ user: { id: '10000000-0000-4000-8000-000000000002', phone: '', role: 'coach', created_at: plan.created_at } });
  const rows = await loadRosterRows([{ id: studentId, displayName: 'Student', status: 'active', evaluationEndAt: null }], new Date(), client);
  expect(rows[0].trainingDays).toHaveLength(1); assertCurrentDetail();
});
test('110 coach detail reads the current cycle with coach identity', async () => {
  useSessionStore.setState({ user: { id: '10000000-0000-4000-8000-000000000002', phone: '', role: 'coach', created_at: plan.created_at } });
  function Probe() { useStudentDetail(studentId, new Date(), false); return null; }
  await mountProbe(Probe); assertCurrentDetail();
});
test('110 history requests the full list including the upcoming cycle', async () => {
  function Probe() { useHistoryViewModel(studentId); return null; }
  await mountProbe(Probe); assertFullList();
  expect(authenticatedRequest).toHaveBeenCalledWith(`/plans/${upcoming.id}`, expect.anything());
});
test('110 publication notice sees a future publication while its active detail stays current', async () => {
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => path.endsWith('/plans?include_all=true') ? { plans: [{ ...servedPlan, published_at: '2026-09-01T00:00:00Z' }, { ...upcoming, published_at: '2026-09-02T00:00:00Z' }] } as never : original(path, options));
  let notice: ReturnType<typeof useStudentPlanNotice> | undefined;
  function Probe() { notice = useStudentPlanNotice(studentId); return null; }
  await mountProbe(Probe); assertFullList(); assertCurrentDetail();
  expect(notice?.unread).toBe(true);
  expect(notice?.planNotice?.signature.planId).toBe(upcoming.id);
});
test('110 exercise note lookup requests the full list', async () => {
  const reference = { v: 1 as const, exercise_name: 'Squat', day_date: '2026-10-01', plan_day_id: upcoming.days[0].id, plan_exercise_id: upcoming.days[0].exercises[0].id, exercise_id: upcoming.days[0].exercises[0].exercise_id };
  await act(async () => { renderer = create(<QueryClientProvider client={client}><ChatExerciseNoteCard student outgoing message={{ body: 'Note', sender_id: studentId, exercise_ref: reference }} /></QueryClientProvider>); });
  await press(exerciseNoteTitle(reference)); await settle(); assertFullList();
});
test('110 set-sync metadata recovery requests the full list and writes against the original next-cycle exercise', async () => {
  const exercise = upcoming.days[0].exercises[0];
  const id = await ensureVideoSet(studentId, `${exercise.id}:0`, { plan_exercise_id: exercise.id, set_index: 0, logged_date: '2026-10-01', weight_kg: '80', reps: 5, rpe: null, completed: true, failed: false });
  assertFullList(); expect(id).toBe('90000000-0000-4000-8000-000000000000');
  expect(jest.mocked(authenticatedRequest).mock.calls.find(([path]) => path === '/sets/log')?.[1]?.body).toMatchObject({ plan_exercise_id: exercise.id, logged_date: '2026-10-01' });
});

test('110 completion reward stays on the old day until closed and the next visit starts the new cycle', async () => {
  await mount();
  await act(async () => renderer.root.findAllByProps({ accessibilityLabel: t('student.todayWorkoutScreen.copy022') })[0].props.onAccessibilityAction());
  await settle();
  const flow = renderer.root.findByType(WorkoutCompletionFlowView);
  expect(copy()).toContain('Strength · 4 weeks');
  await enterTraining();
  expect(copy()).toContain('Strength · 4 weeks');
  await act(async () => flow.props.onFinish({}));
  await enterTraining();
  expect(copy()).toContain('Next block · 4 weeks');
});
test('110 completing a set dismisses the new-cycle notice across remounts', async () => {
  await mount();
  servedPlan = { ...plan, days: plan.days.map(day => ({ ...day, completed_at: new Date().toISOString() })) };
  currentPlanID = upcoming.id;
  await act(async () => { await client.invalidateQueries({ queryKey: planKeys.all }); });
  await enterTraining();
  expect(copy()).toContain('Previous cycle complete. Your new cycle starts here.');
  await press(t('training.allDay.completeExercise')); await settle();
  expect(copy()).not.toContain('Previous cycle complete. Your new cycle starts here.');
  act(() => renderer.unmount()); await mount();
  expect(copy()).not.toContain('Previous cycle complete. Your new cycle starts here.');
});
test('110 previous-cycle undo follows the server back to the old day without deleting any sets', async () => {
  servedPlan = { ...plan, days: plan.days.map(day => ({ ...day, completed_at: new Date().toISOString() })) };
  currentPlanID = upcoming.id;
  await mount(); await press(t('student.trainingWeekStrip.previous')); await settle();
  expect(copy()).toContain('Strength · 4 weeks');
  await press(t('student.todayWorkoutScreen.copy023')); await settle();
  expect(copy()).toContain('Strength · 4 weeks');
  expect(renderer.root.findAllByType(HoldToCompleteButton)).toHaveLength(1);
  expect(jest.mocked(authenticatedRequest).mock.calls.filter(([path, options]) => options?.method === 'DELETE').map(([path]) => path)).toEqual([`/plans/days/${plan.days[0].id}/complete`]);
});
test('110 last-day pending completion preserves the cached old cycle on cold start', async () => {
  await saveWorkoutSnapshot(studentId, plan, []);
  const sync = accountSetSync(studentId); await sync.queue.ready;
  await sync.gate.arm(plan.days[0].id); await sync.gate.holdForNetwork(plan.days[0].id); await sync.gate.release(plan.days[0].id);
  currentPlanID = upcoming.id;
  await mount(); await enterTraining();
  expect(copy()).toContain('Strength · 4 weeks');
  expect(copy()).not.toContain('Next block · 4 weeks');
  await press(t('student.trainingWeekStrip.next')); await settle();
  expect(copy()).toContain('Strength · 4 weeks');
  expect(copy()).not.toContain('Next block · 4 weeks');
});
test('110 uploads keep the old cycle mounted when the server current changes', async () => {
  await mount();
  useVideoUploadStore.setState({ records: { [`${studentId}:upload`]: { ...EMPTY_VIDEO_UPLOAD, status: 'uploading', createdAt: 1 } } });
  currentPlanID = upcoming.id;
  await act(async () => { await client.invalidateQueries({ queryKey: planKeys.all }); });
  await enterTraining();
  expect(copy()).toContain('Strength · 4 weeks');
});
test('110 preview does not replace the offline workout snapshot or create drafts', async () => {
  await mount(); await settle();
  const before = await readWorkoutSnapshot(studentId);
  const draftKeys = Object.keys(accountSetSync(studentId).queue.snapshot().drafts ?? {});
  await press(t('student.trainingWeekStrip.next')); await settle();
  expect(copy()).toContain('Preview only');
  expect((await readWorkoutSnapshot(studentId))?.plan.id).toBe(before?.plan.id);
  expect(Object.keys(accountSetSync(studentId).queue.snapshot().drafts ?? {})).toEqual(draftKeys);
});
test('110 navigation skips empty plans between the current and upcoming cycle', async () => {
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  const empty = { ...plan, id: '30000000-0000-4000-8000-000000000009', name: 'Empty', days: [] };
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path.endsWith('/plan-handoff')) return { current_plan_id: plan.id, plans: [plan, empty, upcoming].map((p, i) => ({ ...p, completed_training_days: 0, total_training_days: p.days.length, handoff_status: i === 0 ? 'current' : i === 1 ? 'past' : 'upcoming' })) } as never;
    if (path === `/plans/${empty.id}`) return empty as never;
    return original(path, options);
  });
  await mount(); await press(t('student.trainingWeekStrip.next')); await settle();
  expect(copy()).toContain('Preview only');
  expect(copy().some(text => text.startsWith('Next block'))).toBe(true);
});

test('110 opening the camera holds the original cycle through a late current-plan refresh', async () => {
  await AsyncStorage.setItem('video_upload_consent_v1', 'true');
  await mount(); await expandFirst();
  await press(t('student.videoAttachmentV3Controls.copy001')); await settle();
  expect(renderer.root.findAllByType(CameraRecorder)).toHaveLength(1);
  currentPlanID = upcoming.id;
  await act(async () => { await client.invalidateQueries({ queryKey: planKeys.all }); });
  await enterTraining();
  expect(copy()).toContain('Strength · 4 weeks');
  expect(renderer.root.findAllByType(CameraRecorder)).toHaveLength(1);
});

test('110 preview keeps the weight strip visible but cannot open its writer', async () => {
  await writeDailyWeight(studentId, true);
  await mount(); await press(t('student.trainingWeekStrip.next')); await settle();
  expect(renderer.root.findAllByProps({ testID: 'training.meetWeightStrip' }).length).toBeGreaterThan(0);
  const entry = renderer.root.findAll(node => node.props.onPress && node.props.accessibilityLabel === t('student.weightStrip.log'))[0];
  expect(entry.props.disabled).toBe(true);
  await act(async () => entry.props.onPress());
  expect(renderer.root.findAllByType(BodyWeightSheet)).toHaveLength(0);
});

test('110 an old workout snapshot remains editable offline before the first handoff cache exists', async () => {
  await saveWorkoutSnapshot(studentId, plan, []);
  jest.mocked(authenticatedRequest).mockRejectedValue(new Error('Offline'));
  await mount(); await settle();
  expect(copy()).toContain('Strength · 4 weeks');
  expect(renderer.root.findAllByType(HoldToCompleteButton)).toHaveLength(1);
  expect(renderer.root.findAll(node => node.props.accessibilityRole === 'checkbox').length).toBeGreaterThan(0);
});

test('110 preview remaining count belongs to the retained cycle during a background handoff', async () => {
  await mount(); await press(t('student.trainingWeekStrip.next')); await settle();
  servedPlan = { ...plan, days: plan.days.map(day => ({ ...day, completed_at: new Date().toISOString() })) };
  currentPlanID = upcoming.id;
  await act(async () => { await client.invalidateQueries({ queryKey: planKeys.all }); });
  await settle();
  expect(copy()).toContain('Preview only');
  expect(copy()).toContain(t('training.handoff.remaining', [0]));
});

// A finished cycle must not be held by background state left on the phone (Android CN16, first real handoff).
const finishedPlan = (): PlanDetail => ({ ...plan, days: plan.days.map(day => ({ ...day, completed_at: '2026-09-01T12:00:00Z' })) });
const slowHandoff = () => {
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path.endsWith('/plan-handoff')) await new Promise(resolve => setTimeout(resolve, 60));
    return original(path, options);
  });
};
const finishedColdStart = async () => {
  servedPlan = finishedPlan(); currentPlanID = upcoming.id;
  await saveWorkoutSnapshot(studentId, servedPlan, []);
};
const enterAfterSlowHandoff = async () => { await mount(); await enterTraining(); await settle(); await settle(); await settle(); };
test('110 a finished cycle hands off on cold start despite a rejected set left in the outbox', async () => {
  await finishedColdStart();
  const day = plan.days[0]; const exercise = day.exercises[0];
  await AsyncStorage.setItem(`training.set-sync.v1.${studentId}`, JSON.stringify({ confirmed: {}, pending: [{
    stableSetId: 'rejected', dayId: day.id, exerciseId: exercise.exercise_id, loggedDate: '2026-09-01',
    request: { plan_exercise_id: exercise.id, set_index: 0, weight_kg: 80, reps: 5, completed: true },
    log: { id: 'local:rejected', student_id: studentId, plan_day_id: null, plan_exercise_id: exercise.id, exercise_id: exercise.exercise_id,
      set_index: 0, weight_kg: '80', reps: 5, rpe: null, completed: true, failed: false, logged_date: '2026-09-01', logged_at: '2026-09-01T12:00:00Z' },
    id: 1, remove: false, status: 'failed', attempts: 1, retryAt: 0 }] }));
  await enterAfterSlowHandoff();
  expect(copy()).toContain('Next block · 4 weeks');
});
test('110 a finished cycle hands off on cold start despite a stale waiting video from an earlier day', async () => {
  await finishedColdStart(); slowHandoff();
  useVideoUploadStore.setState({ records: { [`${studentId}:stale`]: { ...EMPTY_VIDEO_UPLOAD, status: 'waiting', createdAt: 1 } } });
  await enterAfterSlowHandoff();
  expect(copy()).toContain('Next block · 4 weeks');
});
test('110 a finished cycle hands off on cold start while the completion gate still holds a day the server already settled', async () => {
  await finishedColdStart();
  const setLogId = '90000000-0000-4000-8000-000000000000';
  await AsyncStorage.setItem('training.videoUploads.v1', JSON.stringify({ version: 1, records: { [`${studentId}:gate-set`]: { ...EMPTY_VIDEO_UPLOAD, status: 'failed', createdAt: 1, setLogId } } }));
  await AsyncStorage.setItem(`training.completion-gate.v1.${studentId}`, JSON.stringify({ [plan.days[0].id]: { completed: false, released: true,
    video: { sets: [{ stableSetId: 'gate-set', setLogId }], exerciseIds: [], heldAt: Date.now() - 3_600_000, timedOut: true } } }));
  await enterAfterSlowHandoff();
  expect(copy()).toContain('Next block · 4 weeks');
});
test('110 a finished cycle still holds while a video upload is in flight', async () => {
  await finishedColdStart(); slowHandoff();
  useVideoUploadStore.setState({ records: { [`${studentId}:live`]: { ...EMPTY_VIDEO_UPLOAD, status: 'uploading', createdAt: Date.now() } } });
  await enterAfterSlowHandoff();
  expect(copy()).toContain('Strength · 4 weeks');
});
test('110 skipping leftover state on a finished cycle reports which state it was', async () => {
  await finishedColdStart(); slowHandoff();
  useVideoUploadStore.setState({ records: { [`${studentId}:stale`]: { ...EMPTY_VIDEO_UPLOAD, status: 'waiting', createdAt: 1 } } });
  const tracked = jest.mocked(track);
  await enterAfterSlowHandoff();
  expect(copy()).toContain('Next block · 4 weeks');
  expect(tracked).toHaveBeenCalledWith(AnalyticsEvent.ClientError, { domain: 'persistence', code: 'handoff.settled_skip.upload_waiting', screen: 'today_workout' });
});
