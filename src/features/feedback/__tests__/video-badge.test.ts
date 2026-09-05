import { expect, jest, test } from '@jest/globals';
import { StudentVideoSchema } from '@/api/domains/videos';
import { feedbackVideoBadge } from '../video-presentation';

const wireVideo = {
  id: '00000000-0000-4000-8000-000000000001', set_log_id: null, plan_exercise_id: null,
  exercise_name: ' Squat ', set_index: 1, weight_kg: '100.00', reps: 5, rpe: '8.0',
  content_type: 'video/mp4', size_bytes: 100, filename: null,
  created_at: '2026-09-05T12:00:00Z', logged_at: null,
};
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

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
