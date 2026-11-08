import { expect, test } from '@jest/globals';
import type { ChatMessage } from '@/api/domains/chat';
import type { FeedbackItem } from '@/api/domains/feedback';
import { feedbackCoverSize, chatTimeSeparators, sharedSetAttachment, mergeStudentTimeline, visibleFraction, videoLabel, videoDuration, totalUnreadCount } from '../student-timeline';

import { setLocaleOverride, t } from '@/i18n';

test('portrait feedback covers use 240dp height and preserve the image ratio with a 135dp minimum width', () => {
  expect(feedbackCoverSize(900, 1200, 300)).toEqual({ width: 180, height: 240 });
  expect(feedbackCoverSize(400, 1200, 300)).toEqual({ width: 135, height: 240 });
});

test.each([
  ['landscape', 1200, 900],
  ['square', 900, 900],
  ['missing', undefined, undefined],
  ['empty', null, null],
  ['zero width', 0, 1200],
  ['invalid height', 900, Infinity],
])('%s feedback covers keep the full available width and 150dp height', (_kind, width, height) => {
  expect(feedbackCoverSize(width, height, 300)).toEqual({ width: 300, height: 150 });
});

test('interleaves messages, unseen plan and feedback chronologically with ID ties', () => {
  const messages = [{ id: 'z', created_at: '2026-09-05T09:03:00Z' }, { id: 'a', created_at: '2026-09-05T09:01:00Z' }] as ChatMessage[];
  const feedback = [{ id: 'b', posted_at: '2026-09-05T09:01:00Z' }] as FeedbackItem[];
  const notice = { signature: { planId: 'p', publishedAt: '2026-09-05T09:02:00Z' }, weekIndex: 2 };
  expect(mergeStudentTimeline(messages, notice, feedback).map(item => item.id)).toEqual([
    'feedback-b', 'message-a', 'plan-p.2026-09-05T09:02:00Z', 'message-z',
  ]);
  expect(mergeStudentTimeline(messages, null, feedback).map(item => item.kind)).toEqual(['feedback', 'message', 'message']);
});

test('feedback visibility measures its own height, including clipped and zero-height cards', () => {
  expect(visibleFraction({ y: 20, height: 100 }, { y: 0, height: 200 })).toBe(1);
  expect(visibleFraction({ y: -50, height: 100 }, { y: 0, height: 200 })).toBe(0.5);
  expect(visibleFraction({ y: 20, height: 0 }, { y: 0, height: 200 })).toBe(0);
  expect(visibleFraction({ y: 200, height: 100 }, { y: 0, height: 200 })).toBe(0);
});
test('video labels include available exercise and one-based set position; missing duration hides the badge', () => {
  setLocaleOverride('en');
  expect(videoLabel({ exercise_name: 'Squat', set_index: 0 })).toBe('My Squat · Set 1');
  expect(videoLabel({ exercise_name: 'Squat', set_index: null })).toBe('My Squat');
  expect(videoLabel(null)).toBe(t('student.studentChatTimeline.copy001'));
  expect(videoDuration(8)).toBe('0:08');
  expect(videoDuration(65)).toBe('1:05');
  expect(videoDuration(null)).toBeNull();
  setLocaleOverride(null);
});
test('header count adds one unseen plan, unread feedback and coach chat messages', () => {
  expect(totalUnreadCount({ hasPlanNotice: true, feedbackUnread: 2, chatUnread: 4 })).toBe(7);
  expect(totalUnreadCount({ hasPlanNotice: false, feedbackUnread: 2, chatUnread: 0 })).toBe(2);
});

test('shared-set attachment presents the note before compact metrics and omits unavailable fields', () => {
  const ref = { v: 1 as const, source: 'logged' as const, exerciseName: 'Squat', setNumber: 2, setTotal: 3, weightKg: '50', reps: 5, rpe: '8', dayDate: '2026-10-02', setLogId: null };
  expect(sharedSetAttachment(ref, 'Check depth', 'https://video')).toEqual({ note: 'Check depth', title: 'Squat', subtitle: 'Set 2 of 3 · 50kg × 5 · RPE 8', hasVideo: true });
  expect(sharedSetAttachment({ ...ref, setTotal: null, weightKg: null, reps: null, rpe: null }, '', null)).toEqual({ note: null, title: 'Squat', subtitle: 'Set 2', hasVideo: false });
  expect(sharedSetAttachment({ ...ref, weightKg: null, repsMax: 8, rpe: null }, null, null).subtitle).toBe('Set 2 of 3 · 5–8 reps');
  expect(sharedSetAttachment({ ...ref, reps: null, rpe: null }, null, null).subtitle).toBe('Set 2 of 3 · 50kg');
});


test('separates the first item and gaps of at least five minutes, recomputing the history join', () => {
  const now = new Date('2026-11-06T20:00:00');
  const recent = ['2026-11-06T19:00:00', '2026-11-06T19:04:59', '2026-11-06T19:09:59'];
  expect(chatTimeSeparators(recent, now, 'zh')).toEqual([{ index: 0, label: '19:00' }, { index: 2, label: '19:09' }]);
  expect(chatTimeSeparators(['2026-11-06T18:59:00', ...recent], now, 'zh')).toEqual([{ index: 0, label: '18:59' }, { index: 3, label: '19:09' }]);
  expect(chatTimeSeparators([], now, 'zh')).toEqual([]);
});

test.each([
  ['zh', ['19:34', '昨天 19:34', '周三 19:34', '10月3日 19:34', '2025年11月3日 19:34']],
  ['zh-Hant', ['19:34', '昨天 19:34', '週三 19:34', '10月3日 19:34', '2025年11月3日 19:34']],
  ['en-u-hc-h23', ['19:34', 'Yesterday 19:34', 'Wed 19:34', 'Oct 3 19:34', 'Nov 3, 2025 19:34']],
  ['en-u-hc-h12', ['07:34 PM', 'Yesterday 07:34 PM', 'Wed 07:34 PM', 'Oct 3 07:34 PM', 'Nov 3, 2025 07:34 PM']],
])('formats all five local calendar tiers for %s', (locale, expected) => {
  const now = new Date('2026-11-06T20:00:00');
  const dates = ['2026-11-06T19:34:00', '2026-11-05T19:34:00', '2026-11-04T19:34:00', '2026-10-03T19:34:00', '2025-11-03T19:34:00'];
  expect(dates.map(date => chatTimeSeparators([date], now, locale as string)[0].label)).toEqual(expected);
});

test('uses calendar days across midnight, year boundaries and the seventh day', () => {
  expect(chatTimeSeparators(['2025-12-31T23:59:00'], new Date('2026-01-01T00:01:00'), 'zh')[0].label).toBe('昨天 23:59');
  expect(chatTimeSeparators(['2026-10-31T19:34:00'], new Date('2026-11-06T00:01:00'), 'zh')[0].label).toBe('周六 19:34');
  expect(chatTimeSeparators(['2026-10-30T19:34:00'], new Date('2026-11-06T00:01:00'), 'zh')[0].label).toBe('10月30日 19:34');
});
