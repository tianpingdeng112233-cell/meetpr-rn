import { afterEach, expect, jest, test } from '@jest/globals';
import { FeedbackResponseSchema } from '@/api/domains/feedback';
import { setLocaleOverride } from '@/i18n';
import { StudentVideoSchema } from '@/api/domains/videos';
import { feedbackVideoAssociation, feedbackVideoBadge, feedbackVideoName, feedbackVideoSummary } from '../video-presentation';

const wireVideo = {
  id: '00000000-0000-4000-8000-000000000001', set_log_id: null, plan_exercise_id: null,
  exercise_name: ' Squat ', set_index: 1, weight_kg: '100.00', reps: 5, rpe: '8.0',
  content_type: 'video/mp4', size_bytes: 100, filename: null,
  created_at: '2026-09-05T12:00:00Z', logged_at: null,
};
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
afterEach(() => setLocaleOverride(null));

test('Global feedback preserves its localized video metadata through summary and playback', () => {
  setLocaleOverride('en');
  const item = FeedbackResponseSchema.parse({ items: [{
    id: wireVideo.id, coach_id: wireVideo.id, student_id: wireVideo.id,
    day_date: '2026-09-22', plan_exercise_id: null, video_id: wireVideo.id,
    text: 'QA feedback', posted_at: wireVideo.created_at, read_at: null,
    video: { id: wireVideo.id, exercise_name: '竞技深蹲', exercise_name_en: 'Competition Squat',
      set_index: 0, weight_kg: '80.00', reps: 5, rpe: '7.0', logged_at: wireVideo.created_at },
  }] }).items[0];
  const association = feedbackVideoAssociation(item.video_id, [], item.video);
  expect(association.kind).toBe('available');
  if (association.kind !== 'available') throw new Error('Feedback video missing');
  expect(feedbackVideoSummary(association.video)).toBe('Competition Squat · Set 1 · 80 kg × 5 reps');
  expect(feedbackVideoBadge(association.video)).toMatchObject({ exerciseName: 'Competition Squat', setOrdinal: 1, weightKg: 80, reps: 5, rpe: 7 });
});

test('feedback video decoding and display mapping preserve RPE and convert the ordinal once', () => {
  expect(feedbackVideoBadge(StudentVideoSchema.parse(wireVideo))).toEqual({
    exerciseName: 'Squat', setOrdinal: 2, weightKg: 100, reps: 5, rpe: 8, coachName: null,
  });
});
test('missing association omits a badge, and invalid or missing decimals hide metrics', () => {
  expect(feedbackVideoBadge(undefined)).toBeUndefined();
  const video = StudentVideoSchema.parse({ ...wireVideo, rpe: undefined, weight_kg: null, set_index: null });
  expect(feedbackVideoBadge(video)).toMatchObject({ rpe: null, weightKg: null, setOrdinal: null });
  expect(feedbackVideoBadge({ ...video, rpe: 'Infinity', weight_kg: 'bad' })).toMatchObject({ rpe: null, weightKg: null });
  expect(feedbackVideoBadge({ ...video, rpe: ' ', weight_kg: '' })).toMatchObject({ rpe: null, weightKg: null });
});

test('legacy feedback keeps its video while explicit unavailable or mismatched metadata cannot substitute another clip', () => {
  const legacy = StudentVideoSchema.parse(wireVideo);
  expect(feedbackVideoAssociation(legacy.id, [legacy])).toEqual({ kind: 'available', video: legacy });
  expect(feedbackVideoAssociation(legacy.id, [legacy], null)).toEqual({ kind: 'unavailable' });
  expect(feedbackVideoAssociation(legacy.id, [legacy], { ...legacy, id: 'different' })).toEqual({ kind: 'unavailable' });
  expect(feedbackVideoAssociation(null, [], null)).toEqual({ kind: 'none' });
});

test('feedback preserves Chinese names in Chinese and falls back when English metadata is blank', () => {
  const names = { exercise_name: '竞技深蹲', exercise_name_en: 'Competition Squat' };
  setLocaleOverride('zh');
  expect(feedbackVideoName(names)).toBe('竞技深蹲');
  setLocaleOverride('en');
  expect(feedbackVideoName({ ...names, exercise_name_en: '  ' })).toBe('竞技深蹲');
  expect(feedbackVideoName({ exercise_name: null, exercise_name_en: null })).toBeNull();
});
