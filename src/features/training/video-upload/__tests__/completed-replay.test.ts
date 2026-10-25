import { expect, test } from '@jest/globals';
import { latestVideoFeedbackId, playableSetVideo } from '../completed-replay';
import { EMPTY_VIDEO_UPLOAD } from '../model';
import type { StudentVideo } from '@/api/domains/videos';

test('reviewed means matching feedback, choosing the newest posted entry', () => {
  const feedback = [
    { id: 'new', video_id: 'video', posted_at: '2026-10-24T12:00:00Z' },
    { id: 'other', video_id: 'other-video', posted_at: '2026-10-24T13:00:00Z' },
    { id: 'old', video_id: 'video', posted_at: '2026-10-23T12:00:00Z' },
  ];
  expect(latestVideoFeedbackId('video', feedback)).toBe('new');
  expect(latestVideoFeedbackId('unreviewed', feedback)).toBeNull();
  expect(latestVideoFeedbackId(null, feedback)).toBeNull();
});

test('a set replays its newest uploaded video, with a retained local file preferred', () => {
  const videos = [video('old', '2026-10-23T12:00:00Z'), video('new', '2026-10-24T12:00:00Z')];
  expect(playableSetVideo('log', videos, EMPTY_VIDEO_UPLOAD, false)).toEqual({ attachmentId: 'new', localUri: null });
  const local = { ...EMPTY_VIDEO_UPLOAD, status: 'uploaded' as const, setLogId: 'log', attachmentId: 'new', localUri: 'file:///set.mp4', createdAt: Date.parse('2026-10-24T12:00:00Z') };
  expect(playableSetVideo('log', videos, local, true)).toEqual({ attachmentId: 'new', localUri: 'file:///set.mp4' });
  expect(playableSetVideo('log', [], { ...local, attachmentId: null }, true)).toEqual({ attachmentId: null, localUri: 'file:///set.mp4' });
  expect(playableSetVideo('log', [], { ...local, attachmentId: null }, false)).toBeNull();
  expect(playableSetVideo('different', videos, EMPTY_VIDEO_UPLOAD, false)).toBeNull();
});

function video(id: string, created_at: string): StudentVideo {
  return { id, created_at, set_log_id: 'log', plan_exercise_id: null, exercise_name: null, set_index: 0, weight_kg: null, reps: null, content_type: 'video/mp4', size_bytes: 100, filename: null, logged_at: null };
}

test.each(['pending', 'preparing', 'uploading', 'waiting', 'failed'] as const)('%s hides replay even with an older remote or retained file', status => {
  expect(playableSetVideo('log', [video('old', '2026-10-23T12:00:00Z')], {
    ...EMPTY_VIDEO_UPLOAD, status, localUri: 'file:///set.mp4', attachmentId: 'upload',
  }, true)).toBeNull();
});
