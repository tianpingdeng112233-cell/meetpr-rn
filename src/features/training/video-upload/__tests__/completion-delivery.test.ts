import { expect, test } from '@jest/globals';
import { EMPTY_VIDEO_UPLOAD } from '../model';
import { completionVideoSummary, dayCompletionVideos } from '../completion-delivery';

test('completion counts waiting-for-set and backoff as undelivered, separates failures from active uploads', () => {
  const summary = completionVideoSummary([
    { ...EMPTY_VIDEO_UPLOAD, status: 'uploaded' },
    { ...EMPTY_VIDEO_UPLOAD, status: 'pending' },
    { ...EMPTY_VIDEO_UPLOAD, status: 'waiting' },
    { ...EMPTY_VIDEO_UPLOAD, status: 'uploading', retry: { failureCount: 1, firstFailureAt: 0, lastFailureAt: 0, failure: 'network' } },
    EMPTY_VIDEO_UPLOAD,
  ]);
  expect(summary).toEqual({ failed: 2, uploading: 1, done: 1, total: 4, undelivered: 3, delivered: false });
});

test('waiting-day videos include later additions and replacements but never other days or accounts', () => {
  const record = (status: typeof EMPTY_VIDEO_UPLOAD.status, extra = {}) => ({ ...EMPTY_VIDEO_UPLOAD, status, ...extra });
  const context = { sets: [{ stableSetId: 'original', setLogId: 'server-original' }], exerciseIds: ['exercise'] };
  const rows = dayCompletionVideos('alice', 'day', context, {
    'alice:original': record('uploaded'),
    'alice:new': record('pending', { logRequest: { plan_day_id: 'day' } }),
    'alice:replacement': record('preparing', { logRequest: { plan_exercise_id: 'exercise' } }),
    'alice:history': record('failed', { logRequest: { plan_day_id: 'history' } }),
    'bob:original': record('failed'),
  });
  expect(rows.map((row: { stableSetId: string }) => row.stableSetId)).toEqual(['original', 'new', 'replacement']);
  expect(completionVideoSummary(rows.map((row: { upload: typeof EMPTY_VIDEO_UPLOAD }) => row.upload))).toMatchObject({ done: 1, total: 3, delivered: false });
});

test('re-adding a set while waiting includes its replacement video after an older delete receipt', () => {
  const rows = dayCompletionVideos('alice', 'day', { sets: [], exerciseIds: [] },
    { 'alice:extra': { ...EMPTY_VIDEO_UPLOAD, status: 'pending' } }, [
      { stableSetId: 'extra', dayId: 'day', remove: true, log: { id: 'old' } },
      { stableSetId: 'extra', dayId: 'day', remove: false, log: { id: 'new' } },
    ]);
  expect(completionVideoSummary(rows.map(row => row.upload))).toMatchObject({ total: 1, delivered: false });
});
