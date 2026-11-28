import { afterEach, expect, jest, test } from '@jest/globals';
import { createRef, type ComponentProps } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { ActivityIndicator, Animated, Modal, ScrollView, StyleSheet, Text, ToastAndroid, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Video, { type VideoRef } from 'react-native-video';
import { FeedbackPressable } from '@/design/FeedbackPressable';
import { setLocaleOverride, t } from '@/i18n';
import { SetEntrySheet } from '../../SetEntrySheet';
import { day, set } from '@/domain/plan/test-fixtures';
import { synthesizeDrafts } from '../../drafts';
import { useVideoUploadStore } from '../store';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { resolveColors, spacing } from '@/design';
import { ColorSchemeProvider } from '@/design/theme';
import { VideoAttachmentControls } from '../VideoAttachmentControls';
import { EMPTY_VIDEO_UPLOAD } from '../model';
import { FeedbackVideoPlayer } from '@/features/video-player/FeedbackVideoPlayer';
import { VideoBadgeOverlay } from '@/features/video-player/VideoBadgeOverlay';
import { SetVideoPlayer } from '../SetVideoPlayer';
import { SetVideoPlayerHost } from '../SetVideoPlayerHost';

const mockSave = jest.fn(async (_uri: string) => {});
jest.mock('expo-media-library', () => ({ getPermissionsAsync: async () => ({ granted: true }), Asset: { create: (uri: string) => mockSave(uri) } }));
const mockBitmap = { release: jest.fn() };
const mockCapture = jest.fn(async () => mockBitmap);
jest.mock('@/features/video-player/BadgeCaptureHost', () => ({
  ...jest.requireActual<typeof import('@/features/video-player/BadgeCaptureHost')>('@/features/video-player/BadgeCaptureHost'),
  useBadgeCapture: () => mockCapture,
}));
const mockBurn = jest.fn(async () => ({ uri: 'file:///cache/badged.mp4' }));
jest.mock('../trim-native', () => ({ trainingVideoTrim: () => ({
  trimInfo: async () => ({ displayWidth: 1080, displayHeight: 1920 }), burnBadge: mockBurn,
  reserveGalleryOriginal: async () => ({ finish: mockSave, release: jest.fn() }),
}) }));
const mockDownload = jest.fn(async (_uri: string, _destination: unknown) => {});

jest.mock('react-native-compressor', () => ({}));
jest.mock('expo-file-system', () => ({
  Paths: { cache: { uri: 'file:///cache' }, document: { uri: 'file:///docs' } },
  File: class {
    exists = true;
    uri: string;
    constructor(parent: string | { uri: string }, name?: string) { this.uri = name ? `${(parent as { uri: string }).uri}/${name}` : String(parent); }
    static async downloadFileAsync(uri: string, destination: unknown): Promise<void> { await mockDownload(uri, destination); }
    delete() {}
  },
}));


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
  expect(renderer.root.findAllByType(Text).map(node => node.props.children)).not.toContain('Set 1 · 50kg × 5 · RPE 8');
  act(() => renderer.root.findByProps({ testID: 'set-video-badge-layer' }).props.onLayout({ nativeEvent: { layout: { width: 540, height: 960 } } }));
  const badge = () => renderer.root.findByType(VideoBadgeOverlay);
  expect(badge().props.geometry.left).toBe(44);
  expect(badge().props.geometry.bottom).toBeGreaterThan(spacing.minimumHitTarget);
  expect(badge().props.expanded).toBe(true);
  expect(badge().findAllByType(Text).map(node => node.props.children)).toEqual(expect.arrayContaining(['Set 1', 'Squat', '50', '× 5', 'RPE', '8']));
  press(t('chat.videoBadge.collapse'));
  expect(badge().props.expanded).toBe(false);
  press(t('chat.videoBadge.expand'));
  expect(badge().props.expanded).toBe(true);
  press(t('chat.videoBadge.collapse'));
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
  expect(renderer.root.findAllByType(VideoBadgeOverlay)).toHaveLength(0);
  press(t('training.previewExpand'));
  act(() => renderer.root.findByProps({ testID: 'set-video-badge-layer' }).props.onLayout({ nativeEvent: { layout: { width: 540, height: 960 } } }));
  expect(badge().props.expanded).toBe(true);
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


test.each(['failed', 'uploading', 'preparing', 'uploaded'] as const)('video attachment status and accessible 44dp actions stay in one row: %s', async status => {
  setLocaleOverride('en');
  useVideoUploadStore.setState({ records: { 'student:set': { ...EMPTY_VIDEO_UPLOAD, status } } });
  await act(async () => { renderer = create(<VideoAttachmentControls studentId="student" stableSetId="set" editable ensureSetLog={async () => 'log'} buildLogRequest={() => { throw new Error('not used'); }} />); });
  const label = t(status === 'failed' ? 'student.videoAttachmentV3Controls.copy008' : status === 'uploaded' ? 'student.videoAttachmentV3Controls.copy006' : status === 'preparing' ? 'student.videoAttachmentV3Controls.copy003' : 'student.videoAttachmentV3Controls.copy007');
  const text = renderer.root.findAllByType(Text).find(node => node.props.children === label)!;
  let group = text.parent!;
  while (group.type !== View) group = group.parent!;
  expect(StyleSheet.flatten(group.props.style)).toMatchObject({ flex: 1 });
  expect(StyleSheet.flatten(text.props.style).flexShrink).toBe(status === 'preparing' ? 0 : 1);
  let row = group.parent!;
  while (row.type !== View) row = row.parent!;
  expect(StyleSheet.flatten(row.props.style).flexWrap).not.toBe('wrap');
  for (const button of renderer.root.findAllByType(FeedbackPressable)) {
    const style = StyleSheet.flatten(button.props.style({ pressed: false }));
    expect(style.minHeight).toBeGreaterThanOrEqual(spacing.minimumHitTarget);
    expect(style.minWidth).toBeGreaterThanOrEqual(spacing.minimumHitTarget);
    const label = button.findAllByType(Text).find(node => node.props.children === button.props.accessibilityLabel)!;
    if (label) expect(label.props.numberOfLines).toBe(1);
    else expect(button.props.accessibilityLabel).toBeTruthy();
  }
});

test.each([{ locale: 'en', reviewedLabel: 'Coach reviewed' }, { locale: 'zh', reviewedLabel: '教练已点评' }, { locale: 'zh-Hant', reviewedLabel: '教練已點評' }] as const)('read-only replay in $locale opens full screen with close and coach feedback, without editing actions', async ({ locale, reviewedLabel }) => {
  setLocaleOverride(locale);
  const close = jest.fn();
  const review = jest.fn();
  await act(async () => { renderer = create(<SafeAreaInsetsContext.Provider value={{ top: 24, bottom: 24, left: 0, right: 0 }}>
    <SetVideoPlayer uri="file:///sample.mp4" refreshURL={async () => 'file:///sample.mp4'} readOnly onClose={close} onReview={review}
      badge={{ exerciseName: 'Squat', setOrdinal: 2, weightKg: 100, reps: 5, rpe: 8 }} />
  </SafeAreaInsetsContext.Provider>); });
  const labels = renderer.root.findAllByType(FeedbackPressable).map(node => node.props.accessibilityLabel);
  expect(labels).toContain(t('chat.closePlayback'));
  expect(labels).toContain(reviewedLabel);
  expect(labels).not.toContain(t('training.previewExpand'));
  expect(labels).not.toContain(t('training.previewCollapse'));
  expect(renderer.root.findAllByType(VideoAttachmentControls)).toHaveLength(0);
  press(reviewedLabel);
  expect(review).toHaveBeenCalledTimes(1);
  press(t('chat.closePlayback'));
  expect(close).toHaveBeenCalledTimes(1);
});


test('unreviewed replay hides the badge and silently renews an expired playback URL', async () => {
  setLocaleOverride('en');
  const refreshURL = jest.fn<() => Promise<string>>().mockResolvedValue('https://video.test/renewed');
  await act(async () => { renderer = create(<SafeAreaInsetsContext.Provider value={{ top: 24, bottom: 24, left: 0, right: 0 }}>
    <SetVideoPlayer uri="https://video.test/expired" refreshURL={refreshURL} readOnly onClose={() => {}} />
  </SafeAreaInsetsContext.Provider>); });
  expect(renderer.root.findAllByType(FeedbackPressable).some(node => node.props.accessibilityLabel === t('training.coachReviewed'))).toBe(false);
  await act(async () => renderer.root.findByType(Video).props.onError?.({} as never));
  expect(renderer.root.findByType(Video).props.source).toEqual({ uri: 'https://video.test/renewed' });
  act(() => renderer.root.findByType(Video).props.onLoad?.({ duration: 20 } as never));
  expect(renderer.root.findByType(Video).props.paused).toBe(false);
  expect(renderer.root.findAllByType(Text).some(node => node.props.children === t('student.videoAttachmentSection.copy004'))).toBe(false);
});


test.each(['light', 'dark'] as const)('replay colors use semantic tokens in %s', async scheme => {
  const colors = resolveColors(scheme);
  expect(colors).toMatchObject({ completedVideoIcon: scheme === 'light' ? '#9CA3AF' : '#6B6B72',
    videoReviewedFill: 'rgba(17,24,39,.72)', videoReviewedBorder: 'rgba(255,255,255,.18)', videoReviewedText: '#FFFFFF' });
  setLocaleOverride('en');
  await act(async () => { renderer = create(<SafeAreaInsetsContext.Provider value={{ top: 24, bottom: 24, left: 0, right: 0 }}><ColorSchemeProvider scheme={scheme}>
    <SetVideoPlayer uri="file:///sample.mp4" refreshURL={async () => 'file:///sample.mp4'} readOnly onReview={() => {}} />
  </ColorSchemeProvider></SafeAreaInsetsContext.Provider>); });
  const review = renderer.root.findAllByType(FeedbackPressable).find(node => node.props.accessibilityLabel === t('training.coachReviewed'))!;
  const pill = review.findAllByType(View).find(node => StyleSheet.flatten(node.props.style)?.height === 30)!;
  expect(StyleSheet.flatten(pill.props.style)).toMatchObject({ backgroundColor: colors.videoReviewedFill, borderColor: colors.videoReviewedBorder });
  expect(StyleSheet.flatten(pill.findAllByType(Text).find(node => node.props.children === t('training.coachReviewed'))!.props.style).color).toBe(colors.videoReviewedText);
  expect(pill.findByType(MaterialCommunityIcons).props.color).toBe(colors.videoReviewedText);
});

test.each(['training', 'feedback'])('%s replay downloads the source and saves one badged video with current RPE', async surface => {
  let finish!: (value: { uri: string }) => void;
  mockBurn.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const toast = jest.spyOn(ToastAndroid, 'show').mockImplementation(() => {});
  const badge = { exerciseName: 'Squat', reps: 5, rpe: 8 };
  const remote = 'https://example.invalid/set.mp4';
  try {
    await act(async () => { renderer = create(<SafeAreaInsetsContext.Provider value={{ top: 24, bottom: 24, left: 0, right: 0 }}>
      {surface === 'feedback'
        ? <FeedbackVideoPlayer videoId="set" url={remote} refreshURL={async () => remote} badge={badge} allowGalleryExport />
        : <SetVideoPlayer uri={remote} refreshURL={async () => remote} badge={badge} readOnly allowGalleryExport />}
    </SafeAreaInsetsContext.Provider>); });
    const button = () => renderer.root.findAllByType(FeedbackPressable).find(n => n.props.testID === 'feedback.video.export')!;
    expect(button()).toBeDefined();
    await act(async () => { button().props.onPress(); button().props.onPress(); });
    expect(button().props.disabled).toBe(true);
    expect(button().findAllByType(ActivityIndicator)).toHaveLength(1);
    expect(mockDownload).toHaveBeenCalledWith(remote, expect.objectContaining({ uri: expect.stringMatching(/^file:/) }));
    expect(mockCapture).toHaveBeenCalledWith(badge, expect.any(Number), expect.anything());
    expect(mockBurn).toHaveBeenCalledTimes(1);
    expect(mockBurn).toHaveBeenCalledWith(expect.stringMatching(/^file:/), mockBitmap, 88, 428, 1, expect.any(String));
    await act(async () => finish({ uri: 'file:///cache/badged.mp4' }));
    expect(mockSave).toHaveBeenCalledWith('file:///cache/badged.mp4');
    expect(toast).toHaveBeenCalledWith(t('chat.videoExport.saved'), ToastAndroid.SHORT);
    expect(button().props.disabled).toBe(false);
  } finally { toast.mockRestore(); }
});

test('export retries an expired video URL once using the current playback resolver', async () => {
  mockDownload.mockRejectedValueOnce(new Error('HTTP 403'));
  const refreshURL = jest.fn(async () => 'https://example.invalid/renewed');
  await act(async () => { renderer = create(<SafeAreaInsetsContext.Provider value={{ top: 24, bottom: 24, left: 0, right: 0 }}>
    <SetVideoPlayer uri="https://example.invalid/expired" refreshURL={refreshURL} badge={{ rpe: 8 }} readOnly allowGalleryExport />
  </SafeAreaInsetsContext.Provider>); });
  await act(async () => { renderer.root.findAllByType(FeedbackPressable).find(n => n.props.testID === 'feedback.video.export')!.props.onPress(); });
  expect(refreshURL).toHaveBeenCalledTimes(1);
  expect(mockDownload).toHaveBeenLastCalledWith('https://example.invalid/renewed', expect.anything());
  expect(mockSave).toHaveBeenCalledWith('file:///cache/badged.mp4');
});

test('a failed replay export reports failure without publishing the original', async () => {
  const toast = jest.spyOn(ToastAndroid, 'show').mockImplementation(() => {});
  mockBurn.mockRejectedValueOnce(new Error('encoder'));
  try {
    await act(async () => { renderer = create(<SafeAreaInsetsContext.Provider value={{ top: 0, bottom: 0, left: 0, right: 0 }}>
      <SetVideoPlayer uri="file:///original" refreshURL={async () => 'file:///original'} badge={{ rpe: 8 }} readOnly allowGalleryExport />
    </SafeAreaInsetsContext.Provider>); });
    await act(async () => renderer.root.findAllByType(FeedbackPressable).find(n => n.props.testID === 'feedback.video.export')!.props.onPress());
    expect(mockSave).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(t('chat.videoExport.failed'), ToastAndroid.LONG);
  } finally { toast.mockRestore(); }
});

test('a reopened replay joins its pending save even when the signed URL has changed', async () => {
  let finish!: (result: { uri: string }) => void;
  mockBurn.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const player = (url: string) => <SafeAreaInsetsContext.Provider value={{ top: 0, bottom: 0, left: 0, right: 0 }}>
    <FeedbackVideoPlayer videoId="same-attachment" url={url} refreshURL={async () => url} badge={{ rpe: 8 }} allowGalleryExport />
  </SafeAreaInsetsContext.Provider>;
  const save = async () => { await act(async () => renderer.root.findAllByType(FeedbackPressable).find(n => n.props.testID === 'feedback.video.export')!.props.onPress()); };
  await act(async () => { renderer = create(player('https://example.invalid/one')); });
  await save();
  await act(async () => renderer.update(player('https://example.invalid/two')));
  await save();
  try { expect(mockDownload).toHaveBeenCalledTimes(1); }
  finally { await act(async () => finish({ uri: 'file:///cache/badged.mp4' })); }
  expect(mockSave).toHaveBeenCalledTimes(1);
});
