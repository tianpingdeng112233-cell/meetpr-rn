import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AppState, Text, type AppStateStatus } from 'react-native';
import { authenticatedRequest, getAccessToken, useSessionStore } from '@/api/session';
import { type RealtimeSocket } from '@/api/realtime';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { chatRepository } from '@/api/domains/chat';
import { useCoachReceiving, receivingKeys } from '@/features/coach/receiving/use-coach-receiving';
import { useOpenCoachChat, studentChatKeys } from '../open-coach-chat';
import { ConversationScreen } from '../ConversationScreen';
import { StudentConversationScreen } from '../StudentConversationScreen';
import { setLocaleOverride, t } from '@/i18n';
import { createConversationSync } from '../conversation-model';
import { chatRealtime, useChatRealtime, useChatRealtimeLifecycle } from '../realtime';

jest.mock('@/api/session', () => ({
  ...jest.requireActual<typeof import('@/api/session')>('@/api/session'), getAccessToken: jest.fn(async () => 'test-token'), authenticatedRequest: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-community/netinfo', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-community/netinfo/jest/netinfo-mock'));
jest.mock('react-native-video', () => 'Video');
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: jest.fn() }),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('@/api/domains/chat', () => ({
  ...jest.requireActual<typeof import('@/api/domains/chat')>('@/api/domains/chat'),
  chatRepository: { list: jest.fn(), messages: jest.fn(), read: jest.fn() },
}));
class FakeSocket implements RealtimeSocket {
  onmessage: RealtimeSocket['onmessage'] = null;
  onclose: RealtimeSocket['onclose'] = null;
  onerror: RealtimeSocket['onerror'] = null;
  close = jest.fn();
  frame(type: string, payload = {}) { this.onmessage?.({ data: JSON.stringify({ type, payload }) }); }
}
let client: QueryClient;
let sockets: FakeSocket[];
let renderer: ReactTestRenderer;
let listeners: Set<(state: AppStateStatus) => void>;
let connected = false;
let subscribe: ReturnType<typeof useChatRealtime>['subscribe'];
const user = { id: 'me', role: 'coach' as const, phone: '', created_at: '2026-09-05' };
const originalSocket = global.WebSocket;
const originalAppState = AppState.currentState;
function Probe() {
  useChatRealtimeLifecycle();
  const realtime = useChatRealtime();
  useEffect(() => { ({ connected, subscribe } = realtime); });
  return null;
}
async function foreground(state: AppStateStatus) {
  await act(async () => { AppState.currentState = state; listeners.forEach(listener => listener(state)); });
}
beforeEach(() => {
  setLocaleOverride('en');
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  jest.mocked(chatRepository.list).mockResolvedValue({ conversations: [] });
  jest.mocked(authenticatedRequest).mockImplementation(async path => {
    if (path === '/bind-requests/mine') return { bind_request: { status: 'accepted', coach_id: 'coach' } } as never;
    return { plans: [], days: [], items: [], videos: [] } as never;
  });
  sockets = []; listeners = new Set();
  AppState.currentState = 'active';
  global.WebSocket = jest.fn(() => { const socket = new FakeSocket(); sockets.push(socket); return socket; }) as unknown as typeof WebSocket;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => { listeners.add(listener); return { remove: () => { listeners.delete(listener); } }; });
  useSessionStore.setState({ status: 'authenticated', user });
});
afterEach(() => {
  act(() => renderer?.unmount());
  useSessionStore.setState({ status: 'anonymous', user: null });
  global.WebSocket = originalSocket; AppState.currentState = originalAppState;
  setLocaleOverride(null); client.clear(); jest.useRealTimers(); jest.restoreAllMocks();
});

test('one session connection follows foreground/authentication and clears old account subscriptions', async () => {
  await act(async () => { renderer = create(<Probe />); });
  expect(getAccessToken).toHaveBeenCalled();
  expect(sockets).toHaveLength(1);
  expect(connected).toBe(false);
  await act(async () => sockets[0].frame('hello'));
  expect(connected).toBe(true);
  const oldEvents = jest.fn(); const stopOldEvents = subscribe(oldEvents);
  await foreground('background');
  expect(sockets[0].close).toHaveBeenCalledTimes(1);
  expect(connected).toBe(false);
  await foreground('active');
  expect(sockets).toHaveLength(2);
  await act(async () => sockets[1].frame('hello'));
  expect(oldEvents).toHaveBeenCalledTimes(1);
  await act(async () => useSessionStore.setState({ user: { ...user, id: 'new' } }));
  expect(sockets[1].close).toHaveBeenCalledTimes(1);
  await act(async () => sockets[2].frame('hello'));
  expect(oldEvents).toHaveBeenCalledTimes(1);
  await act(async () => useSessionStore.setState({ status: 'anonymous', user: null }));
  expect(sockets[2].close).toHaveBeenCalledTimes(1);
  expect(chatRealtime.state).toBe('disconnected');
  await foreground('background'); await foreground('active');
  expect(sockets).toHaveLength(3);
  stopOldEvents();
});

function CoachInbox() { useCoachReceiving(); return null; }
function StudentInbox() { useOpenCoachChat('me'); return null; }
const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); }); };
test.each(['coach', 'student'])('%s inbox pauses polling on hello and folds a burst into one trailing refresh', async role => {
  if (role === 'student') useSessionStore.setState({ user: { ...user, role: 'coached_student' } });
  const Inbox = role === 'coach' ? CoachInbox : StudentInbox;
  await act(async () => { renderer = create(<QueryClientProvider client={client}><Probe /><Inbox /><Inbox /></QueryClientProvider>); });
  await settle();
  const key = role === 'coach' ? receivingKeys.chats('me') : studentChatKeys.conversations('me');
  const interval = () => (client.getQueryCache().find({ queryKey: key })!.options as { refetchInterval?: number | false }).refetchInterval;
  expect(interval()).toBe(30000);
  await act(async () => sockets[0].frame('hello'));
  expect(interval()).toBe(false);
  jest.mocked(chatRepository.list).mockClear();
  await act(async () => sockets[0].frame('chat.read', { conversation_id: 'c', user_id: 'me', last_read_seq: 2 }));
  expect(chatRepository.list).not.toHaveBeenCalled();
  let finish!: (value: { conversations: [] }) => void;
  jest.mocked(chatRepository.list).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => {
    for (let i = 0; i < 5; i++) sockets[0].frame('chat.message', { conversation_id: 'c', sender_id: 'peer', seq: i + 1 });
  });
  expect(chatRepository.list).toHaveBeenCalledTimes(1);
  await act(async () => finish({ conversations: [] }));
  expect(chatRepository.list).toHaveBeenCalledTimes(2);
  await act(async () => sockets[0].frame('chat.read', { conversation_id: 'c', user_id: 'peer', last_read_seq: 2 }));
  expect(chatRepository.list).toHaveBeenCalledTimes(3);
  await foreground('background');
  expect(interval()).toBe(30000);
  jest.mocked(chatRepository.list).mockClear();
  await foreground('active'); await settle();
  expect(chatRepository.list).toHaveBeenCalledTimes(1);
});

test('conversation sync filters pointers, advances known read cursors locally and serializes forced refreshes', async () => {
  let readSeq = 0;
  let now = 0;
  const messages = [{ id: 'm2', seq: 2 }];
  const fetchPage = jest.fn(async () => messages);
  const markRead = jest.fn(async () => undefined);
  const sync = createConversationSync({ now: () => now, fetchPage, markRead,
    realtime: { conversationId: 'c', userId: 'me', messages: () => messages, otherReadSeq: () => readSeq, updateOtherRead: seq => { readSeq = seq; } },
  });
  await sync.refresh(true); fetchPage.mockClear();
  await sync.receive({ type: 'chat.message', conversationId: 'elsewhere', seq: 2, senderId: 'peer' });
  await sync.receive({ type: 'chat.read', conversationId: 'c', lastReadSeq: 2, userId: 'me' });
  expect(readSeq).toBe(0);
  await sync.receive({ type: 'chat.read', conversationId: 'c', lastReadSeq: 2, userId: 'peer' });
  expect(readSeq).toBe(2);
  await sync.receive({ type: 'chat.read', conversationId: 'c', lastReadSeq: 1, userId: 'peer' });
  expect(fetchPage).not.toHaveBeenCalled();
  await sync.receive({ type: 'chat.read', conversationId: 'c', lastReadSeq: 3, userId: 'peer' });
  expect(fetchPage).toHaveBeenCalledTimes(1);
  let finish!: (value: typeof messages) => void;
  fetchPage.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const first = sync.receive({ type: 'chat.message', conversationId: 'c', seq: 3, senderId: 'peer' });
  const next = sync.receive({ type: 'chat.message', conversationId: 'c', seq: 4, senderId: 'peer' });
  void sync.receive({ type: 'chat.message', conversationId: 'c', seq: 5, senderId: 'peer' });
  expect(fetchPage).toHaveBeenCalledTimes(2);
  finish(messages); await Promise.all([first, next]);
  expect(fetchPage).toHaveBeenCalledTimes(3);
  now = 2999; await sync.refresh(); expect(fetchPage).toHaveBeenCalledTimes(3);
  now = 3000; await sync.refresh(); expect(fetchPage).toHaveBeenCalledTimes(4);
  sync.stop();
  await sync.receive({ type: 'chat.read', conversationId: 'c', lastReadSeq: 6, userId: 'peer' });
  expect(fetchPage).toHaveBeenCalledTimes(4);
});

test.each(['coach', 'student'])('%s screen receives only matching messages, applies local reads and polls at 3s only offline', async role => {
  jest.useFakeTimers();
  if (role === 'student') useSessionStore.setState({ user: { ...user, role: 'coached_student' } });
  jest.mocked(chatRepository.messages).mockResolvedValue({ messages: [{ id: 'm', seq: 2, sender_id: 'me', body: 'hello peer', conversation_id: 'c', kind: 'text', client_id: 'm', created_at: '2026-09-05T09:00:00Z' }], meta: { has_more: false } });
  jest.mocked(chatRepository.read).mockResolvedValue({ unread_count: 0, my_last_read: { message_id: 'm', seq: 2 } });
  await act(async () => { renderer = create(<QueryClientProvider client={client}><Probe />{role === 'coach' ? <ConversationScreen conversationId="c" studentName="Peer" /> : <StudentConversationScreen conversationId="c" coachName="Peer" />}</QueryClientProvider>); });
  await act(async () => { await jest.advanceTimersByTimeAsync(1); });
  expect(chatRepository.messages).toHaveBeenCalledTimes(1);
  await act(async () => { await jest.advanceTimersByTimeAsync(3000); });
  expect(chatRepository.messages).toHaveBeenCalledTimes(2);
  await act(async () => sockets[0].frame('hello'));
  jest.mocked(chatRepository.messages).mockClear();
  await act(async () => { await jest.advanceTimersByTimeAsync(6000); });
  expect(chatRepository.messages).not.toHaveBeenCalled();
  await act(async () => sockets[0].frame('chat.message', { conversation_id: 'different', sender_id: 'peer', seq: 3 }));
  expect(chatRepository.messages).not.toHaveBeenCalled();
  await act(async () => sockets[0].frame('chat.read', { conversation_id: 'c', user_id: 'peer', last_read_seq: 2 }));
  expect(chatRepository.messages).not.toHaveBeenCalled();
  const readLabel = t(role === 'coach' ? 'chat.read' : 'student.studentBlackGoldChatView.copy016');
  expect(renderer.root.findAllByType(Text).some(node => node.props.children === readLabel)).toBe(true);
  await act(async () => sockets[0].frame('chat.message', { conversation_id: 'c', sender_id: 'peer', seq: 3 }));
  expect(chatRepository.messages).toHaveBeenCalledTimes(1);
  await foreground('background');
  await act(async () => { await jest.advanceTimersByTimeAsync(3000); });
  expect(chatRepository.messages).toHaveBeenCalledTimes(1);
  await foreground('active');
  expect(chatRepository.messages).toHaveBeenCalledTimes(2);
  await act(async () => { await jest.advanceTimersByTimeAsync(3000); });
  expect(chatRepository.messages).toHaveBeenCalledTimes(3);
});

test('inbox events during an existing HTTP load get exactly one trailing refresh', async () => {
  let finish!: (value: { conversations: [] }) => void;
  jest.mocked(chatRepository.list).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => { renderer = create(<QueryClientProvider client={client}><Probe /><CoachInbox /></QueryClientProvider>); });
  await act(async () => {
    sockets[0].frame('hello');
    for (let seq = 1; seq <= 5; seq++) sockets[0].frame('chat.message', { conversation_id: 'c', sender_id: 'peer', seq });
  });
  expect(chatRepository.list).toHaveBeenCalledTimes(1);
  await act(async () => finish({ conversations: [] }));
  expect(chatRepository.list).toHaveBeenCalledTimes(2);
});

test('lifecycle follows the AppState event value even before currentState is updated', async () => {
  await act(async () => { renderer = create(<Probe />); });
  await act(async () => listeners.forEach(listener => listener('inactive')));
  expect(sockets[0].close).toHaveBeenCalledTimes(1);
  await act(async () => listeners.forEach(listener => listener('active')));
  expect(sockets).toHaveLength(2);
});

test('switching accounts drops a queued inbox refresh before React cleans up the old observer', async () => {
  await act(async () => { renderer = create(<QueryClientProvider client={client}><Probe /><CoachInbox /></QueryClientProvider>); });
  await settle();
  let finish!: (value: { conversations: [] }) => void;
  jest.mocked(chatRepository.list).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => {
    sockets[0].frame('hello');
    sockets[0].frame('chat.message', { conversation_id: 'c', sender_id: 'peer', seq: 1 });
    sockets[0].frame('chat.message', { conversation_id: 'c', sender_id: 'peer', seq: 2 });
  });
  await act(async () => {
    useSessionStore.setState({ user: { ...user, id: 'new' } });
    finish({ conversations: [] });
  });
  await settle();
  expect(chatRepository.list).toHaveBeenCalledTimes(3); // Initial, event, new account's initial load.
});

test.each(['coach', 'student'])('%s screen clears an initial load failure after a successful realtime refresh', async role => {
  if (role === 'student') useSessionStore.setState({ user: { ...user, role: 'coached_student' } });
  jest.mocked(chatRepository.messages).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ messages: [], meta: { has_more: false } });
  await act(async () => { renderer = create(<QueryClientProvider client={client}><Probe />{role === 'coach' ? <ConversationScreen conversationId="c" studentName="Peer" /> : <StudentConversationScreen conversationId="c" coachName="Peer" />}</QueryClientProvider>); });
  const failure = t(role === 'coach' ? 'chat.loadMessagesFailed' : 'student.studentBlackGoldChatView.copy011');
  const hasFailure = () => renderer.root.findAllByType(Text).some(node => node.props.children === failure);
  expect(hasFailure()).toBe(true);
  await act(async () => {
    sockets[0].frame('hello');
    sockets[0].frame('chat.message', { conversation_id: 'c', sender_id: 'peer', seq: 1 });
  });
  expect(chatRepository.messages).toHaveBeenCalledTimes(2);
  expect(hasFailure()).toBe(false);
});
