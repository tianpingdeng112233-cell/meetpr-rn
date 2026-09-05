import { expect, jest, test } from '@jest/globals';
import { mergeMessages, createConversationSync, conversationSubtitle, applyReadState } from '../conversation-model';
test('merges overlapping pages by identity and orders by sequence with stable ID ties', () => {
  expect(mergeMessages([{ id: 'b', seq: 2 }, { id: 'a', seq: 1 }], [{ id: 'b', seq: 2 }, { id: 'c', seq: 2 }])).toEqual([{ id: 'a', seq: 1 }, { id: 'b', seq: 2 }, { id: 'c', seq: 2 }]);
});
test('enter reads the latest message; polls at 30 seconds without overlapping and retries failed read', async () => {
  let now = 0;
  const fetchPage = jest.fn<() => Promise<{ id: string; seq: number }[]>>().mockResolvedValue([{ id: 'a', seq: 1 }]);
  const markRead = jest.fn<(id: string) => Promise<void>>().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
  const sync = createConversationSync({ now: () => now, fetchPage, markRead });
  await expect(sync.refresh(true)).rejects.toThrow('offline');
  expect(markRead).toHaveBeenCalledWith('a');
  await sync.refresh(true);
  expect(markRead).toHaveBeenCalledTimes(2);
  now = 29999;
  await sync.refresh();
  expect(fetchPage).toHaveBeenCalledTimes(2);
  now = 30000;
  await Promise.all([sync.refresh(), sync.refresh()]);
  expect(fetchPage).toHaveBeenCalledTimes(3);
  expect(markRead).toHaveBeenCalledTimes(2);
  now = 60000;
  fetchPage.mockResolvedValue([{ id: 'b', seq: 2 }]);
  await sync.refresh();
  expect(markRead).toHaveBeenLastCalledWith('b');
});

test('leaving a conversation prevents an in-flight page from marking messages read', async () => {
  let resolve!: (messages: { id: string; seq: number }[]) => void;
  const markRead = jest.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined);
  const sync = createConversationSync({ now: () => 0, fetchPage: () => new Promise<{ id: string; seq: number }[]>(done => { resolve = done; }), markRead });
  const pending = sync.refresh(true);
  sync.stop();
  resolve([{ id: 'late', seq: 3 }]);
  expect(await pending).toBeUndefined();
  expect(markRead).not.toHaveBeenCalled();
});

test('unknown student status has no subtitle, while attention never defaults to active', () => {
  expect(conversationSubtitle(undefined)).toBeNull();
  expect(conversationSubtitle('unrecognized')).toBeNull();
  expect(conversationSubtitle('abnormal')).toBe('coach.chat.attentionStudentSubtitle');
  expect(conversationSubtitle('active')).toBe('coach.chat.activeStudentSubtitle');
  expect(conversationSubtitle('in_evaluation')).toBe('coach.chat.activeStudentSubtitle');
});

test('acknowledged read immediately clears unread, and an older read cursor cannot resurrect it', () => {
  const old = [{ id: 'c', unread_count: 3, my_last_read: { message_id: 'a', seq: 1 } }];
  const read = applyReadState(old, 'c', { unread_count: 0, my_last_read: { message_id: 'b', seq: 4 } });
  expect(read[0].unread_count).toBe(0);
  expect(applyReadState(read, 'c', { unread_count: 2, my_last_read: { message_id: 'a', seq: 2 } })).toEqual(read);
});
