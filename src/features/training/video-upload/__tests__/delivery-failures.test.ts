import { expect, test } from '@jest/globals';
import { EMPTY_VIDEO_UPLOAD, videoUploadReducer } from '../model';
import { videoDeliveryFailures } from '../delivery-failures';

test('first failure including backoff and a suspended set log appears in day, exercise and set markers', () => {
  const rows = [
    { stableSetId: 'waiting', exerciseId: 'bench', upload: { ...EMPTY_VIDEO_UPLOAD, status: 'waiting' as const } },
    { stableSetId: 'no-log', exerciseId: 'squat', upload: { ...EMPTY_VIDEO_UPLOAD, status: 'failed' as const } },
    { stableSetId: 'sending', exerciseId: 'bench', upload: { ...EMPTY_VIDEO_UPLOAD, status: 'uploading' as const } },
  ];
  expect(videoDeliveryFailures(rows)).toEqual({ count: 2, setIds: ['waiting', 'no-log'], exerciseIds: ['bench', 'squat'] });
});

test('manual retry keeps the failure visible until delivery, then removes all markers', () => {
  const failed = videoUploadReducer(EMPTY_VIDEO_UPLOAD, { type: 'failed', message: 'offline' });
  const retrying = videoUploadReducer(failed, { type: 'retry' });
  const row = { stableSetId: 'set', exerciseId: 'bench', upload: retrying };
  expect(videoDeliveryFailures([row]).count).toBe(1);
  expect(videoDeliveryFailures([{ ...row, upload: videoUploadReducer(retrying, { type: 'succeeded', attachmentId: 'video' }) }]).count).toBe(0);
});
