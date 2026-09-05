import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { useVideoUploadStore } from '@/features/training/video-upload/store';
import { EMPTY_VIDEO_UPLOAD } from '@/features/training/video-upload/model';
import { day, plan, set } from '@/domain/plan/test-fixtures';
import { isValidElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, AppState, Pressable, Text, TextInput, ScrollView, type AppStateStatus } from 'react-native';
import { authenticatedRequest, useSessionStore } from '@/api/session';
import { chatRepository, ChatMessageSchema, type ChatMessage } from '@/api/domains/chat';
import { setLocaleOverride, t } from '@/i18n';
import { ApiError } from '@/api/client';
import { FeedbackVideoPlayer } from '@/features/video-player/FeedbackVideoPlayer';
import { StudentConversationScreen } from '../StudentConversationScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dashboardPlanSeenKey } from '@/features/dashboard/plan-seen';
import { studentChatKeys, useOpenCoachChat } from '../open-coach-chat';
import { canonicalBody, displayFirstLine } from '../set-ref';
import { useSetRefStagingStore, type SetRefSendIntent } from '../set-ref-staging';



jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-community/netinfo', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-community/netinfo/jest/netinfo-mock'));
jest.mock('react-native-video', () => 'Video');
const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: mockNavigate, back: jest.fn() }),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('@/api/session', () => ({
  ...jest.requireActual<typeof import('@/api/session')>('@/api/session'), authenticatedRequest: jest.fn(),
}));
jest.mock('@/api/domains/chat', () => ({
  ...jest.requireActual<typeof import('@/api/domains/chat')>('@/api/domains/chat'),
  chatRepository: { list: jest.fn(), messages: jest.fn(), send: jest.fn(), sendSetRef: jest.fn(), read: jest.fn(), open: jest.fn() },
}));
const studentId = '10000000-0000-4000-8000-000000000000';
const conversationId = '20000000-0000-4000-8000-000000000000';
const coachId = '30000000-0000-4000-8000-000000000000';
let renderer: ReactTestRenderer;
let client: QueryClient;
let feedbackItems: unknown[];
let boundCoach: unknown;
let plans: unknown[];
function textContent(value: ReactNode): string {
  if (Array.isArray(value)) return value.map(textContent).join('');
  if (isValidElement<{ children: ReactNode }>(value)) return textContent(value.props.children);
  return value == null ? '' : String(value);
}
const copy = () => renderer.root.findAllByType(Text).map(node => textContent(node.props.children));
async function renderScreen() {
  await act(async () => { renderer = create(<QueryClientProvider client={client}><StudentConversationScreen conversationId={conversationId} coachName="Alex" /></QueryClientProvider>); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
}
beforeEach(() => {
  jest.clearAllMocks();
  useSetRefStagingStore.setState({ intents: {} });
  feedbackItems = []; plans = [];
  boundCoach = { status: 'accepted', coach_id: coachId, coach_display_name: 'Alex' };
  setLocaleOverride('en');
  useSessionStore.setState({ user: { id: studentId, phone: '', role: 'coached_student', created_at: '2026-09-05T00:00:00Z' } });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  jest.mocked(authenticatedRequest).mockImplementation(async path => {
    if (path.endsWith('/plans')) return { plans } as never;
    if (path.startsWith('/plans/')) return { days: [] } as never;
    if (path.endsWith('/feedback')) return { items: feedbackItems } as never;
    if (path.endsWith('/videos')) return { videos: [] } as never;
    if (path.endsWith('/read')) return undefined as never;
    if (path.startsWith('/uploads/') && path.endsWith('/url')) return { url: 'https://video.example/play.mp4', expires_in: 600 } as never;
    if (path.endsWith('/markers')) return { markers: [{ id: 'marker', time_ms: 1200, note: 'Brace', annotation_url: null }] } as never;
    if (path === '/bind-requests/mine') return { bind_request: boundCoach } as never;
    throw new Error(`Unexpected request: ${path}`);
  });
  jest.mocked(chatRepository.list).mockResolvedValue({ conversations: [] });
  jest.mocked(chatRepository.messages).mockResolvedValue({ messages: [], meta: { has_more: false } });
  jest.mocked(chatRepository.read).mockResolvedValue({ unread_count: 0, my_last_read: { message_id: 'm', seq: 2 } });
});
afterEach(() => {
  act(() => renderer?.unmount()); jest.restoreAllMocks(); client.clear(); useSessionStore.setState({ user: null }); setLocaleOverride(null);
});

test('empty conversation invites a message to the coach and shows tonight online', async () => {
  await renderScreen();
  expect(copy()).toContain(t('student.studentBlackGoldChatView.copy014', ['Alex']));
  expect(copy()).toContain(t('student.studentBlackGoldChatView.copy002'));
  expect(chatRepository.read).not.toHaveBeenCalled();
});

function message(id: string, seq: number, sender_id: string, body: string): ChatMessage {
  return { id, seq, sender_id, body, conversation_id: conversationId, kind: 'text', client_id: id, created_at: '2026-09-05T09:03:00Z' };
}
test('shows both sides and marks my bubble read when the coach read cursor covers it', async () => {
  jest.mocked(chatRepository.messages).mockResolvedValue({ messages: [message('a', 1, coachId, 'Great work'), message('b', 2, studentId, 'Thank you')], meta: { has_more: false, other_last_read: { message_id: 'b', seq: 2 } } });
  await renderScreen();
  expect(copy()).toContain('Great work'); expect(copy()).toContain('Thank you');
  expect(copy()).toContain(t('student.studentBlackGoldChatView.copy016'));
  expect(copy()).not.toContain(t('student.studentBlackGoldChatView.copy002'));
  expect(chatRepository.read).toHaveBeenCalledWith(conversationId, 'b');
});

test('unread coach feedback is present in the conversation with its unread badge', async () => {
  feedbackItems = [{ id: 'f', student_id: studentId, coach_id: coachId, day_date: null, plan_exercise_id: null, text: 'Keep your chest up', posted_at: '2026-09-05T09:04:00Z', read_at: null }];
  await renderScreen();
  expect(copy()).toContain('Keep your chest up');
  expect(copy()).toContain(t('student.studentBlackGoldChatView.copy023'));
});
test('opening the new plan persists its seen signature and goes to Training', async () => {
  plans = [{ id: 'plan', status: 'published', published_at: '2026-09-05T08:00:00Z', created_at: '2026-09-01T08:00:00Z' }];
  await renderScreen();
  const card = renderer.root.find(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === t('student.studentBlackGoldChatView.copy020'));
  await act(async () => { await card.props.onPress(); });
  expect(await AsyncStorage.getItem(dashboardPlanSeenKey(studentId))).toBe(JSON.stringify({ planId: 'plan', publishedAt: '2026-09-05T08:00:00Z' }));
  expect(mockNavigate).toHaveBeenCalledWith('/(student)/training');
});

test('sending text clears the composer and shows the confirmed message', async () => {
  jest.mocked(chatRepository.send).mockResolvedValue({ message: message('sent', 3, studentId, 'Ready for tomorrow') });
  await renderScreen();
  await act(async () => { renderer.root.findByType(TextInput).props.onChangeText('Ready for tomorrow'); });
  await act(async () => { await renderer.root.find(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === t('student.studentBlackGoldChatView.copy007')).props.onPress(); });
  expect(renderer.root.findByType(TextInput).props.value).toBe('');
  expect(copy()).toContain('Ready for tomorrow');
  expect(chatRepository.send).toHaveBeenCalledWith(conversationId, 'Ready for tomorrow', expect.any(String));
});

test('failed sends retain their text and retry with the same idempotency key', async () => {
  jest.mocked(chatRepository.send).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ message: message('retry', 3, studentId, 'Try again') });
  await renderScreen();
  await act(async () => { renderer.root.findByType(TextInput).props.onChangeText('Try again'); });
  await act(async () => { await renderer.root.find(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === t('student.studentBlackGoldChatView.copy007')).props.onPress(); });
  expect(copy()).toContain(t('student.studentBlackGoldChatView.copy026'));
  const retryText = renderer.root.findAllByType(Text).find(node => node.props.children === t('student.studentBlackGoldChatView.copy026'))!;
  let button = retryText.parent!;
  while (!button.props.onPress) button = button.parent!;
  await act(async () => { await button.props.onPress(); });
  expect(chatRepository.send).toHaveBeenNthCalledWith(2, ...jest.mocked(chatRepository.send).mock.calls[0]);
  expect(copy()).not.toContain(t('student.studentBlackGoldChatView.copy026'));
});

test('initial load failure offers retry and can recover to the empty conversation', async () => {
  jest.mocked(chatRepository.messages).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ messages: [], meta: { has_more: false } });
  await renderScreen();
  expect(copy()).toContain(t('student.studentBlackGoldChatView.copy011'));
  await act(async () => { renderer.root.find(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === t('student.studentBlackGoldChatView.copy013')).props.onPress(); });
  expect(copy()).toContain(t('student.studentBlackGoldChatView.copy014', ['Alex']));
});
test('reading the latest message updates the shared unread cache immediately', async () => {
  client.setQueryData(studentChatKeys.conversations(studentId), { conversations: [{ id: conversationId, unread_count: 3, other_party: { id: coachId, display_name: 'Alex' } }] });
  jest.mocked(chatRepository.messages).mockResolvedValue({ messages: [message('b', 2, coachId, 'Hello')], meta: { has_more: false } });
  await renderScreen();
  expect(client.getQueryData(studentChatKeys.conversations(studentId))).toMatchObject({ conversations: [{ unread_count: 0 }] });
});
function HeaderProbe() {
  const chat = useOpenCoachChat(studentId);
  return <Pressable accessibilityLabel="open-coach" disabled={chat.isOpening} onPress={chat.openCoachChat}><Text>{chat.totalUnread}</Text></Pressable>;
}
test('header opens the bound coach once and navigates with conversation ID and name', async () => {
  jest.mocked(chatRepository.open).mockResolvedValue({ conversation: { id: conversationId, other_party: { id: coachId, display_name: 'Alex' }, unread_count: 0 } });
  await act(async () => { renderer = create(<QueryClientProvider client={client}><HeaderProbe /></QueryClientProvider>); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  const button = renderer.root.findAllByProps({ accessibilityLabel: 'open-coach' })[0];
  await act(async () => { await Promise.all([button.props.onPress(), button.props.onPress()]); });
  expect(chatRepository.open).toHaveBeenCalledTimes(1);
  expect(chatRepository.open).toHaveBeenCalledWith(coachId);
  expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/(student)/chat', params: { conversationId, coachName: 'Alex' } });
});
test('the visible history sentinel requests older messages without discarding the loaded page', async () => {
  jest.mocked(chatRepository.messages)
    .mockResolvedValueOnce({ messages: [message('new', 5, coachId, 'Latest')], meta: { has_more: true } })
    .mockResolvedValue({ messages: [message('old', 4, coachId, 'Earlier')], meta: { has_more: false } });
  await renderScreen();
  await act(async () => { renderer.root.findByType(ScrollView).props.onScrollBeginDrag(); renderer.root.findByType(ScrollView).props.onScroll({ nativeEvent: { contentOffset: { y: 0 }, layoutMeasurement: { height: 400 }, contentSize: { height: 1000 } } }); });
  expect(chatRepository.messages).toHaveBeenCalledWith(conversationId, { before_seq: 5 });
  expect(copy()).toContain('Latest'); expect(copy()).toContain('Earlier');
});
test('valid training shares render their metrics and note, invalid snapshots fall back to ordinary text', async () => {
  const valid = ChatMessageSchema.parse({ ...message(studentId, 1, studentId, '[训练分享] Squat 第2组/3 100.5kg×5 @RPE8.5 (2026-09-05)\nKeep the tempo'), kind: 'set_ref', set_ref: { v: 1, source: 'logged', exerciseName: 'Squat', setNumber: 2, setTotal: 3, weightKg: '100.5', reps: 5, rpe: '8.5', dayDate: '2026-09-05', setLogId: studentId } });
  const invalid = ChatMessageSchema.parse({ ...message(coachId, 2, coachId, 'broken'), kind: 'set_ref', set_ref: { v: 3 } });
  jest.mocked(chatRepository.messages).mockResolvedValue({ messages: [valid, invalid], meta: { has_more: false } });
  await renderScreen();
  expect(copy()).toEqual(expect.arrayContaining(['Squat', '100.5kg × 5', '8.5', 'Keep the tempo', 'broken', t('chat.setPosition %@ of %@', [2, 3])]));
});

test('feedback becomes read only when at least 55 percent of its height is visible, once per card', async () => {
  feedbackItems = [{ id: coachId, student_id: studentId, coach_id: coachId, text: 'Visible feedback', posted_at: '2026-09-05T09:04:00Z', read_at: null }];
  await renderScreen();
  const scrollView = renderer.root.findByType(ScrollView);
  await act(async () => {
    scrollView.props.onLayout({ nativeEvent: { layout: { height: 200 } } });
    renderer.root.findAllByProps({ testID: `student-chat-item-feedback-${coachId}` })[0].props.onLayout({ nativeEvent: { layout: { y: 0, height: 400 } } });
    scrollView.props.onContentSizeChange(400, 418);
    await new Promise(resolve => setTimeout(resolve, 30));
  });
  expect(jest.mocked(authenticatedRequest).mock.calls.filter(([path]) => path === `/feedback/${coachId}/read`)).toHaveLength(0);
  await act(async () => { scrollView.props.onScroll({ nativeEvent: { contentOffset: { y: 0 }, layoutMeasurement: { height: 220 }, contentSize: { height: 400 } } }); });
  await act(async () => { scrollView.props.onScroll({ nativeEvent: { contentOffset: { y: 0 }, layoutMeasurement: { height: 240 }, contentSize: { height: 400 } } }); });
  expect(jest.mocked(authenticatedRequest).mock.calls.filter(([path]) => path === `/feedback/${coachId}/read`)).toHaveLength(1);
});

test('initial scroll aligns the first unread feedback bottom, and prepending history preserves the visible message', async () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
  feedbackItems = [{ id: coachId, student_id: studentId, coach_id: coachId, text: 'Anchor', posted_at: '2026-09-05T09:04:00Z', read_at: null }];
  jest.mocked(chatRepository.messages).mockResolvedValueOnce({ messages: [message('new', 5, coachId, 'Latest')], meta: { has_more: true } })
    .mockResolvedValue({ messages: [message('old', 4, coachId, 'Earlier')], meta: { has_more: false } });
  await renderScreen();
  const view = () => renderer.root.findByType(ScrollView);
  const layout = (id: string, y: number, height: number) => renderer.root.findAllByProps({ testID: `student-chat-item-${id}` })[0].props.onLayout({ nativeEvent: { layout: { y, height } } });
  await act(async () => {
    view().props.onScroll({ nativeEvent: { contentOffset: { y: 0 }, layoutMeasurement: { height: 400 }, contentSize: { height: 1100 } } });
    view().props.onLayout({ nativeEvent: { layout: { height: 400 } } });
    layout('message-new', 80, 100); layout(`feedback-${coachId}`, 700, 200);
    view().props.onContentSizeChange(400, 1100);
    await new Promise(resolve => setTimeout(resolve, 30));
  });
  expect(scrollTo).toHaveBeenCalledWith({ y: 518, animated: false });
  await act(async () => { view().props.onScroll({ nativeEvent: { contentOffset: { y: 30 }, layoutMeasurement: { height: 400 }, contentSize: { height: 1100 } } }); });
  await act(async () => {
    layout('message-old', 80, 150); layout('message-new', 240, 100); layout(`feedback-${coachId}`, 860, 200);
    view().props.onContentSizeChange(400, 1260);
    await new Promise(resolve => setTimeout(resolve, 30));
  });
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 190, animated: false });
  scrollTo.mockRestore();
});

test('header counts the unseen plan plus feedback plus only the bound coach conversation', async () => {
  plans = [{ id: 'plan-count', status: 'published', published_at: '2026-09-05T08:00:00Z', created_at: '2026-09-01T08:00:00Z' }];
  feedbackItems = [{ id: 'unread', read_at: null }];
  jest.mocked(chatRepository.list).mockResolvedValue({ conversations: [
    { id: conversationId, other_party: { id: coachId, display_name: 'Alex' }, unread_count: 4 },
    { id: 'unrelated', other_party: { id: 'someone-else', display_name: 'Other' }, unread_count: 99 },
  ] });
  await act(async () => { renderer = create(<QueryClientProvider client={client}><HeaderProbe /></QueryClientProvider>); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  expect(copy()).toContain('6');
});

test.each(['noCoach', 'binding', 'network'] as const)('opening failure %s uses the matching iOS alert', async kind => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  if (kind === 'noCoach') boundCoach = null;
  else jest.mocked(chatRepository.open).mockRejectedValue(kind === 'binding' ? new ApiError('backend', 'Binding required', { status: 403, envelope: { error: 'CHAT_BIND_REQUIRED' } }) : new Error('offline'));
  await act(async () => { renderer = create(<QueryClientProvider client={client}><HeaderProbe /></QueryClientProvider>); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  await act(async () => { await renderer.root.findAllByProps({ accessibilityLabel: 'open-coach' })[0].props.onPress(); });
  expect(alert).toHaveBeenCalledWith(
    t(kind === 'noCoach' ? 'student.studentNotificationComponents.copy001' : kind === 'binding' ? 'student.studentNotificationComponents.copy003' : 'student.studentNotificationComponents.copy005'),
    t(kind === 'noCoach' ? 'student.studentNotificationComponents.copy002' : kind === 'binding' ? 'student.studentNotificationComponents.copy004' : 'student.studentNotificationComponents.copy006'),
    [{ text: t('student.studentNotificationComponents.copy007') }],
  );
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('returning to foreground drains all incremental pages and reads their latest sequence', async () => {
  const listeners: ((state: AppStateStatus) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => { listeners.push(listener); return { remove: jest.fn() }; });
  jest.mocked(chatRepository.messages).mockResolvedValueOnce({ messages: [message('first', 1, coachId, 'First')], meta: { has_more: false } })
    .mockResolvedValueOnce({ messages: [message('second', 2, coachId, 'Second')], meta: { has_more: true } })
    .mockResolvedValueOnce({ messages: [message('third', 3, coachId, 'Third')], meta: { has_more: false } });
  await renderScreen();
  await act(async () => { listeners.forEach(listener => listener('active')); });
  expect(chatRepository.messages).toHaveBeenNthCalledWith(2, conversationId, { since_seq: 1 });
  expect(chatRepository.messages).toHaveBeenNthCalledWith(3, conversationId, { since_seq: 2 });
  expect(chatRepository.read).toHaveBeenLastCalledWith(conversationId, 'third');
  expect(copy()).toEqual(expect.arrayContaining(['First', 'Second', 'Third']));
});

test('a feedback video opens the shared player with W3-a markers and unknown duration', async () => {
  feedbackItems = [{ id: coachId, student_id: studentId, coach_id: coachId, video_id: studentId, text: 'Watch your brace', posted_at: '2026-09-05T09:04:00Z', read_at: null }];
  await renderScreen();
  expect(copy()).toContain('—:—');
  await act(async () => { await renderer.root.findAllByProps({ accessibilityLabel: t('chat.playVideo') })[0].props.onPress(); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  const player = renderer.root.findByType(FeedbackVideoPlayer);
  expect(player.props.url).toBe('https://video.example/play.mp4');
  expect(player.props.markers).toEqual([{ id: 'marker', timeMs: 1200, note: 'Brace', annotationURL: null }]);
  expect(player.props.badge).toBeUndefined();
});

const staged: SetRefSendIntent = { conversationId, clientId: 'staged-id', setRef: { v: 1, source: 'logged', exerciseName: 'Squat', setNumber: 1, weightKg: '80', reps: 5, rpe: '8', dayDate: '2026-09-05', setLogId: studentId }, body: '', video: null };
test('staged composer accepts an optional note, sends the canonical body and clears on success', async () => {
  useSetRefStagingStore.getState().stage(staged);
  jest.mocked(chatRepository.sendSetRef).mockResolvedValue({ message: { ...message('sent-set', 3, studentId, canonicalBody(staged.setRef, 'Why?')), set_ref: staged.setRef } });
  await renderScreen();
  expect(copy()).toContain(displayFirstLine(staged.setRef));
  expect(renderer.root.findByType(TextInput).props.placeholder).toBe(t('student.studentBlackGoldChatView.copy009'));
  const sendButton = () => renderer.root.find(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === t('student.studentBlackGoldChatView.copy007'));
  expect(sendButton().props.disabled).toBe(false);
  await act(async () => { renderer.root.findByType(TextInput).props.onChangeText('Why?'); });
  await act(async () => { await sendButton().props.onPress(); });
  expect(chatRepository.sendSetRef).toHaveBeenCalledWith(conversationId, { body: canonicalBody(staged.setRef, 'Why?'), clientID: 'staged-id', setRef: staged.setRef });
  expect(useSetRefStagingStore.getState().intents[conversationId]).toBeUndefined();
  expect(renderer.root.findByType(TextInput).props.value).toBe('');
});

test('uploading share waits, then sends the selected video; HTTP retries keep body and client id', async () => {
  const video = { state: 'uploading' as const, recordKey: `${studentId}:set`, createdAt: 10, attachmentId: null };
  useVideoUploadStore.setState({ records: { [video.recordKey]: { ...EMPTY_VIDEO_UPLOAD, createdAt: 10, status: 'pending', setLogId: studentId } } });
  useSetRefStagingStore.getState().stage({ ...staged, video });
  jest.mocked(chatRepository.sendSetRef).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ message: message('sent-video', 3, studentId, canonicalBody(staged.setRef)) });
  await renderScreen();
  await act(async () => { void renderer.root.find(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === t('student.studentBlackGoldChatView.copy007')).props.onPress(); });
  expect(chatRepository.sendSetRef).not.toHaveBeenCalled();
  await act(async () => { useVideoUploadStore.setState({ records: { [video.recordKey]: { ...EMPTY_VIDEO_UPLOAD, createdAt: 10, status: 'uploaded', setLogId: studentId, attachmentId: coachId } } }); });
  expect(chatRepository.sendSetRef).toHaveBeenCalledWith(conversationId, { body: canonicalBody(staged.setRef), clientID: staged.clientId, setRef: staged.setRef, videoId: coachId });
  expect(copy()).toContain(t('student.studentBlackGoldChatView.copy026'));
  await act(async () => { renderer.root.findByType(TextInput).props.onChangeText('A new unsent note'); useVideoUploadStore.setState({ records: {} }); });
  const retryText = renderer.root.findAllByType(Text).find(node => node.props.children === t('student.studentBlackGoldChatView.copy026'))!;
  let retry = retryText.parent!; while (!retry.props.onPress) retry = retry.parent!;
  await act(async () => { await retry.props.onPress(); });
  expect(chatRepository.sendSetRef).toHaveBeenNthCalledWith(2, ...jest.mocked(chatRepository.sendSetRef).mock.calls[0]);
  expect(renderer.root.findByType(TextInput).props.value).toBe('A new unsent note');
  expect(useSetRefStagingStore.getState().intents[conversationId]).toBeUndefined();
});
test.each(['failed', 'removed', 'replaced'] as const)('waiting upload %s never sends a wrong video and can be discarded', async outcome => {
  const recordKey = `${studentId}:set`;
  useVideoUploadStore.setState({ records: { [recordKey]: { ...EMPTY_VIDEO_UPLOAD, createdAt: 10, status: 'uploading', setLogId: studentId, attachmentId: coachId } } });
  useSetRefStagingStore.getState().stage({ ...staged, video: { state: 'uploading', recordKey, createdAt: 10, attachmentId: coachId } });
  await renderScreen();
  await act(async () => { void renderer.root.find(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === t('student.studentBlackGoldChatView.copy007')).props.onPress(); });
  await act(async () => { useVideoUploadStore.setState({ records: outcome === 'removed' ? {} : { [recordKey]: { ...EMPTY_VIDEO_UPLOAD, createdAt: outcome === 'replaced' ? 20 : 10, status: outcome === 'failed' ? 'failed' : 'uploaded', attachmentId: outcome === 'failed' ? coachId : studentId } } }); });
  expect(chatRepository.sendSetRef).not.toHaveBeenCalled();
  expect(copy()).toContain(t(outcome === 'failed' ? 'chat.videoFailed' : 'chat.videoUnavailable'));
  await act(async () => { renderer.root.find(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === t('student.studentBlackGoldChatView.copy004')).props.onPress(); });
  expect(useSetRefStagingStore.getState().intents[conversationId]).toBeUndefined();
});
test('oversized staged body disables sending and shows the canonical-inclusive UTF-16 count', async () => {
  useSetRefStagingStore.getState().stage(staged);
  await renderScreen();
  await act(async () => { renderer.root.findByType(TextInput).props.onChangeText('😀'.repeat(2000)); });
  expect(renderer.root.find(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === t('student.studentBlackGoldChatView.copy007')).props.disabled).toBe(true);
  expect(copy()).toContain(t('student.studentBlackGoldChatView.copy005'));
  expect(copy()).toContain(`${canonicalBody(staged.setRef, '😀'.repeat(2000)).length}/4000`);
});
test('chat plus opens the real picker and can stage a prescribed set', async () => {
  const summary = plan([day(studentId, { exercises: [{ id: studentId, plan_day_id: studentId, exercise_id: coachId, sort_order: 0, is_main_lift: true, notes: null, sets: [set({ id: conversationId, plan_exercise_id: studentId })] }] })], { id: conversationId, trainee_id: studentId });
  plans = [summary];
  const previous = jest.mocked(authenticatedRequest).getMockImplementation()!;
  jest.mocked(authenticatedRequest).mockImplementation(async (path, options) => {
    if (path === `/plans/${conversationId}`) return summary as never;
    if (path.includes('/sets?')) return { logs: [] } as never;
    if (path === '/exercises') return { exercises: [{ id: coachId, name: 'Squat', name_en: 'Squat' }] } as never;
    return previous(path, options);
  });
  await renderScreen();
  await act(async () => { renderer.root.find(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === t('student.studentBlackGoldChatView.copy006')).props.onPress(); });
  await act(async () => { await renderer.root.find(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === t('chat.continueSelection')).props.onPress(); });
  expect(copy()).toContain(t('chat.sendCurrentSetPlan'));
  await act(async () => { await renderer.root.find(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === t('chat.continueToChat')).props.onPress(); });
  expect(useSetRefStagingStore.getState().intents[conversationId]).toMatchObject({ setRef: { source: 'planned', planSetId: conversationId, exerciseName: 'Squat' } });
});

test('an upload session can renew its remote attachment id without replacing the selected local video', async () => {
  const recordKey = `${studentId}:set`;
  useVideoUploadStore.setState({ records: { [recordKey]: { ...EMPTY_VIDEO_UPLOAD, createdAt: 10, status: 'uploading', attachmentId: coachId } } });
  useSetRefStagingStore.getState().stage({ ...staged, video: { state: 'uploading', recordKey, createdAt: 10, attachmentId: coachId } });
  jest.mocked(chatRepository.sendSetRef).mockResolvedValue({ message: message('renewed', 3, studentId, canonicalBody(staged.setRef)) });
  await renderScreen();
  await act(async () => { void renderer.root.find(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === t('student.studentBlackGoldChatView.copy007')).props.onPress(); });
  await act(async () => { useVideoUploadStore.setState({ records: { [recordKey]: { ...EMPTY_VIDEO_UPLOAD, createdAt: 10, status: 'uploaded', attachmentId: studentId } } }); });
  expect(chatRepository.sendSetRef).toHaveBeenCalledWith(conversationId, expect.objectContaining({ videoId: studentId }));
});

test('poll acknowledgement clears a staged send whose HTTP response was lost', async () => {
  const listeners: ((state: AppStateStatus) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => { listeners.push(listener); return { remove: jest.fn() }; });
  useSetRefStagingStore.getState().stage(staged);
  jest.mocked(chatRepository.sendSetRef).mockRejectedValue(new Error('response lost'));
  await renderScreen();
  await act(async () => { await renderer.root.find(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === t('student.studentBlackGoldChatView.copy007')).props.onPress(); });
  jest.mocked(chatRepository.messages).mockResolvedValue({ messages: [{ ...message('ack', 3, studentId, canonicalBody(staged.setRef)), client_id: staged.clientId, set_ref: staged.setRef }], meta: { has_more: false } });
  await act(async () => { listeners.forEach(listener => listener('active')); });
  expect(useSetRefStagingStore.getState().intents[conversationId]).toBeUndefined();
  expect(copy()).not.toContain(t('student.studentBlackGoldChatView.copy026'));
});
