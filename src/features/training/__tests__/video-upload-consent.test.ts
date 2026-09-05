import { describe, expect, jest, test } from '@jest/globals';

import {
  requestVideoUploadConsent,
  VIDEO_UPLOAD_CONSENT_MESSAGE,
  VIDEO_UPLOAD_CONSENT_TITLE,
} from '../video-upload/consent';
import { VIDEO_UPLOAD_CONSENT_KEY } from '../video-upload/model';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  };
}

describe('video upload privacy gate', () => {
  test('shows exact copy only on first attach after consent', async () => {
    const storage = memoryStorage();
    const prompt = jest.fn(async () => true);

    await expect(
      requestVideoUploadConsent(storage, prompt),
    ).resolves.toBe(true);
    expect(prompt).toHaveBeenCalledWith({
      title: VIDEO_UPLOAD_CONSENT_TITLE,
      message: VIDEO_UPLOAD_CONSENT_MESSAGE,
      acceptLabel: '同意上传',
      declineLabel: '不上传',
    });
    expect(storage.setItem).toHaveBeenCalledWith(
      VIDEO_UPLOAD_CONSENT_KEY,
      'true',
    );

    await expect(
      requestVideoUploadConsent(storage, prompt),
    ).resolves.toBe(true);
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  test('does not persist a declined prompt', async () => {
    const storage = memoryStorage();
    await expect(
      requestVideoUploadConsent(storage, async () => false),
    ).resolves.toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
