import { afterEach, beforeEach, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { exercisesRepository, feedbackRepository, onboardingRepository, plansRepository, setsRepository, type SetLog } from '@/api/domains';
import { trainingE1RMRepository } from '@/features/training/storage';
import { setLocaleOverride } from '@/i18n';
import { LIFT_FAMILIES } from '../model';
import type { E1RMHistoryPoint, LiftFamily } from '@/domain/e1rm';

jest.mock('react-native-safe-area-context', () => (jest.requireActual('react-native-safe-area-context/jest/mock') as { default: unknown }).default);
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/api/session', () => ({ useSessionStore: (selector: (state: { user: { id: string } }) => unknown) => selector({ user: { id: 'student' } }) }));
export const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: mockNavigate, push: mockNavigate, back: mockNavigate }), useFocusEffect: (callback: () => void) => { const React = jest.requireActual<typeof import('react')>('react'); React.useEffect(callback, [callback]); } }));
jest.mock('@/analytics', () => ({ AnalyticsScreen: {}, AnalyticsEvent: { ProgressViewed: 'ProgressViewed' }, screen: jest.fn(), track: jest.fn() }));

export let renderer: ReactTestRenderer;
let client: QueryClient;
export const textOf = (node: { children: readonly unknown[] }): string => node.children.map(child => typeof child === 'string' ? child : child && typeof child === 'object' && 'children' in child ? textOf(child as { children: unknown[] }) : '').join('');
export const texts = () => renderer.root.findAllByType(Text).map(textOf);
export const buttons = () => renderer.root.findAll(node => node.props.accessibilityRole === 'button', { deep: false });
export const button = (label: string) => buttons().find(node => node.props.accessibilityLabel === label || textOf(node) === label)!;
export async function render(element: ReactElement) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  await act(async () => { renderer = create(<QueryClientProvider client={client}>{element}</QueryClientProvider>); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
}
export function seedPoints(count = 3, families: readonly LiftFamily[] = LIFT_FAMILIES, old = false) {
  const now = new Date();
  const points = families.flatMap((family, familyIndex) => Array.from({ length: count }, (_, index): E1RMHistoryPoint => ({
    id: `${family}-${index}`, studentId: 'student', exerciseId: family, setLogId: `${family}-${index}`,
    computedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - (old ? 50 : 5) + index, 12),
    e1RMKg: 100 + familyIndex * 50 + index * 5, sourceWeightKg: 100, sourceReps: 1, sourceRPE: 10,
    origin: 'logged', confidence: 'normal',
  })));
  jest.mocked(trainingE1RMRepository.historySnapshot).mockResolvedValue({ points, revision: 0 });
  return points;
}
export function seedLogs() {
  const logs = ['2026-08-01', '2026-08-02', '2026-08-03'].map((date, index): SetLog => ({ id: String(index), student_id: 'student', plan_exercise_id: null, exercise_id: 'squat', set_index: 0, weight_kg: '100', reps: 5, rpe: '8', completed: true, failed: false, assumed: false, adhoc: true, logged_date: date, logged_at: `${date}T12:00:00Z` }));
  jest.mocked(setsRepository.range).mockResolvedValue({ logs });
}
beforeEach(() => {
  setLocaleOverride('en');
  mockNavigate.mockReset();
  jest.spyOn(plansRepository, 'list').mockResolvedValue({ plans: [] });
  jest.spyOn(setsRepository, 'range').mockResolvedValue({ logs: [] });
  jest.spyOn(exercisesRepository, 'list').mockResolvedValue({ exercises: LIFT_FAMILIES.map(family => ({ id: family, name: family, name_en: family, exercise_type: 'strength', main_lift_family: family, is_competition_lift: true, competition_stance: null, muscle_groups: null, equipment: null, movement_pattern: null, created_by_coach_id: null, created_at: '2026-01-01' })) });
  jest.spyOn(onboardingRepository, 'get').mockResolvedValue(null);
  jest.spyOn(feedbackRepository, 'list').mockResolvedValue({ items: [] });
  jest.spyOn(trainingE1RMRepository, 'historySnapshot').mockResolvedValue({ points: [], revision: 0 });
  jest.spyOn(trainingE1RMRepository, 'replaceHistoryIfUnchanged').mockResolvedValue(true);
});
afterEach(() => {
  if (renderer) act(() => renderer.unmount());
  client?.clear();
  jest.restoreAllMocks();
  setLocaleOverride(null);
});
