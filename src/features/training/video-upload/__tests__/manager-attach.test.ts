import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { configure, flushNow, resetAnalyticsForTests } from '@/analytics/client';
import { ANALYTICS_PRIVACY_NOTICE_KEY } from '@/analytics/storage';
import { useSessionStore } from '@/api/session';
import { plansRepository } from '@/api/domains/plans';
import { setsRepository } from '@/api/domains/sets';
import { accountSetSync } from '../../set-sync/runtime';
import { uploadsRepository } from '@/api/domains/uploads';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { videoUploadManager } from '../manager';
import { resetVideoUploadStoreForTests, useVideoUploadStore } from '../store';
import { VideoNativeError } from '../native';
import { EMPTY_VIDEO_UPLOAD, type SelectedVideo } from '../model';

const mockFiles = new Map<string, number>();
const mockOperations: string[] = [];
const mockCopyErrors: unknown[] = [];
let mockSequence = 0;
let mockCopyWait: Promise<void> | undefined;
let mockCopyFailure: Error | null = null;
let mockDeleteFailure: string | null = null;
let mockOnCopied: (() => void) | undefined;
let mockNeedsTranscode = false;
const mockReadMetadata = jest.fn(async (uri: string) => {
  mockOperations.push(`prepare:${uri}:${mockFiles.get(uri) ?? 0}`);
  return { duration: 4, width: 1280, height: 720 };
});
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/analytics', () => ({ AnalyticsEvent: { MediaUpload: 'media_upload' }, track: jest.fn(async () => {}) }));
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: () => () => {} }));
jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn() }));
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'en-US' }] }));
jest.mock('expo-image-picker', () => ({}));
jest.mock('expo-modules-core', () => ({
  ...jest.requireActual<typeof import('expo-modules-core')>('expo-modules-core'),
  uuid: { v4: () => `retained-${++mockSequence}` },
  requireNativeModule: (name: string) => name === 'TrainingVideo'
    ? { readTracks: async () => ({ codec: mockNeedsTranscode ? 'hevc' : 'h264', width: 1280, height: 720, bitrate: 700000, audio: null }) }
    : jest.requireActual<typeof import('expo-modules-core')>('expo-modules-core').requireNativeModule(name),
}));
jest.mock('react-native-compressor', () => ({
  getVideoMetaData: (uri: string) => mockReadMetadata(uri),
  Video: {
    cancelCompression: jest.fn(),
    compress: async () => {
      const uri = 'file:///cache/11111111-1111-4111-8111-111111111111.mp4';
      mockFiles.set(uri, 200000);
      return uri;
    },
  },
}));
const mockUploadAsync = jest.fn(async () => ({ status: 200, headers: { ETag: 'etag' }, body: '' }));
jest.mock('expo-file-system/legacy', () => ({
  FileSystemUploadType: { BINARY_CONTENT: 0 },
  createUploadTask: () => ({
    uploadAsync: () => mockUploadAsync(),
    cancelAsync: async () => {},
  }),
}));
jest.mock('@/api/domains/uploads', () => ({ uploadsRepository: {
  initiate: jest.fn(async () => ({ attachment_id: 'attachment', upload_id: 'upload', part_urls: [{ part_number: 1, url: 'https://upload.test/1' }] })),
  complete: jest.fn(async () => ({ id: 'attachment' })),
  remove: jest.fn(async () => {}),
} }));
jest.mock('expo-file-system', () => {
  const path = (parts: (string | { uri: string })[]) => parts.map((p) => (typeof p === 'string' ? p : p.uri).replace(/\/$/, '')).join('/');
  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) { this.uri = path(parts); }
    get exists() { return mockFiles.has(this.uri); }
    get size() { return mockFiles.get(this.uri) ?? 0; }
    get name() { return this.uri.split('/').pop()!; }
    copy(destination: File) {
      mockOperations.push(`copy:${this.uri}`);
      // SDK 57 dispatches copy to an Android coroutine, after JS returns.
      const pending = new Promise<void>((resolve, reject) => setTimeout(async () => {
        await mockCopyWait;
        const failure = mockCopyFailure ?? (!this.exists ? new Error(`NoSuchFileException: ${this.uri}`) : null);
        if (failure) { mockCopyErrors.push(failure); reject(failure); return; }
        mockFiles.set(destination.uri, this.size);
        mockOnCopied?.();
        resolve();
      }, 0));
      return pending;
    }
    delete() {
      if (mockDeleteFailure && this.uri.includes(mockDeleteFailure)) throw new Error('Native delete rejected');
      mockOperations.push(`delete:${this.uri}`); mockFiles.delete(this.uri);
    }
    open() { return { offset: 0, readBytes: (size: number) => new Uint8Array(size), close: () => {} }; }
    write(bytes: Uint8Array) { mockFiles.set(this.uri, bytes.length); }
  }
  class Directory {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) { this.uri = path(parts); }
    create() {}
    get exists() { return false; }
    list() { return [...mockFiles.keys()].filter((uri) => uri.startsWith(`${this.uri}/`)).map((uri) => new File(uri)); }
  }
  return { File, Directory, Paths: { document: { uri: 'file:///documents/' }, cache: { uri: 'file:///cache/' } } };
});

const id = { studentId: 'student', stableSetId: 'set' };
const source: SelectedVideo = { uri: 'file:///cache/ImagePicker/sample.mp4', width: 1280, height: 720, durationMs: 4000, mimeType: 'video/mp4', fileName: 'sample.mp4', codec: null, rotationDegrees: 0 };
test.each([
  new Error("fetch failed: Call to function 'NativeRequest.start' has been rejected. Cannot cast value for field 'headers'"),
  new TypeError('Native upload arguments cannot be cast'),
])('native upload rejection remains retryable and persists its message: $message', async (error) => {
  mockUploadAsync.mockRejectedValueOnce(error);
  await videoUploadManager.attach(id, source, async () => 'set-log');
  expect(useVideoUploadStore.getState().records['student:set']).toMatchObject({
    status: 'waiting', retry: { failure: 'network', failureCount: 1 }, errorMessage: error.message,
  });
  resetVideoUploadStoreForTests();
  await useVideoUploadStore.getState().hydrate();
  expect(useVideoUploadStore.getState().records['student:set']).toMatchObject({
    status: 'waiting', retry: { failure: 'network', failureCount: 1 }, errorMessage: error.message,
  });
});
afterEach(() => {
  resetAnalyticsForTests();
  useSessionStore.setState({ user: null });
  jest.restoreAllMocks();
});
beforeEach(async () => {
  await AsyncStorage.clear();
  resetVideoUploadStoreForTests();
  mockFiles.clear();
  mockOperations.length = 0;
  mockCopyErrors.length = 0;
  mockCopyFailure = null;
  mockCopyWait = undefined;
  mockDeleteFailure = null;
  mockOnCopied = undefined;
  mockNeedsTranscode = false;
  mockReadMetadata.mockClear();
  mockFiles.set(source.uri, 350000);
});

test('one attach retains the picker source through the immediate sweep and prepares the nonempty copy', async () => {
  let releaseLog!: (value: string) => void;
  let enteredEnsure!: () => void;
  const log = new Promise<string>((resolve) => { releaseLog = resolve; });
  const ensuring = new Promise<void>((resolve) => { enteredEnsure = resolve; });
  const attaching = videoUploadManager.attach(id, source, () => { enteredEnsure(); return log; });
  await ensuring;
  const record = useVideoUploadStore.getState().records['student:set'];
  try {
    // attach's immediate sweep has completed, while preparation is still gated.
    expect(record.prepared).toBe(false);
    expect(record.source?.uri).toMatch(/^file:\/\/\/documents\/training-videos\//);
    expect(mockFiles.has(source.uri)).toBe(false);
    expect(mockFiles.get(record.source!.uri)).toBe(350000);
    expect(mockReadMetadata).not.toHaveBeenCalled();
    const persisted = JSON.parse((await AsyncStorage.getItem('training.videoUploads.v1'))!);
    expect(persisted.records['student:set'].source.uri).toBe(record.source!.uri);
  } finally {
    releaseLog('set-log');
    await attaching;
  }
  expect(mockOperations).toContain(`prepare:${record.source!.uri}:350000`);
  expect(mockCopyErrors).toEqual([]);
  expect(mockFiles.get(record.source!.uri)).toBe(350000);
  expect(useVideoUploadStore.getState().records['student:set'].status).toBe('uploaded');
});

test('concurrent attaches of the same selection share one retained file and upload', async () => {
  const ensure = jest.fn(async () => 'set-log');
  const results = await Promise.allSettled([
    videoUploadManager.attach(id, source, ensure),
    videoUploadManager.attach(id, { ...source }, ensure),
  ]);
  expect(results.map((result) => result.status)).toEqual(['fulfilled', 'fulfilled']);
  expect(mockCopyErrors).toEqual([]);
  expect([...mockFiles.keys()].filter((uri) => uri.startsWith('file:///documents/training-videos/'))).toHaveLength(1);
  expect(mockOperations.filter((operation) => operation.startsWith('copy:'))).toEqual([`copy:${source.uri}`]);
  expect(useVideoUploadStore.getState().records['student:set'].status).toBe('uploaded');
});


test('a rejected native copy is caught as VideoNativeError without deleting the picker source or publishing a phantom record', async () => {
  mockCopyFailure = new Error('Native copy rejected');
  await expect(videoUploadManager.attach(id, source, async () => 'set-log')).rejects.toBeInstanceOf(VideoNativeError);
  expect(mockFiles.get(source.uri)).toBe(350000);
  expect(useVideoUploadStore.getState().records['student:set']).toBeUndefined();
});

test.each(['Set log unavailable', 'Invalid set input'])(
  '%s fails deterministically with readable attachment copy and keeps the source for retry',
  async (message) => {
    await videoUploadManager.attach(id, source, async () => { throw new Error(message); });
    const record = useVideoUploadStore.getState().records['student:set'];
    expect(record.status).toBe('failed');
    expect(record.retry?.failure).toBe('deterministic');
    expect(record.errorMessage).toBe('The log was not saved. Try again. Your entries remain on this page.');
    expect(mockFiles.get(record.source!.uri)).toBe(350000);
    expect(mockReadMetadata).not.toHaveBeenCalled();
    await videoUploadManager.retry(id, async () => 'set-log');
    expect(useVideoUploadStore.getState().records['student:set'].status).toBe('uploaded');
  },
);


test('a native part deletion failure is deterministic and keeps the prepared video for retry', async () => {
  mockDeleteFailure = 'video-parts';
  await videoUploadManager.attach(id, source, async () => 'set-log');
  const record = useVideoUploadStore.getState().records['student:set'];
  expect(record.retry?.failure).toBe('deterministic');
  expect(record.status).toBe('failed');
  expect(mockFiles.get(record.localUri!)).toBe(350000);
});

test('a picker deletion failure returns VideoNativeError and keeps the original selection', async () => {
  mockDeleteFailure = 'ImagePicker';
  await expect(videoUploadManager.attach(id, source, async () => 'set-log')).rejects.toBeInstanceOf(VideoNativeError);
  expect(mockFiles.get(source.uri)).toBe(350000);
  expect([...mockFiles.keys()]).toEqual([source.uri]);
});


test('startup during an asynchronous retain cannot reclaim the not-yet-published copy', async () => {
  let dispose: (() => void) | undefined;
  mockOnCopied = () => { dispose = videoUploadManager.start(id.studentId); };
  try {
    await videoUploadManager.attach(id, source, async () => 'set-log');
    const record = useVideoUploadStore.getState().records['student:set'];
    expect(record.status).toBe('uploaded');
    expect(mockFiles.get(record.localUri!)).toBe(350000);
  } finally {
    dispose?.();
  }
});

test('transcode output is retained before its cache file and old source are reclaimed', async () => {
  mockNeedsTranscode = true;
  await videoUploadManager.attach(id, source, async () => 'set-log');
  const record = useVideoUploadStore.getState().records['student:set'];
  expect(record.status).toBe('uploaded');
  expect(record.localUri).toMatch(/^file:\/\/\/documents\/training-videos\//);
  expect([...mockFiles.entries()]).toEqual([[record.localUri, 200000]]);
  expect(mockOperations.filter((operation) => operation.startsWith('copy:'))).toEqual([
    `copy:${source.uri}`,
    'copy:file:///cache/11111111-1111-4111-8111-111111111111.mp4',
  ]);
});


test('a late startup hydration cannot roll the retained source back to a stale picker URI', async () => {
  let releaseHydration!: (value: string) => void;
  const staleRead = new Promise<string>((resolve) => { releaseHydration = resolve; });
  jest.spyOn(AsyncStorage, 'getItem').mockImplementationOnce(() => staleRead);
  const hydration = useVideoUploadStore.getState().hydrate();
  let enteredEnsure!: () => void;
  let releaseLog!: (value: string) => void;
  const ensuring = new Promise<void>((resolve) => { enteredEnsure = resolve; });
  const log = new Promise<string>((resolve) => { releaseLog = resolve; });
  const attaching = videoUploadManager.attach(id, source, () => { enteredEnsure(); return log; });
  await ensuring;
  const retainedUri = useVideoUploadStore.getState().records['student:set'].source!.uri;
  try {
    releaseHydration(JSON.stringify({ version: 1, records: {
      'student:set': { ...EMPTY_VIDEO_UPLOAD, status: 'pending', source },
    } }));
    await hydration;
    expect(useVideoUploadStore.getState().records['student:set'].source!.uri).toBe(retainedUri);
    expect(mockFiles.get(retainedUri)).toBe(350000);
  } finally {
    releaseLog('set-log');
    await attaching;
  }
  expect(mockOperations.filter((operation) => operation.startsWith('copy:'))).toEqual([`copy:${source.uri}`]);
});

test('an ensureSetLog transport failure still uses network backoff', async () => {
  await videoUploadManager.attach(id, source, async () => { throw new TypeError('Network request failed'); });
  expect(useVideoUploadStore.getState().records['student:set']).toMatchObject({
    status: 'waiting', retry: { failure: 'network' }, errorMessage: 'Network request failed',
  });
});

test('cancelling a video awaiting its offline set releases the job and permits replacement', async () => {
  const waiting = videoUploadManager.attach(id, source, () => new Promise(() => {}));
  for (let tick = 0; tick < 100; tick++) await Promise.resolve();
  await videoUploadManager.cancel(id);
  await waiting;
  expect(useVideoUploadStore.getState().records['student:set']?.status ?? 'none').toBe('none');
  mockFiles.set(source.uri, 350000);
  await videoUploadManager.attach(id, source, async () => 'set-log');
  expect(useVideoUploadStore.getState().records['student:set'].status).toBe('uploaded');
});

test('retry now interrupts backoff and delivers the same set without waiting for its timer', async () => {
  mockUploadAsync.mockRejectedValueOnce(new TypeError('offline'));
  await videoUploadManager.attach(id, source, async () => 'set-log');
  expect(useVideoUploadStore.getState().records['student:set'].status).toBe('waiting');
  await videoUploadManager.retry(id, async () => 'set-log');
  expect(useVideoUploadStore.getState().records['student:set']).toMatchObject({ status: 'uploaded', setLogId: 'set-log' });
});

test('a missing prepared file remains retryable and a Photos replacement attaches to the original set', async () => {
  mockUploadAsync.mockRejectedValueOnce(new TypeError('offline'));
  await videoUploadManager.attach(id, source, async () => 'original-log');
  const failed = useVideoUploadStore.getState().records['student:set'];
  mockFiles.delete(failed.localUri!);
  await videoUploadManager.retry(id);
  expect(useVideoUploadStore.getState().records['student:set']).toMatchObject({ status: 'failed', setLogId: 'original-log' });
  expect(videoUploadManager.needsReselection(id)).toBe(true);
  mockFiles.set(source.uri, 350000);
  await videoUploadManager.replaceMissing(id, source);
  expect(useVideoUploadStore.getState().records['student:set']).toMatchObject({ status: 'uploaded', setLogId: 'original-log' });
});

test('cold start after an upgrade preserves yesterday\'s failed file over 500 MiB and its retry identity', async () => {
  const uri = 'file:///documents/training-videos/old.mp4';
  const sizeBytes = 600 * 1024 * 1024;
  mockFiles.set(uri, sizeBytes);
  await AsyncStorage.setItem('training.videoUploads.v1', JSON.stringify({ version: 1, records: {
    'student:set': { ...EMPTY_VIDEO_UPLOAD, status: 'failed', createdAt: Date.now() - 86400000,
      prepared: true, localUri: uri, sizeBytes, setLogId: 'old-log' },
  } }));
  const dispose = videoUploadManager.start('student');
  try {
    for (let i = 0; i < 80; i++) await Promise.resolve();
    expect(mockFiles.get(uri)).toBe(sizeBytes);
    expect(useVideoUploadStore.getState().records['student:set']).toMatchObject({ status: 'failed', localUri: uri, setLogId: 'old-log' });
  } finally { dispose(); }
});


test('replacement deletion failure retains the new video and retries the same set after restart', async () => {
  await videoUploadManager.attach(id, source, async () => 'original-log');
  mockFiles.set(source.uri, 400000);
  jest.mocked(uploadsRepository.remove).mockRejectedValueOnce(new TypeError('offline'));
  await expect(videoUploadManager.attach(id, source, async () => 'original-log')).resolves.toBeUndefined();
  const record = useVideoUploadStore.getState().records['student:set'];
  expect(record.status).toBe('waiting');
  expect(mockFiles.get(record.source!.uri)).toBe(400000);
  resetVideoUploadStoreForTests();
  await useVideoUploadStore.getState().hydrate();
  await videoUploadManager.retry(id);
  expect(useVideoUploadStore.getState().records['student:set']).toMatchObject({ status: 'uploaded', setLogId: 'original-log' });
});


test.each(['retry', 'replaceMissing'] as const)('%s waits for the restored offline set receipt before uploading', async action => {
  useSessionStore.setState({ user: { id: 'student', phone: '', role: 'coached_student', created_at: '2026-11-05T12:00:00Z' } });
  let finish!: (value: { id: string; logged_at: string }) => void;
  jest.spyOn(setsRepository, 'upsert').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const request = { exercise_id: '10000000-0000-4000-8000-000000000001', plan_day_id: '10000000-0000-4000-8000-000000000002', set_index: 0, weight_kg: '80', reps: 5, completed: true, logged_date: '2026-11-05' };
  const { queue } = accountSetSync('student');
  await queue.ready;
  await queue.enqueue({ stableSetId: 'set', dayId: 'day', exerciseId: 'squat', loggedDate: '2026-11-05', request });
  await AsyncStorage.setItem('training.videoUploads.v1', JSON.stringify({ version: 1, records: {
    'student:set': { ...EMPTY_VIDEO_UPLOAD, status: 'failed', logRequest: request, source: action === 'retry' ? source : null },
  } }));
  resetVideoUploadStoreForTests();
  await useVideoUploadStore.getState().hydrate();
  expect(useVideoUploadStore.getState().records['student:set']?.status).toBe('failed');
  jest.mocked(uploadsRepository.initiate).mockClear();
  const uploading = action === 'retry' ? videoUploadManager.retry(id) : videoUploadManager.replaceMissing(id, source);
  await new Promise(resolve => setTimeout(resolve, 20));
  expect(uploadsRepository.initiate).not.toHaveBeenCalled();
  finish({ id: 'restored-receipt', logged_at: '2026-11-05T12:00:00Z' });
  try {
    await uploading;
    expect(useVideoUploadStore.getState().records['student:set']).toMatchObject({ status: 'uploaded', setLogId: 'restored-receipt' });
    expect(setsRepository.upsert).toHaveBeenCalledTimes(1);
  } finally { useSessionStore.setState({ user: null }); }
});


test.each(['success', 'copy failure', 'cancel', 'new video'])('a replacement copy blocks completion without overwriting the delivered source until %s', async outcome => {
  const complete = jest.spyOn(plansRepository, 'completeDay').mockResolvedValue({} as never);
  useSessionStore.setState({ user: { id: 'student', phone: '', role: 'coached_student', created_at: '2026-11-05T00:00:00Z' } });
  const { gate } = accountSetSync('student'); await gate.ready;
  const original = { ...EMPTY_VIDEO_UPLOAD, status: 'uploaded' as const, localUri: 'file:///documents/original.mp4', setLogId: 'old-log', attachmentId: 'old' };
  useVideoUploadStore.setState({ hydrated: true, records: { ...(outcome === 'new video' ? {} : { 'student:set': original }),
    'student:other': { ...EMPTY_VIDEO_UPLOAD, status: 'uploading', setLogId: 'other-log' } } });
  await gate.arm('day', { heldAt: Date.now(), sets: [{ stableSetId: 'other' }, ...(outcome === 'new video' ? [] : [{ stableSetId: 'set' }])], exerciseIds: ['exercise'] }); await gate.release('day');
  let release!: () => void;
  mockCopyWait = new Promise(resolve => { release = resolve; });
  if (outcome === 'copy failure') mockCopyFailure = new Error('Copy rejected');
  const attaching = videoUploadManager.attach(id, source, async () => 'old-log', () => ({ plan_exercise_id: 'exercise', set_index: 0, weight_kg: '80', reps: 5, completed: true })).catch(error => error);
  await new Promise(resolve => setTimeout(resolve, 10));
  useVideoUploadStore.getState().dispatch('student', 'other', { type: 'succeeded', attachmentId: 'other' });
  for (let i = 0; i < 150; i++) await Promise.resolve();
  expect(useVideoUploadStore.getState().records['student:set']).toBe(outcome === 'new video' ? undefined : original);
  const prematureCompletions = complete.mock.calls.length;
  const cancellation = outcome === 'cancel' ? videoUploadManager.cancel(id) : Promise.resolve();
  release(); await attaching; await cancellation;
  for (let i = 0; i < 150; i++) await Promise.resolve();
  expect(prematureCompletions).toBe(0);
  expect(complete).toHaveBeenCalledTimes(1);
  expect(useVideoUploadStore.getState().records['student:set']?.status ?? 'none').toBe(outcome === 'cancel' ? 'none' : 'uploaded');
});


test('upload lifecycle emits the backend stage/context contract', async () => {
  const { track } = jest.requireMock<typeof import('@/analytics')>('@/analytics');
  jest.mocked(track).mockClear();
  await videoUploadManager.attach(id, source, async () => 'set-log');
  expect(track).toHaveBeenCalledWith('media_upload', { stage: 'started', context: 'set_log' });
  expect(track).toHaveBeenCalledWith('media_upload', { stage: 'succeeded', context: 'set_log' });
});


test('a retry whose retained file disappeared sends a source-file diagnostic', async () => {
  const events: { name: string; props: Record<string, unknown> }[] = [];
  await AsyncStorage.setItem(ANALYTICS_PRIVACY_NOTICE_KEY, 'true');
  await configure({ accessTokenProvider: async () => 'test-token', fetch: async (_url, request) => {
    if (request?.method === 'POST') events.push(...JSON.parse(String(request.body)).events);
    return { status: request?.method === 'POST' ? 204 : 200,
      json: async () => ({ enabled: true, sample_rate: 1 }) } as Response;
  } });
  mockUploadAsync.mockRejectedValueOnce(new TypeError('offline'));
  await videoUploadManager.attach(id, source, async () => 'original-log');
  mockFiles.delete(useVideoUploadStore.getState().records['student:set'].localUri!);
  await videoUploadManager.retry(id);
  await flushNow();
  expect(events).toEqual([expect.objectContaining({ name: 'client_error', props: {
    domain: 'persistence', code: 'video.source_file.SOURCE_UNAVAILABLE', screen: 'today_workout',
  } })]);
});
