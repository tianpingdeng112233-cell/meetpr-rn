import { afterEach, expect, jest, test } from '@jest/globals';
import { createRef, type ComponentProps } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { ActivityIndicator, Animated, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Video, { type VideoRef } from 'react-native-video';
import { FeedbackPressable } from '@/design/FeedbackPressable';
import { setLocaleOverride, t } from '@/i18n';
import { SetEntrySheet } from '../../SetEntrySheet';
import { day, set } from '@/domain/plan/test-fixtures';
import { synthesizeDrafts } from '../../drafts';
import { useVideoUploadStore } from '../store';
import { spacing } from '@/design';
import { VideoAttachmentControls } from '../VideoAttachmentControls';
import { EMPTY_VIDEO_UPLOAD } from '../model';
import { SetVideoPlayer } from '../SetVideoPlayer';
import { SetVideoPlayerHost } from '../SetVideoPlayerHost';

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

async function renderHostedPlayer(refreshURL = async () => 'file:///sample.mp4') {
  setLocaleOverride('en');
  const viewport = createRef<ScrollView>();
  await act(async () => { renderer = create(
    <SafeAreaInsetsContext.Provider value={{ top: 24, bottom: 24, left: 0, right: 0 }}>
      <SetVideoPlayerHost viewport={viewport} scrollY={new Animated.Value(0)}>
        <ScrollView ref={viewport}><SetVideoPlayer uri="file:///sample.mp4" refreshURL={refreshURL} /></ScrollView>
      </SetVideoPlayerHost>
    </SafeAreaInsetsContext.Provider>,
  ); });
  return renderer.root.findByType(Video);
}

function parentView(node: ReactTestInstance): ReactTestInstance {
  let parent = node.parent!;
  while (parent.type !== View) parent = parent.parent!;
  return parent;
}

test('inline picture and central play display pass touches through while controls remain interactive', async () => {
  const decoder = await renderHostedPlayer();
  act(() => decoder.props.onLoad?.({ duration: 60 } as never));
  const picture = parentView(decoder);
  expect(picture.props.pointerEvents).toBe('none');
  expect(parentView(picture).props.pointerEvents).toBe('box-none');
  const central = renderer.root.findAllByProps({ testID: 'set-video-central-play' })[0];
  expect(parentView(central).props.pointerEvents).toBe('none');
  expect(renderer.root.findAllByType(FeedbackPressable).filter(node => node.props.testID === 'set-video-central-play')).toHaveLength(0);
  const bottomPlayback = () => renderer.root.findAllByType(FeedbackPressable).find(node => node.props.accessibilityLabel === t(decoder.props.paused ? 'chat.playVideo' : 'training.previewPause') && node.props.testID !== 'set-video-inline-picture')!;
  act(() => bottomPlayback().props.onPress());
  expect(decoder.props.paused).toBe(false);
  const track = renderer.root.findAllByType(View).find(node => node.props.accessibilityRole === 'adjustable')!;
  expect(track.props.onStartShouldSetResponder()).toBe(true);
  act(() => track.props.onLayout({ nativeEvent: { layout: { width: 200 } } }));
  act(() => track.props.onResponderGrant({ nativeEvent: { locationX: 50 } }));
  expect(mockSeek).toHaveBeenLastCalledWith(15);
  act(() => track.props.onResponderMove({ nativeEvent: { locationX: 100 } }));
  expect(mockSeek).toHaveBeenLastCalledWith(30);
  act(() => track.props.onResponderRelease({ nativeEvent: { locationX: 150 } }));
  expect(mockSeek).toHaveBeenLastCalledWith(45);
  act(() => decoder.props.onSeek?.({ seekTime: 45 } as never));
  expect(decoder.props.paused).toBe(false);
  act(() => bottomPlayback().props.onPress());
  expect(decoder.props.paused).toBe(true);
});

test('the inline anchor toggles playback from inside the ScrollView and excludes the controls', async () => {
  const decoder = await renderHostedPlayer();
  const scrollingPage = renderer.root.findByType(ScrollView);
  const anchorButton = () => scrollingPage.findAllByType(FeedbackPressable).find(node => node.props.testID === 'set-video-inline-picture');
  expect(anchorButton()).toBeDefined();
  expect(anchorButton()!.props.disabled).toBe(true);
  act(() => decoder.props.onLoad?.({ duration: 60 } as never));
  expect(anchorButton()!.props.disabled).toBe(false);
  const anchor = parentView(anchorButton()!);
  act(() => anchor.props.onLayout({ nativeEvent: { layout: { width: 360 } } }));
  const controls = renderer.root.findAllByType(View).find(node => node.props.onLayout && StyleSheet.flatten(node.props.style)?.flexDirection === 'row')!;
  act(() => controls.props.onLayout({ nativeEvent: { layout: { height: 64 } } }));
  expect(StyleSheet.flatten(anchor.props.style).height).toBe(266.5);
  expect(StyleSheet.flatten(anchorButton()!.props.style).bottom).toBe(64);
  act(() => anchorButton()!.props.onPress());
  expect(decoder.props.paused).toBe(false);
  expect(anchorButton()!.props.accessibilityLabel).toBe(t('training.previewPause'));
  act(() => anchorButton()!.props.onPress());
  expect(decoder.props.paused).toBe(true);
  act(() => decoder.props.onEnd?.());
  act(() => anchorButton()!.props.onPress());
  expect(mockSeek).toHaveBeenCalledWith(0);
  act(() => decoder.props.onSeek?.({ seekTime: 0 } as never));
  expect(decoder.props.paused).toBe(false);
  expect(mockMounted).toHaveBeenCalledTimes(1);
  expect(mockUnmounted).not.toHaveBeenCalled();
});

test('the expanded picture accepts touches and its central button plays without remounting', async () => {
  const decoder = await renderHostedPlayer();
  act(() => decoder.props.onLoad?.({ duration: 60 } as never));
  press(t('training.previewExpand'));
  expect(parentView(decoder).props.pointerEvents).toBe('auto');
  const central = renderer.root.findAllByType(FeedbackPressable).find(node => node.props.testID === 'set-video-central-play')!;
  expect(parentView(central).props.pointerEvents).toBe('box-none');
  act(() => central.props.onPress());
  expect(decoder.props.paused).toBe(false);
  press(t('training.previewPause'));
  expect(decoder.props.paused).toBe(true);
  press(t('training.previewCollapse'));
  expect(parentView(decoder).props.pointerEvents).toBe('none');
  expect(renderer.root.findByType(Video)).toBe(decoder);
  expect(mockMounted).toHaveBeenCalledTimes(1);
  expect(mockUnmounted).not.toHaveBeenCalled();
});

test('inline playback failure keeps Retry touchable outside the pass-through picture', async () => {
  const refreshURL = jest.fn<() => Promise<string>>()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce('file:///renewed.mp4');
  const decoder = await renderHostedPlayer(refreshURL);
  await act(async () => decoder.props.onError?.({} as never));
  const retry = renderer.root.findAllByType(FeedbackPressable).find(node => node.props.accessibilityLabel === t('student.videoAttachmentSection.copy002'))!;
  expect(retry).toBeDefined();
  for (let parent = retry.parent; parent; parent = parent.parent) {
    expect(parent.props.pointerEvents).not.toBe('none');
  }
  await act(async () => retry.props.onPress());
  expect(refreshURL).toHaveBeenCalledTimes(2);
  expect(renderer.root.findByType(Video).props.source).toEqual({ uri: 'file:///renewed.mp4' });
});

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


test.each(['failed', 'uploading', 'preparing', 'uploaded'] as const)('video attachment status wraps as a group with single-line actions: %s', async status => {
  setLocaleOverride('en');
  useVideoUploadStore.setState({ records: { 'student:set': { ...EMPTY_VIDEO_UPLOAD, status } } });
  await act(async () => { renderer = create(<VideoAttachmentControls studentId="student" stableSetId="set" editable ensureSetLog={async () => 'log'} buildLogRequest={() => { throw new Error('not used'); }} />); });
  const label = t(status === 'failed' ? 'student.videoAttachmentV3Controls.copy008' : status === 'uploaded' ? 'student.videoAttachmentV3Controls.copy006' : status === 'preparing' ? 'student.videoAttachmentV3Controls.copy003' : 'student.videoAttachmentV3Controls.copy007');
  const text = renderer.root.findAllByType(Text).find(node => node.props.children === label)!;
  let group = text.parent!;
  while (group.type !== View) group = group.parent!;
  expect(StyleSheet.flatten(group.props.style)).toMatchObject({ flexShrink: 0 });
  expect(StyleSheet.flatten(text.props.style)).toMatchObject({ flexShrink: 0 });
  let row = group.parent!;
  while (row.type !== View) row = row.parent!;
  expect(StyleSheet.flatten(row.props.style).flexWrap).toBe('wrap');
  for (const button of renderer.root.findAllByType(FeedbackPressable)) {
    const style = StyleSheet.flatten(button.props.style({ pressed: false }));
    expect(style.minHeight).toBeGreaterThanOrEqual(spacing.minimumHitTarget);
    expect(style.minWidth).toBeGreaterThanOrEqual(spacing.minimumHitTarget);
    const label = button.findAllByType(Text).find(node => node.props.children === button.props.accessibilityLabel)!;
    expect(label.props.numberOfLines).toBe(1);
  }
});
