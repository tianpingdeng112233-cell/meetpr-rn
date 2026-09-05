import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { exercisesRepository, feedbackRepository, onboardingRepository, plansRepository, setKeys, setsRepository, type SetLog } from '@/api/domains';
import { t, setLocaleOverride } from '@/i18n';
import { Eyebrow } from '@/design';
import { useStudentTabsStore } from '@/features/student-tabs';

import { GrowthScreen } from '../GrowthScreen';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/api/session', () => ({ useSessionStore: (selector: (state: { user: { id: string } }) => unknown) => selector({ user: { id: 'student' } }) }));
const mockNavigate = jest.fn();
const mockOpenCoachChat = jest.fn();
let mockChatUnread = 0;
// The growth header's message button is the coach-chat entry (iOS parity); the hook is exercised in chat tests.
jest.mock('@/features/chat/open-coach-chat', () => ({ useOpenCoachChat: () => ({ totalUnread: mockChatUnread, openCoachChat: mockOpenCoachChat, isOpening: false }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: mockNavigate, push: mockNavigate }), useFocusEffect: () => undefined }));
jest.mock('@/analytics', () => ({ AnalyticsScreen: {}, AnalyticsEvent: {}, screen: jest.fn(), track: jest.fn() }));

let renderer: ReactTestRenderer;
let client: QueryClient;
const textOf = (node: { children: readonly unknown[] }): string => node.children.map(child => typeof child === 'string' ? child : child && typeof child === 'object' && 'children' in child ? textOf(child as { children: unknown[] }) : '').join('');
function texts() { return renderer.root.findAllByType(Text).map(textOf); }
function buttons() { return renderer.root.findAll(node => node.props.accessibilityRole === 'button', { deep: false }); }
function button(label: string) { return buttons().find(node => node.props.accessibilityLabel === label || textOf(node).includes(label))!; }
async function render() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  await act(async () => { renderer = create(<QueryClientProvider client={client}><GrowthScreen /></QueryClientProvider>); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
}
beforeEach(() => {
  setLocaleOverride('en');
  mockChatUnread = 0;
  mockOpenCoachChat.mockReset();
  jest.spyOn(plansRepository, 'list').mockResolvedValue({ plans: [] });
  jest.spyOn(setsRepository, 'range').mockResolvedValue({ logs: [] });
  jest.spyOn(exercisesRepository, 'list').mockResolvedValue({ exercises: [] });
  jest.spyOn(onboardingRepository, 'get').mockResolvedValue(null);
  jest.spyOn(feedbackRepository, 'list').mockResolvedValue({ items: [] });
});
afterEach(() => {
  if (renderer) act(() => renderer.unmount());
  client?.clear();
  jest.restoreAllMocks();
  setLocaleOverride(null);
});

test('zero training shows the today action only on squat, locks history, and shows dashes in all three stats', async () => {
  await render();
  const today = t('student.growthEmptyStates.copy009');
  expect(buttons().filter(node => textOf(node).includes(today))).toHaveLength(1);
  expect(texts().indexOf(today)).toBeGreaterThan(texts().indexOf(`${t('student.growthCurveView.copy002')} E1RM`));
  expect(texts().indexOf(today)).toBeLessThan(texts().indexOf(`${t('student.growthCurveView.copy003')} E1RM`));
  expect(button(t('student.trainingHistoryView.copy004')).props.disabled).toBe(true);
  expect(texts()).toContain(t('student.trainingHistoryView.copy005'));
  for (const key of ['student.trainingHistoryView.copy018', 'student.trainingHistoryView.copy019', 'student.trainingHistoryView.copy020'] as const) {
    const label = renderer.root.findAllByType(Text).find(node => textOf(node) === t(key))!;
    expect(textOf(label.parent!)).toContain('—');
  }
  expect(texts()).toContain(t('student.volumeIntensityChart.copy003'));
  act(() => button(today).props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('/(student)/today');
});

test('three completed training days unlock the volume chart and history entry', async () => {
  jest.mocked(setsRepository.range).mockResolvedValue({ logs: ['2026-08-01', '2026-08-02', '2026-08-03'].map((date, index): SetLog => ({ id: String(index), student_id: 'student', plan_exercise_id: null, exercise_id: 'squat', set_index: 0, weight_kg: '100', reps: 5, rpe: '8', completed: true, failed: false, assumed: false, adhoc: true, logged_date: date, logged_at: `${date}T12:00:00Z` })) });
  await render();
  expect(texts()).not.toContain(t('student.volumeIntensityChart.copy003'));
  expect(renderer.root.findAll(node => node.props.accessibilityLabel === t('student.volumeIntensityChart.copy004', [2])).length).toBeGreaterThan(0);
  expect(button(t('student.trainingHistoryView.copy004')).props.disabled).toBe(false);
});

test('the squat range capsule cycles 30 days, 90 days, all history, and back using catalog labels', async () => {
  await render();
  const family = t('student.growthCurveView.copy002');
  for (const key of ['student.growthScreenPresentation.copy001', 'student.growthScreenPresentation.copy002', 'student.growthScreenPresentation.copy003', 'student.growthScreenPresentation.copy001'] as const) {
    const range = t(key);
    const capsule = button(t('student.growthE1Rmcard.copy001', [family, range]));
    expect(capsule).toBeDefined();
    expect(textOf(capsule)).toContain(range);
    act(() => capsule.props.onPress());
  }
});

test('header, sections, and feedback empty state use the selected catalog language', async () => {
  setLocaleOverride('zh');
  await render();
  for (const key of ['student.trainingHistoryView.copy013', 'student.trainingHistoryView.copy014', 'student.trainingHistoryView.copy009', 'student.trainingHistoryView.copy011'] as const) expect(texts()).toContain(t(key));
  expect(button(t('student.trainingHistoryView.copy009')).props.disabled).toBe(true);
});

test('growth header shows the wordmark and chat action before the title and subtitle, without Eyebrow', async () => {
  await render();
  expect(renderer.root.findByProps({ testID: 'growth-header-mark' })).toBeDefined();
  const chat = button(t('student.trainingHistoryView.copy012'));
  expect(chat).toBeDefined();
  expect(chat.props.accessibilityValue).toEqual({ text: '' });
  expect(texts().indexOf(t('student.trainingHistoryView.copy014'))).toBeGreaterThan(texts().indexOf(t('student.trainingHistoryView.copy013')));
  expect(renderer.root.findAllByType(Eyebrow)).toHaveLength(0);
  const previousJump = useStudentTabsStore.getState().feedbackJumpToken;
  act(() => chat.props.onPress());
  expect(mockOpenCoachChat).toHaveBeenCalledTimes(1);
  expect(useStudentTabsStore.getState().feedbackJumpToken).toBe(previousJump);
  expect(mockNavigate).not.toHaveBeenCalledWith('/(student)/growth');
});

test('pending data shows the catalog skeleton and a failed request takes priority with retry recovery', async () => {
  jest.mocked(exercisesRepository.list).mockReturnValue(new Promise(() => {}));
  await render();
  expect(renderer.root.findAll(node => node.props.accessibilityLabel === t('student.trainingHistoryView.copy021')).length).toBeGreaterThan(0);
  jest.mocked(setsRepository.range).mockRejectedValue(new Error('History unavailable'));
  await act(async () => { await client.invalidateQueries({ queryKey: setKeys.all }); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  expect(texts()).toContain(t('student.trainingHistoryView.copy022'));
  expect(texts()).toContain('History unavailable');
  jest.mocked(setsRepository.range).mockResolvedValue({ logs: [] });
  // Release the second query for a successful reload.
  jest.mocked(exercisesRepository.list).mockResolvedValue({ exercises: [] });
  await act(async () => { await client.cancelQueries(); button(t('student.trainingHistoryView.copy023')).props.onPress(); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  expect(texts()).toContain(t('student.trainingHistoryView.copy013'));
  expect(texts()).not.toContain(t('student.trainingHistoryView.copy022'));
});

test('feedback entry opens the archive and reading a detail marks that item read', async () => {
  const item = { id: 'feedback', coach_id: 'coach', student_id: 'student', day_date: '2026-08-03', plan_exercise_id: null, text: 'Keep your brace', posted_at: '2026-08-03T12:00:00Z', read_at: null };
  jest.mocked(feedbackRepository.list).mockResolvedValue({ items: [item] });
  const markRead = jest.spyOn(feedbackRepository, 'markRead').mockResolvedValue(undefined);
  mockChatUnread = 1;
  await render();
  // The header badge counts unread chat, not unread feedback; reading feedback below leaves it untouched.
  expect(button(t('student.trainingHistoryView.copy012')).props.accessibilityValue).toEqual({ text: '1' });
  expect(textOf(renderer.root.findByProps({ testID: 'growth-header-unread' }))).toBe('1');
  expect(texts()).toContain(t('student.trainingHistoryView.copy010', [1]));
  expect(texts()).not.toContain(item.text);
  act(() => button(t('student.trainingHistoryView.copy009')).props.onPress());
  expect(texts()).toContain(item.text);
  await act(async () => { button(item.text).props.onPress(); });
  expect(markRead.mock.calls[0][0]).toBe(item.id);
  expect(button(t('student.trainingHistoryView.copy012')).props.accessibilityValue).toEqual({ text: '1' });
  expect(texts()).toContain(item.text);
});
