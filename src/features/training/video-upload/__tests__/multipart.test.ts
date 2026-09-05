import { ApiError } from '@/api/client';
import { test, expect, jest } from '@jest/globals';
import { EMPTY_VIDEO_UPLOAD, videoUploadReducer } from '../model';
import {
  useVideoUploadStore,
  resetVideoUploadStoreForTests,
  flushVideoUploads,
} from '../store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { runPreparedVideoUpload } from '../upload-runner';
import { PartUploadError, uploadFileParts } from '../multipart';
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual(
    '@react-native-async-storage/async-storage/jest/async-storage-mock',
  ),
);
const session = {
  attachment_id: 'attachment',
  upload_id: 'upload',
  part_urls: [{ part_number: 1, url: 'https://part/1' }],
};
test('session and each ETag survive store persistence and cold hydration', async () => {
  await AsyncStorage.clear();
  resetVideoUploadStoreForTests();
  const dispatch = useVideoUploadStore.getState().dispatch;
  dispatch('student', 'set', { type: 'uploadSession', session });
  dispatch('student', 'set', {
    type: 'partCompleted',
    part: { part_number: 1, etag: '"etag"' },
  });
  await flushVideoUploads();
  resetVideoUploadStoreForTests();
  await useVideoUploadStore.getState().hydrate();
  expect(useVideoUploadStore.getState().records['student:set']).toMatchObject({
    session,
    parts: [{ part_number: 1, etag: '"etag"' }],
    status: 'uploading',
  });
});
test('complete retains local prepared file for same-day playback', () => {
  expect(
    videoUploadReducer(
      {
        ...EMPTY_VIDEO_UPLOAD,
        localUri: 'file:///retained.mp4',
        sizeBytes: 100,
        prepared: true,
      },
      { type: 'succeeded', attachmentId: 'attachment' },
    ),
  ).toMatchObject({
    status: 'uploaded',
    localUri: 'file:///retained.mp4',
    sizeBytes: 100,
  });
});
test('expired PUT signature deletes old attachment and initiates a new session', async () => {
  const remove = jest.fn(async () => undefined);
  const complete = jest.fn(async (id: string) => ({ id }));
  const initiate = jest.fn(async () => ({ ...session, attachment_id: 'new' }));
  const put = jest
    .fn<
      NonNullable<
        import('../upload-runner').PreparedUploadDependencies['uploadParts']
      >
    >()
    .mockRejectedValueOnce(new PartUploadError(403))
    .mockResolvedValueOnce([{ part_number: 1, etag: 'fresh' }]);
  const saved: unknown[] = [];
  await expect(
    runPreparedVideoUpload(
      {
        localUri: 'file:///video',
        setLogId: 'set',
        sizeBytes: 100,
        signal: new AbortController().signal,
        session,
        parts: [],
        onSession: async (value) => {
          saved.push(value);
        },
        onPart: async () => {},
        onInitiated: () => {},
        onProgress: () => {},
      },
      {
        repository: { initiate, complete, remove, abort: jest.fn() } as never,
        uploadParts: put,
      },
    ),
  ).resolves.toBe('new');
  expect(remove).toHaveBeenCalledWith('attachment');
  expect(saved).toEqual([null, { ...session, attachment_id: 'new' }]);
});
const mockFiles = new Map<string, number>();
jest.mock('expo-file-system', () => ({
  Paths: { cache: { uri: 'file:///cache/' } },
  Directory: class {
    uri: string;
    constructor(_base: unknown, name: string) {
      this.uri = `file:///cache/${name}`;
    }
    create() {}
  },
  File: class {
    uri: string;
    constructor(base: string | { uri: string }, name?: string) {
      this.uri = name
        ? `${typeof base === 'string' ? base : base.uri}/${name}`
        : String(base);
    }
    get size() {
      return mockFiles.get(this.uri) ?? 0;
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    open() {
      return {
        offset: 0,
        readBytes: (size: number) => new Uint8Array(size),
        close() {},
      };
    }
    write(bytes: Uint8Array) {
      mockFiles.set(this.uri, bytes.length);
    }
    delete() {
      mockFiles.delete(this.uri);
    }
  },
}));
const mockFetch = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock('expo/fetch', () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
test.each(['success', 'delete', 'terminal'])(
  'temporary parts are reclaimed on %s and original survives',
  async (path) => {
    mockFiles.clear();
    mockFiles.set('file:///source', 100);
    const controller = new AbortController();
    mockFetch.mockReset().mockImplementation(async () => {
      expect(
        [...mockFiles.keys()].some((uri) => uri.includes('video-parts')),
      ).toBe(true);
      if (path === 'delete') {
        controller.abort();
        throw new Error('aborted');
      }
      return {
        ok: path === 'success',
        status: path === 'success' ? 200 : 400,
        headers: { get: () => 'etag' },
      };
    });
    const result = uploadFileParts('file:///source', session.part_urls, {
      signal: controller.signal,
      onProgress: () => {},
    });
    if (path === 'success')
      await expect(result).resolves.toEqual([{ part_number: 1, etag: 'etag' }]);
    else await expect(result).rejects.toBeDefined();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect([...mockFiles.keys()]).toEqual(['file:///source']);
  },
);
test('cold resume sends only missing parts and persists retry window unchanged', async () => {
  const dispatch = useVideoUploadStore.getState().dispatch;
  const retry = {
    firstFailureAt: 1000,
    lastFailureAt: 61000,
    failureCount: 2,
    failure: 'network' as const,
  };
  dispatch('student', 'set', { type: 'waiting', retry });
  await flushVideoUploads();
  resetVideoUploadStoreForTests();
  await useVideoUploadStore.getState().hydrate();
  expect(useVideoUploadStore.getState().records['student:set'].retry).toEqual(
    retry,
  );
  mockFiles.clear();
  mockFiles.set('file:///source', 5 * 1024 * 1024 + 100);
  mockFetch.mockReset().mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: () => 'etag-2' },
  });
  const result = await uploadFileParts(
    'file:///source',
    [
      { part_number: 1, url: 'https://part/1' },
      { part_number: 2, url: 'https://part/2' },
    ],
    {
      signal: new AbortController().signal,
      onProgress: () => {},
      completedParts: [{ part_number: 1, etag: 'etag-1' }],
    },
  );
  expect(result).toEqual([
    { part_number: 1, etag: 'etag-1' },
    { part_number: 2, etag: 'etag-2' },
  ]);
  expect(mockFetch.mock.calls.map((call) => call[0])).toEqual([
    'https://part/2',
  ]);
});
test('attach persists the numeric set-log request before lazy log creation', async () => {
  const logRequest = {
    plan_exercise_id: '11111111-1111-4111-8111-111111111111',
    logged_date: '2026-09-05',
    set_index: 0,
    weight_kg: '75',
    reps: 5,
    rpe: '8',
    completed: false,
    failed: false,
  };
  useVideoUploadStore.getState().dispatch('student', 'staged', {
    type: 'attach',
    source: {
      uri: 'file:///source',
      width: 720,
      height: 1280,
      durationMs: 30000,
      mimeType: 'video/mp4',
      fileName: null,
      codec: null,
      rotationDegrees: 0,
    },
    logRequest,
  });
  await flushVideoUploads();
  resetVideoUploadStoreForTests();
  await useVideoUploadStore.getState().hydrate();
  expect(
    useVideoUploadStore.getState().records['student:staged'],
  ).toMatchObject({ logRequest, setLogId: null });
});
test('cold resume reconciles a complete response lost before local success was persisted', async () => {
  const abort = jest.fn(async () => undefined);
  const repository = {
    initiate: jest.fn(),
    abort,
    complete: jest.fn(async () => {
      throw new ApiError('backend', 'UPLOAD_INVALID_STATE', { status: 409 });
    }),
    url: jest.fn(async () => ({ url: 'https://ready/video', expires_in: 900 })),
  };
  await expect(
    runPreparedVideoUpload(
      {
        localUri: 'file:///source',
        setLogId: 'set',
        sizeBytes: 100,
        session,
        signal: new AbortController().signal,
        onInitiated: () => {},
        onProgress: () => {},
        onSession: async () => {},
      },
      {
        repository: repository as never,
        uploadParts: async () => [{ part_number: 1, etag: 'etag' }],
      },
    ),
  ).resolves.toBe('attachment');
  expect(abort).not.toHaveBeenCalled();
});
test('5 MiB chunks use at most three PUTs concurrently', async () => {
  mockFiles.clear();
  mockFiles.set('file:///source', 3 * 5 * 1024 * 1024 + 100);
  const releases: (() => void)[] = [];
  mockFetch.mockReset().mockImplementation(
    () =>
      new Promise((resolve) => {
        releases.push(() =>
          resolve({ ok: true, status: 200, headers: { get: () => 'etag' } }),
        );
      }),
  );
  const pending = uploadFileParts(
    'file:///source',
    [1, 2, 3, 4].map((part_number) => ({
      part_number,
      url: `https://part/${part_number}`,
    })),
    {
      signal: new AbortController().signal,
      onProgress: () => {},
    },
  );
  expect(releases).toHaveLength(3);
  expect([...mockFiles.values()]).toEqual([
    15728740, 5242880, 5242880, 5242880,
  ]);
  releases[0]();
  for (let tick = 0; tick < 6; tick++) await Promise.resolve();
  expect(releases).toHaveLength(4);
  expect([...mockFiles.values()]).toContain(100);
  releases.slice(1).forEach((release) => release());
  await expect(pending).resolves.toHaveLength(4);
  expect([...mockFiles.keys()]).toEqual(['file:///source']);
});
