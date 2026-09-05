import { describe, expect, test } from '@jest/globals';

import {
  EMPTY_VIDEO_UPLOAD,
  recoverInterruptedVideoUploads,
  shouldPassthroughVideo,
  type SelectedVideo,
  videoPartCount,
  videoUploadReducer,
  VIDEO_PART_SIZE_BYTES,
} from '../video-upload/model';

const SOURCE: SelectedVideo = {
  uri: 'file:///video.mp4',
  width: 1920,
  height: 1080,
  durationMs: 30_000,
  mimeType: 'video/mp4',
  fileName: 'video.mp4',
  codec: 'h264',
  rotationDegrees: 0,
};

describe('video processing policy', () => {
  test('passes through H.264 exactly at both display-size boundaries', () => {
    expect(
      shouldPassthroughVideo({ codec: 'H.264', width: 1920, height: 1080 }),
    ).toBe(true);
    expect(
      shouldPassthroughVideo({ codec: 'avc1.640028', width: 1080, height: 1920 }),
    ).toBe(true);
    expect(
      shouldPassthroughVideo({
        codec: 'h264',
        width: 1080,
        height: 1920,
        rotationDegrees: 90,
      }),
    ).toBe(true);
  });

  test('transcodes non-H.264 and either dimension above the boundary', () => {
    expect(
      shouldPassthroughVideo({ codec: 'hevc', width: 1920, height: 1080 }),
    ).toBe(false);
    expect(
      shouldPassthroughVideo({ codec: 'h264', width: 1921, height: 1080 }),
    ).toBe(false);
    expect(
      shouldPassthroughVideo({ codec: 'h264', width: 1920, height: 1081 }),
    ).toBe(false);
    expect(
      shouldPassthroughVideo({ codec: null, width: 1920, height: 1080 }),
    ).toBe(false);
  });
});

describe('video multipart policy', () => {
  test('calculates 5 MiB part boundaries', () => {
    expect(videoPartCount(1)).toBe(1);
    expect(videoPartCount(VIDEO_PART_SIZE_BYTES)).toBe(1);
    expect(videoPartCount(VIDEO_PART_SIZE_BYTES + 1)).toBe(2);
    expect(videoPartCount(200 * 1024 * 1024)).toBe(40);
  });
});

describe('video upload state machine', () => {
  test('moves through processing, upload, success, deletion', () => {
    let state = videoUploadReducer(EMPTY_VIDEO_UPLOAD, {
      type: 'attach',
      source: SOURCE,
    });
    expect(state.status).toBe('pending');
    state = videoUploadReducer(state, {
      type: 'setLogReady',
      setLogId: 'set-log',
    });
    state = videoUploadReducer(state, {
      type: 'prepared',
      localUri: 'file:///prepared.mp4',
      sizeBytes: 100,
    });
    expect(state.status).toBe('preparing');
    state = videoUploadReducer(state, {
      type: 'uploadStarted',
      attachmentId: 'attachment-1',
    });
    state = videoUploadReducer(state, { type: 'progress', progress: 0.45 });
    expect(state).toMatchObject({ status: 'uploading', progress: 0.45 });
    state = videoUploadReducer(state, {
      type: 'succeeded',
      attachmentId: 'attachment-1',
    });
    expect(state).toMatchObject({ status: 'uploaded', progress: 1 });
    expect(videoUploadReducer(state, { type: 'remove' })).toBe(
      EMPTY_VIDEO_UPLOAD,
    );
  });

  test('keeps prepared file on failure and retries from a fresh preparing state', () => {
    let state = videoUploadReducer(EMPTY_VIDEO_UPLOAD, {
      type: 'attach',
      source: SOURCE,
    });
    state = videoUploadReducer(state, {
      type: 'prepared',
      localUri: 'file:///prepared.mp4',
      sizeBytes: 100,
    });
    state = videoUploadReducer(state, {
      type: 'uploadStarted',
      attachmentId: 'attachment-old',
    });
    state = videoUploadReducer(state, {
      type: 'failed',
      message: '视频处理失败,请重试',
    });
    expect(state).toMatchObject({
      status: 'failed',
      prepared: true,
      localUri: 'file:///prepared.mp4',
    });
    state = videoUploadReducer(state, { type: 'retry' });
    expect(state).toMatchObject({
      status: 'preparing',
      attachmentId: null,
      prepared: true,
    });
  });

  test('app startup marks interrupted processing and uploads as failed', () => {
    const pending = videoUploadReducer(EMPTY_VIDEO_UPLOAD, {
      type: 'attach',
      source: SOURCE,
    });
    const uploading = videoUploadReducer(
      videoUploadReducer(pending, {
        type: 'prepared',
        localUri: 'file:///prepared.mp4',
        sizeBytes: 100,
      }),
      { type: 'uploadStarted', attachmentId: 'attachment-1' },
    );
    const uploaded = videoUploadReducer(uploading, {
      type: 'succeeded',
      attachmentId: 'attachment-1',
    });
    const recovered = recoverInterruptedVideoUploads({
      pending,
      uploading,
      uploaded,
    });

    expect(recovered.pending.status).toBe('failed');
    expect(recovered.uploading.status).toBe('failed');
    expect(recovered.uploaded.status).toBe('uploaded');
  });
});
