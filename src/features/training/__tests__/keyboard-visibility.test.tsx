import AsyncStorage from '@react-native-async-storage/async-storage';
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, DeviceEventEmitter, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { authenticatedRequest, useSessionStore } from '@/api/session';
import type { PlanDetail } from '@/api/domains/plans';
import { setLocaleOverride, t } from '@/i18n';
import { spacing } from '@/design';
import { TodayWorkoutView } from '@/features/training/TodayWorkoutView';

const Commands = jest.requireActual<{ default: { scrollTo: (view: unknown, x: number, y: number, animated: boolean) => void } }>('react-native/Libraries/Components/ScrollView/ScrollViewCommands').default;

jest.unmock('react-native/Libraries/Components/ScrollView/ScrollView');
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

beforeEach(() => {
  setLocaleOverride('en');
  mockNavigate.mockClear();
  jest.mocked(useFocusEffect).mockClear();
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
    if (path === '/bind-requests/mine') return { bind_request: null } as never;
    if (path.includes('/readiness')) return { checkin: null } as never;
    throw new Error(`Unexpected request: ${path}`);
  });
});

const mount = async () => {
  await act(async () => { renderer = create(<QueryClientProvider client={client}><TodayWorkoutView /></QueryClientProvider>); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
};
const press = async (label: string) => {
  await act(async () => { renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label)[0].props.onPress(); });
};
afterEach(async () => {
  act(() => renderer?.unmount());
  client.clear();
  useSessionStore.setState({ user: null });
  setLocaleOverride(null);
  DeviceEventEmitter.emit('keyboardDidHide', {});
  jest.restoreAllMocks();
  jest.useRealTimers();
  await AsyncStorage.clear();
});


// The existing completion-entry suite uses RN's mock ScrollView. This suite
// runs its actual responder; only native geometry/commands and HTTP are faked.
async function mountCards(kind = 'accessory', position = 5) {
  const exercises = Array.from({ length: 6 }, (_, index) => {
    const exercise = plan.days[0].exercises[0];
    const id = `${exercise.id.slice(0, -1)}${index}`;
    return { ...exercise, id, exercise_id: `${exercise.exercise_id.slice(0, -1)}${index}`, sort_order: index,
      sets: [{ ...exercise.sets[0], id: `${exercise.sets[0].id.slice(0, -1)}${index}`, plan_exercise_id: id,
        ...(kind === 'main_lift' ? { load_mode: 'free_weight' as const } : {}) }] };
  });
  servedPlan = { ...plan, days: [{ ...plan.days[0], exercises }] };
  const original = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === '/exercises') return { exercises: exercises.map((exercise, index) => ({
      id: exercise.exercise_id, name: `Exercise ${index}`, name_en: `Exercise ${index}`,
      exercise_type: index === position ? kind : 'main_lift', main_lift_family: null,
      is_competition_lift: false, competition_stance: null,
    })) } as never;
    if (path.includes('/sets')) return { logs: exercises.slice(0, position).map(exercise => ({
      id: `log-${exercise.id}`, student_id: studentId, plan_exercise_id: exercise.id,
      exercise_id: exercise.exercise_id, set_index: 0, weight_kg: '80', reps: 5, rpe: '8',
      completed: true, failed: false, assumed: false, adhoc: false,
      logged_date: '2026-09-01', logged_at: '2026-09-01T12:00:00Z',
    })) } as never;
    return original(path, options);
  });
  await mount();
  if (position === 0) await press(t('student.todayWorkoutScreen.copy008'));
}

function nativeGeometry({ headerHeight = 120, initialOffset = 0, atEnd = false } = {}) {
  const scroll = renderer.root.findAllByType(ScrollView)[0];
  const nativeScroll = scroll.find(node => typeof node.instance?.getNativeScrollRef === 'function').instance.getNativeScrollRef();
  jest.spyOn(nativeScroll, 'measureInWindow').mockImplementation((...args: unknown[]) => {
    (args[0] as (x: number, y: number, width: number, height: number) => void)(0, headerHeight, 400, 680);
  });
  const inputs = renderer.root.findAllByType(TextInput);
  expect(inputs.length).toBeGreaterThan(0);
  const contentY = initialOffset + 600;
  let offset = initialOffset;
  const padding = () => StyleSheet.flatten(scroll.props.contentContainerStyle).paddingBottom;
  const scrollTo = jest.spyOn(Commands, 'scrollTo').mockImplementation((_view, _x, y) => {
    offset = atEnd ? Math.min(y, Math.max(0, contentY + 120 + padding() - 680)) : y;
    scroll.props.onScroll?.({ nativeEvent: { contentOffset: { x: 0, y: offset } } });
  });
  scroll.props.onScroll?.({ nativeEvent: { contentOffset: { x: 0, y: offset } } });
  for (const input of inputs) {
    jest.spyOn(input.instance, 'measureLayout').mockImplementation((...args: unknown[]) => {
      (args[1] as (x: number, y: number, width: number, height: number) => void)(0, contentY, 80, 44);
    });
    jest.spyOn(input.instance, 'measureInWindow').mockImplementation((...args: unknown[]) => {
      (args[0] as (x: number, y: number, width: number, height: number) => void)(0, headerHeight + contentY - offset, 80, 44);
    });
  }
  return { inputs, scrollTo, padding, bottom: () => headerHeight + contentY + 44 - offset,
    layout: () => scroll.props.onContentSizeChange?.(400, contentY + 120 + padding()),
    resetScroll: () => { offset = initialOffset; scroll.props.onScroll?.({ nativeEvent: { contentOffset: { x: 0, y: offset } } }); } };
}
async function showKeyboard(top = 500) {
  await act(async () => {
    DeviceEventEmitter.emit('keyboardDidShow', { duration: 0, easing: 'keyboard', endCoordinates: { screenX: 0, screenY: top, width: 400, height: 800 - top } });
    await new Promise(resolve => setTimeout(resolve, 10));
  });
}

test.each([
  { kind: 'accessory', position: 0, headerHeight: 0, atEnd: false },
  ...['accessory', 'main_lift'].flatMap(kind => [0, 2, 5].map(position => ({ kind, position, headerHeight: 120, atEnd: position === 5 }))),
])('Android reveals every inline input: $kind card $position, header=$headerHeight, end=$atEnd', async ({ kind, position, headerHeight, atEnd }) => {
  jest.replaceProperty(Platform, 'OS', 'android');
  await mountCards(kind, position);
  const scene = nativeGeometry({ headerHeight, atEnd, initialOffset: position * 400 });
  const normalPadding = scene.padding();
  for (const input of scene.inputs) {
    scene.resetScroll();
    await act(async () => { input.props.onFocus(); });
    await showKeyboard();
    await act(async () => { scene.layout(); });
    expect(scene.bottom()).toBeLessThanOrEqual(500 - spacing.lg);
    expect(scene.bottom() - 44).toBeGreaterThanOrEqual(headerHeight);
    await act(async () => { input.props.onBlur(); });
  }
  await act(async () => { DeviceEventEmitter.emit('keyboardDidHide', {}); });
  expect(scene.padding()).toBe(normalPadding);
});

test('Android reopens the keyboard on an input that retained focus after Back', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  await mountCards();
  const scene = nativeGeometry({ atEnd: true });
  await act(async () => { scene.inputs[0].props.onFocus(); });
  await showKeyboard();
  await act(async () => { scene.layout(); });
  await act(async () => { DeviceEventEmitter.emit('keyboardDidHide', {}); });
  scene.resetScroll();
  await showKeyboard();
  await act(async () => { scene.layout(); });
  expect(scene.bottom()).toBeLessThanOrEqual(476);
});

test('iOS retains its responder behavior and does not add Android keyboard padding', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  await mountCards();
  const scene = nativeGeometry();
  const normalPadding = scene.padding();
  await act(async () => { scene.inputs[0].props.onFocus(); });
  await showKeyboard();
  // The existing iOS responder receives spacing.lg unchanged. iOS owns its insets.
  expect(scene.scrollTo).toHaveBeenLastCalledWith(expect.anything(), 0, 168, true);
  expect(scene.padding()).toBe(normalPadding);
});

test('overlapping native measurements do not scroll the focused field above the viewport', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  await mountCards();
  const scene = nativeGeometry();
  const replies: (() => void)[] = [];
  jest.spyOn(scene.inputs[0].instance, 'measureInWindow').mockImplementation((...args: unknown[]) => {
    const callback = args[0] as (x: number, y: number, width: number, height: number) => void;
    const measuredY = scene.bottom() - 44;
    replies.push(() => callback(0, measuredY, 80, 44));
  });
  await act(async () => { scene.inputs[0].props.onFocus(); });
  await showKeyboard(400);
  await act(async () => { scene.layout(); });
  expect(replies).toHaveLength(2);
  await act(async () => { replies.forEach(reply => reply()); });
  expect(scene.bottom() - 44).toBeGreaterThanOrEqual(120);
  expect(scene.bottom()).toBeLessThanOrEqual(376);
});
