import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { writeDailyWeight } from '@/features/settings/daily-weight';
import { bodyWeightsRepository } from '@/api/domains/body-weights';
import { localDay } from '@/domain/coach/detail-week';
import { useExerciseNoteOutbox, flushExerciseNotes } from '@/features/chat/exercise-note-outbox';
import { chatRepository, ChatMessageSchema, ExerciseRefSchema } from '@/api/domains/chat';
import contract from '../__fixtures__/107-contract-provisional.json';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PlanDetail } from '@/api/domains/plans';
import { authenticatedRequest, useSessionStore } from '@/api/session';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Svg, { LinearGradient, Rect } from 'react-native-svg';
import { NumberPad } from '@/design/NumberPad';
import { ExerciseNoteSheet } from '@/features/chat/ExerciseNoteSheet';
import { ChatExerciseNoteCard } from '@/features/chat/ChatExerciseNoteCard';
import { TodayWorkoutView } from '@/features/training/TodayWorkoutView';
import { setLocaleOverride, t, type Locale } from '@/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { Alert, Text, TextInput, Modal, StyleSheet, View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { TrainingWeekStrip } from '../TrainingWeekStrip';
import { AllDayBody } from '../AllDayBody';
import { StudentExercisePicker } from '../StudentExercisePicker';
import { HoldToCompleteButton } from '../HoldToCompleteButton';
import { resetVideoUploadStoreForTests } from '../video-upload/store';


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
let renderer: ReactTestRenderer;
let client: QueryClient;
let servedPlan: PlanDetail;
let failCompletion = false;

beforeEach(() => {
  jest.mocked(authenticatedRequest).mockClear();
  setLocaleOverride('en');
  mockNavigate.mockClear();
  jest.mocked(useFocusEffect).mockClear();
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
    if (path === '/sets/log') return { id: '90000000-0000-4000-8000-000000000000', logged_at: new Date().toISOString() } as never;
    if (path.endsWith('/weight-suggestions')) return { suggestions: [] } as never;
    if (path.includes('/sets')) return { logs: [] } as never;
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

test('107 tapping a row edits in place and checking an exercise collapses its rows', async () => {
  await mount();
  await expandFirst();
  await press('Edit set 1');
  expect(renderer.root.findAllByType(NumberPad)).toHaveLength(1);
  await act(async () => renderer.root.findByType(NumberPad).props.onCancel());
  await press('Complete exercise');
  expect(renderer.root.findAll(node => node.props.accessibilityLabel === 'Edit set 1')).toHaveLength(0);
  expect(copy()).toContain('1×5');
  expect(copy()).toContain('80');
  await press('Expand exercise');
  expect(renderer.root.findAll(node => node.props.accessibilityLabel === 'Edit set 1').length).toBeGreaterThan(0);
});

test('107 long hold records untouched prescriptions before completing the day', async () => {
  await mount();
  expect(renderer.root.findAllByType(HoldToCompleteButton)).toHaveLength(1);
  await act(async () => renderer.root.findAllByProps({ accessibilityLabel: t('student.todayWorkoutScreen.copy022') })[0].props.onAccessibilityAction());
  expect(jest.mocked(authenticatedRequest).mock.calls.find(([path]) => path === '/sets/log')?.[1]?.body)
    .toMatchObject({ weight_kg: '80', reps: 5, rpe: null });
  expect(copy()).toContain(t('student.workoutCompletionFlowView.copy001'));
});


test('107 row fields remain reachable while the keypad is open and only the edited row changes', async () => {
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [{ ...plan.days[0].exercises[0], sets: [plan.days[0].exercises[0].sets[0], { ...plan.days[0].exercises[0].sets[0], id: '70000000-0000-4000-8000-000000000001', set_number: 2 }] }] }] };
  await mount(); await expandFirst(); await press('Edit set 1');
  expect(renderer.root.findAllByType(Modal)).toHaveLength(0);
  await press('reps');
  expect(renderer.root.findByType(NumberPad).props.field).toBe('reps');
  await act(async () => renderer.root.findByType(NumberPad).props.onChangeText('4'));
  await act(async () => renderer.root.findByType(NumberPad).props.onCancel());
  expect(copy().some(text => text.includes('4/5'))).toBe(true);
  const writes = jest.mocked(authenticatedRequest).mock.calls.filter(([path]) => path === '/sets/log');
  expect(writes.at(-1)?.[1]?.body).toMatchObject({ set_index: 0, weight_kg: '80', reps: 4, rpe: null });
  expect(writes.some(([, options]) => (options?.body as { set_index: number }).set_index === 1)).toBe(false);
});

test('107 exercise note queues offline and retries canonical text plus exercise_ref without set_ref or video', async () => {
  const coachId = '80000000-0000-4000-8000-000000000000';
  const conversationId = '20000000-0000-4000-8000-000000000000';
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  let online = false;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === '/bind-requests/mine') return { bind_request: { status: 'accepted', coach_id: coachId } } as never;
    if (path === '/conversations') {
      if (!online && options?.method === 'POST') throw new Error('Offline');
      return options?.method === 'POST' ? { conversation: { id: conversationId, other_party: { id: coachId, display_name: 'Coach' } } } as never : { conversations: [] } as never;
    }
    if (path.endsWith('/messages')) return { message: { id: '90000000-0000-4000-8000-000000000000' } } as never;
    return original(path, options);
  });
  await mount();
  await expandFirst();
  const note = renderer.root.findAll(node => node.props.onPress && String(node.props.accessibilityLabel).startsWith('Message coach ·'))[0];
  await act(async () => note.props.onPress());
  await act(async () => renderer.root.findByType(TextInput).props.onChangeText('Check my pause, please.'));
  await act(async () => renderer.root.findAll(node => node.props.onPress && node.props.label === 'Send')[0].props.onPress());
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  expect(useExerciseNoteOutbox.getState().notes).toHaveLength(1);
  const queued = useExerciseNoteOutbox.getState().notes[0];
  expect(queued.body).toMatch(/^\[Exercise note\] .+ · \d+\/\d+\nCheck my pause, please\.$/);
  expect(JSON.parse((await AsyncStorage.getItem(`chat.exercise-notes.v1.${studentId}`))!)[0].clientID).toBe(queued.clientID);
  online = true;
  await act(async () => flushExerciseNotes(studentId));
  const body = jest.mocked(authenticatedRequest).mock.calls.find(([path]) => path.endsWith('/messages'))?.[1]?.body;
  expect(body).toMatchObject({ kind: 'text', body: queued.body, exercise_ref: { v: 1, exercise_id: plan.days[0].exercises[0].exercise_id } });
  expect(body).not.toHaveProperty('set_ref'); expect(body).not.toHaveProperty('video_id');
  expect(useExerciseNoteOutbox.getState().notes).toHaveLength(0);
  expect(ChatMessageSchema.parse({ id: contract.nullLog.id, conversation_id: conversationId, seq: 1, sender_id: studentId, kind: 'text', client_id: queued.clientID, body: queued.body, created_at: contract.nullLog.logged_at, exercise_ref: contract.exerciseRef }).exercise_ref).toEqual(contract.exerciseRef);
});


test('changing the selected day closes the old row editor', async () => {
  const second = { ...plan.days[0], id: '40000000-0000-4000-8000-000000000004', day_of_week: 4 };
  servedPlan = { ...plan, days: [...plan.days, second] };
  await mount(); await expandFirst(); await press('Edit set 1');
  await act(async () => renderer.root.findByType(TrainingWeekStrip).props.onSelect(second.id));
  expect(renderer.root.findAllByType(NumberPad)).toHaveLength(0);
});

test('switching accounts drains the new outbox while the previous account request is pending', async () => {
  const otherId = '10000000-0000-4000-8000-000000000001';
  const pending = (id: string) => ({ studentId: id, coachId: '80000000-0000-4000-8000-000000000000', clientID: id, body: '[Exercise note] Squat · 11/10\nHelp', exerciseRef: contract.exerciseRef, createdAt: plan.created_at });
  await AsyncStorage.setItem(`chat.exercise-notes.v1.${studentId}`, JSON.stringify([pending(studentId)]));
  await AsyncStorage.setItem(`chat.exercise-notes.v1.${otherId}`, JSON.stringify([pending(otherId)]));
  let release!: (value: never) => void;
  const held = new Promise<never>(resolve => { release = resolve; });
  jest.mocked(authenticatedRequest).mockImplementation(async (path) => {
    if (path === '/conversations') {
      if (useSessionStore.getState().user?.id === studentId) return held;
      return { conversation: { id: '20000000-0000-4000-8000-000000000001' } } as never;
    }
    return { message: { id: 'sent' } } as never;
  });
  const first = flushExerciseNotes(studentId);
  await new Promise(resolve => setTimeout(resolve, 10));
  useSessionStore.setState({ user: { id: otherId, phone: '', role: 'coached_student', created_at: plan.created_at } });
  const second = flushExerciseNotes(otherId);
  await new Promise(resolve => setTimeout(resolve, 10));
  const sentBeforeRelease = jest.mocked(authenticatedRequest).mock.calls.some(([path]) => path === '/conversations/20000000-0000-4000-8000-000000000001/messages');
  release({ conversation: { id: '20000000-0000-4000-8000-000000000000' } } as never);
  await Promise.all([first, second]);
  expect(sentBeforeRelease).toBe(true);
  expect(JSON.parse((await AsyncStorage.getItem(`chat.exercise-notes.v1.${otherId}`))!)).toEqual([]);
  expect(JSON.parse((await AsyncStorage.getItem(`chat.exercise-notes.v1.${studentId}`))!)).toHaveLength(1);
});


test('exercise note wire body preserves the original student text after the canonical header', async () => {
  const body = '[Exercise note] Squat · 11/10\n  My original text  \n';
  jest.mocked(authenticatedRequest).mockResolvedValueOnce({ message: {} } as never);
  await chatRepository.sendExerciseNote('20000000-0000-4000-8000-000000000000', { body, clientID: 'note', exerciseRef: ExerciseRefSchema.parse(contract.exerciseRef) });
  expect(jest.mocked(authenticatedRequest).mock.calls.at(-1)?.[1]?.body).toMatchObject({ body });
});


test('single expanded exercise, repeated name indentation, manual collapse and check reset do not conflate viewing with saving', async () => {
  const first = plan.days[0].exercises[0];
  const second = { ...first, id: '50000000-0000-4000-8000-000000000001', sort_order: 1,
    sets: first.sets.map(s => ({ ...s, id: '70000000-0000-4000-8000-000000000001', plan_exercise_id: '50000000-0000-4000-8000-000000000001' })) };
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [first, second] }] };
  await mount();
  const row = (id: string) => renderer.root.findAll(node => node.props.testID === `all-day-exercise-${id}` && node.props.onPress)[0];
  const isExpanded = (id: string) => row(id).props.accessibilityState.expanded;
  expect(isExpanded(first.id)).toBe(false); expect(isExpanded(second.id)).toBe(false);
  expect(renderer.root.findAll(node => node.type === Text && node.props.testID === `all-day-name-${second.id}`)).toHaveLength(0);
  await act(async () => row(second.id).props.onPress());
  expect(isExpanded(first.id)).toBe(false); expect(isExpanded(second.id)).toBe(true);
  await press('Edit set 1');
  await act(async () => row(first.id).props.onPress());
  expect(renderer.root.findAllByType(NumberPad)).toHaveLength(0);
  await act(async () => row(first.id).props.onPress());
  expect(isExpanded(first.id)).toBe(false); expect(isExpanded(second.id)).toBe(false);
  expect(jest.mocked(authenticatedRequest).mock.calls.filter(([path]) => path === '/sets/log')).toHaveLength(0);
  // Checking a collapsed exercise leaves every exercise collapsed.
  await act(async () => renderer.root.findAll(node => node.props.testID === `all-day-check-${second.id}` && node.props.onPress)[0].props.onPress());
  expect(isExpanded(first.id)).toBe(false); expect(isExpanded(second.id)).toBe(false);
  await act(async () => row(second.id).props.onPress());
  expect(isExpanded(second.id)).toBe(true);
  expect(renderer.root.findAll(node => node.props.testID === `all-day-check-${second.id}`)[0].props.accessibilityState.checked).toBe(true);
});


test('acceptance 14: free weight, RPE without history, and an empty added exercise finish without input', async () => {
  const first = plan.days[0].exercises[0];
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [{ ...first, sets: [
    { ...first.sets[0], load_mode: 'free_weight' },
    { ...first.sets[0], id: '70000000-0000-4000-8000-000000000001', set_number: 2, load_mode: 'rpe', target_rpe: '8' },
  ] }] }] };
  await mount();
  await act(async () => renderer.root.findByType(AllDayBody).props.onAddExercise());
  await act(async () => renderer.root.findByType(StudentExercisePicker).props.onSelect('60000000-0000-4000-8000-000000000009'));
  expect(copy()).not.toContain('Weight kg · Required');
  await act(async () => renderer.root.findAllByProps({ accessibilityLabel: t('student.todayWorkoutScreen.copy022') })[0].props.onAccessibilityAction());
  const writes = jest.mocked(authenticatedRequest).mock.calls.filter(([path]) => path === '/sets/log').map(([, options]) => options?.body);
  expect(writes).toHaveLength(2);
  expect(writes).toEqual(expect.arrayContaining([
    expect.objectContaining({ weight_kg: null, rpe: null, reps: 5 }),
    expect.objectContaining({ weight_kg: null, rpe: '8', reps: 5 }),
  ]));
  expect(copy()).toContain(t('student.workoutCompletionFlowView.copy001'));
  expect(Alert.alert).not.toHaveBeenCalled();
});

test('a day with no exercises can complete without an at-least-one-exercise gate', async () => {
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [] }] };
  await mount();
  await act(async () => renderer.root.findAllByProps({ accessibilityLabel: t('student.todayWorkoutScreen.copy022') })[0].props.onAccessibilityAction());
  expect(jest.mocked(authenticatedRequest).mock.calls.filter(([path]) => path === '/sets/log')).toHaveLength(0);
  expect(copy()).toContain(t('student.workoutCompletionFlowView.copy001'));
  expect(Alert.alert).not.toHaveBeenCalled();
});

test('lb summary, expanded rows and keypad use the same unit while saved weights remain kg', async () => {
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => path.endsWith('/onboarding') ? { unit_preference: 'lb' } as never : original(path, options));
  await mount();
  expect(copy()).toContain('176.4');
  await expandFirst();
  await press('Edit set 1');
  expect(renderer.root.findByType(NumberPad).props.initialValue).toBe('176.4');
  expect(renderer.root.findByType(NumberPad).props.contextText).toContain('lb');
  await act(async () => renderer.root.findByType(NumberPad).props.onChangeText('220.5'));
  expect(jest.mocked(authenticatedRequest).mock.calls.filter(([path]) => path === '/sets/log').at(-1)?.[1]?.body)
    .toMatchObject({ weight_kg: '100' });
});

test('108 logging weight from the training strip updates today without leaving training', async () => {
  await writeDailyWeight(studentId, true);
  let records: { recorded_on: string; weight_kg: string }[] = [];
  jest.spyOn(bodyWeightsRepository, 'list').mockImplementation(async () => ({ records }));
  jest.spyOn(bodyWeightsRepository, 'saveToday').mockImplementation(async weight => {
    const record = { recorded_on: localDay(new Date()), weight_kg: weight };
    records = [record]; return { record, current_weight_kg: weight };
  });
  await mount();
  await press('Log weight');
  for (const key of ['7', '7', 'Decimal point', '4']) await press(key);
  await press('Done');
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  expect(copy()).toContain('77.4');
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(records).toEqual([{ recorded_on: localDay(new Date()), weight_kg: '77.40' }]);
});


test('current collapsed exercise retains its gold highlight and completion moves it without expanding', async () => {
  const first = plan.days[0].exercises[0];
  const second = { ...first, id: '50000000-0000-4000-8000-000000000001', sort_order: 1, sets: [] };
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [first, second] }] };
  await mount();
  const rowStyle = (id: string) => StyleSheet.flatten(renderer.root.findAll(node => node.props.testID === `all-day-exercise-${id}` && node.props.onPress)[0].parent!.props.style);
  expect(rowStyle(first.id).borderColor).not.toBe('transparent');
  expect(rowStyle(first.id).backgroundColor).toBeTruthy();
  expect(rowStyle(first.id).borderWidth).toBe(1);
  expect(rowStyle(second.id).borderColor).toBe('transparent');
  await press('Complete exercise');
  expect(rowStyle(first.id).borderColor).toBe('transparent');
  expect(rowStyle(second.id).borderColor).not.toBe('transparent');
  expect(renderer.root.findAll(node => node.props.accessibilityLabel === 'Edit set 1')).toHaveLength(0);
});


test('timeline connects consecutive node centers with no outer gap and stops at the last node', async () => {
  const first = plan.days[0].exercises[0];
  const second = { ...first, id: '50000000-0000-4000-8000-000000000001', sort_order: 1, sets: [] };
  const third = { ...second, id: '50000000-0000-4000-8000-000000000002', sort_order: 2 };
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [first, second, third] }] };
  await mount();
  const timeline = renderer.root.findByProps({ testID: 'all-day-timeline' });
  expect(StyleSheet.flatten(timeline.props.style).gap).toBe(0);
  const lines = (id: string) => renderer.root.findAllByType(View).filter(node => node.props.testID === `all-day-line-${id}`);
  const line = (id: string) => lines(id)[0];
  for (const id of [first.id, second.id]) {
    expect(lines(id)).toHaveLength(1);
    expect(StyleSheet.flatten(line(id)!.props.style)).toMatchObject({ position: 'absolute', top: 16, bottom: -16, width: 3 });
  }
  expect(line(third.id)).toBeUndefined();
  await expandFirst();
  expect(StyleSheet.flatten(line(first.id)!.props.style).bottom).toBe(-16);
});


test.each<[string, string | null, string]>([
  ['rpe', '8', 'RPE 8'], ['rpe', null, 'RPE —'],
  ['rir', '2', 'RIR 2'], ['rir', null, 'RIR —'],
])('expanded effort column identifies %s even when its value is %s', async (kind, value, expected) => {
  const exercise = plan.days[0].exercises[0];
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [{ ...exercise, sets: [{
    ...exercise.sets[0], load_mode: kind === 'rir' ? 'rir' : 'fixed_weight', rir_target: kind === 'rir' ? 2 : null,
    target_rpe: kind === 'rpe' ? value : null,
  }] }] }] };
  await mount();
  await expandFirst();
  if (value === null && kind === 'rir') {
    await press('Edit set 1');
    await press('rir');
    await act(async () => renderer.root.findByType(NumberPad).props.onChangeText(''));
    await act(async () => renderer.root.findByType(NumberPad).props.onCancel());
  }
  expect(copy()).toContain(expected);
});

test.each<[Locale, number, string]>([
  ['zh', 23, '距比赛 23 天'], ['zh', 0, '今天比赛'],
  ['zh-Hant', 23, '距比賽 23 天'], ['zh-Hant', 0, '今天比賽'],
  ['en', 23, '23 days until meet'], ['en', 0, 'Meet today'],
])('meet strip displays the generic countdown in %s at day %s', async (locale, days, expected) => {
  setLocaleOverride(locale);
  const meet = new Date();
  meet.setDate(meet.getDate() + days);
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => path.endsWith('/onboarding')
    ? { is_competing: true, competition_date: localDay(meet) } as never : original(path, options));
  jest.spyOn(bodyWeightsRepository, 'list').mockResolvedValue({ records: [] });
  await mount();
  expect(copy()).toContain(expected);
  await press(expected);
  expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/(student)/profile', params: { edit: 'competition' } });
});


test('switching an RIR prescription to empty RPE keeps the chosen column label after editing', async () => {
  const exercise = plan.days[0].exercises[0];
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [{ ...exercise, sets: [{
    ...exercise.sets[0], load_mode: 'rir', rir_target: 2,
  }] }] }] };
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => path === '/exercises'
    ? { exercises: [{ id: exercise.exercise_id, name: 'Row', name_en: 'Row', exercise_type: 'accessory' }] } as never
    : original(path, options));
  await mount();
  await expandFirst();
  await press('Edit set 1');
  await act(async () => renderer.root.findAll(node => node.props.onPress && !node.props.disabled &&
    node.findAllByType(Text).some(text => text.props.children === 'RIR'))[0].props.onPress());
  expect(renderer.root.findByType(NumberPad).props.field).toBe('rpe');
  await act(async () => renderer.root.findByType(NumberPad).props.onCancel());
  expect(copy()).toContain('RPE —');
  expect(copy()).not.toContain('RIR —');
});

test('107-1 expanding a noncurrent exercise adds only a gold border', async () => {
  const first = plan.days[0].exercises[0];
  const second = { ...first, id: '50000000-0000-4000-8000-000000000001', sort_order: 1, sets: [] };
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [first, second] }] };
  await mount();
  const row = (id: string) => renderer.root.findByType(AllDayBody).findAll(node => node.props.testID === `all-day-exercise-${id}` && node.props.onPress)[0];
  await act(async () => row(second.id).props.onPress());
  expect(StyleSheet.flatten(row(second.id).parent!.props.style)).toMatchObject({ borderWidth: 1 });
  expect(StyleSheet.flatten(row(second.id).parent!.props.style).borderColor).not.toBe('transparent');
  expect(StyleSheet.flatten(row(second.id).parent!.props.style).backgroundColor).toBeUndefined();
  expect(StyleSheet.flatten(row(first.id).parent!.props.style).backgroundColor).toBeTruthy();
  await expandFirst();
  expect(StyleSheet.flatten(row(first.id).parent!.props.style).backgroundColor).toBeTruthy();
});

test('107-2 expanded coach notes show every line without truncation', async () => {
  const exercise = plan.days[0].exercises[0];
  const notes = 'Pause at the bottom.\nKeep your knees out.\nRest fully before the next set.';
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [{ ...exercise, notes }] }] };
  await mount();
  await expandFirst();
  const note = renderer.root.findAllByType(Text).find(node => node.props.children === t('training.allDay.coachNote', [notes]))!;
  expect(note).toBeDefined();
  expect(note.props.numberOfLines).toBeUndefined();
});


test('107-3 current connector stretches one continuous gradient to its measured height', async () => {
  const first = plan.days[0].exercises[0];
  const second = { ...first, id: '50000000-0000-4000-8000-000000000001', sort_order: 1, sets: [] };
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [first, second] }] };
  await mount();
  const line = () => renderer.root.findAllByType(View).find(node => node.props.testID === `all-day-line-${first.id}`)!;
  for (const height of [64, 240, 64]) {
    if (height === 240) await expandFirst();
    if (height === 64 && line().findByType(Svg).props.height === 240) await expandFirst();
    expect(line().props.onLayout).toEqual(expect.any(Function));
    await act(async () => line().props.onLayout({ nativeEvent: { layout: { width: 3, height } } }));
    expect(line().findAllByType(Svg)).toHaveLength(1);
    expect(line().findByType(Svg).props.height).toBe(height);
    expect(line().findByType(Rect).props.height).toBe(height);
    expect(line().findAllByType(LinearGradient)).toHaveLength(1);
    expect(line().findByType(LinearGradient).props).toMatchObject({ y1: '0%', y2: '100%' });
  }
});


test('107-4 exercise note entry is icon-only with a 44pt touch target', async () => {
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => path === '/bind-requests/mine'
    ? { bind_request: { status: 'accepted', coach_id: 'coach' } } as never : original(path, options));
  await mount();
  await expandFirst();
  const note = renderer.root.findByType(AllDayBody).findAll(node => node.props.onPress && String(node.props.accessibilityLabel).includes(' · '))[0];
  const icon = note.findByType(MaterialCommunityIcons);
  expect(icon.props.name).toBe('message-outline');
  expect(note.findAllByType(Text)).toEqual(icon.findAllByType(Text));
  expect(StyleSheet.flatten(note.props.style)).toMatchObject({ minWidth: 44, minHeight: 44 });
});

test.each<[Locale, string, string, string]>([
  ['zh', '给教练留言 · Squat', '这组感觉怎么样，或想问教练什么', '学员留言'],
  ['zh-Hant', '給教練留言 · Squat', '這組感覺怎麼樣，或想問教練什麼', '學員留言'],
  ['en', 'Message coach · Squat', 'How did this set feel, or what would you like to ask your coach?', 'Student note'],
])('107-4 centered note dialog and both chat cards use revised copy in %s', async (locale, title, placeholder, label) => {
  setLocaleOverride(locale);
  const reference = { ...ExerciseRefSchema.parse(contract.exerciseRef), exercise_name: 'Squat', day_date: '2026-11-10' };
  const close = jest.fn();
  await act(async () => { renderer = create(<ExerciseNoteSheet studentId={studentId} coachId="coach" reference={reference} onClose={close} />); });
  expect(copy()).toContain(title);
  expect(renderer.root.findByType(TextInput).props).toMatchObject({ placeholder, multiline: true });
  const backdrop = renderer.root.findByType(Modal).findAllByType(View).find(node => StyleSheet.flatten(node.props.style)?.flex === 1)!;
  expect(StyleSheet.flatten(backdrop.props.style).justifyContent).toBe('center');
  await act(async () => renderer.root.findAll(node => node.props.label === t('designSystem.action.cancel') && node.props.onPress)[0].props.onPress());
  expect(close).toHaveBeenCalledTimes(1);
  expect(useExerciseNoteOutbox.getState().notes).toHaveLength(0);
  for (const student of [true, false]) {
    await act(async () => renderer.update(<ChatExerciseNoteCard student={student} outgoing={student} message={{ sender_id: studentId, exercise_ref: reference, body: '[Exercise note] Squat · 11/10\nHelp with my pause' }} />));
    expect(copy()).toContain(`11/10 · Squat · ${label}`);
    expect(copy()).toContain('Help with my pause');
  }
});


test('107-6 expanded percentage prescriptions place the original percent at each set row end', async () => {
  const exercise = plan.days[0].exercises[0];
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [{ ...exercise, sets: [{
    ...exercise.sets[0], load_mode: 'pct', pct_anchor: 'one_rm', target_pct: '60',
  }] }] }] };
  await mount();
  await expandFirst();
  const row = renderer.root.findAllByType(View).find(node => String(node.props.testID).startsWith('all-day-row-'))!;
  const percent = row.findAllByType(Text).find(node => node.props.children === '60%');
  expect(percent).toBeDefined();
  expect(StyleSheet.flatten(percent!.props.style)).toMatchObject({ fontSize: 11, color: '#4B5563' });
});
