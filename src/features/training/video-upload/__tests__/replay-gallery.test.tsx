import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import * as RN from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { presentBadge } from '@/features/video-player/badge-presentation';
import { BadgeCaptureHost } from '@/features/video-player/BadgeCaptureHost';
import { VideoBadgeCard } from '@/features/video-player/VideoBadgeCard';
import { FeedbackPressable } from '@/design/FeedbackPressable';
import { t } from '@/i18n';
import { VideoAttachmentControls } from '../VideoAttachmentControls';
import { EMPTY_VIDEO_UPLOAD } from '../model';
import { useVideoUploadStore } from '../store';
import { aliasRecordingSource, beginUploadPreparation, startRecordingSave, uploadPreparationFinished } from '../recording-gallery';
import { setsRepository } from '@/api/domains/sets';

const source = 'file:///documents/training-videos/synthetic.mp4';
const currentSet = { exerciseName: 'Squat', setOrdinal: 1, weightKg: 145, reps: 5, rpe: null };
const mockInfo = jest.fn(async (_uri: string) => ({ durationMs: 5000, displayWidth: 720, displayHeight: 1280 }));
const mockBitmap = { release: jest.fn() };
const mockCapture = jest.fn(async (_tag: number) => mockBitmap);
const mockBurn = jest.fn(async () => ({ uri: 'file:///cache/badged.mp4' }));
const mockPermission = jest.fn(async () => ({ granted: true, canAskAgain: false }));
const mockSave = jest.fn(async (_uri: string) => {});
const mockDownload = jest.fn();
jest.mock('expo-media-library', () => ({ getPermissionsAsync: () => mockPermission(), Asset: { create: (uri: string) => mockSave(uri) } }));
jest.mock('expo-file-system', () => ({
  Paths: { cache: { uri: 'file:///cache' }, document: { uri: 'file:///documents' } },
  File: class {
    uri: string; constructor(path: string) { this.uri = path; }
    exists = true;
    delete() {}
    static downloadFileAsync() { return mockDownload(); }
  },
}));
jest.mock('react-native-compressor', () => ({}));
jest.mock('react-native-video', () => ({ __esModule: true, default: 'Video' }));
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

let tree: ReactTestRenderer;
const initialAppState = RN.AppState.currentState;
beforeEach(() => { RN.AppState.currentState = 'active'; });
afterEach(() => {
  act(() => tree?.unmount());
  RN.AppState.currentState = initialAppState;
  useVideoUploadStore.setState({ records: {} });
  jest.restoreAllMocks();
  jest.clearAllMocks();
  jest.useRealTimers();
});

async function openAttachmentAndExport() {
  jest.useFakeTimers();
  jest.spyOn(jest.requireMock<typeof import('expo-modules-core')>('expo-modules-core'), 'requireNativeModule')
    .mockReturnValue({ hasCamera: async () => true, trimInfo: mockInfo, captureBadge: mockCapture, burnBadge: mockBurn });
  const toast = jest.spyOn(RN.ToastAndroid, 'show').mockImplementation(() => {});
  jest.spyOn(jest.requireActual<typeof import('react-native')>('react-native'), 'findNodeHandle').mockReturnValue(17);
  const query = jest.spyOn(setsRepository, 'range').mockRejectedValue(new Error('unexpected set read'));
  // The completed camera save and its retained/prepared aliases precede this manual export.
  const previous = startRecordingSave('file:///cache/camera.mp4', JSON.stringify(presentBadge(currentSet, 'export')), async ready => { await ready; return true; });
  beginUploadPreparation('file:///cache/camera.mp4');
  aliasRecordingSource('file:///cache/camera.mp4', source);
  aliasRecordingSource(source, 'attachment');
  uploadPreparationFinished(source);
  await previous;
  useVideoUploadStore.setState({ records: { 'student:set': { ...EMPTY_VIDEO_UPLOAD, status: 'uploaded',
    localUri: source, attachmentId: 'attachment', setLogId: 'log', savedToPhotos: true } } });
  await act(async () => { tree = create(<SafeAreaInsetsContext.Provider value={{ top: 24, bottom: 24, left: 0, right: 0 }}>
    <BadgeCaptureHost><VideoAttachmentControls compact editable stableSetId="set" studentId="student"
      ensureSetLog={async () => 'log'} buildLogRequest={() => { throw new Error('unexpected log write'); }}
      badge={currentSet} /></BadgeCaptureHost>
  </SafeAreaInsetsContext.Provider>); });
  const press = (label: string) => act(async () => {
    tree.root.findAllByType(FeedbackPressable).find(node => node.props.accessibilityLabel === label)!.props.onPress();
  });
  await press(t('student.videoAttachmentV3Controls.copy006'));
  await press(t('training.previewExpand'));
  const controls = tree.root.findByType(RN.Modal).findAllByType(FeedbackPressable).map(node => node.props.accessibilityLabel);
  expect(controls).toEqual(expect.arrayContaining([t('training.previewCollapse'), t('training.previewSpeed'),
    t('student.videoAttachmentV3Controls.copy001'), t('student.videoAttachmentV3Controls.copy005')]));
  await press(t('student.cameraRecorderComponents.copy006'));
  return { toast, query };
}

test.each(['foreground dialog', 'whole tree'])('local replay saves after recording when native layout reaches the %s', async layout => {
  const { toast, query } = await openAttachmentAndExport();
  expect(query).not.toHaveBeenCalled();
  expect(mockPermission).toHaveBeenCalledTimes(1);
  expect(mockInfo).toHaveBeenCalledWith(source);
  expect(mockDownload).not.toHaveBeenCalled();
  // Deliver native layout only to the foreground Dialog; the Activity behind it can be occluded.
  const modal = tree.root.findByType(RN.Modal);
  const exportCard = (layout === 'foreground dialog' ? modal : tree.root).findAllByType(VideoBadgeCard).find(node => node.props.form === 'export');
  const capturedFields = exportCard?.props.info;
  if (exportCard) await act(async () => exportCard.parent!.props.onLayout());
  await act(async () => jest.advanceTimersByTime(5100));
  expect(toast.mock.calls.map(call => call[0])).toEqual([t('chat.videoExport.saved')]);
  expect(capturedFields).toMatchObject({ exerciseName: 'Squat', weightKg: 145, reps: 5, rpe: null });
  expect(mockCapture).toHaveBeenCalledWith(17);
  expect(mockBurn).toHaveBeenCalledTimes(1);
  expect(mockSave.mock.calls).toEqual([['file:///cache/badged.mp4']]);
});

test.each(['PERMISSION', 'INSPECT', 'BACKGROUND', 'CAPTURE'] as const)('a replay failure reports only %s and never publishes the source', async stage => {
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  if (stage === 'PERMISSION') mockPermission.mockResolvedValueOnce({ granted: false, canAskAgain: false });
  if (stage === 'INSPECT') mockInfo.mockRejectedValueOnce(new Error(source));
  if (stage === 'BACKGROUND') RN.AppState.currentState = 'background';
  const { toast } = await openAttachmentAndExport();
  await act(async () => jest.advanceTimersByTime(5100));
  expect(warning.mock.calls.filter(call => call[0] === '[video.replay_save]')).toEqual([['[video.replay_save]', stage]]);
  expect(mockBurn).not.toHaveBeenCalled();
  expect(mockSave).not.toHaveBeenCalled();
  expect(toast).toHaveBeenCalledWith(t(stage === 'PERMISSION' ? 'chat.videoExport.photoPermissionDenied' : 'chat.videoExport.failed'), RN.ToastAndroid.LONG);
});

test.each(['collapse before capture', 'close during capture'] as const)('%s keeps the accepted replay save alive', async transition => {
  let finishInspect!: () => void;
  if (transition === 'collapse before capture') {
    mockInfo.mockImplementationOnce(() => new Promise(resolve => {
      finishInspect = () => resolve({ durationMs: 5000, displayWidth: 720, displayHeight: 1280 });
    }));
  }
  const { toast } = await openAttachmentAndExport();
  const dismissLabel = t(transition === 'collapse before capture' ? 'training.previewCollapse' : 'training.allDay.done');
  await act(async () => tree.root.findAllByType(FeedbackPressable).find(node => node.props.accessibilityLabel === dismissLabel)!.props.onPress());
  if (finishInspect) await act(async () => finishInspect());
  const visible = transition === 'collapse before capture' ? tree.root.findByType(RN.Modal) : tree.root;
  const exportCard = visible.findAllByType(VideoBadgeCard).find(node => node.props.form === 'export');
  if (exportCard) await act(async () => exportCard.parent!.props.onLayout());
  await act(async () => jest.advanceTimersByTime(5100));
  expect(toast.mock.calls.map(call => call[0])).toEqual([t('chat.videoExport.saved')]);
  expect(mockBurn).toHaveBeenCalledTimes(1);
  expect(mockSave.mock.calls).toEqual([['file:///cache/badged.mp4']]);
});
