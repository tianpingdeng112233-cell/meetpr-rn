import { afterEach, beforeAll, beforeEach, expect, jest, test } from '@jest/globals';
import { ColorSchemeProvider, resolveColors } from '@/design/theme';
import { StatusBar, StyleSheet } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AppState, Modal, Text, View, ToastAndroid, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoModules from 'expo-modules-core';
import * as MediaLibrary from 'expo-media-library';
import { CameraView } from 'expo-camera';
import Video from 'react-native-video';
import { setLocaleOverride, t } from '@/i18n';
import { CameraRecorder } from '../CameraRecorder';
import { deleteLocalVideo } from '../native';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../native', () => ({ deleteLocalVideo: jest.fn() }));
const mockSeek = jest.fn();
jest.mock('react-native-video', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return React.forwardRef(function MockVideo(_props, ref) {
    React.useImperativeHandle(ref, () => ({ seek: mockSeek }));
    return null;
  });
});
jest.mock('expo-media-library', () => ({
  getPermissionsAsync: async () => ({ granted: true }),
  Asset: { create: jest.fn() },
}));
let mockFinishRecording: ((video: { uri: string }) => void) | undefined;
const mockStopRecording = jest.fn(() =>
  mockFinishRecording?.({ uri: 'file:///recorded.mp4' }));
jest.mock('expo-camera', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    Camera: {
      requestCameraPermissionsAsync: async () => ({ granted: true }),
      requestMicrophonePermissionsAsync: async () => ({ granted: true }),
    },
    CameraView: React.forwardRef(function MockCameraView(_props, ref) {
      React.useImperativeHandle(ref, () => ({
        recordAsync: () => new Promise<{ uri: string }>(resolve => {
          mockFinishRecording = resolve;
        }),
        stopRecording: mockStopRecording,
      }));
      return null;
    }),
  };
});

const mockMedia = {
  trimInfo: jest.fn(async (_uri: string) => ({ durationMs: 3000, videoTrackCount: 1 })),
  thumbnails: jest.fn(async () => ['file:///cache/thumb.jpg']),
  trim: jest.fn(async () => ({ uri: 'file:///cache/trimmed.mp4', durationMs: 1000 })),
  cancelTrim: jest.fn(async () => {}),
};
jest.mock('expo-file-system', () => ({
  File: class {
    uri: string; exists = true; size = 100;
    constructor(...parts: (string | { uri: string })[]) { this.uri = parts.map(p => typeof p === 'string' ? p : p.uri).join('/'); }
    copy() {} delete() {}
  },
  Paths: { cache: { uri: 'file:///cache/' }, document: { uri: 'file:///documents/' } },
}));
const uri = 'file:///recorded.mp4';
let renderer: ReactTestRenderer;
let changeState: (state: AppStateStatus) => void;
beforeAll(async () => {
  // Pay the first-mount module loading cost here; tests keep Jest's default timeout.
  try {
    await mountCamera();
  } finally {
    await act(async () => { renderer?.unmount(); });
  }
}, 30_000);
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  jest.spyOn(jest.requireMock<typeof import('expo-modules-core')>('expo-modules-core'), 'requireNativeModule').mockReturnValue(mockMedia);
  jest.spyOn(ExpoModules.uuid, 'v4').mockReturnValue('camera-working');
  jest.mocked(MediaLibrary.Asset.create).mockClear();
  setLocaleOverride('en');
  jest.useFakeTimers();
  jest.mocked(deleteLocalVideo).mockClear();
  mockFinishRecording = undefined;
  mockStopRecording.mockReset().mockImplementation(() => mockFinishRecording?.({ uri }));
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, callback) => {
    changeState = callback;
    return { remove: jest.fn() };
  });
});
afterEach(() => {
  act(() => renderer?.unmount());
  jest.useRealTimers();
  jest.restoreAllMocks();
  setLocaleOverride(null);
});
const press = async (label: string) => {
  await act(async () => {
    const node = renderer.root.findAll(node =>
      (node.props.accessibilityLabel === label || node.props.label === label) && node.props.onPress)[0];
    expect(node).toBeDefined();
    expect(node.props.disabled).not.toBe(true);
    node.props.onPress();
  });
};
const mountCamera = async (scheme: 'light' | 'dark' = 'light') => {
  const onUse = jest.fn();
  const onClose = jest.fn(() => renderer.unmount());
  await act(async () => {
    renderer = create(<ColorSchemeProvider scheme={scheme}><CameraRecorder onClose={onClose} onUse={onUse} /></ColorSchemeProvider>);
  });
  return { onUse, onClose };
};
const startRecording = async () => {
  await act(async () => { renderer.root.findByType(CameraView).props.onCameraReady(); });
  await press(t('student.cameraRecorderComponents.copy004'));
  act(() => jest.advanceTimersByTime(3000));
  expect(renderer.root.findAllByType(Text).some(node => node.props.children === '00:03')).toBe(true);
};
const completeRecording = async () => {
  await startRecording();
  await press(t('student.cameraRecorderComponents.copy003'));
  expect(renderer.root.findByType(Video).props.source.uri).toBe(uri);
};
const changeAppState = async (...states: AppStateStatus[]) => {
  for (const state of states) await act(async () => { changeState(state); });
};

test.each<[string, AppStateStatus[]]>([
  ['no interruption control', []],
  ['inactive-only control', ['inactive', 'active']],
  ['background and return', ['background', 'active']],
  ['background alone', ['background']],
])('%s: completed preview and file survive for Use', async (_label, states) => {
  const { onUse } = await mountCamera();
  await completeRecording();
  const preview = renderer.root.findByType(Video);
  await changeAppState(...states);
  expect(renderer.root.findByType(Video)).toBe(preview);
  expect(preview.props.source.uri).toBe(uri);
  expect(preview.props.controls).not.toBe(true);
  expect(renderer.root.findAll(node => node.props.label === t('student.cameraRecorderView.copy009')).length).toBeGreaterThan(0);
  expect(renderer.root.findAllByType(Text).some(node => node.props.children === '00:00')).toBe(false);
  expect(deleteLocalVideo).not.toHaveBeenCalledWith(uri);
  await press(t('student.cameraRecorderComponents.copy010'));
  expect(onUse).toHaveBeenCalledTimes(1);
  expect(onUse).toHaveBeenCalledWith(uri);
  act(() => renderer.unmount());
  expect(deleteLocalVideo).not.toHaveBeenCalledWith(uri);
});

test.each([false, true])('background interrupts an active recording and deletes its file (late completion: %s)', async (lateCompletion) => {
  const { onUse } = await mountCamera();
  await startRecording();
  if (lateCompletion) mockStopRecording.mockImplementationOnce(() => undefined);
  await changeAppState('background');
  expect(mockStopRecording).toHaveBeenCalledTimes(1);
  await changeAppState('active');
  if (lateCompletion) await act(async () => { mockFinishRecording?.({ uri }); });
  expect(deleteLocalVideo).toHaveBeenCalledWith(uri);
  expect(renderer.root.findAllByType(Video)).toHaveLength(0);
  expect(renderer.root.findAllByType(Text).some(node => node.props.children === '00:00')).toBe(true);
  expect(onUse).not.toHaveBeenCalled();
  await completeRecording();
});

test('Retry after returning from background deletes the old file and allows a new recording', async () => {
  const { onUse } = await mountCamera();
  await completeRecording();
  await changeAppState('background', 'active');
  expect(deleteLocalVideo).not.toHaveBeenCalledWith(uri);
  await press(t('student.cameraRecorderView.copy009'));
  expect(deleteLocalVideo).toHaveBeenCalledWith(uri);
  expect(renderer.root.findAllByType(Video)).toHaveLength(0);
  await startRecording();
  const nextUri = 'file:///retake.mp4';
  mockStopRecording.mockImplementationOnce(() => mockFinishRecording?.({ uri: nextUri }));
  await press(t('student.cameraRecorderComponents.copy003'));
  expect(renderer.root.findByType(Video).props.source.uri).toBe(nextUri);
  await press(t('student.cameraRecorderComponents.copy010'));
  expect(onUse).toHaveBeenCalledWith(nextUri);
  act(() => renderer.unmount());
  expect(deleteLocalVideo).not.toHaveBeenCalledWith(nextUri);
});

test.each(['Close camera', 'system back', 'parent unmount'])('%s cleans up an unused preview after returning from background', async (action) => {
  const { onUse, onClose } = await mountCamera();
  await completeRecording();
  await changeAppState('background', 'active');
  expect(deleteLocalVideo).not.toHaveBeenCalledWith(uri);
  if (action === 'Close camera') {
    await press(t('student.cameraRecorderComponents.copy011'));
    expect(onClose).toHaveBeenCalledTimes(1);
  } else if (action === 'system back') {
    act(() => renderer.root.findByType(Modal).props.onRequestClose());
    expect(onClose).toHaveBeenCalledTimes(1);
  } else {
    act(() => renderer.unmount());
  }
  expect(deleteLocalVideo).toHaveBeenCalledWith(uri);
  expect(onUse).not.toHaveBeenCalled();
});

test.each(['Close camera', 'system back'])('%s closes capture and cleans up an in-flight recording', async action => {
  const { onUse, onClose } = await mountCamera();
  await startRecording();
  if (action === 'Close camera') await press(t('student.cameraRecorderComponents.copy011'));
  else await act(async () => { renderer.root.findByType(Modal).props.onRequestClose(); });
  expect(onClose).toHaveBeenCalledTimes(1);
  // Native camera unmount may settle recordAsync after React has cleared its ref.
  await act(async () => { mockFinishRecording?.({ uri }); });
  expect(deleteLocalVideo).toHaveBeenCalledWith(uri);
  expect(onUse).not.toHaveBeenCalled();
});

test('review shows the shared timeline and Selected without Edit, Duration or native controls', async () => {
  await mountCamera();
  await completeRecording();
  const labels = renderer.root.findAllByType(Text).map(node => node.props.children);
  expect(labels).toContain('Selected 0:03');
  expect(labels).not.toContain(t('student.cameraRecorderComponents.copy009'));
  expect(labels).not.toContain('Duration 00:03');
  expect(renderer.root.findByType(Video).props.controls).not.toBe(true);
  expect(renderer.root.findByType(Video).props.paused).toBe(false);
});

const adjust = async (edge: 'start' | 'end', actionName = 'increment') => {
  await act(async () => { renderer.root.findAllByType(View).find(n => n.props.accessibilityLabel === t(
    edge === 'start' ? 'student.videoTrimTimeline.copy003' : 'student.videoTrimTimeline.copy004'))!
    .props.onAccessibilityAction({ nativeEvent: { actionName } }); });
};
const loadReview = async () => {
  await act(async () => { renderer.root.findByType(Video).props.onLoad({ duration: 3 }); });
};

test('moving handles then Use exports the selected range, saves that file to Photos and releases the original', async () => {
  const { onUse } = await mountCamera();
  await completeRecording();
  await loadReview();
  await adjust('start');
  await adjust('end', 'decrement');
  await press(t('student.cameraRecorderComponents.copy010'));
  expect(mockMedia.trim).toHaveBeenCalledWith(expect.any(String), 1000, 2000);
  expect(MediaLibrary.Asset.create).toHaveBeenCalledWith('file:///cache/trimmed.mp4');
  expect(onUse).toHaveBeenCalledWith('file:///cache/trimmed.mp4');
  expect(deleteLocalVideo).toHaveBeenCalledWith(uri);
  expect(deleteLocalVideo).toHaveBeenCalledWith('file:///cache/thumb.jpg');
  expect(await AsyncStorage.getItem('training.video.trimHintDismissed.v1')).toBe('true');
  act(() => renderer.unmount());
  expect(deleteLocalVideo).not.toHaveBeenCalledWith('file:///cache/trimmed.mp4');
});

test('review Play loops within the selection, ignores stale progress and preserves paused bounds across background', async () => {
  await mountCamera();
  await completeRecording();
  await loadReview();
  await adjust('start');
  await adjust('end', 'decrement');
  expect(renderer.root.findByType(Video).props.paused).toBe(true);
  await changeAppState('background', 'active');
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).toContain('Selected 0:01');
  await press(t('student.videoTrimView.copy005'));
  expect(mockSeek).toHaveBeenLastCalledWith(1, 0);
  await act(async () => { renderer.root.findByType(Video).props.onProgress({ currentTime: 3 }); });
  expect(renderer.root.findByType(Video).props.paused).toBe(false);
  await act(async () => { renderer.root.findByType(Video).props.onSeek({ seekTime: 1 }); });
  await act(async () => { renderer.root.findByType(Video).props.onProgress({ currentTime: 2 }); });
  expect(mockSeek).toHaveBeenLastCalledWith(1, 0);
  expect(renderer.root.findByType(Video).props.paused).toBe(false);
  await press(t('student.videoTrimView.copy004'));
  expect(renderer.root.findByType(Video).props.paused).toBe(true);
});

test('hint bubble closes for this review only, while do-not-remind persists across reviews', async () => {
  await mountCamera();
  await completeRecording();
  const hint = () => renderer.root.findAllByType(Text).find(n => n.props.children === t('student.cameraRecorderComponents.copy007'));
  expect(hint()).toBeDefined();
  expect(hint()!.props.numberOfLines).toBe(3);
  expect(hint()!.props.ellipsizeMode).not.toBe('tail');
  await press(t('student.cameraRecorderView.copy005'));
  expect(hint()).toBeUndefined();
  expect(await AsyncStorage.getItem('training.video.trimHintDismissed.v1')).toBeNull();
  await press(t('student.cameraRecorderView.copy009'));
  await completeRecording();
  expect(hint()).toBeDefined();
  await press(t('student.cameraRecorderComponents.copy008'));
  expect(hint()).toBeUndefined();
  act(() => renderer.unmount());
  await mountCamera();
  await completeRecording();
  expect(hint()).toBeUndefined();
});

test('export locks Retry, Close, back, handles, Play and Photos until completion', async () => {
  let finish!: (value: { uri: string; durationMs: number }) => void;
  mockMedia.trim.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const { onUse, onClose } = await mountCamera();
  await completeRecording();
  await loadReview();
  await adjust('start');
  await press(t('student.cameraRecorderComponents.copy010'));
  for (const label of [t('student.cameraRecorderView.copy009'), t('student.cameraRecorderComponents.copy011'), t('student.videoTrimView.copy005')]) {
    const button = renderer.root.findAll(n => (n.props.label === label || n.props.accessibilityLabel === label) && n.props.onPress)[0];
    expect(button.props.disabled).toBe(true);
    await act(async () => { button.props.onPress(); });
  }
  await act(async () => { renderer.root.findByType(Modal).props.onRequestClose(); });
  await adjust('start');
  expect(onClose).not.toHaveBeenCalled();
  expect(onUse).not.toHaveBeenCalled();
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).toContain('Selected 0:02');
  const photos = renderer.root.findAll(n => n.props.accessibilityLabel === t('student.cameraRecorderComponents.copy006') && n.props.onValueChange)[0];
  expect(photos.props.disabled).toBe(true);
  await act(async () => { photos.props.onValueChange(false); });
  await act(async () => { finish({ uri: 'file:///cache/trimmed.mp4', durationMs: 2000 }); });
  expect(MediaLibrary.Asset.create).toHaveBeenCalledWith('file:///cache/trimmed.mp4');
  expect(onUse).toHaveBeenCalledTimes(1);
});

test.each(['metadata', 'thumbnails'])('%s preparation failure hides trim tools and Use delivers the original', async stage => {
  if (stage === 'metadata') mockMedia.trimInfo.mockRejectedValueOnce(new Error('unreadable'));
  else mockMedia.thumbnails.mockRejectedValueOnce(new Error('unreadable frame'));
  const { onUse } = await mountCamera();
  await completeRecording();
  expect(renderer.root.findAllByType(View).filter(n => n.props.accessibilityLabel === t('student.videoTrimTimeline.copy002'))).toHaveLength(0);
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).not.toContain(t('student.cameraRecorderComponents.copy007'));
  await press(t('student.cameraRecorderComponents.copy010'));
  expect(mockMedia.trim).not.toHaveBeenCalled();
  expect(onUse).toHaveBeenCalledWith(uri);
});

test('Retry resets the previous selection and keeps handles disabled while the next clip is preparing', async () => {
  await mountCamera();
  await completeRecording();
  await loadReview();
  await adjust('start');
  await press(t('student.cameraRecorderView.copy009'));
  let finish!: (value: { durationMs: number; videoTrackCount: number }) => void;
  mockMedia.trimInfo.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await completeRecording();
  const handle = () => renderer.root.findAllByType(View).find(n => n.props.accessibilityLabel === t('student.videoTrimTimeline.copy003'))!;
  expect(handle().props.accessibilityState.disabled).toBe(true);
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).not.toContain('Selected 0:02');
  await act(async () => { finish({ durationMs: 3000, videoTrackCount: 1 }); });
  expect(handle().props.accessibilityState.disabled).toBe(true);
  await loadReview();
  expect(handle().props.accessibilityState.disabled).toBe(false);
});

test('Use during thumbnail preparation delivers the original and cleans late thumbnails without exporting', async () => {
  let finish!: (images: string[]) => void;
  mockMedia.thumbnails.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const { onUse } = await mountCamera();
  await completeRecording();
  await loadReview();
  const handle = renderer.root.findAllByType(View).find(n => n.props.accessibilityLabel === t('student.videoTrimTimeline.copy003'))!;
  expect(handle.props.accessibilityState.disabled).toBe(true);
  await press(t('student.cameraRecorderComponents.copy010'));
  expect(mockMedia.trim).not.toHaveBeenCalled();
  expect(onUse).toHaveBeenCalledWith(uri);
  expect(await AsyncStorage.getItem('training.video.trimHintDismissed.v1')).toBeNull();
  await act(async () => { finish(['file:///cache/late-thumb.jpg']); });
  expect(deleteLocalVideo).toHaveBeenCalledWith('file:///cache/late-thumb.jpg');
});

test('export failure keeps the source and range, reports the existing error and retries Use', async () => {
  const toast = jest.spyOn(ToastAndroid, 'show').mockImplementation(() => {});
  mockMedia.trim.mockRejectedValueOnce(new Error('encoder failed'));
  const { onUse } = await mountCamera();
  await completeRecording();
  await loadReview();
  await adjust('start');
  await press(t('student.cameraRecorderComponents.copy010'));
  expect(toast).toHaveBeenCalledWith(t('student.cameraRecorderView.copy011'), ToastAndroid.LONG);
  expect(onUse).not.toHaveBeenCalled();
  expect(renderer.root.findByType(Video).props.source.uri).toBe(uri);
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).toContain('Selected 0:02');
  expect(deleteLocalVideo).not.toHaveBeenCalledWith(uri);
  expect(await AsyncStorage.getItem('training.video.trimHintDismissed.v1')).toBeNull();
  await press(t('student.cameraRecorderComponents.copy010'));
  expect(mockMedia.trim).toHaveBeenCalledTimes(2);
  expect(mockMedia.trim).toHaveBeenLastCalledWith(expect.any(String), 1000, 3000);
  expect(onUse).toHaveBeenCalledTimes(1);
});

test.each(['Retry', 'Close', 'unmount'])('%s cleans review work files and late thumbnail results', async action => {
  let finish!: (images: string[]) => void;
  mockMedia.thumbnails.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const { onUse } = await mountCamera();
  await completeRecording();
  const work = mockMedia.trimInfo.mock.calls[0][0];
  if (action === 'Retry') await press(t('student.cameraRecorderView.copy009'));
  else if (action === 'Close') await press(t('student.cameraRecorderComponents.copy011'));
  else act(() => renderer.unmount());
  await act(async () => { finish(['file:///cache/late-thumb.jpg']); });
  expect(mockMedia.cancelTrim).toHaveBeenCalledWith(work);
  expect(deleteLocalVideo).toHaveBeenCalledWith(work);
  expect(deleteLocalVideo).toHaveBeenCalledWith(uri);
  expect(deleteLocalVideo).toHaveBeenCalledWith('file:///cache/late-thumb.jpg');
  expect(onUse).not.toHaveBeenCalled();
});

test.each(['export', 'Photos'])('unmount during %s cancels work, reclaims the output and never delivers it', async stage => {
  let finishExport!: (value: { uri: string; durationMs: number }) => void;
  let finishPhotos!: () => void;
  if (stage === 'export') mockMedia.trim.mockImplementationOnce(() => new Promise(resolve => { finishExport = resolve; }));
  else jest.mocked(MediaLibrary.Asset.create).mockImplementationOnce(() => new Promise(resolve => { finishPhotos = () => resolve({} as never); }));
  const { onUse } = await mountCamera();
  await completeRecording();
  await loadReview();
  await adjust('start');
  await press(t('student.cameraRecorderComponents.copy010'));
  act(() => renderer.unmount());
  await act(async () => {
    if (stage === 'export') finishExport({ uri: 'file:///cache/trimmed.mp4', durationMs: 2000 });
    else finishPhotos();
  });
  expect(mockMedia.cancelTrim).toHaveBeenCalledTimes(1);
  expect(deleteLocalVideo).toHaveBeenCalledWith('file:///cache/trimmed.mp4');
  expect(deleteLocalVideo).toHaveBeenCalledWith('file:///cache/thumb.jpg');
  expect(deleteLocalVideo).toHaveBeenCalledWith(uri);
  expect(onUse).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem('training.video.trimHintDismissed.v1')).toBeNull();
});

test('untouched Use does not export or suppress the hint and hands off only the original', async () => {
  const { onUse } = await mountCamera();
  await completeRecording();
  await loadReview();
  await press(t('student.cameraRecorderComponents.copy010'));
  expect(mockMedia.trim).not.toHaveBeenCalled();
  expect(MediaLibrary.Asset.create).toHaveBeenCalledWith(uri);
  expect(onUse).toHaveBeenCalledWith(uri);
  expect(deleteLocalVideo).toHaveBeenCalledWith('file:///cache/thumb.jpg');
  expect(deleteLocalVideo).not.toHaveBeenCalledWith(uri);
  expect(await AsyncStorage.getItem('training.video.trimHintDismissed.v1')).toBeNull();
});

test('pausing during preparation stays paused when metadata becomes ready', async () => {
  let finish!: (value: { durationMs: number; videoTrackCount: number }) => void;
  mockMedia.trimInfo.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await mountCamera();
  await completeRecording();
  await press(t('student.videoTrimView.copy004'));
  await act(async () => { finish({ durationMs: 3000, videoTrackCount: 1 }); });
  expect(renderer.root.findByType(Video).props.paused).toBe(true);
});


test.each(['light', 'dark'] as const)('trim presentation uses %s theme tokens and icon-only playback', async scheme => {
  await mountCamera(scheme);
  await completeRecording();
  await loadReview();
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
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).not.toContain(t('student.cameraRecorderComponents.copy007'));
  act(() => scrubber.props.onResponderRelease(touch));
  expect(renderer.root.findAllByProps({ testID: 'trim-time-bubble' })).toHaveLength(0);
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).toContain(t('student.cameraRecorderComponents.copy007'));
});
