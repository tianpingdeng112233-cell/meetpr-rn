import { describe, expect, jest, test } from '@jest/globals';

import type {
  UploadInitiateRequest,
  UploadInitiateResponse,
} from '@/api/domains/uploads';
import { ApiError } from '@/api/client';

import { runPreparedVideoUpload } from '../video-upload/upload-runner';

const SET_LOG_ID = '11111111-1111-4111-8111-111111111111';
const ATTACHMENT_1 = '22222222-2222-4222-8222-222222222222';
const ATTACHMENT_2 = '33333333-3333-4333-8333-333333333333';

describe('prepared video upload retry', () => {
  test('a failed retry performs a brand-new initiate', async () => {
    const initiate = jest
      .fn<(input: UploadInitiateRequest) => Promise<UploadInitiateResponse>>()
      .mockResolvedValueOnce({
        attachment_id: ATTACHMENT_1,
        upload_id: 'upload-1',
        part_urls: [{ part_number: 1, url: 'https://oss.example/1' }],
      })
      .mockResolvedValueOnce({
        attachment_id: ATTACHMENT_2,
        upload_id: 'upload-2',
        part_urls: [{ part_number: 1, url: 'https://oss.example/2' }],
      });
    const abort = jest.fn(async () => undefined);
    const complete = jest.fn(async (attachmentId: string) => ({ id: attachmentId }));
    const repository = { initiate, abort, complete };
    const firstParts = jest.fn(async () => {
      throw new Error('part failed');
    });
    const secondParts = jest.fn(async () => [
      { part_number: 1, etag: 'etag-2' },
    ]);
    const input = {
      localUri: 'file:///prepared.mp4',
      setLogId: SET_LOG_ID,
      sizeBytes: 100,
      signal: new AbortController().signal,
      onInitiated: jest.fn(),
      onProgress: jest.fn(),
    };

    await expect(
      runPreparedVideoUpload(input, {
        repository: repository as never,
        uploadParts: firstParts,
      }),
    ).rejects.toThrow('part failed');
    expect(abort).toHaveBeenCalledWith(ATTACHMENT_1);

    await expect(
      runPreparedVideoUpload(input, {
        repository: repository as never,
        uploadParts: secondParts,
      }),
    ).resolves.toBe(ATTACHMENT_2);
    expect(initiate).toHaveBeenCalledTimes(2);
    expect(initiate.mock.calls[0][0]).toMatchObject({
      filename: `setlog-${SET_LOG_ID}-prepared.mp4`,
      set_log_id: SET_LOG_ID,
    });
    expect(initiate.mock.calls[1][0]).toMatchObject({
      filename: `setlog-${SET_LOG_ID}-prepared.mp4`,
      set_log_id: SET_LOG_ID,
    });
    expect(complete).toHaveBeenCalledWith(ATTACHMENT_2, {
      parts: [{ part_number: 1, etag: 'etag-2' }],
    });
  });

  test('does not abort when complete returns 409', async () => {
    const abort = jest.fn(async () => undefined);
    const repository = {
      initiate: jest.fn(async () => ({
        attachment_id: ATTACHMENT_1,
        upload_id: 'upload-1',
        part_urls: [{ part_number: 1, url: 'https://oss.example/1' }],
      })),
      abort,
      complete: jest.fn(async () => {
        throw new ApiError('backend', 'UPLOAD_INVALID_STATE', {
          status: 409,
          code: 'UPLOAD_INVALID_STATE',
        });
      }),
    };

    await expect(
      runPreparedVideoUpload(
        {
          localUri: 'file:///prepared.mp4',
          setLogId: SET_LOG_ID,
          sizeBytes: 100,
          signal: new AbortController().signal,
          onInitiated: jest.fn(),
          onProgress: jest.fn(),
        },
        {
          repository: repository as never,
          uploadParts: async () => [{ part_number: 1, etag: 'etag-1' }],
        },
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(abort).not.toHaveBeenCalled();
  });
});
