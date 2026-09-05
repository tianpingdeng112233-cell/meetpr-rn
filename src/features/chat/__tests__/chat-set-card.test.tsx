import { afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { ChatSetCard } from '../ChatSetCard';
import { t } from '@/i18n';
import type { ChatMessage, ChatSetRef } from '@/api/domains/chat';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const reference: ChatSetRef = { v: 1, source: 'logged', exerciseName: 'Squat', setNumber: 2, setTotal: 3, weightKg: '100.5', reps: 5, rpe: '8.5', dayDate: '2026-09-05', setLogId: '10000000-0000-4000-8000-000000000000' };
const message: ChatMessage = { id: 'share', conversation_id: 'conversation', seq: 1, sender_id: 'student', kind: 'text', body: '', client_id: 'client', created_at: '2026-09-05T09:03:00Z' };
let renderer: ReactTestRenderer;
afterEach(() => { act(() => renderer?.unmount()); });

test('outgoing card includes its delivery footer and remark', async () => {
  await act(async () => { renderer = create(<ChatSetCard reference={reference} message={message} note="Keep the tempo" outgoing read={false} />); });
  const copy = renderer.root.findAllByType(Text).map(node => node.props.children);
  expect(copy).toContain(t('chat.setCardDelivered'));
  expect(copy).toContain('Keep the tempo');
});

test.each([null, '', 'Keep the tempo'])('incoming card has no delivery footer with remark %p', async note => {
  await act(async () => { renderer = create(<ChatSetCard reference={reference} message={message} note={note} outgoing={false} read />); });
  const copy = renderer.root.findAllByType(Text).map(node => node.props.children);
  expect(copy).not.toContain(t('chat.setCardRead'));
  expect(copy).not.toContain(t('chat.setCardDelivered'));
  expect(copy.includes('Keep the tempo')).toBe(Boolean(note));
});

test('outgoing read card shows its read footer without an empty remark', async () => {
  await act(async () => { renderer = create(<ChatSetCard reference={reference} message={message} note={null} outgoing read />); });
  expect(renderer.root.findAllByType(Text).map(node => node.props.children)).toContain(t('chat.setCardRead'));
});
