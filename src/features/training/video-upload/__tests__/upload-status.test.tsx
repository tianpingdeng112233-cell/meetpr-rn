import { afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { setLocaleOverride } from '@/i18n';
import { videoUploadManager } from '../manager';
import { EMPTY_VIDEO_UPLOAD } from '../model';
import { VideoAttachmentControls } from '../VideoAttachmentControls';
import { flushVideoUploads, resetVideoUploadStoreForTests, useVideoUploadStore } from '../store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-media-library', () => ({}));
jest.mock('react-native-compressor', () => ({}));
jest.mock('react-native-video', () => 'Video');
jest.mock('react-native-safe-area-context', () =>
  jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default);

let renderer: ReactTestRenderer;
afterEach(async () => {
  act(() => renderer?.unmount());
  await flushVideoUploads();
  resetVideoUploadStoreForTests();
  setLocaleOverride(null);
});

test.each(['en', 'zh'] as const)('the video row shows live integer upload percentages in %s', async locale => {
  setLocaleOverride(locale);
  const dispatch = useVideoUploadStore.getState().dispatch;
  dispatch('student', 'set', { type: 'uploadStarted', attachmentId: 'attachment' });
  await act(async () => {
    renderer = create(<VideoAttachmentControls studentId="student" stableSetId="set" editable={false}
      ensureSetLog={async () => 'set-log'} buildLogRequest={() => { throw new Error('unused'); }} />);
  });
  const text = () => renderer.root.findAllByType(Text).map(node => node.props.children);
  expect(text()).toContain(locale === 'en' ? 'Sending' : '发送中');
  act(() => { dispatch('student', 'set', { type: 'progress', progress: 0.424 }); });
  expect(text()).toContain(locale === 'en' ? 'Sending · 42%' : '发送中 · 42%');
  act(() => { dispatch('student', 'set', { type: 'waiting', retry: {
    failureCount: 1, firstFailureAt: 0, lastFailureAt: 0, failure: 'network',
  } }); });
  expect(text()).toContain(locale === 'en' ? 'Sending' : '还在路上');
  expect(text()).not.toContain(locale === 'en' ? 'Sending · 42%' : '发送中 · 42%');
});


const mockSession = {
  attachment_id: 'attachment', upload_id: 'upload',
  part_urls: [{ part_number: 1, url: 'https://part/1' }],
};
let mockProgress: (data: { totalBytesSent: number; totalBytesExpectedToSend: number }) => void;
let mockFinish: (response: unknown) => void;
jest.mock('expo-file-system/legacy', () => ({
  FileSystemUploadType: { BINARY_CONTENT: 0 },
  createUploadTask: (_url: string, _uri: string, _options: unknown, callback: typeof mockProgress) => {
    mockProgress = callback;
    return { uploadAsync: () => new Promise(resolve => { mockFinish = resolve; }), cancelAsync: async () => {} };
  },
}));
jest.mock('expo-file-system', () => ({
  File: class {
    uri = 'file:///source'; size = 100; exists = true;
    open() { return { offset: 0, readBytes: () => new Uint8Array(100), close() {} }; }
    write() {} delete() {}
  },
  Directory: class { create() {} }, Paths: { cache: 'file:///cache' },
}));
jest.mock('@/api/domains/uploads', () => ({ uploadsRepository: {
  initiate: async () => mockSession, complete: async () => ({ id: 'attachment' }),
} }));
jest.mock('@/analytics', () => ({ AnalyticsEvent: { MediaUpload: 'media_upload' }, track: async () => {} }));

test.each([false, true])('native progress reaches the video row during upload (saved session: %s)', async resumed => {
  setLocaleOverride('en');
  useVideoUploadStore.setState({ records: { 'student:set': {
    ...EMPTY_VIDEO_UPLOAD, status: 'failed', localUri: 'file:///source', sizeBytes: 100,
    prepared: true, setLogId: 'set-log', session: resumed ? mockSession : null,
  } } });
  await act(async () => {
    renderer = create(<VideoAttachmentControls studentId="student" stableSetId="set" editable={false}
      ensureSetLog={async () => 'set-log'} buildLogRequest={() => { throw new Error('unused'); }} />);
  });
  let uploading!: Promise<void>;
  await act(async () => {
    uploading = videoUploadManager.retry({ studentId: 'student', stableSetId: 'set' }, async () => 'set-log');
    for (let tick = 0; tick < 60; tick++) await Promise.resolve();
  });
  try {
    act(() => { mockProgress({ totalBytesSent: 42, totalBytesExpectedToSend: 100 }); });
    expect(renderer.root.findAllByType(Text).map(node => node.props.children)).toContain('Sending · 42%');
  } finally {
    await act(async () => {
      mockFinish({ status: 200, headers: { ETag: 'etag' } });
      await uploading;
    });
  }
  expect(renderer.root.findAllByType(Text).map(node => node.props.children)).toContain('Delivered to coach');
});
