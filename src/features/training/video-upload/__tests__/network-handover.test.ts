// Diagnostic boundary simulation, NOT a recording of the Xiaomi native transport.
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { videoUploadManager } from '../manager';
import { flushVideoUploads, resetVideoUploadStoreForTests, useVideoUploadStore } from '../store';

let mockNetwork: (state: { type: string; isConnected: boolean; isInternetReachable: boolean }) => void;
let mockCancelHangs = false;
let mockUploadHangs = true;
let releaseUpload: () => void;
let releaseCancel: () => void;
const mockUpload = jest.fn<() => Promise<{ status: number; headers: { ETag: string }; body: string }>>();
const mockCancel = jest.fn<() => Promise<void>>();
const mockRemove = jest.fn<(id: string) => Promise<void>>();
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: (listener: typeof mockNetwork) => { mockNetwork = listener; return () => {}; } }));
jest.mock('@/analytics', () => ({ AnalyticsEvent: { MediaUpload: 'media_upload' }, track: async () => {} }));
jest.mock('../failure-notifier', () => ({ notifyUploadFailures: () => {} }));
jest.mock('../native', () => ({
  ...jest.requireActual<typeof import('../native-error')>('../native-error'),
  retainVideoSource: async (source: unknown) => source,
  prepareTrainingVideo: async () => ({ localUri: 'file:///diagnose.mp4', sizeBytes: 1 }),
  localVideoSize: () => 1, cleanOrphanVideos: () => {}, deleteLocalVideo: () => {}, cancelVideoCompression: () => {},
}));
jest.mock('@/api/domains/uploads', () => ({ uploadsRepository: {
  initiate: async () => ({ attachment_id: 'attachment', upload_id: 'upload', part_urls: [{ part_number: 1, url: 'https://example.invalid/part' }] }),
  complete: async () => ({ id: 'attachment' }), abort: async () => {}, remove: (id: string) => mockRemove(id),
} }));
jest.mock('expo-file-system/legacy', () => ({ FileSystemUploadType: { BINARY_CONTENT: 0 }, createUploadTask: () => ({ uploadAsync: mockUpload, cancelAsync: mockCancel }) }));
jest.mock('expo-file-system', () => ({
  File: class {
    uri = 'file:///diagnose.mp4'; size = 1; exists = true;
    open() { return { offset: 0, readBytes: () => new Uint8Array(1), close() {} }; }
    write() {} delete() {}
  },
  Directory: class { exists = false; create() {} delete() {} }, Paths: { cache: 'file:///cache' },
}));
let dispose: (() => void) | undefined;
let attaching: Promise<void> | undefined;
const flush = async () => { for (let i = 0; i < 60; i++) await Promise.resolve(); };
beforeEach(async () => {
  mockRemove.mockReset().mockResolvedValue();
  jest.useFakeTimers({ now: new Date('2026-10-02T12:00:00Z') });
  await AsyncStorage.clear(); resetVideoUploadStoreForTests();
  mockUpload.mockReset().mockImplementation(() => mockUploadHangs
    ? new Promise(resolve => { releaseUpload = () => resolve({ status: 200, headers: { ETag: 'etag' }, body: '' }); })
    : Promise.resolve({ status: 200, headers: { ETag: 'etag' }, body: '' }));
  mockCancel.mockReset().mockImplementation(() => mockCancelHangs
    ? new Promise(resolve => { releaseCancel = resolve; }) : Promise.resolve());
});
afterEach(async () => {
  dispose?.(); releaseCancel?.(); releaseUpload?.(); await attaching; await flushVideoUploads();
  jest.useRealTimers();
});
test.each([
  ['native upload succeeds', false, false, true],
  ['native timeout cancellation settles', true, false, true],
  ['native upload AND cancellation stay pending after handover', true, true, true],
  ['minimal: same pending native calls without handover', true, true, false],
])('%s: Sending must eventually end or surface failure', async (_label, uploadHangs, cancelHangs, handover) => {
  mockUploadHangs = uploadHangs; mockCancelHangs = cancelHangs;
  dispose = videoUploadManager.start('student'); await flush();
  mockNetwork({ type: 'wifi', isConnected: true, isInternetReachable: true });
  attaching = videoUploadManager.attach({ studentId: 'student', stableSetId: 'set' }, {
    uri: 'file:///diagnose.mp4', width: 720, height: 1280, durationMs: 1000,
    mimeType: 'video/mp4', fileName: null, codec: null, rotationDegrees: 0,
  }, async () => 'set-log');
  await flush(); expect(mockUpload).toHaveBeenCalledTimes(1);
  if (handover) {
    mockNetwork({ type: 'none', isConnected: false, isInternetReachable: false });
    mockNetwork({ type: 'cellular', isConnected: true, isInternetReachable: true });
  }
  await jest.advanceTimersByTimeAsync(31 * 60_000);
  const record = useVideoUploadStore.getState().records['student:set'];
  expect(['uploaded', 'failed']).toContain(record.status);
});

test.each([true, false])('a stalled upload retries once when connectivity changes (offline gap: %s)', async (offline) => {
  mockUploadHangs = true; mockCancelHangs = true;
  dispose = videoUploadManager.start('student'); await flush();
  mockNetwork({ type: 'wifi', isConnected: true, isInternetReachable: true });
  attaching = videoUploadManager.attach({ studentId: 'student', stableSetId: 'set' }, {
    uri: 'file:///diagnose.mp4', width: 720, height: 1280, durationMs: 1000,
    mimeType: 'video/mp4', fileName: null, codec: null, rotationDegrees: 0,
  }, async () => 'set-log');
  await flush();
  mockUploadHangs = false;
  if (offline) mockNetwork({ type: 'none', isConnected: false, isInternetReachable: false });
  mockNetwork({ type: 'cellular', isConnected: true, isInternetReachable: true });
  mockNetwork({ type: 'cellular', isConnected: true, isInternetReachable: true });
  await flush();
  expect(useVideoUploadStore.getState().records['student:set'].status).toBe('uploaded');
  expect(mockUpload).toHaveBeenCalledTimes(2);
});

test('removing a video during network handover does not start a replacement upload', async () => {
  mockUploadHangs = true; mockCancelHangs = true;
  dispose = videoUploadManager.start('student'); await flush();
  mockNetwork({ type: 'wifi', isConnected: true, isInternetReachable: true });
  const id = { studentId: 'student', stableSetId: 'set' };
  attaching = videoUploadManager.attach(id, {
    uri: 'file:///diagnose.mp4', width: 720, height: 1280, durationMs: 1000,
    mimeType: 'video/mp4', fileName: null, codec: null, rotationDegrees: 0,
  }, async () => 'set-log');
  await flush();
  mockNetwork({ type: 'cellular', isConnected: true, isInternetReachable: true });
  let finishRemoval!: () => void;
  mockRemove.mockImplementationOnce(() => new Promise(resolve => { finishRemoval = resolve; }));
  const removing = videoUploadManager.remove(id);
  await flush();
  try {
    expect(mockUpload).toHaveBeenCalledTimes(1);
  } finally {
    finishRemoval();
    await removing;
  }
  expect(useVideoUploadStore.getState().records['student:set']).toBeUndefined();
  expect(mockRemove).toHaveBeenCalledWith('attachment');
});
