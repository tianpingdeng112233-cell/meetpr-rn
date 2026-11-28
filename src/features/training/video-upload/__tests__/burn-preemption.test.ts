import { afterEach, expect, jest, test } from '@jest/globals';
import { saveRecordingVideo } from '../gallery-save';
import { beginUploadPreparation, videoTranscodes } from '../recording-gallery';

const mockNative = {
  trimInfo: jest.fn(async (_uri: string) => ({ durationMs: 5000, displayWidth: 720, displayHeight: 1280 })),
  reserveGalleryOriginal: jest.fn(),
  burnBadge: jest.fn(),
  cancelBadge: jest.fn(),
};
jest.mock('../trim-native', () => ({ trainingVideoTrim: () => mockNative }));
jest.mock('../native', () => ({ holdLocalVideo: () => () => {}, deleteLocalVideo: jest.fn() }));
jest.mock('../diagnostics', () => ({ reportVideoProcessingFailure: jest.fn() }));
jest.mock('expo-media-library', () => ({ Asset: { create: jest.fn(async () => {}) } }));
jest.mock('expo-file-system', () => ({ Paths: { cache: { uri: 'file:///cache' } }, File: class {} }));

afterEach(() => { jest.clearAllMocks(); jest.useRealTimers(); });

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const squat = { exerciseName: 'Squat', weightKg: 130, reps: 5 };
const bitmap = { release: jest.fn() };

test('a trim the user is waiting on preempts a running burn, which is redone afterwards and saved once', async () => {
  const uri = 'file:///recorded-a.mp4';
  const burns = [deferred<{ uri: string }>(), deferred<{ uri: string }>()];
  mockNative.burnBadge.mockImplementation(() => burns[mockNative.burnBadge.mock.calls.length - 1]!.promise);
  mockNative.cancelBadge.mockImplementation(async () => { burns[0]!.reject(new Error('Video trim cancelled')); });
  const publish = jest.fn(async (output: string | null) => output !== null);
  mockNative.reserveGalleryOriginal.mockImplementation(async () => ({ finish: publish, release: jest.fn() }));

  jest.useFakeTimers();
  const saved = saveRecordingVideo(uri, squat, (async () => bitmap) as never, Promise.resolve(true), 5000);
  beginUploadPreparation(uri)();
  await flush();
  expect(mockNative.burnBadge).toHaveBeenCalledTimes(1);

  const trim = deferred<string>();
  const userTrim = videoTranscodes.runUserTask(() => trim.promise);
  await flush();
  expect(mockNative.cancelBadge).toHaveBeenCalledTimes(1);
  // Being preempted is not a failure: nothing is published and the burn waits for the user.
  expect(publish).not.toHaveBeenCalled();
  expect(mockNative.burnBadge).toHaveBeenCalledTimes(1);

  trim.resolve('file:///trimmed-b.mp4');
  await expect(userTrim).resolves.toBe('file:///trimmed-b.mp4');
  await flush();
  expect(mockNative.burnBadge).toHaveBeenCalledTimes(2);
  burns[1]!.resolve({ uri: 'file:///cache/badged-a.mp4' });
  await expect(saved).resolves.toBe(true);
  expect(publish.mock.calls).toEqual([['file:///cache/badged-a.mp4']]);
});
