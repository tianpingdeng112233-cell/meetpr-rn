import { afterEach, expect, jest, test } from '@jest/globals';
import { type ComponentProps } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ActivityIndicator, Modal, ScrollView, Text } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Video, { type VideoRef } from 'react-native-video';
import { FeedbackPressable } from '@/design/FeedbackPressable';
import { setLocaleOverride, t } from '@/i18n';
import { SetEntrySheet } from '../../SetEntrySheet';
import { day, set } from '@/domain/plan/test-fixtures';
import { synthesizeDrafts } from '../../drafts';
import { useVideoUploadStore } from '../store';
import { EMPTY_VIDEO_UPLOAD } from '../model';
import { SetVideoPlayer } from '../SetVideoPlayer';

jest.mock('expo-media-library', () => ({}));
jest.mock('react-native-compressor', () => ({}));
jest.mock('expo-file-system', () => ({ File: class { exists = true; } }));


jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const mockMounted = jest.fn();
const mockUnmounted = jest.fn();
const mockSeek = jest.fn();
jest.mock('react-native-video', () => ({
  __esModule: true,
  default: function MockVideo(_props: ComponentProps<typeof Video>) {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useImperativeHandle(_props.ref, () => ({ seek: mockSeek }) as unknown as VideoRef);
    React.useEffect(() => { mockMounted(); return () => { mockUnmounted(); }; }, []);
    return null;
  },
}));

let renderer: ReactTestRenderer;
afterEach(() => { act(() => renderer?.unmount()); jest.clearAllMocks(); useVideoUploadStore.setState({ records: {} }); });
function press(label: string) {
  act(() => renderer.root.findAllByType(FeedbackPressable).find(node => node.props.accessibilityLabel === label)!.props.onPress());
}

test.each([false, true])('the central play button resumes and replays video (expanded: %s)', async expanded => {
  setLocaleOverride('en');
  await act(async () => { renderer = create(<SafeAreaInsetsContext.Provider value={{ top: 24, bottom: 24, left: 0, right: 0 }}><SetVideoPlayer uri="file:///sample.mp4" refreshURL={async () => 'file:///sample.mp4'} /></SafeAreaInsetsContext.Provider>); });
  const decoder = renderer.root.findByType(Video);
  act(() => decoder.props.onLoad?.({ duration: 60 } as never));
  if (expanded) press(t('training.previewExpand'));
  const centralButtons = () => renderer.root.findAllByType(FeedbackPressable).filter(node => node.props.testID === 'set-video-central-play');
  const playCentrally = () => {
    expect(centralButtons()).toHaveLength(1);
    expect(centralButtons()[0].props).toMatchObject({ accessibilityRole: 'button', accessibilityLabel: t('chat.playVideo') });
    act(() => centralButtons()[0].props.onPress());
  };

  expect(decoder.props.paused).toBe(true);
  playCentrally();
  expect(decoder.props.paused).toBe(false);
  expect(centralButtons()).toHaveLength(0);
  act(() => decoder.props.onProgress?.({ currentTime: 24 } as never));
  press(t('training.previewPause'));
  expect(decoder.props.paused).toBe(true);
  playCentrally();
  expect(decoder.props.paused).toBe(false);
  expect(mockSeek).not.toHaveBeenCalled();

  act(() => decoder.props.onEnd?.());
  expect(decoder.props.paused).toBe(true);
  playCentrally();
  expect(mockSeek).toHaveBeenCalledWith(0);
  act(() => decoder.props.onSeek?.({ seekTime: 0 } as never));
  expect(decoder.props.paused).toBe(false);
  expect(centralButtons()).toHaveLength(0);
  press(t('training.previewPause'));
  const bottomPlay = renderer.root.findAllByType(FeedbackPressable).find(node => node.props.accessibilityLabel === t('chat.playVideo') && node.props.testID !== 'set-video-central-play')!;
  act(() => bottomPlay.props.onPress());
  expect(decoder.props.paused).toBe(false);
  expect(centralButtons()).toHaveLength(0);
  expect(mockMounted).toHaveBeenCalledTimes(1);
  expect(mockUnmounted).not.toHaveBeenCalled();
});

test.each([false, true])('the set-entry sheet keeps its player mounted across resize/back (playing: %s)', async playing => {
  setLocaleOverride('en');
  const draft = synthesizeDrafts(day('day', { exercises: [{ id: 'exercise', plan_day_id: 'day', exercise_id: 'squat', sort_order: 0, is_main_lift: true, notes: null, sets: [set()] }] }), [])[0];
  draft.weightText = '50';
  draft.rpeText = '8';
  useVideoUploadStore.setState({ records: { [`student:${draft.stableSetId}`]: { ...EMPTY_VIDEO_UPLOAD, status: 'uploaded', localUri: 'file:///sample.mp4', createdAt: 1 } } });
  const close = jest.fn();
  await act(async () => { renderer = create(<SafeAreaInsetsContext.Provider value={{ top: 24, bottom: 24, left: 0, right: 0 }}><SetEntrySheet studentId="student" draft={draft} collarOn={false} editable exerciseName="Squat" suggestion={null} suggestionReason={null} ensureSetLog={async () => 'log'} onChangeCollar={() => {}} onClose={close} onSave={async () => {}} /></SafeAreaInsetsContext.Provider>); });
  const scrollingPage = renderer.root.findByType(ScrollView);
  act(() => renderer.root.findByType(Video).props.onLoad?.({ duration: 60 } as never));
  if (playing) press(t('chat.playVideo'));
  press(t('training.previewSpeed'));
  press('1.5×');
  act(() => renderer.root.findByType(Video).props.onProgress?.({ currentTime: 24 } as never));
  const decoder = renderer.root.findByType(Video);
  press(t('training.previewExpand'));
  expect(renderer.root.findAllByType(Text).map(node => node.props.children)).toContain('Set 1 · 50kg × 5 · RPE 8');
  expect(mockUnmounted).not.toHaveBeenCalled();
  expect(mockMounted).toHaveBeenCalledTimes(1);
  expect(renderer.root.findByType(Video)).toBe(decoder);
  expect(decoder.props).toMatchObject({ paused: !playing, rate: 1.5 });
  expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(0);
  press(t('training.previewCollapse'));
  expect(mockUnmounted).not.toHaveBeenCalled();
  expect(renderer.root.findByType(Video)).toBe(decoder);
  expect(decoder.props).toMatchObject({ paused: !playing, rate: 1.5 });
  expect(renderer.root.findByType(ScrollView)).toBe(scrollingPage);
  press(t('training.previewExpand'));
  act(() => renderer.root.findByType(Modal).props.onRequestClose());
  expect(renderer.root.findByType(Video)).toBe(decoder);
  expect(decoder.props).toMatchObject({ paused: !playing, rate: 1.5 });
  expect(mockUnmounted).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  // A new selection is a new playback session even if the same local file is chosen.
  await act(async () => useVideoUploadStore.setState({ records: {
    [`student:${draft.stableSetId}`]: { ...EMPTY_VIDEO_UPLOAD, status: 'uploaded', localUri: 'file:///sample.mp4', createdAt: 2 },
  } }));
  expect(mockMounted).toHaveBeenCalledTimes(2);
  expect(mockUnmounted).toHaveBeenCalledTimes(1);
  act(() => renderer.root.findByType(Modal).props.onRequestClose());
  expect(close).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
  expect(mockUnmounted).toHaveBeenCalledTimes(2);
});
