import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { authenticatedRequest, useSessionStore } from '@/api/session';
import type { PlanDetail } from '@/api/domains/plans';
import { setLocaleOverride } from '@/i18n';
import { spacing } from '@/design';
import { NumberPad } from '@/design/NumberPad';
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
afterEach(async () => {
  act(() => renderer?.unmount());
  client.clear();
  useSessionStore.setState({ user: null });
  setLocaleOverride(null);
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

}

test.each(['accessory', 'main_lift'].flatMap(kind => [0, 2, 5].map(position => ({ kind, position }))))(
  '105 reveals the active row above the pad: $kind card $position, then removes its inset', async ({ kind, position }) => {
    await mountCards(kind, position);
    const exerciseId = servedPlan.days[0].exercises[position].id;
    const header = renderer.root.findAll(node => node.props.testID === `all-day-exercise-${exerciseId}` && node.props.onPress)[0];
    if (!header.props.accessibilityState.expanded) await act(async () => header.props.onPress());
    expect(renderer.root.findAllByType(TextInput).filter(node => node.props.editable !== false)).toHaveLength(0);
    const scroll = renderer.root.findAllByType(ScrollView)[0];
    const nativeScroll = scroll.find(node => typeof node.instance?.getNativeScrollRef === 'function').instance.getNativeScrollRef();
    jest.spyOn(nativeScroll, 'measureInWindow').mockImplementation((...args: unknown[]) => {
      (args[0] as (x: number, y: number, width: number, height: number) => void)(0, 120, 400, 680);
    });
    const rows = renderer.root.findAllByType(View).filter(node => node.props.testID?.startsWith('all-day-row-'));
    expect(rows.length).toBeGreaterThan(0);
    const contentY = position * 400 + 600;
    let offset = position * 400;
    const padding = () => StyleSheet.flatten(scroll.props.contentContainerStyle).paddingBottom;
    const originalPadding = padding();
    const scrollTo = jest.spyOn(Commands, 'scrollTo').mockImplementation((_view, _x, y) => {
      offset = Math.min(y, Math.max(0, contentY + 120 + padding() - 680));
    });
    for (const row of rows) {
      jest.spyOn(row.instance, 'measureLayout').mockImplementation((...args: unknown[]) => {
        (args[1] as (x: number, y: number, width: number, height: number) => void)(0, contentY, 400, 52);
      });
      jest.spyOn(row.instance, 'measureInWindow').mockImplementation((...args: unknown[]) => {
        (args[0] as (x: number, y: number, width: number, height: number) => void)(0, 120 + contentY - offset, 400, 52);
      });
    }
    await act(async () => renderer.root.findAll(node => node.props.accessibilityLabel === 'Edit set 1' && node.props.onPress)[0].props.onPress());
    const pad = () => renderer.root.findByType(NumberPad);
    await act(async () => pad().props.onPanelLayout(500, 300));
    await act(async () => scroll.props.onContentSizeChange(400, contentY + 120 + padding()));
    expect(120 + contentY + 52 - offset).toBeLessThanOrEqual(500 - spacing.lg);
    expect(120 + contentY - offset).toBeGreaterThanOrEqual(120);
    await act(async () => pad().props.onNext(7.5));
    await act(async () => pad().props.onPanelLayout(500, 300));
    expect(120 + contentY + 52 - offset).toBeLessThanOrEqual(500 - spacing.lg);
    scrollTo.mockClear();
    await act(async () => pad().props.onCancel());
    expect(padding()).toBe(originalPadding);
    expect(scrollTo).not.toHaveBeenCalled();
  },
);
