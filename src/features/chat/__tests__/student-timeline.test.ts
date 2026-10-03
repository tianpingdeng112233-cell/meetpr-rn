import { expect, test } from '@jest/globals';
import type { ChatMessage } from '@/api/domains/chat';
import type { FeedbackItem } from '@/api/domains/feedback';
import { sharedSetAttachment, mergeStudentTimeline, visibleFraction, videoLabel, videoDuration, totalUnreadCount } from '../student-timeline';

import { setLocaleOverride, t } from '@/i18n';

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
test('video labels include available exercise and one-based set position; missing duration stays unknown', () => {
  setLocaleOverride('en');
  expect(videoLabel({ exercise_name: 'Squat', set_index: 0 })).toBe('My Squat · Set 1');
  expect(videoLabel({ exercise_name: 'Squat', set_index: null })).toBe('My Squat');
  expect(videoLabel(null)).toBe(t('student.studentChatTimeline.copy001'));
  expect(videoDuration(8)).toBe('0:08');
  expect(videoDuration(65)).toBe('1:05');
  expect(videoDuration(null)).toBe('—:—');
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
