import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AppState, Modal, Text, type AppStateStatus } from 'react-native';
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
jest.mock('react-native-video', () => 'Video');
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
  trimInfo: jest.fn(async () => ({ durationMs: 3000, videoTrackCount: 1 })),
  thumbnails: jest.fn(async () => []),
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
beforeEach(async () => {
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
const mountCamera = async () => {
  const onUse = jest.fn();
  const onClose = jest.fn(() => renderer.unmount());
  await act(async () => {
    renderer = create(<CameraRecorder onClose={onClose} onUse={onUse} />);
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
  expect(preview.props.controls).toBe(true);
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

test('review offers Edit and a persistent do-not-remind trim hint', async () => {
  await mountCamera();
  await completeRecording();
  const labels = () => renderer.root.findAllByType(Text).map(node => node.props.children);
  expect(labels()).toContain(t('student.cameraRecorderComponents.copy009'));
  expect(labels()).toContain(t('student.cameraRecorderComponents.copy007'));
  await press(t('student.cameraRecorderComponents.copy008'));
  expect(labels()).not.toContain(t('student.cameraRecorderComponents.copy007'));
  act(() => renderer.unmount());
  await mountCamera();
  await completeRecording();
  expect(labels()).not.toContain(t('student.cameraRecorderComponents.copy007'));
});


test('Edit then Save updates duration, suppresses the hint, and Use saves and delivers the trimmed file', async () => {
  const { onUse } = await mountCamera();
  await completeRecording();
  await press(t('student.cameraRecorderComponents.copy009'));
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).toContain(t('student.videoTrimView.copy002'));
  const trimPlayer = renderer.root.findAllByType(Video).find(n => n.props.source.uri !== uri)!;
  await act(async () => { trimPlayer.props.onLoad({ duration: 3 }); });
  await press(t('student.videoTrimView.copy003'));
  expect(renderer.root.findByType(Video).props.source.uri).toBe('file:///cache/trimmed.mp4');
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).toContain('Duration 00:01');
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).not.toContain(t('student.cameraRecorderComponents.copy007'));
  await changeAppState('background', 'active');
  await press(t('student.cameraRecorderComponents.copy010'));
  expect(MediaLibrary.Asset.create).toHaveBeenCalledWith('file:///cache/trimmed.mp4');
  expect(onUse).toHaveBeenCalledWith('file:///cache/trimmed.mp4');
  expect(deleteLocalVideo).toHaveBeenCalledWith(uri);
  act(() => renderer.unmount());
  expect(deleteLocalVideo).not.toHaveBeenCalledWith('file:///cache/trimmed.mp4');
});


test.each(['close', 'failure'])('Edit %s retains the review and permits retry', async outcome => {
  const { onUse } = await mountCamera();
  await completeRecording();
  if (outcome === 'failure') mockMedia.trimInfo.mockRejectedValueOnce(new Error('invalid file'));
  await press(t('student.cameraRecorderComponents.copy009'));
  if (outcome === 'close') await press(t('student.cameraRecorderView.copy005'));
  expect(renderer.root.findByType(Video).props.source.uri).toBe(uri);
  expect(deleteLocalVideo).not.toHaveBeenCalledWith(uri);
  await press(t('student.cameraRecorderComponents.copy009'));
  const trimPlayer = renderer.root.findAllByType(Video).find(n => n.props.source.uri !== uri)!;
  await act(async () => { trimPlayer.props.onLoad({ duration: 3 }); });
  await press(t('student.videoTrimView.copy003'));
  await press(t('student.cameraRecorderComponents.copy010'));
  expect(onUse).toHaveBeenCalledWith('file:///cache/trimmed.mp4');
});
