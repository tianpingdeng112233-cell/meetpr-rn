import { expect, test } from '@jest/globals';
import { inboxCount, inboxRows } from '../inbox';
const now = new Date('2026-09-05T12:00:00Z');
const conversation = (id: string, studentID: string, unreadCount = 1, lastMessageAt: string | null = null, otherPartyName = studentID) => ({ id, otherPartyID: studentID, otherPartyName, unreadCount, lastMessageAt, lastMessagePreview: 'Hello' });
test('one row per student keeps newest conversation and larger ID on a tie; count and badge use that same fold', () => {
  const conversations = [conversation('a', 'student', 9), conversation('b', 'student', 2), conversation('c', 'second', 3)];
  const rows = inboxRows({ conversations, videoGroups: [], now });
  expect(rows.find(row => row.studentID === 'student')?.conversation?.id).toBe('b');
  expect(rows).toHaveLength(2);
  expect(inboxCount(conversations, 4)).toBe(9);
  expect(inboxCount(conversations, 0)).toBe(rows.reduce((sum, row) => sum + row.unreadCount, 0));
});
test('sorts by priority, activity, natural name then student ID and prefers video preview', () => {
  const conversations = [conversation('1', 'both', 1), conversation('2', 'video', 0), conversation('3', 'unread', 1, '2026-09-05T12:00:00Z'), conversation('4', 'z', 0, null, 'Student 2'), conversation('5', 'a', 0, null, 'Student 2'), conversation('6', 'b', 0, null, 'Student 10'), conversation('7', 'recent', 0, '2026-09-05T10:00:00Z')];
  const videoGroups = ['both', 'video'].map(studentID => ({ studentID, studentName: studentID, count: 1, latestUploadedAt: '2026-09-05T11:00:00Z' }));
  const rows = inboxRows({ conversations, videoGroups, now });
  expect(rows.map(row => row.studentID)).toEqual(['both', 'video', 'unread', 'recent', 'a', 'z', 'b']);
  expect(rows[0].lastPreview).toBe('1 video awaiting feedback · 1 hour ago');
  expect(rows[2].lastPreview).toBe('Hello');
  expect(inboxRows({ conversations: [{ ...conversation('8', 'empty'), lastMessagePreview: null }], videoGroups: [], now })[0].lastPreview).toBe('No Messages');
});
test('a newer timestamp wins over a greater conversation ID and video-only students get a row', () => {
  const conversations = [conversation('z', 's', 8, null), conversation('a', 's', 2, '2026-09-05T11:00:00Z')];
  const rows = inboxRows({ conversations, videoGroups: [{ studentID: 'video-only', studentName: 'Video Student', count: 2, latestUploadedAt: '2026-09-05T11:00:00Z' }], now });
  expect(rows.map(row => [row.studentID, row.studentName])).toEqual([['video-only', 'Video Student'], ['s', 's']]);
  expect(rows[1].conversation?.id).toBe('a');
  expect(inboxCount(conversations, 2)).toBe(4);
});
