import AsyncStorage from '@react-native-async-storage/async-storage';
import { readReview } from '../storage';
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { useSetRefStagingStore } from '@/features/chat/set-ref-staging';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ApiError } from '@/api/client';
import { AccessibilityInfo, Alert, AppState, Keyboard, ScrollView, Text, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { authenticatedRequest, useSessionStore } from '@/api/session';
import type { PlanDetail } from '@/api/domains/plans';
import { setLocaleOverride, t } from '@/i18n';
import { HoldToCompleteButton } from '../HoldToCompleteButton';
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
  jest.useRealTimers();
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
  expect(copy()).toContain(t('chat.whichSet'));
  await press(t('chat.sendToCoach'));
  expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/(student)/chat', params: { conversationId, coachName: 'Alex' } });
  expect(useSetRefStagingStore.getState().intents[conversationId]).toMatchObject({ setRef: { source: 'planned', planSetId: plan.days[0].exercises[0].sets[0].id } });
});
test('Ask coach conversation failure uses the training share alert and stays on Training', async () => {
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === '/bind-requests/mine') return { bind_request: { status: 'accepted', coach_id: '80000000-0000-4000-8000-000000000000', coach_display_name: 'Alex' } } as never;
    if (path === '/conversations') { if (options?.method === 'POST') throw new Error('offline'); return { conversations: [] } as never; }
    if (path.endsWith('/videos')) return { videos: [] } as never;
    // Exercise the share failure while a current hero exists (090 removes it once all sets are done).
    if (path.includes('/sets?')) return { logs: [] } as never;
    return original(path, options);
  });
  await mount(); await press(t('student.askCoach'));
  expect(Alert.alert).toHaveBeenCalledWith(t('student.trainingShareConversationFailed'));
  expect(mockNavigate).not.toHaveBeenCalled();
});

function delayCompletion() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const gate = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path.endsWith('/complete') && options?.method === 'POST') await gate;
    return original(path, options);
  });
  return { resolve, reject, restore: () => jest.mocked(authenticatedRequest).mockImplementation(original) };
}

const complete = async () => {
  await act(async () => {
    renderer.root.findAllByProps({ accessibilityLabel: t('student.todayWorkoutScreen.copy022') })[0].props.onAccessibilityAction();
  });
};

test('completion immediately celebrates while sending, then acknowledges the coach after success', async () => {
  const request = delayCompletion();
  await mount();
  await complete();
  expect(copy()).toContain(t('student.workoutCompletionFlowView.copy001'));
  expect(copy()).toContain('Sending to your coach…');
  expect(copy()).not.toContain('Your coach received your training log');
  await act(async () => { request.resolve(); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  expect(copy()).toContain('Your coach received your training log');
  expect(copy()).not.toContain('Sending to your coach…');
});

const expectRetryable = () => {
  expect(copy()).not.toContain(t('student.workoutCompletionFlowView.copy001'));
  expect(copy()).not.toContain(t('student.todayWorkoutScreen.copy024'));
  expect(renderer.root.findAllByProps({ accessibilityLabel: t('student.todayWorkoutScreen.copy022') })[0].props.accessibilityState.disabled).toBe(false);
  expect(copy()).toContain('80');
  expect(Alert.alert).toHaveBeenCalledWith(t('student.todayWorkoutScreen.copy001'), t('student.todayWorkoutViewModel.copy001'));
};

test('a 503 closes celebration, restores completion eligibility and keeps the recorded set for retry', async () => {
  const request = delayCompletion();
  await mount();
  await complete();
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  expect(copy()).toContain(t('student.todayWorkoutScreen.copy024'));
  await act(async () => { request.reject(new ApiError('server', 'Unavailable', { status: 503 })); });
  expectRetryable();
  request.restore();
  await complete();
  expect(copy()).toContain('Your coach received your training log');
});

test('30 seconds without a response closes celebration and rolls back, ignoring late success', async () => {
  const request = delayCompletion();
  await mount();
  jest.useFakeTimers();
  await complete();
  await act(async () => { await jest.advanceTimersByTimeAsync(29_999); });
  expect(copy()).toContain('Sending to your coach…');
  expect(copy()).toContain(t('student.todayWorkoutScreen.copy024'));
  await act(async () => { await jest.advanceTimersByTimeAsync(1); });
  expectRetryable();
  await act(async () => { request.resolve(); await jest.advanceTimersByTimeAsync(1); });
  expectRetryable();
});

test('coach receipt follows the completion response without waiting for the plan refresh', async () => {
  const request = delayCompletion();
  await mount();
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  let releaseRefresh!: () => void;
  const refresh = new Promise<void>(resolve => { releaseRefresh = resolve; });
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === `/plans/${plan.id}`) await refresh;
    return original(path, options);
  });
  await complete();
  await act(async () => { request.resolve(); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  try {
    expect(copy()).toContain('Your coach received your training log');
    expect(copy()).not.toContain('Sending to your coach…');
  } finally {
    await act(async () => { releaseRefresh(); });
  }
});


test('failure after leaving celebration rolls back without reopening it or losing recorded sets', async () => {
  const request = delayCompletion();
  await mount();
  await complete();
  await press(t('student.workoutCompletionFlowView.copy003'));
  expect(mockNavigate).toHaveBeenCalledWith('/(student)/today');
  await act(async () => { request.reject(new Error('Offline')); });
  expectRetryable();
});

test('Chinese celebration shows sending until the completion response', async () => {
  setLocaleOverride('zh');
  const request = delayCompletion();
  await mount();
  await complete();
  expect(copy()).toContain('正在发送给教练…');
  await act(async () => { request.resolve(); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  expect(copy()).toContain('教练已收到你的训练日志');
  expect(copy()).not.toContain('正在发送给教练…');
});

test.each([
  [7, 'Current week', 'Current week'],
  [8, '1 day behind', '1 day behind schedule'],
  [25, '18 days behind', '18 days behind schedule'],
])('training header shows cursor status on September %i', async (date, label, accessibility) => {
  jest.useFakeTimers({ now: new Date(2026, 8, date, 12), doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask'] });
  servedPlan = { ...plan, start_date: '2026-09-07' };
  await mount();
  expect(copy()).toContain(label);
  expect(renderer.root.findAllByProps({ accessibilityLabel: accessibility }).length).toBeGreaterThan(0);
  expect(copy()).toContain('W1');
  expect(copy()).toContain('Training history');
});

test.each(['focus', 'foreground'])('training header recalculates after 4am on %s without waiting for its minute tick', async (event) => {
  jest.useFakeTimers({ now: new Date(2026, 8, 8, 3, 59, 59), doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask'] });
  const appState = jest.spyOn(AppState, 'addEventListener');
  servedPlan = { ...plan, start_date: '2026-09-07' };
  await mount();
  expect(copy()).toContain('Current week');
  jest.setSystemTime(new Date(2026, 8, 8, 4));
  const cleanups: (() => void)[] = [];
  await act(async () => {
    if (event === 'foreground') {
      appState.mock.calls.filter(([type]) => type === 'change').forEach(([, listener]) => listener('active'));
    } else {
      const callbacks = new Set(jest.mocked(useFocusEffect).mock.calls.map(([callback]) => callback));
      callbacks.forEach(callback => { const cleanup = callback(); if (cleanup) cleanups.push(cleanup); });
    }
  });
  try {
    expect(copy()).toContain('1 day behind');
    expect(copy()).not.toContain('Current week');
  } finally {
    act(() => cleanups.forEach(cleanup => cleanup()));
  }
});

test('browsing a completed week keeps Completed instead of the overdue cursor count', async () => {
  servedPlan = { ...plan, days: [
    { ...plan.days[0], completed_at: '2026-09-01T12:00:00Z' },
    { ...plan.days[0], id: 'current-week-two', week_number: 2 },
  ] };
  await mount();
  await press('Previous week');
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  expect(copy()).toContain('Completed');
  expect(copy().some(text => text.includes('days behind'))).toBe(false);
});


test('returning to the current training day on blur scrolls to the top once without animation', async () => {
  servedPlan = { ...plan, days: [
    { ...plan.days[0], completed_at: '2026-09-01T12:00:00Z' },
    { ...plan.days[0], id: 'current-day', day_of_week: 3, sort_order: 1 },
  ] };
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {}).mockClear();
  await mount();
  const cleanups: (() => void)[] = [];
  await act(async () => {
    const callbacks = new Set(jest.mocked(useFocusEffect).mock.calls.map(([callback]) => callback));
    callbacks.forEach(callback => { const cleanup = callback(); if (cleanup) cleanups.push(cleanup); });
  });
  const dayButton = (code: string) => renderer.root.findAll(node =>
    node.props.accessibilityRole === 'button' && node.props.accessibilityLabel?.startsWith(`${code},`))[0];
  try {
    expect(dayButton('W1D2').props.accessibilityState.selected).toBe(true);
    await act(async () => { dayButton('W1D1').props.onPress(); });
    expect(dayButton('W1D1').props.accessibilityState.selected).toBe(true);
    scrollTo.mockClear();
  } finally {
    await act(async () => { cleanups.forEach(cleanup => cleanup()); });
  }
  expect(dayButton('W1D2').props.accessibilityState.selected).toBe(true);
  expect(scrollTo).toHaveBeenCalledTimes(1);
  expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
});

test('initial training day load and same-day rerenders do not scroll', async () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {}).mockClear();
  await mount();
  expect(renderer.root.findAllByType(ScrollView).length).toBeGreaterThan(0);
  expect(scrollTo).not.toHaveBeenCalled();
  await act(async () => {
    renderer.update(<QueryClientProvider client={client}><TodayWorkoutView /></QueryClientProvider>);
  });
  await act(async () => { await client.invalidateQueries(); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  expect(scrollTo).not.toHaveBeenCalled();
});

test('090 all done docks exactly one completion control outside the scroll content', async () => {
  await mount();
  expect(renderer.root.findAllByProps({ testID: 'workout-hero' })).toHaveLength(0);
  expect(renderer.root.findAllByType(HoldToCompleteButton)).toHaveLength(1);
  expect(renderer.root.findAllByType(ScrollView)[0].findAllByType(HoldToCompleteButton)).toHaveLength(0);
  expect(renderer.root.findAllByProps({ testID: 'workout-completion-dock' })[0].findAllByType(HoldToCompleteButton)).toHaveLength(1);
});

test('090 undoing a recorded set restores the hero and returns the single completion control to the scroll content', async () => {
  const exercise = plan.days[0].exercises[0];
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [{ ...exercise, sets: [exercise.sets[0], { ...exercise.sets[0], id: '70000000-0000-4000-8000-000000000001', set_number: 2 }] }] }] };
  let undone = false;
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === '/sets/log') {
      undone = true;
      return { id: '80000000-0000-4000-8000-000000000000', logged_at: new Date().toISOString() } as never;
    }
    if (path.includes('/sets?')) return { logs: [0, 1].map(set_index => ({
      id: `80000000-0000-4000-8000-00000000000${set_index}`, student_id: studentId,
      plan_exercise_id: exercise.id, exercise_id: exercise.exercise_id, set_index, weight_kg: '80', reps: 5, rpe: '8',
      completed: !(undone && set_index === 0), failed: false, assumed: false, adhoc: false,
      logged_date: '2026-09-01', logged_at: '2026-09-01T12:00:00Z',
    })) } as never;
    return original(path, options);
  });
  await mount();
  expect(renderer.root.findAllByProps({ testID: 'workout-hero' })).toHaveLength(0);
  const completed = renderer.root.findAll(node => node.props.onPress && node.props.accessibilityLabel?.includes(', completed, 2 sets'))[0];
  await act(async () => completed.props.onPress());
  const toggle = renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === t('student.todayWorkoutScreen.copy015'))[0];
  await act(async () => toggle.props.onPress({ stopPropagation: () => {} }));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  expect(renderer.root.findAllByProps({ testID: 'workout-hero' }).length).toBeGreaterThan(0);
  expect(renderer.root.findAllByProps({ testID: 'workout-completion-dock' })).toHaveLength(0);
  expect(renderer.root.findAllByType(HoldToCompleteButton)).toHaveLength(1);
  expect(renderer.root.findAllByType(ScrollView)[0].findAllByType(HoldToCompleteButton)).toHaveLength(1);
  expect(copy()).toContain(t('student.todayWorkoutPresentation.copy001', [1, 1]));
});


test.each([
  { name: 'first completion', restored: [], newly: [0], targetY: 228 },
  { name: 'batch completion in plan order, before a previously completed later row', restored: [0, 3], newly: [2, 1], targetY: 336 },
  { name: 'last exercise with no hero remaining', restored: [0, 1, 2, 3], newly: [4], targetY: 444 },
  { name: 'reduced motion', restored: [0], newly: [1], targetY: 282, reduced: true },
  { name: 'keyboard already open', restored: [0], newly: [1], blocked: 'keyboard-before' },
  { name: 'keyboard opens before layout', restored: [0], newly: [1], blocked: 'keyboard-after' },
  { name: 'user dragging', restored: [0], newly: [1], blocked: 'drag-before' },
  { name: 'user starts dragging before layout', restored: [0], newly: [1], blocked: 'drag-after' },
  { name: 'momentum scrolling', restored: [0], newly: [1], blocked: 'momentum-before' },
])('090 completed-row scroll: $name', async ({ restored, newly, targetY, reduced = false, blocked }) => {
  const exercise = plan.days[0].exercises[0];
  const exercises = Array.from({ length: 5 }, (_, index) => ({
    ...exercise, id: `exercise-${index}`, sort_order: index,
    sets: [{ ...exercise.sets[0], id: `set-${index}`, plan_exercise_id: `exercise-${index}` }],
  }));
  // Input order deliberately differs from plan order.
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises: [exercises[3], exercises[0], exercises[4], exercises[2], exercises[1]] }] };
  let recorded = restored;
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path.includes('/sets?')) return { logs: recorded.map(index => ({
      id: `log-${index}`, student_id: studentId, plan_exercise_id: exercises[index].id,
      exercise_id: exercise.exercise_id, set_index: 0, weight_kg: '80', reps: 5, rpe: '8',
      completed: true, failed: false, assumed: false, adhoc: false,
      logged_date: '2026-09-01', logged_at: '2026-09-01T12:00:00Z',
    })) } as never;
    return original(path, options);
  });
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduced);
  let keyboardOpen = false;
  jest.spyOn(Keyboard, 'isVisible').mockImplementation(() => keyboardOpen);
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {}).mockClear();
  await mount();
  if (!restored.length) await press(t('student.todayWorkoutScreen.copy008'));
  const layoutCompletedRows = (indices: number[], rowsFirst = false) => {
    const section = renderer.root.findAllByProps({ testID: 'workout-completed-exercises' })[0];
    const sectionLayout = () => section?.props.onLayout({ nativeEvent: { layout: { x: 0, y: 240, width: 360, height: indices.length * 54 } } });
    if (!rowsFirst) sectionLayout();
    [...indices].sort((a, b) => a - b).forEach((index, order) => {
      const row = renderer.root.findAllByProps({ testID: `workout-completed-exercise-${index}` })[0];
      row?.props.onLayout({ nativeEvent: { layout: { x: 0, y: order * 54, width: 360, height: 48 } } });
    });
    if (rowsFirst) sectionLayout();
  };
  act(() => layoutCompletedRows(restored));
  expect(scrollTo).not.toHaveBeenCalled();
  const beginInteraction = () => {
    const scroll = renderer.root.findAllByType(ScrollView)[0];
    if (blocked?.startsWith('keyboard')) keyboardOpen = true;
    if (blocked?.startsWith('drag')) scroll.props.onScrollBeginDrag();
    if (blocked?.startsWith('momentum')) scroll.props.onMomentumScrollBegin();
  };
  if (blocked?.endsWith('before')) act(beginInteraction);
  recorded = [...restored, ...newly];
  await act(async () => { await client.invalidateQueries(); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  if (blocked?.endsWith('after')) act(beginInteraction);
  act(() => {
    const hero = renderer.root.findAllByProps({ testID: 'workout-hero' })[0];
    hero?.props.onLayout?.({ nativeEvent: { layout: { x: 0, y: 300, width: 360, height: 400 } } });
    layoutCompletedRows(recorded, true);
  });
  if (blocked) {
    expect(scrollTo).not.toHaveBeenCalled();
    keyboardOpen = false;
    act(() => {
      const scroll = renderer.root.findAllByType(ScrollView)[0];
      scroll.props.onScrollEndDrag();
      scroll.props.onMomentumScrollEnd();
      layoutCompletedRows(recorded);
    });
    expect(scrollTo).not.toHaveBeenCalled();
  } else {
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ y: targetY, animated: !reduced });
    act(() => layoutCompletedRows(recorded));
    expect(scrollTo).toHaveBeenCalledTimes(1);
  }
});
