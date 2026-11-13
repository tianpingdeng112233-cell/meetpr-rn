import { writeEffortChoice } from '../effort-preferences';
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { writeDailyWeight } from '@/features/settings/daily-weight';
import { bodyWeightsRepository } from '@/api/domains/body-weights';
import { gymDayToday } from '@/domain/plan/workout-date-policy';
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
import { CoachDayDetailView } from '@/features/coach/student-detail/CoachDayDetailView';
import { setLocaleOverride, t, type Locale } from '@/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { Alert, Text, TextInput, Modal, StyleSheet, View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { TrainingWeekStrip } from '../TrainingWeekStrip';
import * as trainingConstants from '../constants';
import { AllDayBody } from '../AllDayBody';
import { StudentExercisePicker } from '../StudentExercisePicker';
import { HoldToCompleteButton } from '../HoldToCompleteButton';
import { VideoAttachmentControls } from '../video-upload/VideoAttachmentControls';
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

const serveRpeHistory = () => {
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [{ ...plan.days[0].exercises[0],
    sets: [{ ...plan.days[0].exercises[0].sets[0], intensity_mode: 'rpe', target_value: '8' }],
  }] }] };
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) =>
    path.endsWith('/weight-suggestions') ? contract.suggestionsResponse as never : original(path, options));
};

test('history prefill disabled: matching cached/server history leaves RPE-only weight empty and completion saves null', async () => {
  serveRpeHistory();
  client.setQueryData(['weight-suggestions', studentId, plan.days[0].id], contract.suggestionsResponse);
  await mount();
  await expandFirst();
  await press('Edit set 1');
  expect(renderer.root.findByType(NumberPad).props.initialValue).toBe('');
  await act(async () => renderer.root.findByType(NumberPad).props.onCancel());
  expect(renderer.root.findByType(AllDayBody).props.sheet.exercises[0].rows[0])
    .toMatchObject({ weightText: '', repsText: '5', rpeText: '8' });
  await act(async () => renderer.root.findAllByProps({ accessibilityLabel: t('student.todayWorkoutScreen.copy022') })[0].props.onAccessibilityAction());
  expect(jest.mocked(authenticatedRequest).mock.calls.find(([path]) => path === '/sets/log')?.[1]?.body)
    .toMatchObject({ weight_kg: null, reps: 5, rpe: '8' });
});

test('history prefill disabled: opening, switching days and refreshing never request weight suggestions', async () => {
  serveRpeHistory();
  const later = { ...servedPlan.days[0], id: '40000000-0000-4000-8000-000000000002', day_of_week: 3 };
  servedPlan = { ...servedPlan, days: [...servedPlan.days, later] };
  const suggestionCalls = () => jest.mocked(authenticatedRequest).mock.calls.filter(([path]) => path.endsWith('/weight-suggestions'));
  await mount();
  expect(suggestionCalls()).toHaveLength(0);
  await act(async () => renderer.root.findByType(TrainingWeekStrip).props.onSelect(later.id));
  expect(renderer.root.findByType(TrainingWeekStrip).props.strip.selectedDay.id).toBe(later.id);
  expect(suggestionCalls()).toHaveLength(0);
  await act(async () => client.invalidateQueries({ queryKey: ['weight-suggestions'] }));
  await act(async () => renderer.root.findByType(TrainingWeekStrip).props.onSelect(plan.days[0].id));
  expect(suggestionCalls()).toHaveLength(0);
});

test('history prefill enabled: requesting matching history restores the original RPE-only prefill', async () => {
  jest.replaceProperty(trainingConstants, 'HISTORY_WEIGHT_PREFILL_ENABLED', true);
  serveRpeHistory();
  await mount();
  expect(jest.mocked(authenticatedRequest).mock.calls.filter(([path]) => path.endsWith('/weight-suggestions'))).toHaveLength(1);
  expect(renderer.root.findByType(AllDayBody).props.sheet.exercises[0].rows[0])
    .toMatchObject({ weightText: '92.5', repsText: '5', rpeText: '8' });
  await expandFirst();
  await press('Edit set 1');
  expect(renderer.root.findByType(NumberPad).props.initialValue).toBe('92.5');
});

test('acceptance 16: W2 can be edited, checked and completed while W1 remains unsettled', async () => {
  const dayId = '40000000-0000-4000-8000-000000000002';
  const exerciseId = '50000000-0000-4000-8000-000000000002';
  const later = { ...plan.days[0], id: dayId, week_number: 2, exercises: [{
    ...plan.days[0].exercises[0], id: exerciseId, plan_day_id: dayId,
    sets: [{ ...plan.days[0].exercises[0].sets[0], id: '70000000-0000-4000-8000-000000000002', plan_exercise_id: exerciseId }],
  }] };
  servedPlan = { ...plan, days: [...plan.days, later] };
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === '/bind-requests/mine') return { bind_request: { status: 'accepted', coach_id: 'coach' } } as never;
    if (path === `/plans/days/${dayId}/complete`) {
      const completed_at = new Date().toISOString();
      servedPlan = { ...servedPlan, days: servedPlan.days.map(day => day.id === dayId ? { ...day, completed_at } : day) };
      return { id: 'completion', plan_day_id: dayId, student_id: studentId, source: 'manual', completed_at } as never;
    }
    return original(path, options);
  });
  await mount();
  expect(renderer.root.findByType(TrainingWeekStrip).props.strip.selectedDay.id).toBe(plan.days[0].id);
  await press('Next week');
  expect(renderer.root.findAllByType(HoldToCompleteButton)).toHaveLength(1);
  await act(async () => renderer.root.findAll(node => node.props.testID === `all-day-exercise-${exerciseId}` && node.props.onPress)[0].props.onPress());
  expect(renderer.root.findAllByType(VideoAttachmentControls)).toHaveLength(1);
  expect(renderer.root.findByType(VideoAttachmentControls).props.editable).toBe(true);
  await press('Edit set 1');
  await act(async () => renderer.root.findByType(NumberPad).props.onChangeText('85'));
  await act(async () => renderer.root.findByType(NumberPad).props.onCancel());
  expect(jest.mocked(authenticatedRequest).mock.calls.filter(([path]) => path === '/sets/log').at(-1)?.[1]?.body)
    .toMatchObject({ plan_exercise_id: exerciseId, weight_kg: '85' });
  const pressText = async (label: string) => {
    await act(async () => renderer.root.findAll(node => node.props.onPress && node.findAllByType(Text).some(text => text.props.children === label))[0].props.onPress());
  };
  await pressText(t('student.added.addSet'));
  expect(renderer.root.findAllByType(VideoAttachmentControls)).toHaveLength(2);
  await pressText(t('student.added.addExercise'));
  expect(renderer.root.findAllByType(StudentExercisePicker)).toHaveLength(1);
  await act(async () => renderer.root.findByType(StudentExercisePicker).props.onClose());
  await act(async () => renderer.root.findAll(node => node.props.onPress && String(node.props.accessibilityLabel).startsWith('Message coach ·'))[0].props.onPress());
  expect(renderer.root.findByType(ExerciseNoteSheet).props.reference.plan_day_id).toBe(dayId);
  await act(async () => renderer.root.findByType(ExerciseNoteSheet).props.onClose());
  await press('Complete exercise');
  expect(renderer.root.findAllByProps({ testID: `all-day-check-${exerciseId}` })[0].props.accessibilityState.checked).toBe(true);
  await act(async () => renderer.root.findAllByProps({ accessibilityLabel: t('student.todayWorkoutScreen.copy022') })[0].props.onAccessibilityAction());
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  expect(copy()).toContain(t('student.workoutCompletionFlowView.copy001'));
  const strip = renderer.root.findByType(TrainingWeekStrip).props.strip;
  expect(strip.selectedDay).toMatchObject({ id: dayId, completed_at: expect.any(String) });
  expect(strip.todayDay.id).toBe(plan.days[0].id);
  expect(servedPlan.days[0].completed_at).toBeUndefined();
  expect(renderer.root.findAllByType(HoldToCompleteButton)).toHaveLength(0);
  expect(Alert.alert).not.toHaveBeenCalled();
  await act(async () => renderer.unmount());
  await mount();
  expect(renderer.root.findByType(TrainingWeekStrip).props.strip.selectedDay.id).toBe(plan.days[0].id);
  await act(async () => renderer.update(<CoachDayDetailView
    day={{ date: new Date(), planDay: servedPlan.days[1], logs: [] }} planDays={servedPlan.days}
    exerciseName={() => 'Squat'} onClose={() => {}} />));
  expect(copy()).toContain(`W2D1 · ${t('coach.detail.completed')}`);
});

test.each<[number, number, boolean]>([[1, 0, true], [2, 0, true], [2, 8, false]])(
  'settled W%s remains read-only with a %s-day-old completion (undo %s)', async (week, age, undo) => {
    const completed_at = new Date(Date.now() - age * 86_400_000).toISOString();
    const settled = { ...plan.days[0], week_number: week, completed_at };
    const open = { ...plan.days[0], id: '40000000-0000-4000-8000-000000000001', week_number: 2, day_of_week: 4, exercises: [] };
    servedPlan = { ...plan, days: [settled, open] };
    await mount();
    await act(async () => renderer.root.findByType(TrainingWeekStrip).props.onSelect(settled.id));
    await expandFirst();
    expect(renderer.root.findAllByType(HoldToCompleteButton)).toHaveLength(0);
    expect(renderer.root.findAllByType(VideoAttachmentControls)).toHaveLength(0);
    expect(renderer.root.findAll(node => node.props.onPress && node.props.accessibilityRole === 'checkbox')).toHaveLength(0);
    expect(renderer.root.findAll(node => node.props.onPress && node.props.accessibilityLabel === 'Edit set 1').every(node => node.props.disabled)).toBe(true);
    expect(copy()).not.toContain(t('student.added.addSet'));
    expect(copy()).not.toContain(t('student.added.addExercise'));
    expect(copy().includes(t('student.todayWorkoutScreen.copy023'))).toBe(undo);
    expect(jest.mocked(authenticatedRequest).mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(0);
  },
);


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


test('completion moves the current highlight to the next exercise even when it has no rows', async () => {
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


test('empty switched effort returns to coach type, but entered RPE keeps its actual unit', async () => {
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
  expect(copy()).toContain('RIR —');
  await press('Edit set 1');
  await act(async () => renderer.root.findAll(node => node.props.onPress && !node.props.disabled &&
    node.findAllByType(Text).some(text => text.props.children === 'RIR'))[0].props.onPress());
  await act(async () => renderer.root.findByType(NumberPad).props.onChangeText('8'));
  await act(async () => renderer.root.findByType(NumberPad).props.onCancel());
  expect(copy()).toContain('RPE 8');
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


test('summary columns reserve missing load and use the same typography for RPE and weights', async () => {
  const weighted = plan.days[0].exercises[0];
  const intensity = { ...weighted, id: '50000000-0000-4000-8000-000000000002', sort_order: 1,
    sets: [{ ...weighted.sets[0], id: '70000000-0000-4000-8000-000000000002', load_mode: 'rpe' as const, target_rpe: '8', target_value: null }] };
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [weighted, intensity] }] };
  await mount();
  const cell = (field: string, id: string) => renderer.root.findAllByType(Text).find(node => node.props.testID === `all-day-${field}-${id}-0`)!;
  expect(cell('load', intensity.id).findAllByType(Text).map(node => node.props.children).flat()).toContain('—');
  expect(cell('effort', intensity.id).props.children).toBe('RPE\u00a08');
  expect(cell('effort', weighted.id).props.children).toBe('RPE\u00a0—');
  const style = (field: string, id: string) => StyleSheet.flatten(cell(field, id).props.style);
  expect(style('effort', intensity.id)).toEqual({ ...style('load', weighted.id), color: '#9A4A06' });
  expect(style('effort', weighted.id).color).toBe('#9A4A06');
  expect(style('reps', weighted.id)).toEqual(style('load', weighted.id));
  const title = renderer.root.findAllByType(Text).find(node => node.props.testID === `all-day-name-${weighted.id}`)!;
  expect(style('load', weighted.id).fontSize).toBeLessThan(StyleSheet.flatten(title.props.style).fontSize);
});

test('tapping the resting effort value selects effort directly and inline fields remain reachable', async () => {
  await mount();
  await expandFirst();
  const effort = renderer.root.findAll(node => typeof node.props.testID === 'string' && node.props.testID.startsWith('all-day-edit-effort-') && node.props.onPress)[0];
  expect(effort).toBeDefined();
  await act(async () => effort.props.onPress());
  expect(renderer.root.findByType(NumberPad).props.field).toBe('rpe');
  const inlineReps = renderer.root.findAll(node => node.props.accessibilityLabel === 'reps' && node.props.onPress)[0];
  await act(async () => inlineReps.props.onPress());
  expect(renderer.root.findByType(NumberPad).props.field).toBe('reps');
  expect(renderer.root.findByType(NumberPad).findAllByType(View)[0].props.pointerEvents).toBe('box-none');
  const beforeHelp = renderer.root.findByType(NumberPad).props.initialValue;
  await press(t('training.explainer.rpe.help'));
  expect(copy()).toContain(t('training.explainer.rpe.title'));
  await press(t('training.explainer.close'));
  expect(renderer.root.findByType(NumberPad).props.field).toBe('reps');
  expect(renderer.root.findByType(NumberPad).props.initialValue).toBe(beforeHelp);
});

test.each<[string | null, string, string | null]>([
  [null, '9', null], ['8', '8', null], ['8', '9', 'RPE 8'],
])('effort comparison requires a concrete different target: %s → %s', async (target, actual, expected) => {
  const exercise = plan.days[0].exercises[0];
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [{ ...exercise, sets: [{
    ...exercise.sets[0], load_mode: 'fixed_weight', target_rpe: target,
  }] }] }] };
  await mount();
  await expandFirst();
  await press('Edit set 1');
  await press('rpe');
  await act(async () => renderer.root.findByType(NumberPad).props.onChangeText(actual));
  await act(async () => renderer.root.findByType(NumberPad).props.onCancel());
  expect(copy()).toContain(`RPE ${actual}`);
  expect(copy()).not.toContain(t('training.allDay.original', ['—']));
  const original = t('training.allDay.original', ['RPE 8']);
  if (expected) {
    expect(copy()).toContain(original);
    const text = renderer.root.findAllByType(Text).find(node => node.props.children === original)!;
    expect(StyleSheet.flatten(text.props.style).fontSize).toBe(10);
  } else expect(copy()).not.toContain(original);
});

test('editing a set retains its camera control and supplies the edited values', async () => {
  await mount();
  await expandFirst();
  const camera = renderer.root.findByType(VideoAttachmentControls);
  const stableSetId = camera.props.stableSetId;
  await press('Edit set 1');
  expect(renderer.root.findAllByType(VideoAttachmentControls)).toHaveLength(1);
  await press('rpe');
  await act(async () => renderer.root.findByType(NumberPad).props.onChangeText('9'));
  const editingCamera = renderer.root.findByType(VideoAttachmentControls);
  expect(editingCamera).toBe(camera);
  expect(editingCamera.props.stableSetId).toBe(stableSetId);
  expect(editingCamera.props.buildLogRequest()).toMatchObject({
    plan_exercise_id: plan.days[0].exercises[0].id, set_index: 0, rpe: '9',
  });
  await press(t('student.videoAttachmentV3Controls.copy001'));
  expect(Alert.alert).toHaveBeenCalled();
});

test('the first exercise starts collapsed and checking each exercise expands the next one', async () => {
  const first = plan.days[0].exercises[0];
  const second = { ...first, id: '50000000-0000-4000-8000-000000000001', sort_order: 1,
    sets: [{ ...first.sets[0], id: '70000000-0000-4000-8000-000000000001', plan_exercise_id: '50000000-0000-4000-8000-000000000001' }] };
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [first, second] }] };
  await mount();
  const expanded = (id: string) => renderer.root.findAll(node => node.props.testID === `all-day-exercise-${id}` && node.props.onPress)[0].props.accessibilityState.expanded;
  const check = async (id: string) => {
    await act(async () => {
      renderer.root.findAll(node => node.props.testID === `all-day-check-${id}` && node.props.onPress)[0].props.onPress();
      await new Promise(resolve => setTimeout(resolve, 30));
    });
  };
  expect(expanded(first.id)).toBe(false); expect(expanded(second.id)).toBe(false);
  await expandFirst();
  expect(expanded(first.id)).toBe(true);
  await check(first.id);
  expect(expanded(first.id)).toBe(false); expect(expanded(second.id)).toBe(true);
  await check(second.id);
  expect(expanded(first.id)).toBe(false); expect(expanded(second.id)).toBe(false);
  await check(first.id);
  expect(expanded(first.id)).toBe(true); expect(expanded(second.id)).toBe(false);
});

test.each(['saved', 'failed'])('cancelling a pending check stays on that exercise after its save %s', async outcome => {
  const first = plan.days[0].exercises[0];
  const second = { ...first, id: '50000000-0000-4000-8000-000000000001', sort_order: 1,
    sets: [{ ...first.sets[0], id: '70000000-0000-4000-8000-000000000001', plan_exercise_id: '50000000-0000-4000-8000-000000000001' }] };
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [first, second] }] };
  await mount();
  await expandFirst();
  let release: (() => void) | undefined;
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce(() => new Promise<void>((resolve, reject) => { release = () => outcome === 'saved' ? resolve() : reject(new Error('Storage unavailable')); }));
  const check = () => renderer.root.findAll(node => node.props.testID === `all-day-check-${first.id}` && node.props.onPress)[0];
  try {
    await act(async () => { check().props.onPress(); await new Promise(resolve => setTimeout(resolve, 10)); });
    expect(release).toBeDefined();
    expect(check().props.accessibilityState.checked).toBe(true);
    await act(async () => check().props.onPress());
    await act(async () => { release!(); await new Promise(resolve => setTimeout(resolve, 30)); });
    expect(check().props.accessibilityState.checked).toBe(false);
    const expanded = (id: string) => renderer.root.findAll(node => node.props.testID === `all-day-exercise-${id}` && node.props.onPress)[0].props.accessibilityState.expanded;
    expect(expanded(first.id)).toBe(true); expect(expanded(second.id)).toBe(false);
  } finally { release?.(); }
});

test('entering different RPE values updates the weighted exercise summary after every set', async () => {
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => path === '/sets/log'
    ? { id: `90000000-0000-4000-8000-00000000000${(options?.body as { set_index: number }).set_index}`, logged_at: new Date().toISOString() } as never
    : original(path, options));
  const exercise = plan.days[0].exercises[0];
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [{ ...exercise, sets: [95, 100, 105, 110].map((weight, index) => ({
    ...exercise.sets[0], id: `70000000-0000-4000-8000-00000000000${index}`, set_number: index + 1, target_reps: 7, target_value: String(weight),
  })) }] }] };
  await mount();
  await expandFirst();
  for (const [index, rpe] of ['6', '7', '8', '8'].entries()) {
    await press(`Edit set ${index + 1}`);
    await press('rpe');
    await act(async () => renderer.root.findByType(NumberPad).props.onChangeText(rpe));
    await act(async () => renderer.root.findByType(NumberPad).props.onCancel());
    const effort = renderer.root.findAllByType(Text).find(node => node.props.testID === `all-day-effort-${exercise.id}-0`)!;
    expect(effort.props.children).toBe('RPE\u00a0' + ['6/—/—/—', '6/7/—/—', '6/7/8/—', '6/7/8/8'][index]);
  }
});


test('an empty exercise remembers an RIR choice after reopening the training page', async () => {
  const exercise = plan.days[0].exercises[0];
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => path === '/exercises'
    ? { exercises: [{ id: exercise.exercise_id, name: 'Row', name_en: 'Row', exercise_type: 'accessory' }] } as never
    : original(path, options));
  await mount();
  await expandFirst();
  await press('Edit set 1');
  await act(async () => renderer.root.findAll(node => node.props.onPress && !node.props.disabled &&
    node.findAllByType(Text).some(text => text.props.children === 'RPE'))[0].props.onPress());
  await act(async () => renderer.root.findByType(NumberPad).props.onCancel());
  expect(copy()).toContain('RIR —');
  await act(async () => renderer.unmount());
  await mount();
  expect(copy().map(text => text.replace(/\u00a0/g, ' '))).toContain('RIR —');
  await expandFirst();
  await press('Edit set 1');
  await press('rir');
  expect(renderer.root.findByType(NumberPad).props.field).toBe('rir');
});


test('adding an empty exercise loads its previous choice into summary, row and editor', async () => {
  const id = '60000000-0000-4000-8000-000000000009';
  await writeEffortChoice(studentId, id, 'rir');
  await mount();
  await act(async () => renderer.root.findByType(AllDayBody).props.onAddExercise());
  await act(async () => renderer.root.findByType(StudentExercisePicker).props.onSelect(id));
  const block = renderer.root.findByType(AllDayBody).props.sheet.exercises.at(-1);
  expect(block.rows[0].effortKind).toBe('rir');
  const summary = renderer.root.findAllByProps({ testID: `all-day-effort-${block.exercise.id}-0` })[0];
  expect(String(summary.props.children).replace(/\u00a0/g, ' ')).toBe('RIR —');
  await act(async () => renderer.root.findByType(AllDayBody).props.onExpand(block.exercise.id));
  await act(async () => renderer.root.findAll(node => node.props.testID === `all-day-edit-effort-${block.rows[0].stableSetId}` && node.props.onPress)[0].props.onPress());
  expect(renderer.root.findByType(NumberPad).props.field).toBe('rir');
});

function serveAccessoryWeights(weights = ['20', '20', '17.5']) {
  const exercise = plan.days[0].exercises[0];
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [{ ...exercise,
    sets: weights.map((_, index) => ({ ...exercise.sets[0], id: `70000000-0000-4000-8000-00000000000${index}`,
      set_number: index + 1, target_reps: 12, load_mode: 'rpe', target_rpe: '8', intensity_mode: 'rpe', target_value: '8' })),
  }] }] };
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === '/exercises') return { exercises: [{ id: exercise.exercise_id, name: 'Row', name_en: 'Row', exercise_type: 'accessory' }] } as never;
    if (path.includes('/sets?') && path.includes('from=1970-01-01')) return { logs: weights.map((weight, index) => ({
      id: `90000000-0000-4000-8000-00000000000${index}`, student_id: studentId,
      plan_exercise_id: '50000000-0000-4000-8000-000000000009', exercise_id: exercise.exercise_id,
      set_index: index, weight_kg: weight, reps: 10, rpe: '7', completed: true, failed: false,
      assumed: false, adhoc: false, logged_date: '2026-09-01', logged_at: '2026-09-01T12:00:00Z',
    })) } as never;
    return original(path, options);
  });
}

test('109 accessory history starts compact, opening shows weight-only history and dismissing writes nothing', async () => {
  serveAccessoryWeights();
  await mount();
  expect(renderer.root.findByType(AllDayBody).props.sheet.exercises[0].rows.map((row: { weightText: string }) => row.weightText))
    .toEqual(['20', '20', '17.5']);
  expect(renderer.root.findAllByType(NumberPad)).toHaveLength(0);
  expect(copy().filter(text => text.startsWith('Last'))).toEqual([]);
  await expandFirst();
  const weights = renderer.root.findAllByType(Text).filter(node => node.props.testID?.startsWith('all-day-weight-'));
  expect(weights).toHaveLength(3);
  expect(weights.every(node => StyleSheet.flatten(node.props.style).color === '#9A4A06')).toBe(true);
  await press('Edit set 1');
  expect(copy().filter(text => text === 'Last')).toEqual(['Last']);
  const badge = renderer.root.findAllByType(Text).find(node => node.props.children === 'Last')!;
  expect(badge.parent!.findAllByType(Text).map(node => node.props.children)).toEqual(['20', 'Last']);
  expect(StyleSheet.flatten(badge.parent!.props.style).flexDirection).toBe('row');
  expect(renderer.root.findByType(NumberPad).props.initialValue).toBe('20');
  await act(async () => renderer.root.findByType(NumberPad).props.onCancel());
  expect(jest.mocked(authenticatedRequest).mock.calls.filter(([path]) => path === '/sets/log')).toHaveLength(0);
  expect(jest.mocked(authenticatedRequest).mock.calls.filter(([path]) => path.endsWith('/weight-suggestions'))).toHaveLength(0);
});

test('109 changing one history weight clears its gold and preserves other groups and the HTTP contract', async () => {
  serveAccessoryWeights();
  await mount();
  await expandFirst();
  await press('Edit set 1');
  await act(async () => renderer.root.findByType(NumberPad).props.onChangeText('22.5'));
  const weightField = renderer.root.findAll(node => node.props.accessibilityLabel === 'weight' && node.props.onPress)[0];
  expect(StyleSheet.flatten(weightField.findAllByType(Text)[0].props.style).color).toBe('#111827');
  expect(copy().filter(text => text.startsWith('Last'))).toEqual([]);
  await act(async () => renderer.root.findByType(NumberPad).props.onCancel());
  expect(renderer.root.findByType(AllDayBody).props.sheet.exercises[0].rows.map((row: { weightText: string }) => row.weightText))
    .toEqual(['22.5', '20', '17.5']);
  const compactWeights = renderer.root.findAllByType(Text).filter(node => node.props.testID?.startsWith('all-day-weight-'));
  expect(compactWeights.map(node => StyleSheet.flatten(node.props.style).color)).toEqual(['#111827', '#9A4A06', '#9A4A06']);
  const writes = jest.mocked(authenticatedRequest).mock.calls.filter(([path]) => path === '/sets/log');
  expect(writes.length).toBeGreaterThan(0);
  expect(writes[0][1]?.body).toMatchObject({ weight_kg: '22.5', completed: true });
  for (const key of ['previousWeightKg', 'weightPrefilledFromHistory', 'weightEdited']) expect(writes[0][1]?.body).not.toHaveProperty(key);
});

test('109 pound history uses the displayed unit and includes earlier sessions today in the exclusive query range', async () => {
  serveAccessoryWeights();
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path.endsWith('/onboarding')) return { unit_preference: 'lb' } as never;
    const result = await original(path, options);
    if (path.includes('from=1970-01-01')) return { logs: (result as { logs: Record<string, unknown>[] }).logs.map(log => ({ ...log, logged_date: gymDayToday() })) } as never;
    return result;
  });
  await mount();
  await expandFirst();
  await press('Edit set 1');
  expect(renderer.root.findByType(NumberPad).props.initialValue).toBe('44.1');
  expect(copy().filter(text => text === 'Last')).toEqual(['Last']);
  const historyPath = jest.mocked(authenticatedRequest).mock.calls.find(([path]) => path.includes('from=1970-01-01'))![0];
  expect(new URL(historyPath, 'https://fixture.test').searchParams.get('to')! > gymDayToday()).toBe(true);
});

test('109 late history cannot overwrite a manually cleared weight', async () => {
  serveAccessoryWeights();
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  let deliver!: () => void;
  const waiting = new Promise<void>(resolve => { deliver = resolve; });
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path.includes('from=1970-01-01')) await waiting;
    return original(path, options);
  });
  await mount();
  await expandFirst();
  await press('Edit set 1');
  await act(async () => renderer.root.findByType(NumberPad).props.onChangeText(''));
  await act(async () => renderer.root.findByType(NumberPad).props.onCancel());
  await act(async () => { deliver(); await new Promise(resolve => setTimeout(resolve, 30)); });
  expect(renderer.root.findByType(AllDayBody).props.sheet.exercises[0].rows.map((row: { weightText: string }) => row.weightText))
    .toEqual(['', '20', '17.5']);
  expect(jest.mocked(authenticatedRequest).mock.calls.filter(([path]) => path === '/sets/log').at(-1)?.[1]?.body)
    .toMatchObject({ weight_kg: null });
});

test('109 retains the existing gold comparison when an accessory coach weight is changed', async () => {
  serveAccessoryWeights();
  servedPlan.days[0].exercises[0].sets[0] = { ...servedPlan.days[0].exercises[0].sets[0],
    load_mode: 'fixed_weight', target_weight: '22.5' };
  await mount();
  await expandFirst();
  await press('Edit set 1');
  expect(renderer.root.findByType(NumberPad).props.initialValue).toBe('22.5');
  expect(copy().filter(text => text.startsWith('Last'))).toEqual([]);
  await act(async () => renderer.root.findByType(NumberPad).props.onChangeText('25'));
  await act(async () => renderer.root.findByType(NumberPad).props.onCancel());
  const weight = renderer.root.findAllByType(Text).find(node => node.props.testID?.startsWith('all-day-weight-'))!;
  expect(StyleSheet.flatten(weight.props.style).color).toBe('#9A4A06');
});

test.each(['bodyweight', 'pct', 'weight_range'] as const)('109 leaves %s editors free of history hints', async load_mode => {
  serveAccessoryWeights();
  servedPlan.days[0].exercises[0].sets[0] = { ...servedPlan.days[0].exercises[0].sets[0],
    load_mode, target_pct: '70', weight_low: '22.5', weight_high: '25' };
  await mount();
  await expandFirst();
  await press('Edit set 1');
  expect(copy().filter(text => text.startsWith('Last'))).toEqual([]);
});

test.each<[string, string]>([['reps', '13'], ['rpe', '9']])('109 saving only %s removes history provenance while the editor stays open', async (field, value) => {
  serveAccessoryWeights();
  await mount();
  await expandFirst();
  await press('Edit set 1');
  expect(copy()).toContain('Last');
  await press(field);
  await act(async () => renderer.root.findByType(NumberPad).props.onChangeText(value));
  expect(renderer.root.findByType(NumberPad).props.field).toBe(field);
  expect(copy().filter(text => text.startsWith('Last'))).toEqual([]);
  const weightField = renderer.root.findAll(node => node.props.accessibilityLabel === 'weight' && node.props.onPress)[0];
  expect(weightField.findAllByType(Text)[0].props.children).toBe('20');
  expect(StyleSheet.flatten(weightField.findAllByType(Text)[0].props.style).color).toBe('#111827');
});
