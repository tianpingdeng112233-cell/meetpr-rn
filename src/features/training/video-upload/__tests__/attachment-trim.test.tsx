import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { configure, flushNow, resetAnalyticsForTests, confirmPrivacyNotice } from '@/analytics/client';
import { ANALYTICS_PRIVACY_NOTICE_KEY } from '@/analytics/storage';
import { ColorSchemeProvider, resolveColors } from '@/design/theme';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import Video from 'react-native-video';
import * as Compressor from 'react-native-compressor';
import { File } from 'expo-file-system';
import { videosRepository } from '@/api/domains/videos';
import { prepareTrainingVideo, retainVideoSource, cleanOrphanVideos } from '../native';
import { Alert, Image, Modal, StatusBar, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoModules from 'expo-modules-core';
import * as ImagePicker from 'expo-image-picker';
import { setLocaleOverride, t } from '@/i18n';
import { CameraRecorder } from '../CameraRecorder';
import { VideoAttachmentControls } from '../VideoAttachmentControls';
import { videoUploadManager } from '../manager';
import { useVideoUploadStore, resetVideoUploadStoreForTests, flushVideoUploads, hydrateRemoteVideoAttachments } from '../store';
import { spacing } from '@/design';
import { VIDEO_UPLOAD_CONSENT_KEY, EMPTY_VIDEO_UPLOAD } from '../model';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/api/domains/videos', () => ({ videosRepository: { list: jest.fn() } }));
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: () => () => {} }));
jest.mock('expo-media-library', () => ({}));
jest.mock('react-native-compressor', () => ({ getVideoMetaData: jest.fn(async () => ({ duration: 8 })), Video: { compress: jest.fn(), cancelCompression: jest.fn() } }));
const mockSeek = jest.fn();
jest.mock('react-native-video', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return React.forwardRef(function MockVideo(_props, ref) {
    React.useImperativeHandle(ref, () => ({ seek: mockSeek }));
    return null;
  });
});
jest.mock('react-native-safe-area-context', () =>
  jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('../manager', () => ({ videoUploadManager: { attach: jest.fn(async () => {}), remove: jest.fn() } }));
const mockMedia = {
  hasCamera: async () => true,
  readTracks: jest.fn(async () => ({ codec: 'h264', width: 1920, height: 1080, bitrate: 8000000, audio: null, frameRate: 30 })),
  trimInfo: jest.fn(async () => ({ durationMs: 8000, videoTrackCount: 1 })),
  thumbnails: jest.fn(async () => Array.from({ length: 10 }, (_, i) => `file:///cache/thumb${i}.jpg`)),
  trim: jest.fn(async () => ({ uri: 'file:///cache/export.mp4', durationMs: 4000 })),
  cancelTrim: jest.fn(async () => {}),
};
const mockDeleted: string[] = [];
const mockFiles = new Set<string>();
const mockPendingCopies = new Set<string>();
const mockCopy = jest.fn<(destination: { uri: string }) => Promise<void>>(async () => {});
jest.mock('expo-file-system', () => ({
  File: class {
    uri: string; size = 100;
    get name() { return this.uri.split('/').pop()!; }
    get exists() { return !mockPendingCopies.has(this.uri) && !mockDeleted.includes(this.uri); }
    constructor(...parts: (string | { uri: string })[]) { this.uri = parts.map(p => (typeof p === 'string' ? p : p.uri).replace(/\/$/, '')).join('/'); mockFiles.add(this.uri); }
    copy(destination: { uri: string }) { return mockCopy(destination); } delete() { mockDeleted.push(this.uri); }
  },
  Directory: class {
    uri: string;
    constructor(base: { uri: string }) { this.uri = base.uri; }
    create() {}
    list() { return Array.from(mockFiles).filter(uri => uri.startsWith(this.uri) && !mockDeleted.includes(uri)).map(uri => new (jest.requireMock<typeof import('expo-file-system')>('expo-file-system').File)(uri)); }
  },
  Paths: { cache: { uri: 'file:///cache/' }, document: { uri: 'file:///documents/' } },
}));

let renderer: ReactTestRenderer;
beforeEach(async () => {
  jest.clearAllMocks();
  jest.spyOn(jest.requireMock<typeof import('expo-modules-core')>('expo-modules-core'), 'requireNativeModule').mockReturnValue(mockMedia);
  jest.spyOn(ExpoModules.uuid, 'v4').mockReturnValue('11111111-1111-4111-8111-111111111111');
  mockDeleted.length = 0;
  mockFiles.clear();
  mockPendingCopies.clear();
  setLocaleOverride('en');
  await AsyncStorage.setItem(VIDEO_UPLOAD_CONSENT_KEY, 'true');
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: false, assets: [
    { uri: 'file:///cache/picked.mp4', width: 1280, height: 720, duration: 8000, type: 'video' },
  ] });
});
afterEach(async () => { resetAnalyticsForTests(); act(() => renderer?.unmount()); await flushVideoUploads(); resetVideoUploadStoreForTests(); setLocaleOverride(null); });
const press = async (label: string) => {
  await act(async () => {
    const button = renderer.root.findAll(n => n.props.accessibilityLabel === label && n.props.onPress)[0];
    expect(button).toBeDefined();
    expect(button.props.disabled).not.toBe(true);
    button.props.onPress();
  });
};
const mount = async (replace = false, scheme: 'light' | 'dark' = 'light') => {
  if (replace) useVideoUploadStore.setState({ records: { 'trim-student:trim-set': { ...EMPTY_VIDEO_UPLOAD, status: 'uploaded', localUri: 'file:///documents/existing.mp4' } } });
  await act(async () => { renderer = create(<ColorSchemeProvider scheme={scheme}><VideoAttachmentControls studentId="trim-student" stableSetId="trim-set"
    editable ensureSetLog={async () => 'log'} buildLogRequest={() => { throw new Error('not used'); }} /></ColorSchemeProvider>); });
  await press(t(replace ? 'student.videoAttachmentV3Controls.copy004' : 'student.videoAttachmentV3Controls.copy002'));
};

test('Photos waits for the working copy to finish before calling trimInfo', async () => {
  let finishCopy!: () => void;
  mockCopy.mockImplementationOnce(destination => {
    mockPendingCopies.add(destination.uri);
    return new Promise(resolve => {
      finishCopy = () => { mockPendingCopies.delete(destination.uri); resolve(); };
    });
  });
  await mount();
  expect(mockCopy).toHaveBeenCalledTimes(1);
  expect(mockMedia.trimInfo).not.toHaveBeenCalled();
  expect(renderer.root.findAllByType(Video)).toHaveLength(0);
  await act(async () => { finishCopy(); });
  expect(mockMedia.trimInfo).toHaveBeenCalledTimes(1);
  expect(mockMedia.trimInfo).toHaveBeenCalledWith('file:///cache/training-trim-11111111-1111-4111-8111-111111111111.mp4');
  expect(renderer.root.findByType(Video).props.source.uri).toBe('file:///cache/training-trim-11111111-1111-4111-8111-111111111111.mp4');
  expect(videoUploadManager.attach).not.toHaveBeenCalled();
});

test('closing during the working copy cleans its late result without reading it', async () => {
  let finishCopy!: () => void;
  mockCopy.mockImplementationOnce(destination => {
    mockPendingCopies.add(destination.uri);
    return new Promise(resolve => {
      finishCopy = () => { mockPendingCopies.delete(destination.uri); resolve(); };
    });
  });
  await mount();
  await press(t('student.cameraRecorderView.copy005'));
  await act(async () => { finishCopy(); });
  expect(mockMedia.trimInfo).not.toHaveBeenCalled();
  expect(mockDeleted).toContain('file:///cache/training-trim-11111111-1111-4111-8111-111111111111.mp4');
  expect(videoUploadManager.attach).not.toHaveBeenCalled();
});

test.each(['copyTrimSource', 'trimInfo', 'thumbnails', 'player.onError'])('preparation reports %s failures without paths outside development', async step => {
  const development = jest.replaceProperty(globalThis as typeof globalThis & { __DEV__: boolean }, '__DEV__', false);
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const failure = new Error('Cannot read file:///cache/private clip.mp4');
  try {
    if (step === 'copyTrimSource') mockCopy.mockRejectedValueOnce(failure);
    if (step === 'trimInfo') mockMedia.trimInfo.mockRejectedValueOnce(failure);
    if (step === 'thumbnails') mockMedia.thumbnails.mockRejectedValueOnce(failure);
    await mount();
    if (step === 'player.onError') {
      await act(async () => { renderer.root.findByType(Video).props.onError({
        error: { errorException: 'Error', errorString: failure.message },
        target: 'file:///cache/private clip.mp4',
      }); });
    }
    expect(warn).toHaveBeenCalledTimes(1);
    const stage = { copyTrimSource: 'trim_copy', trimInfo: 'trim_info', thumbnails: 'trim_thumbnails', 'player.onError': 'trim_preview' }[step];
    expect(warn).toHaveBeenCalledWith('[VideoProcessing]', `video.${stage}.UNKNOWN`);
    if (step === 'thumbnails' || step === 'player.onError') {
      if (step === 'thumbnails') {
        expect(renderer.root.findAllByType(Image)).toHaveLength(0);
        expect(renderer.root.findAllByType(Video)).toHaveLength(1);
        await act(async () => { renderer.root.findByType(Video).props.onLoad({ duration: 8 }); });
        await press(t('student.videoTrimView.copy005'));
        expect(renderer.root.findByType(Video).props.paused).toBe(false);
      } else {
        expect(renderer.root.findAllByType(Video)).toHaveLength(0);
        const play = renderer.root.findAll(n => n.props.accessibilityLabel === t('student.videoTrimView.copy005') && n.props.onPress)[0];
        expect(play.props.disabled).toBe(true);
      }
      await act(async () => { renderer.root.findAll(n => n.props.accessibilityLabel === t('student.videoTrimTimeline.copy003') && n.props.onAccessibilityAction)[0].props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } }); });
      await press(t('student.videoTrimView.copy003'));
      expect(videoUploadManager.attach).toHaveBeenCalledTimes(1);
    } else {
      expect(renderer.root.findAllByType(Text).map(n => n.props.children)).toContain(t('student.videoAttachmentViewModel.copy001'));
      expect(videoUploadManager.attach).not.toHaveBeenCalled();
    }
  } finally {
    warn.mockRestore();
    development.restore();
  }
});

test('Photos presents trim first and only Save attaches the exported file', async () => {
  await mount();
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).toContain(t('student.videoTrimView.copy002'));
  expect(videoUploadManager.attach).not.toHaveBeenCalled();
  await act(async () => { renderer.root.findByType(Video).props.onLoad({ duration: 8 }); });
  await press(t('student.videoTrimView.copy003'));
  expect(videoUploadManager.attach).toHaveBeenCalledTimes(1);
  expect(videoUploadManager.attach).toHaveBeenCalledWith(
    { studentId: 'trim-student', stableSetId: 'trim-set' },
    expect.objectContaining({ uri: 'file:///cache/export.mp4', durationMs: 4000 }),
    expect.any(Function), expect.any(Function),
  );
});


test.each(['close', 'back', 'read failure', 'export failure'])('%s never attaches or removes the existing video', async action => {
  if (action === 'read failure') mockMedia.trimInfo.mockRejectedValueOnce(new Error('bad file'));
  await mount(true);
  if (action === 'close') await press(t('student.cameraRecorderView.copy005'));
  if (action === 'back') await act(async () => { renderer.root.findByType(Modal).props.onRequestClose(); });
  if (action === 'export failure') {
    mockMedia.trim.mockRejectedValueOnce(new Error('encoder failed'));
    await act(async () => { renderer.root.findAllByType(Video).find(n => n.props.source.uri !== 'file:///documents/existing.mp4')!.props.onLoad({ duration: 8 }); });
    await press(t('student.videoTrimView.copy003'));
  }
  expect(videoUploadManager.attach).not.toHaveBeenCalled();
  expect(videoUploadManager.remove).not.toHaveBeenCalled();
  expect(useVideoUploadStore.getState().records['trim-student:trim-set'].localUri).toBe('file:///documents/existing.mp4');
  expect(mockDeleted).not.toContain('file:///documents/existing.mp4');
  expect(mockDeleted).toContain('file:///cache/picked.mp4');
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).not.toContain(t('student.videoTrimView.copy002'));
  if (action.includes('failure')) expect(renderer.root.findAllByType(Text).map(n => n.props.children)).toContain(t('student.videoAttachmentViewModel.copy001'));
});

test('a 180 second source enters trim with ten thumbnails and a two minute selection', async () => {
  mockMedia.trimInfo.mockResolvedValueOnce({ durationMs: 180000, videoTrackCount: 1 });
  await mount();
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).toContain('Selected 2:00');
  expect(renderer.root.findAllByType(Image)).toHaveLength(10);
  expect(videoUploadManager.attach).not.toHaveBeenCalled();
});

test('export blocks close and back; parent unmount cancels it and discards a late success', async () => {
  let finish!: (value: { uri: string; durationMs: number }) => void;
  mockMedia.trim.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await mount();
  await act(async () => { renderer.root.findByType(Video).props.onLoad({ duration: 8 }); });
  await press(t('student.videoTrimView.copy003'));
  await act(async () => { renderer.root.findByType(Modal).props.onRequestClose(); });
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).toContain(t('student.videoTrimView.copy002'));
  const close = renderer.root.findAll(n => n.props.accessibilityLabel === t('student.cameraRecorderView.copy005') && n.props.onPress)[0];
  expect(close.props.disabled).toBe(true);
  act(() => renderer.unmount());
  await act(async () => { finish({ uri: 'file:///cache/late.mp4', durationMs: 4000 }); });
  expect(mockMedia.cancelTrim).toHaveBeenCalledTimes(1);
  expect(mockDeleted).toContain('file:///cache/late.mp4');
  expect(videoUploadManager.attach).not.toHaveBeenCalled();
});


test('handles seek to their edge and Play stays within the selected 2–6 second range', async () => {
  await mount();
  await act(async () => { renderer.root.findByType(Video).props.onLoad({ duration: 8 }); });
  const adjust = async (label: string, direction: string) => {
    await act(async () => { renderer.root.findAll(n => n.props.accessibilityLabel === label && n.props.onAccessibilityAction)[0].props.onAccessibilityAction({ nativeEvent: { actionName: direction } }); });
  };
  await adjust(t('student.videoTrimTimeline.copy003'), 'increment');
  await adjust(t('student.videoTrimTimeline.copy003'), 'increment');
  await adjust(t('student.videoTrimTimeline.copy004'), 'decrement');
  await adjust(t('student.videoTrimTimeline.copy004'), 'decrement');
  expect(mockSeek).toHaveBeenLastCalledWith(6, 0);
  expect(renderer.root.findByType(Video).props.paused).toBe(true);
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).toContain('Selected 0:04');
  await press(t('student.videoTrimView.copy005'));
  expect(mockSeek).toHaveBeenLastCalledWith(2, 0);
  expect(renderer.root.findByType(Video).props.paused).toBe(false);
  await act(async () => { renderer.root.findByType(Video).props.onSeek({ seekTime: 2, currentTime: 2 }); });
  await act(async () => { renderer.root.findByType(Video).props.onProgress({ currentTime: 6 }); });
  expect(renderer.root.findByType(Video).props.paused).toBe(true);
  expect(mockSeek).toHaveBeenLastCalledWith(2, 0);
  await press(t('student.videoTrimView.copy003'));
  expect(mockMedia.trim).toHaveBeenCalledWith(expect.any(String), 2000, 6000);
});

test.each([0, 2])('a source with %i video tracks fails before Save', async count => {
  mockMedia.trimInfo.mockResolvedValueOnce({ durationMs: 8000, videoTrackCount: count });
  await mount();
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).toContain(t('student.videoAttachmentViewModel.copy001'));
  expect(videoUploadManager.attach).not.toHaveBeenCalled();
});


test('a concurrent upload compression failure cannot delete the open trim session source', async () => {
  let rejectCompression!: (error: Error) => void;
  jest.mocked(Compressor.Video.compress).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectCompression = reject; }));
  const preparing = prepareTrainingVideo({ uri: 'file:///cache/uploading.mp4', width: 1920, height: 1080, durationMs: 8000,
    mimeType: 'video/mp4', fileName: null, codec: null, rotationDegrees: 0 },
  { signal: new AbortController().signal, setCompressionCancellationId: () => {} }).catch(() => undefined);
  await act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); });
  expect(rejectCompression).toBeDefined();
  await mount();
  const workingUri = renderer.root.findByType(Video).props.source.uri;
  await act(async () => { rejectCompression(new Error('another set compression failed')); await preparing; });
  expect(mockDeleted).not.toContain(workingUri);
  await act(async () => { renderer.root.findByType(Video).props.onLoad({ duration: 8 }); });
  await press(t('student.videoTrimView.copy003'));
  expect(videoUploadManager.attach).toHaveBeenCalledTimes(1);
});


test('cold startup reclaims abandoned trim files while preserving referenced and unrelated files', () => {
  new File('file:///cache/training-trim-orphan.mp4');
  new File('file:///cache/training-trim-thumbnail.jpg');
  new File('file:///cache/training-trim-referenced.mp4');
  new File('file:///cache/unrelated.jpg');
  cleanOrphanVideos(['file:///cache/training-trim-referenced.mp4']);
  expect(mockDeleted).toEqual(expect.arrayContaining(['file:///cache/training-trim-orphan.mp4', 'file:///cache/training-trim-thumbnail.jpg']));
  expect(mockDeleted).not.toContain('file:///cache/training-trim-referenced.mp4');
  expect(mockDeleted).not.toContain('file:///cache/unrelated.jpg');
});

test('a player failure during Save leaves export active and attaches its output', async () => {
  let finish!: (value: { uri: string; durationMs: number }) => void;
  mockMedia.trim.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await mount();
  await act(async () => { renderer.root.findByType(Video).props.onLoad({ duration: 8 }); });
  await press(t('student.videoTrimView.copy003'));
  await act(async () => { renderer.root.findByType(Video).props.onError(new Error('decoder failed')); });
  expect(mockMedia.cancelTrim).not.toHaveBeenCalled();
  await act(async () => { finish({ uri: 'file:///cache/late.mp4', durationMs: 4000 }); });
  expect(videoUploadManager.attach).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ uri: 'file:///cache/late.mp4' }), expect.any(Function), expect.any(Function));
  expect(mockDeleted).not.toContain('file:///cache/late.mp4');
});


test.each(['close', 'back', 'read failure', 'export failure'])('Replace %s keeps the displayed original video across the picker return refresh', async action => {
  const original = { ...EMPTY_VIDEO_UPLOAD, status: 'uploaded' as const, progress: 1,
    attachmentId: 'original-attachment', setLogId: 'log', createdAt: 123,
    localUri: 'file:///documents/existing.mp4' };
  useVideoUploadStore.setState({ hydrated: true, records: { 'trim-student:trim-set': original } });
  jest.mocked(videosRepository.list).mockResolvedValue({ videos: [] });
  const picked = { canceled: false as const, assets: [
    { uri: 'file:///cache/picked.mp4', width: 1280, height: 720, duration: 8000, type: 'video' as const },
  ] };
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockImplementationOnce(async () => {
    // TodayWorkoutView refreshes attachments when the system picker returns to active.
    await hydrateRemoteVideoAttachments('trim-student', [{ stableSetId: 'trim-set', setLogId: 'log' }]);
    return picked;
  });
  await act(async () => { renderer = create(<VideoAttachmentControls studentId="trim-student" stableSetId="trim-set"
    editable ensureSetLog={async () => 'log'} buildLogRequest={() => { throw new Error('not used'); }} />); });
  const originalPlayer = renderer.root.findByType(Video);
  if (action === 'read failure') mockMedia.trimInfo.mockRejectedValueOnce(new Error('bad file'));
  await press(t('student.videoAttachmentV3Controls.copy004'));
  if (action === 'close') await press(t('student.cameraRecorderView.copy005'));
  if (action === 'back') await act(async () => { renderer.root.findByType(Modal).props.onRequestClose(); });
  if (action === 'export failure') {
    mockMedia.trim.mockRejectedValueOnce(new Error('encoder failed'));
    await act(async () => { renderer.root.findAllByType(Video).find(n => n.props.source.uri !== original.localUri)!.props.onLoad({ duration: 8 }); });
    await press(t('student.videoTrimView.copy003'));
  }
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).toContain('Delivered to coach');
  expect(renderer.root.findByType(Video)).toBe(originalPlayer);
  expect(renderer.root.findByType(Video).props.source.uri).toBe(original.localUri);
  expect(useVideoUploadStore.getState().records['trim-student:trim-set']).toEqual(original);
  expect(videoUploadManager.attach).not.toHaveBeenCalled();
  expect(videoUploadManager.remove).not.toHaveBeenCalled();
});


test('a full-limit trim of a 130 second source prepares its actual exported duration within one frame', async () => {
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({ canceled: false, assets: [
    { uri: 'file:///cache/long.mp4', width: 1280, height: 720, duration: 130000, type: 'video' },
  ] });
  mockMedia.trimInfo.mockResolvedValueOnce({ durationMs: 130000, videoTrackCount: 1 });
  mockMedia.trim.mockResolvedValueOnce({ uri: 'file:///cache/export.mp4', durationMs: 120021 });
  jest.mocked(Compressor.getVideoMetaData).mockResolvedValueOnce({ duration: 120.021 } as never);
  mockMedia.readTracks.mockResolvedValueOnce({ codec: 'h264', width: 1280, height: 720, bitrate: 2000000, audio: null, frameRate: 30 });
  await mount();
  await act(async () => { renderer.root.findByType(Video).props.onLoad({ duration: 130 }); });
  await press(t('student.videoTrimView.copy003'));
  expect(mockMedia.trim).toHaveBeenCalledWith(expect.any(String), 0, 120000);
  const exported = jest.mocked(videoUploadManager.attach).mock.calls[0][1];
  expect(exported.durationMs).toBe(120021);
  await expect(prepareTrainingVideo(exported, { signal: new AbortController().signal, setCompressionCancellationId: () => {} }))
    .resolves.toEqual({ localUri: 'file:///cache/export.mp4', sizeBytes: 100 });
});


test.each([[220, 35], [110, 5], [200, 77], [200, 113]])('handle follows the full %ipx drag even when responder grant is %ipx late', async (distance, grantDelay) => {
  await mount();
  await act(async () => { renderer.root.findByType(Video).props.onLoad({ duration: 8 }); });
  const handle = () => renderer.root.findAllByType(View).find(n => n.props.accessibilityLabel === t('student.videoTrimTimeline.copy003'))!;
  await act(async () => { renderer.root.findAllByType(View).find(n => n.props.onLayout && n.props.style?.height === 64)!.props.onLayout({ nativeEvent: { layout: { width: 880 + spacing.minimumHitTarget } } }); });
  await act(async () => {
    expect(handle().props.onStartShouldSetResponder({ nativeEvent: { pageX: 100 } })).toBe(true);
    handle().props.onResponderGrant({ nativeEvent: { pageX: 100 + grantDelay } });
  });
  await act(async () => { handle().props.onResponderMove({ nativeEvent: { pageX: 100 + distance } }); });
  expect(mockSeek.mock.calls.at(-1)![0]).toBeCloseTo(distance / 110, 6);
  // Release also carries an absolute position, including any coalesced final move.
  await act(async () => { handle().props.onResponderRelease({ nativeEvent: { pageX: 100 + distance + 5 } }); });
  expect(mockSeek.mock.calls.at(-1)![0]).toBeCloseTo((distance + 5) / 110, 6);
});

test('pre-seek progress cannot end playback while the jump to the selection start is pending', async () => {
  await mount();
  await act(async () => { renderer.root.findByType(Video).props.onLoad({ duration: 8 }); });
  const adjust = async (key: Parameters<typeof t>[0], actionName: string) => {
    await act(async () => { renderer.root.findAllByType(View).find(n => n.props.accessibilityLabel === t(key))!
      .props.onAccessibilityAction({ nativeEvent: { actionName } }); });
  };
  await adjust('student.videoTrimTimeline.copy003', 'increment');
  await adjust('student.videoTrimTimeline.copy003', 'increment');
  await adjust('student.videoTrimTimeline.copy004', 'decrement');
  await adjust('student.videoTrimTimeline.copy004', 'decrement');
  await press(t('student.videoTrimView.copy005'));
  expect(mockSeek).toHaveBeenLastCalledWith(2, 0);
  await act(async () => { renderer.root.findByType(Video).props.onProgress({ currentTime: 6.55 }); });
  expect(renderer.root.findByType(Video).props.paused).toBe(false);
  // A superseded right-handle seek completion must not unlock the new seek.
  await act(async () => { renderer.root.findByType(Video).props.onSeek({ seekTime: 6, currentTime: 6 }); });
  await act(async () => { renderer.root.findByType(Video).props.onProgress({ currentTime: 7 }); });
  expect(renderer.root.findByType(Video).props.paused).toBe(false);
  await act(async () => { renderer.root.findByType(Video).props.onSeek({ seekTime: 2, currentTime: 2 }); });
  await act(async () => { renderer.root.findByType(Video).props.onProgress({ currentTime: 3.2 }); });
  expect(renderer.root.findByType(Video).props.paused).toBe(false);
  await act(async () => { renderer.root.findByType(Video).props.onProgress({ currentTime: 6 }); });
  expect(renderer.root.findByType(Video).props.paused).toBe(true);
  expect(mockSeek).toHaveBeenLastCalledWith(2, 0);
});

test.each([
  [30, 120.034], [60, 120.017], [120, 120.009], [0, 120.001], [NaN, 120.001],
])('duration validation rejects %.0f fps video beyond its frame allowance (%.3fs)', async (frameRate, duration) => {
  jest.mocked(Compressor.getVideoMetaData).mockResolvedValueOnce({ duration } as never);
  mockMedia.readTracks.mockResolvedValueOnce({ codec: 'h264', width: 1280, height: 720, bitrate: 2000000, audio: null, frameRate });
  await expect(prepareTrainingVideo({ uri: 'file:///cache/export.mp4', width: 1280, height: 720,
    durationMs: duration * 1000, mimeType: 'video/mp4', fileName: null, codec: null, rotationDegrees: 0 },
  { signal: new AbortController().signal, setCompressionCancellationId: () => {} }))
    .rejects.toThrow('The video exceeds the 120-second limit');
});


test.each(['light', 'dark'] as const)('trim presentation uses %s theme tokens and icon-only playback', async scheme => {
  await mount(false, scheme);
  await act(async () => renderer.root.findByType(Video).props.onLoad({ duration: 8 }));
  const colors = resolveColors(scheme);
  const node = (id: string) => renderer.root.findAll(n => n.props.testID === id)[0];
  const style = (id: string) => StyleSheet.flatten(node(id).props.style);
  expect(style('trim-page').backgroundColor).toBe(colors.bgBase);
  expect(style('trim-header').backgroundColor).toBe(colors.bgBase);
  expect(style('trim-video').backgroundColor).toBe(colors.chatImageBackground);
  expect(style('trim-play-button').backgroundColor).toBe(colors.numberPadScrim);
  expect(node('trim-play-icon').props.color).toBe(colors.inkOnCTAFill);
  expect(style('trim-playhead')).toMatchObject({ backgroundColor: colors.inkOnCTAFill, borderColor: colors.borderStrong });
  expect(style('trim-outside-start')).toMatchObject({ backgroundColor: colors.bgBase, opacity: 0.62 });
  expect(style('trim-selection').borderColor).toBe(colors.gold500);
  expect(renderer.root.findByType(StatusBar).props.barStyle).toBe(scheme === 'dark' ? 'light-content' : 'dark-content');
  const texts = renderer.root.findAllByType(Text).map(n => n.props.children);
  expect(texts).not.toContain(t('student.videoTrimView.copy004'));
  expect(texts).not.toContain(t('student.videoTrimView.copy005'));
  act(() => renderer.root.findAllByType(View).find(n => n.props.onLayout && n.props.style?.height === 64)!.props.onLayout({ nativeEvent: { layout: { width: 444 } } }));
  const scrubber = node('trim-scrubber');
  const touch = { nativeEvent: { pageX: 322, locationX: 222 } };
  mockSeek.mockClear();
  act(() => { expect(scrubber.props.onStartShouldSetResponder(touch)).toBe(true); scrubber.props.onResponderGrant(touch); });
  expect(mockSeek).toHaveBeenCalledTimes(1);
  expect(renderer.root.findByType(Video).props.paused).toBe(true);
  expect(style('trim-time-bubble').backgroundColor).toBe(colors.gold500);
  expect(node('trim-time-bubble').findAllByType(Text)[0].props.style.color).toBe(colors.inkOnGold);
  act(() => scrubber.props.onResponderRelease(touch));
  expect(renderer.root.findAllByProps({ testID: 'trim-time-bubble' })).toHaveLength(0);
});


// Exercise the real persisted analytics queue through its HTTP boundary.
async function collectDiagnostics(options: { offline?: boolean; consent?: boolean } = {}) {
  const bodies: { events: { name: string; props: Record<string, unknown> }[] }[] = [];
  await AsyncStorage.clear();
  await AsyncStorage.setItem(VIDEO_UPLOAD_CONSENT_KEY, 'true');
  if (options.consent !== false) await AsyncStorage.setItem(ANALYTICS_PRIVACY_NOTICE_KEY, 'true');
  await configure({
    accessTokenProvider: async () => 'test-token',
    retryDelaysMs: [],
    fetch: async (_url, request) => {
      if (request?.method === 'POST' && options.offline) throw new Error('offline');
      if (request?.method === 'POST') bodies.push(JSON.parse(String(request.body)));
      return { status: request?.method === 'POST' ? 204 : 200,
        json: async () => ({ enabled: true, sample_rate: 1 }) } as Response;
    },
  });
  return async () => {
    await flushNow();
    return bodies.flatMap(body => body.events).filter(event => event.name === 'client_error');
  };
}

test('an album picker failure reaches the backend with its stage and native code, without file details', async () => {
  const diagnostics = await collectDiagnostics();
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockRejectedValueOnce(Object.assign(
    new Error('Cannot read content://photos/private-training.mp4?token=secret'),
    { code: 'ERR_READ_FILE' },
  ));
  await mount();
  expect(await diagnostics()).toEqual([expect.objectContaining({ props: {
    domain: 'decode', code: 'video.picker.ERR_READ_FILE', screen: 'today_workout',
  } })]);
  expect(videoUploadManager.attach).not.toHaveBeenCalled();
});


test.each([
  ['copy', 'video.trim_copy.ERR_FILE_READ'],
  ['info', 'video.trim_info.ERR_MEDIA_EXTRACTOR'],
  ['invalid', 'video.trim_info.INVALID_SOURCE'],
  ['preview', 'video.trim_preview.22001'],
  ['export', 'video.trim_export.ERR_VIDEO_TRIM_MEDIA3_4001'],
  ['export', 'video.trim_export.ERR_VIDEO_TRIM_ASPECT_RATIO_CHANGED'],
  ['export', 'video.trim_export.ERR_VIDEO_TRIM_OUTPUT_UPSCALED'],
  ['export', 'video.trim_export.ERR_VIDEO_TRIM_HDR_NOT_SDR'],
  ['export', 'video.trim_export.ERR_VIDEO_TRIM_UNEXPECTED_AUDIO'],
])('a %s failure is delivered once with a safe stage-specific code', async (stage, code) => {
  const diagnostics = await collectDiagnostics();
  if (stage === 'copy') mockCopy.mockRejectedValueOnce({ code: 'ERR_FILE_READ', message: 'file:///private.mp4' });
  if (stage === 'info') mockMedia.trimInfo.mockRejectedValueOnce({ code: 'ERR_MEDIA_EXTRACTOR' });
  if (stage === 'invalid') mockMedia.trimInfo.mockResolvedValueOnce({ durationMs: 0, videoTrackCount: 0 });
  await mount();
  if (stage === 'preview') {
    const onError = renderer.root.findByType(Video).props.onError;
    await act(async () => {
      onError({ error: { errorCode: '22001', errorString: 'content://private.mp4' } });
      onError({ error: { errorCode: '22001', errorString: 'content://private.mp4' } });
    });
  }
  if (stage === 'export') {
    mockMedia.trim.mockRejectedValueOnce({ code: code.split('.').at(-1), message: 'file:///private.mp4?token=secret', stack: 'private stack' });
    await act(async () => renderer.root.findByType(Video).props.onLoad({ duration: 8 }));
    await press(t('student.videoTrimView.copy003'));
  }
  expect(await diagnostics()).toEqual([expect.objectContaining({ props: {
    domain: stage === 'copy' ? 'persistence' : 'decode', code, screen: 'today_workout',
  } })]);
  expect(videoUploadManager.attach).not.toHaveBeenCalled();
});


test.each([
  ['retain', 'video.retain_source.ERR_FILE_WRITE'],
  ['metadata', 'video.metadata.ERR_METADATA'],
  ['tracks', 'video.tracks.ERR_TRACKS'],
  ['compress', 'video.compress.ERR_COMPRESS'],
])('a %s failure before upload is delivered with its processing stage', async (stage, code) => {
  const diagnostics = await collectDiagnostics();
  const source = { uri: 'file:///cache/source.mp4', width: 1920, height: 1080, durationMs: 8000,
    mimeType: 'video/mp4', fileName: null, codec: null, rotationDegrees: 0 };
  if (stage === 'retain') mockCopy.mockRejectedValueOnce({ code: 'ERR_FILE_WRITE' });
  if (stage === 'metadata') jest.mocked(Compressor.getVideoMetaData).mockRejectedValueOnce({ code: 'ERR_METADATA' });
  if (stage === 'tracks') mockMedia.readTracks.mockRejectedValueOnce({ code: 'ERR_TRACKS' });
  if (stage === 'compress') jest.mocked(Compressor.Video.compress).mockRejectedValueOnce({ code: 'ERR_COMPRESS' });
  const operation = stage === 'retain' ? retainVideoSource(source) : prepareTrainingVideo(source,
    { signal: new AbortController().signal, setCompressionCancellationId: () => {} });
  await expect(operation).rejects.toThrow();
  expect(await diagnostics()).toEqual([expect.objectContaining({ props: {
    domain: stage === 'retain' ? 'persistence' : 'decode', code, screen: 'today_workout',
  } })]);
});


test('a persisted local failure can be delivered after analytics restarts and the network returns', async () => {
  const network = { offline: true };
  const diagnostics = await collectDiagnostics(network);
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockRejectedValueOnce({ code: 'ERR_READ_FILE' });
  await mount();
  expect(await diagnostics()).toEqual([]);
  resetAnalyticsForTests();
  const bodies: { events: { name: string; props: Record<string, unknown> }[] }[] = [];
  await configure({ accessTokenProvider: async () => 'test-token', fetch: async (_url, request) => {
    if (request?.method === 'POST') bodies.push(JSON.parse(String(request.body)));
    return { status: request?.method === 'POST' ? 204 : 200,
      json: async () => ({ enabled: true, sample_rate: 1 }) } as Response;
  } });
  await flushNow();
  expect(bodies.flatMap(body => body.events)).toEqual([expect.objectContaining({
    name: 'client_error', props: { domain: 'decode', code: 'video.picker.ERR_READ_FILE', screen: 'today_workout' },
  })]);
});

test('diagnostics respect the existing privacy gate', async () => {
  const diagnostics = await collectDiagnostics({ consent: false });
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockRejectedValueOnce({ code: 'ERR_READ_FILE' });
  await mount();
  expect(await diagnostics()).toEqual([]);
  await confirmPrivacyNotice({ waitForFlush: true });
  expect(await diagnostics()).toHaveLength(1);
});

test.each(['cancel picker', 'close trim', 'late failure'])('%s does not report a processing failure', async action => {
  const diagnostics = await collectDiagnostics();
  let fail!: (error: unknown) => void;
  if (action === 'cancel picker') jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({ canceled: true, assets: null });
  if (action === 'late failure') mockMedia.trimInfo.mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
  await mount();
  if (action !== 'cancel picker') await press(t('student.cameraRecorderView.copy005'));
  if (action === 'late failure') await act(async () => fail({ code: 'ERR_READ_FILE' }));
  expect(await diagnostics()).toEqual([]);
});

test('untrusted exception text, paths, and malformed codes never reach logs or requests', async () => {
  const diagnostics = await collectDiagnostics();
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockRejectedValueOnce({
    code: 'file:///private.mp4', name: 'private-name', message: 'token=secret', stack: 'secret stack',
  });
  await mount();
  expect(await diagnostics()).toEqual([expect.objectContaining({ props: {
    domain: 'decode', code: 'video.picker.UNKNOWN', screen: 'today_workout',
  } })]);
  expect(warning).toHaveBeenCalledWith('[VideoProcessing]', 'video.picker.UNKNOWN');
  expect(JSON.stringify(warning.mock.calls)).not.toMatch(/private|secret/);
  warning.mockRestore();
});


test('aborting during export retention suppresses a late copy failure', async () => {
  const diagnostics = await collectDiagnostics();
  const controller = new AbortController();
  let rejectCopy!: (error: unknown) => void;
  jest.mocked(Compressor.Video.compress).mockResolvedValueOnce('file:///cache/compressed.mp4');
  mockCopy.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectCopy = reject; }));
  const pending = prepareTrainingVideo({ uri: 'file:///cache/source.mp4', width: 1920, height: 1080,
    durationMs: 8000, mimeType: 'video/mp4', fileName: null, codec: null, rotationDegrees: 0 },
    { signal: controller.signal, setCompressionCancellationId: () => {} }).catch(() => {});
  await act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); });
  expect(rejectCopy).toBeDefined();
  controller.abort();
  rejectCopy({ code: 'ERR_FILE_WRITE' });
  await pending;
  expect(await diagnostics()).toEqual([]);
});

test.each([
  ['Dolby Vision profile 5 has no HEVC base layer; cannot transcode', 'DOLBY_VISION_UNSUPPORTED'],
  ['Failed to extract video metadata, please try again', 'METADATA_UNAVAILABLE'],
  ['Compressed video output is invalid', 'INVALID_COMPRESSED_OUTPUT'],
  ['Failed to read the input video dimensions', 'DIMENSIONS_UNAVAILABLE'],
])('the compressor message-only failure %s maps to a fixed code', async (message, code) => {
  const diagnostics = await collectDiagnostics();
  // NitroPromiseAdapter drops the RN symbolic code and forwards a Throwable.
  jest.mocked(Compressor.Video.compress).mockRejectedValueOnce(new Error(message));
  await expect(prepareTrainingVideo({ uri: 'file:///cache/source.mp4', width: 1920, height: 1080,
    durationMs: 8000, mimeType: 'video/mp4', fileName: null, codec: null, rotationDegrees: 0 },
    { signal: new AbortController().signal, setCompressionCancellationId: () => {} })).rejects.toThrow();
  expect(await diagnostics()).toEqual([expect.objectContaining({ props: {
    domain: 'decode', code: `video.compress.${code}`, screen: 'today_workout',
  } })]);
});


test('the Android Nitro Throwable prefix and stack are classified without being uploaded', async () => {
  const diagnostics = await collectDiagnostics();
  jest.mocked(Compressor.Video.compress).mockRejectedValueOnce(new Error(
    'java.lang.Throwable: Dolby Vision profile 5 has no HEVC base layer; cannot transcode\n\tat content://private.mp4?token=secret',
  ));
  await expect(prepareTrainingVideo({ uri: 'file:///cache/source.mp4', width: 1920, height: 1080,
    durationMs: 8000, mimeType: 'video/mp4', fileName: null, codec: null, rotationDegrees: 0 },
    { signal: new AbortController().signal, setCompressionCancellationId: () => {} })).rejects.toThrow();
  expect(await diagnostics()).toEqual([expect.objectContaining({ props: {
    domain: 'decode', code: 'video.compress.DOLBY_VISION_UNSUPPORTED', screen: 'today_workout',
  } })]);
});


test.each(['picker', 'export'])('compact %s failure uses an Alert without adding text to the set row', async failure => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  try {
    await act(async () => { renderer = create(<VideoAttachmentControls compact initialCamera studentId="trim-student" stableSetId="trim-set"
      editable ensureSetLog={async () => 'log'} buildLogRequest={() => { throw new Error('not used'); }} />); });
    if (failure === 'picker') jest.mocked(ImagePicker.launchImageLibraryAsync).mockRejectedValueOnce(new Error('private path'));
    await act(async () => { renderer.root.findByType(CameraRecorder).props.onLibrary!(); });
    if (failure === 'export') {
      mockMedia.trim.mockRejectedValueOnce(new Error('encoder failed'));
      await press(t('student.videoTrimView.copy003'));
    }
    expect(alert).toHaveBeenCalledWith('', t('student.videoAttachmentViewModel.copy001'), [
      { text: t('student.cameraRecorderView.copy005') },
    ]);
    expect(renderer.root.findAllByType(Text).map(n => n.props.children)).not.toContain(t('student.videoAttachmentViewModel.copy001'));
    expect(videoUploadManager.attach).not.toHaveBeenCalled();
  } finally { alert.mockRestore(); }
});
