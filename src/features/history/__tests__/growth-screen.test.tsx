import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RefreshControl, Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { exercisesRepository, feedbackRepository, onboardingRepository, plansRepository, setKeys, setsRepository } from '@/api/domains';
import { t, setLocaleOverride } from '@/i18n';
import { Eyebrow, StatTile } from '@/design';
import { GrowthE1RMChart } from '../GrowthE1RMChart';
import { VolumeIntensityChart } from '../VolumeIntensityChart';

import { GrowthScreen } from '../GrowthScreen';

jest.mock('react-native-safe-area-context', () => (jest.requireActual('react-native-safe-area-context/jest/mock') as { default: unknown }).default);
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/api/session', () => ({ useSessionStore: (selector: (state: { user: { id: string } }) => unknown) => selector({ user: { id: 'student' } }) }));
const mockNavigate = jest.fn();
const mockOpenCoachChat = jest.fn();
let mockChatUnread = 0;
let mockFocus: (() => void) | undefined;
// The growth header's message button is the coach-chat entry (iOS parity); the hook is exercised in chat tests.
jest.mock('@/features/chat/open-coach-chat', () => ({ useOpenCoachChat: () => ({ totalUnread: mockChatUnread, openCoachChat: mockOpenCoachChat, isOpening: false }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: mockNavigate, push: mockNavigate }), useFocusEffect: (callback: () => void) => { mockFocus = callback; } }));
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
  mockNavigate.mockReset();
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


const rowLabels = () => [t('student.progressMenu.e1rm'), t('student.e1rmSourceHistory'), t('student.feedbackInboxView.copy006'), t('student.progressMenu.intensity')];
function expectRows() {
  const rows = buttons().filter(node => rowLabels().some(label => node.props.accessibilityLabel?.startsWith(label)));
  expect(rows.map(node => node.props.accessibilityLabel)).toEqual(rowLabels());
  expect(texts()).not.toContain('Body weight');
  expect(renderer.root.findAllByType(GrowthE1RMChart)).toHaveLength(0);
  expect(renderer.root.findAllByType(VolumeIntensityChart)).toHaveLength(0);
  expect(renderer.root.findAllByType(StatTile)).toHaveLength(0);
  return rows;
}

test('four ordered rows remain tappable without charts, tiles or Body weight in both languages', async () => {
  await render();
  const rows = expectRows();
  const routes = ['/progress/e1rm', '/training-history', '/(student)/feedback', '/progress/intensity'];
  rows.forEach((row, index) => { act(() => row.props.onPress()); expect(mockNavigate).toHaveBeenLastCalledWith(routes[index]); });
  expect(texts().filter(text => text === '—')).toHaveLength(4);
  setLocaleOverride('zh');
  act(() => renderer.update(<QueryClientProvider client={client}><GrowthScreen /></QueryClientProvider>));
  expectRows();
});

test('header retains wordmark and chat badge without subtitle or Eyebrow', async () => {
  mockChatUnread = 1;
  await render();
  expect(renderer.root.findByProps({ testID: 'growth-header-mark' })).toBeDefined();
  expect(renderer.root.findAllByType(Eyebrow)).toHaveLength(0);
  expect(texts()).toContain(t('student.trainingHistoryView.copy013'));
  expect(texts()).not.toContain(t('student.trainingHistoryView.copy014'));
  const chat = button(t('student.trainingHistoryView.copy012'));
  expect(chat.props.accessibilityValue).toEqual({ text: '1' });
  expect(textOf(renderer.root.findByProps({ testID: 'growth-header-unread' }))).toBe('1');
  act(() => chat.props.onPress());
  expect(mockOpenCoachChat).toHaveBeenCalledTimes(1);
  expect(mockNavigate).not.toHaveBeenCalledWith('/(student)/growth');
});

test('pending and failed requests keep blank tappable rows, with retry and pull-to-refresh recovery', async () => {
  jest.mocked(exercisesRepository.list).mockReturnValue(new Promise(() => {}));
  await render();
  expectRows();
  expect(texts()).not.toContain('—');
  jest.mocked(setsRepository.range).mockRejectedValue(new Error('History unavailable'));
  await act(async () => { await client.invalidateQueries({ queryKey: setKeys.all }); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  expectRows().forEach(row => act(() => row.props.onPress()));
  expect(texts()).toContain(t('student.trainingHistoryView.copy022'));
  expect(texts()).not.toContain('—');
  jest.mocked(setsRepository.range).mockResolvedValue({ logs: [] });
  jest.mocked(exercisesRepository.list).mockResolvedValue({ exercises: [] });
  await act(async () => { await client.cancelQueries(); button(t('student.trainingHistoryView.copy023')).props.onPress(); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  expect(texts()).not.toContain(t('student.trainingHistoryView.copy022'));
  await act(async () => { renderer.root.findByType(RefreshControl).props.onRefresh(); });
  expectRows();
});

test('feedback navigates to the existing inbox and focus refresh updates its unread value without changing chat', async () => {
  const item = { id: 'feedback', coach_id: 'coach', student_id: 'student', day_date: '2026-08-03', plan_exercise_id: null, text: 'Keep your brace', posted_at: '2026-08-03T12:00:00Z', read_at: null };
  jest.mocked(feedbackRepository.list).mockResolvedValue({ items: [item] });
  mockChatUnread = 1;
  await render();
  expect(texts()).toContain('1 new');
  expect(texts()).not.toContain(item.text);
  act(() => button(t('student.feedbackInboxView.copy006')).props.onPress());
  expect(mockNavigate).toHaveBeenLastCalledWith('/(student)/feedback');
  jest.mocked(feedbackRepository.list).mockResolvedValue({ items: [{ ...item, read_at: '2026-08-04' }] });
  await act(async () => { mockFocus?.(); await new Promise(resolve => setTimeout(resolve, 20)); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  expect(texts()).not.toContain('1 new');
  expect(button(t('student.feedbackInboxView.copy006')).props.accessibilityLabel).toBe(`${t('student.feedbackInboxView.copy006')}, 1`);
  expect(button(t('student.trainingHistoryView.copy012')).props.accessibilityValue).toEqual({ text: '1' });
});
