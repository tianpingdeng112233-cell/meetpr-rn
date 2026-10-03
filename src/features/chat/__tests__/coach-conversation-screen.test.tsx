import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { isValidElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text, TextInput, ScrollView, AppState, type AppStateStatus } from 'react-native';
import { useSessionStore } from '@/api/session';
import { chatRepository, type ChatMessage, type ChatSetRef } from '@/api/domains/chat';
import { setLocaleOverride, t } from '@/i18n';
import { colors } from '@/design/tokens';
import { FeedbackVideoPlayer } from '@/features/video-player/FeedbackVideoPlayer';
import { ConversationScreen } from '../ConversationScreen';
import { canonicalBody } from '../set-ref';
import { receivingKeys } from '@/features/coach/receiving/use-coach-receiving';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-community/netinfo', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-community/netinfo/jest/netinfo-mock'));
jest.mock('react-native-video', () => 'Video');
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: () => mockBack() },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('@/api/domains/chat', () => ({
  ...jest.requireActual<typeof import('@/api/domains/chat')>('@/api/domains/chat'),
  chatRepository: { list: jest.fn(), messages: jest.fn(), send: jest.fn(), read: jest.fn() },
}));
const originalAppState = AppState.currentState;
const coachId = 'coach';
const conversationId = 'conversation';
let renderer: ReactTestRenderer;
let client: QueryClient;
function textContent(value: ReactNode): string {
  if (Array.isArray(value)) return value.map(textContent).join('');
  if (isValidElement<{ children: ReactNode }>(value)) return textContent(value.props.children);
  return value == null ? '' : String(value);
}
const copy = () => renderer.root.findAllByType(Text).map(node => textContent(node.props.children));
const button = (key: Parameters<typeof t>[0]) => renderer.root.find(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === t(key));
async function renderScreen(props: { status?: string; initialDraft?: string } = {}) {
  await act(async () => { renderer = create(<QueryClientProvider client={client}><ConversationScreen conversationId={conversationId} studentName="Sam" {...props} /></QueryClientProvider>); });
}
function message(id: string, seq: number, sender_id: string, body: string): ChatMessage {
  return { id, seq, sender_id, body, conversation_id: conversationId, kind: 'text', client_id: id, created_at: '2026-09-05T09:03:00Z' };
}
const reference: ChatSetRef = { v: 1, source: 'logged', exerciseName: 'Squat', setNumber: 2, setTotal: 3, weightKg: '100.5', reps: 5, rpe: '8.5', dayDate: '2026-09-05', setLogId: '10000000-0000-4000-8000-000000000000' };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(chatRepository.messages).mockReset();
  jest.mocked(chatRepository.send).mockReset();
  AppState.currentState = 'active';
  setLocaleOverride('en');
  useSessionStore.setState({ user: { id: coachId, phone: '', role: 'coach', created_at: '2026-09-05T00:00:00Z' } });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  jest.mocked(chatRepository.list).mockResolvedValue({ conversations: [] });
  jest.mocked(chatRepository.messages).mockResolvedValue({ messages: [], meta: { has_more: false } });
  jest.mocked(chatRepository.read).mockResolvedValue({ unread_count: 0, my_last_read: { message_id: 'm', seq: 2 } });
});
afterEach(() => { act(() => renderer?.unmount()); jest.restoreAllMocks(); AppState.currentState = originalAppState; client.clear(); useSessionStore.setState({ user: null }); setLocaleOverride(null); });

test('header centers the student name and attention subtitle with a chevron back control', async () => {
  await renderScreen({ status: 'abnormal' });
  expect(copy()).toContain('Sam');
  const subtitle = renderer.root.findByProps({ testID: 'coach.chat.subtitle' });
  expect(textContent(subtitle.props.children)).toBe(t('coach.chat.attentionStudentSubtitle'));
  expect(subtitle.props.style).toMatchObject({ fontSize: 11 });
  expect(button('chat.back').props.style).toMatchObject({ width: 44, height: 44 });
  act(() => button('chat.back').props.onPress());
  expect(mockBack).toHaveBeenCalled();
});

test.each([undefined, 'unknown'])('unknown status %p renders no subtitle', async status => {
  await renderScreen({ status });
  expect(renderer.root.findAllByProps({ testID: 'coach.chat.subtitle' })).toHaveLength(0);
});
test.each(['active', 'inEvaluation'])('status %s uses the active subtitle', async status => {
  await renderScreen({ status });
  expect(copy()).toContain(t('coach.chat.activeStudentSubtitle'));
  expect(renderer.root.findByProps({ testID: 'coach.chat.subtitle' }).props.style.color).toBe(colors.success);
});
test('training share is a card without canonical body or delivery labels', async () => {
  const body = canonicalBody(reference);
  jest.mocked(chatRepository.messages).mockResolvedValue({ messages: [{ ...message('share', 1, 'student', body), set_ref: reference }], meta: { has_more: false } });
  await renderScreen();
  expect(renderer.root.findAllByProps({ testID: 'chat.setCard.share' }).length).toBeGreaterThan(0);
  expect(copy()).toContain('Squat');
  expect(copy()).not.toContain(body);
  for (const key of ['chat.read', 'chat.delivered', 'chat.setCardRead', 'chat.setCardDelivered'] as const) expect(copy()).not.toContain(t(key));
});

test('only own text messages display read or delivered according to the other read cursor', async () => {
  jest.mocked(chatRepository.messages).mockResolvedValue({ messages: [message('incoming', 1, 'student', 'Hello'), message('read', 2, coachId, 'Good work'), message('delivered', 3, coachId, 'Rest today')], meta: { has_more: false, other_last_read: { message_id: 'read', seq: 2 } } });
  await renderScreen();
  expect(copy().filter(value => value === t('chat.read'))).toHaveLength(1);
  expect(copy().filter(value => value === t('chat.delivered'))).toHaveLength(1);
});

test('failed send stays in the timeline with a failure banner and retries its frozen text and client ID', async () => {
  jest.mocked(chatRepository.send).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ message: message('sent', 1, coachId, 'Try again') });
  await renderScreen({ initialDraft: 'Try again' });
  await act(async () => { await button('chat.send').props.onPress(); });
  expect(copy()).toContain('Try again');
  expect(copy()).toContain(t('chat.sendFailed'));
  expect(button('chat.retry').props.accessibilityHint).toBe(t('chat.sendFailed'));
  await act(async () => { renderer.root.findByType(TextInput).props.onChangeText('Next message'); });
  await act(async () => { await button('chat.retry').props.onPress(); });
  expect(chatRepository.send).toHaveBeenNthCalledWith(2, ...jest.mocked(chatRepository.send).mock.calls[0]);
  expect(renderer.root.findByType(TextInput).props.value).toBe('Next message');
  expect(copy()).not.toContain(t('chat.sendFailed'));
});

test('compact composer has a disabled circular send control for blank drafts and no attachments', async () => {
  await renderScreen();
  expect(button('chat.send').props.disabled).toBe(true);
  expect(button('chat.send').props.style).toMatchObject({ width: 34, height: 34, opacity: 0.65 });
  expect(copy()).not.toContain(t('chat.send'));
  for (const key of ['chat.addAttachment', 'chat.choosePhoto'] as const) expect(renderer.root.findAllByProps({ accessibilityLabel: t(key) })).toHaveLength(0);
  await act(async () => { renderer.root.findByType(TextInput).props.onChangeText('   '); });
  expect(button('chat.send').props.disabled).toBe(true);
});

test('scrolling to the history sentinel loads automatically and preserves the visible message offset', async () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
  jest.mocked(chatRepository.messages).mockResolvedValueOnce({ messages: [message('new', 5, 'student', 'Latest')], meta: { has_more: true } })
    .mockResolvedValue({ messages: [message('old', 4, 'student', 'Earlier')], meta: { has_more: false } });
  await renderScreen();
  const view = () => renderer.root.findByType(ScrollView);
  const layout = (id: string, y: number) => renderer.root.findAllByProps({ testID: `chat.message.${id}` })[0].props.onLayout({ nativeEvent: { layout: { y, height: 100 } } });
  await act(async () => {
    layout('new', 50);
    view().props.onScrollBeginDrag();
    view().props.onContentSizeChange(400, 1000);
    view().props.onScroll({ nativeEvent: { contentOffset: { y: 10 }, layoutMeasurement: { height: 400 }, contentSize: { height: 1000 } } });
  });
  expect(chatRepository.messages).toHaveBeenCalledWith(conversationId, { before_seq: 5 });
  await act(async () => {
    layout('old', 16); layout('new', 158);
    view().props.onContentSizeChange(400, 1108);
    await new Promise(resolve => setTimeout(resolve, 30));
  });
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 118, animated: false });
  expect(copy()).toEqual(expect.arrayContaining(['Latest', 'Earlier']));
  expect(renderer.root.findAll(node => node.props.accessibilityLabel === t('chat.loadOlder') && typeof node.props.onPress === 'function')).toHaveLength(0);
});

test('initial load failure uses the unavailable state and empty success uses the empty title and description', async () => {
  jest.mocked(chatRepository.messages).mockRejectedValueOnce(new Error('offline'));
  await renderScreen();
  const title = renderer.root.findAllByType(Text).find(node => node.props.children === t('chat.loadMessagesFailed'));
  expect(title?.props.style).toMatchObject({ fontSize: 20 });
  expect(copy()).not.toContain(t('chat.noMessages'));
});
test('empty conversation presents its title and description', async () => {
  await renderScreen();
  const title = renderer.root.findAllByType(Text).find(node => node.props.children === t('chat.noMessages'));
  expect(title?.props.style).toMatchObject({ fontSize: 20 });
  expect(copy()).toContain(t('chat.noMessagesDescription'));
});

test('received image opens full screen and closes without a delivery label', async () => {
  jest.mocked(chatRepository.messages).mockResolvedValue({ messages: [{ ...message('photo', 1, 'student', ''), kind: 'image', image_url: 'https://example.com/photo.jpg' }], meta: { has_more: false } });
  await renderScreen();
  expect(button('chat.image').props.style).toMatchObject({ width: '75%', aspectRatio: 4 / 3 });
  await act(async () => { button('chat.image').props.onPress(); });
  expect(button('chat.close')).toBeDefined();
  await act(async () => { button('chat.close').props.onPress(); });
  expect(renderer.root.findAllByProps({ accessibilityLabel: t('chat.close') })).toHaveLength(0);
  expect(copy()).not.toContain(t('chat.delivered'));
});

test('set video renews its URL and passes the set badge without coach attribution to the shared player', async () => {
  const share = { ...message('share', 1, 'student', canonicalBody(reference)), set_ref: reference, video_url: 'https://example.com/old.mp4' };
  jest.mocked(chatRepository.messages).mockResolvedValueOnce({ messages: [share], meta: { has_more: false } })
    .mockResolvedValue({ messages: [{ ...share, video_url: 'https://example.com/fresh.mp4' }], meta: { has_more: false } });
  await renderScreen();
  await act(async () => { await button('chat.playVideo').props.onPress(); });
  const player = renderer.root.findByType(FeedbackVideoPlayer);
  expect(player.props.url).toBe('https://example.com/fresh.mp4');
  expect(player.props.badge).toEqual({ exerciseName: 'Squat', weightKg: 100.5, reps: 5, rpe: 8.5, setOrdinal: 2, coachName: null });
  expect(chatRepository.messages).toHaveBeenCalledWith(conversationId, { since_seq: 0, limit: 1 });
});

test('initial native scroll keeps the default bottom anchor until the user scrolls', async () => {
  const scrollToEnd = jest.spyOn(ScrollView.prototype, 'scrollToEnd').mockImplementation(() => {});
  jest.mocked(chatRepository.messages).mockResolvedValue({ messages: [message('new', 5, 'student', 'Latest')], meta: { has_more: false } });
  await renderScreen();
  const view = renderer.root.findByType(ScrollView);
  scrollToEnd.mockClear();
  await act(async () => {
    view.props.onScroll({ nativeEvent: { contentOffset: { y: 0 }, layoutMeasurement: { height: 400 }, contentSize: { height: 1000 } } });
    view.props.onLayout({ nativeEvent: { layout: { height: 400 } } });
    view.props.onContentSizeChange(400, 1000);
    await new Promise(resolve => setTimeout(resolve, 30));
  });
  expect(scrollToEnd).toHaveBeenCalled();
});

test('read acknowledgement updates the receiving cache and foreground polling drains incremental pages', async () => {
  const listeners: ((state: AppStateStatus) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => { listeners.push(listener); return { remove: jest.fn() }; });
  const now = jest.spyOn(Date, 'now').mockReturnValue(0);
  client.setQueryData(receivingKeys.chats(coachId), { conversations: [{ id: conversationId, unread_count: 3, other_party: { id: 'student', display_name: 'Sam' } }] });
  jest.mocked(chatRepository.messages).mockResolvedValueOnce({ messages: [message('first', 1, 'student', 'First')], meta: { has_more: false } })
    .mockResolvedValueOnce({ messages: [message('second', 2, 'student', 'Second')], meta: { has_more: true } })
    .mockResolvedValueOnce({ messages: [message('third', 3, 'student', 'Third')], meta: { has_more: false } });
  await renderScreen();
  expect(client.getQueryData(receivingKeys.chats(coachId))).toMatchObject({ conversations: [{ unread_count: 0 }] });
  now.mockReturnValue(30_000);
  await act(async () => { listeners.forEach(listener => listener('active')); });
  expect(chatRepository.messages).toHaveBeenNthCalledWith(2, conversationId, { since_seq: 1 });
  expect(chatRepository.messages).toHaveBeenNthCalledWith(3, conversationId, { since_seq: 2 });
  expect(chatRepository.read).toHaveBeenLastCalledWith(conversationId, 'third');
  expect(copy()).toEqual(expect.arrayContaining(['First', 'Second', 'Third']));
});

test('sending shows a pending row and a polling acknowledgement removes it even when HTTP fails later', async () => {
  const listeners: ((state: AppStateStatus) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => { listeners.push(listener); return { remove: jest.fn() }; });
  const now = jest.spyOn(Date, 'now').mockReturnValue(0);
  let rejectSend!: (error: Error) => void;
  jest.mocked(chatRepository.send).mockImplementation(() => new Promise((_, reject) => { rejectSend = reject; }));
  await renderScreen({ initialDraft: 'Ready' });
  await act(async () => { void button('chat.send').props.onPress(); });
  expect(copy()).toContain(t('chat.sending'));
  expect(copy()).toContain('Ready');
  expect(button('chat.send').props.disabled).toBe(true);
  const client_id = jest.mocked(chatRepository.send).mock.calls[0][2];
  jest.mocked(chatRepository.messages).mockResolvedValue({ messages: [{ ...message('confirmed', 1, coachId, 'Ready'), client_id }], meta: { has_more: false } });
  now.mockReturnValue(30_000);
  await act(async () => { listeners.forEach(listener => listener('active')); });
  await act(async () => { rejectSend(new Error('lost response')); });
  expect(copy().filter(value => value === 'Ready')).toHaveLength(1);
  expect(copy()).not.toContain(t('chat.sending'));
  expect(copy()).not.toContain(t('chat.retry'));
  expect(copy()).not.toContain(t('chat.sendFailed'));
});
