import { afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet, Text, View } from 'react-native';
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


test.each([false, true])('card sizes its title from content without a note (outgoing: %s)', async outgoing => {
  for (const video_url of [undefined, 'https://example.test/video.mp4']) {
    await act(async () => { renderer = create(<ChatSetCard reference={reference} message={{ ...message, video_url }} note={null} outgoing={outgoing} read={false} />); });
    const title = renderer.root.findAllByType(Text).find(node => node.props.children === 'Squat')!;
    let column = title.parent!;
    while (column.type !== View) column = column.parent!;
    expect(StyleSheet.flatten(column.props.style)).toMatchObject({ flexBasis: 'auto', flexShrink: 1 });
    expect(StyleSheet.flatten(column.props.style).flex).toBeUndefined();
    expect(StyleSheet.flatten(renderer.root.findByProps({ testID: 'chat.setCard.share' }).props.style)).toMatchObject({ maxWidth: '88%', alignSelf: outgoing ? 'flex-end' : 'flex-start' });
    act(() => renderer.unmount());
  }
});
