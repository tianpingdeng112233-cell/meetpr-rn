import { afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { readFileSync } from 'node:fs';
import { SvgXml } from 'react-native-svg';
import { Text } from 'react-native';
import { type Locale, setLocaleOverride } from '@/i18n';
import { FeedbackVideoMarkerPanel } from '../FeedbackVideoMarkerPanel';
import { FeedbackVideoPlayer } from '../FeedbackVideoPlayer';
import { VideoBadgeCard } from '../VideoBadgeCard';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-video', () => ({ __esModule: true, default: 'Video' }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: jest.requireActual<typeof import('react-native')>('react-native').View }));

let renderer: ReactTestRenderer;
afterEach(() => { act(() => renderer?.unmount()); setLocaleOverride(null); });
const props = { videoId: 'video', url: 'https://video', refreshURL: async () => 'https://video', onClose: () => {} };
const badge = { exerciseName: 'Squat', weightKg: 100, reps: 5, rpe: 8, setOrdinal: 2 };
const buttons = (id: string) => renderer.root.findAll(node => node.props.testID === id && typeof node.props.onPress === 'function', { deep: false });

test('export renders the plain wordmark at the supplied scale and omits the set', () => {
  act(() => { renderer = create(<VideoBadgeCard info={badge} form="export" scale={0.5} />); });
  const wordmark = renderer.root.findByType(SvgXml);
  expect(wordmark.props.height).toBe(10.5);
  expect(wordmark.props.xml.trim()).toBe(readFileSync('docs/brand/meetpr-wordmark-plain-on-dark.svg', 'utf8').trim());
  const labels = () => renderer.root.findAllByType(Text).map(node => node.props.children);
  expect(labels()).not.toContain('Set 2');
  act(() => { renderer.update(<VideoBadgeCard info={badge} form="playback" scale={0.5} />); });
  expect(labels()).toContain('Set 2');
});

test.each<[Locale, string]>([['en', 'Set 2'], ['zh', '第 2 组'], ['zh-Hant', '第 2 組']])('uses the existing %s set label', (locale, label) => {
  setLocaleOverride(locale);
  act(() => { renderer = create(<VideoBadgeCard info={badge} form="playback" scale={1} />); });
  expect(renderer.root.findAllByType(Text).map(node => node.props.children)).toContain(label);
});

test('a playback session starts expanded and the card toggles in both directions', async () => {
  await act(async () => { renderer = create(<FeedbackVideoPlayer {...props} badge={badge} />); });
  expect(buttons('feedback.video.badge.expanded')).toHaveLength(1);
  act(() => buttons('feedback.video.badge.expanded')[0].props.onPress());
  expect(buttons('feedback.video.badge.collapsed')).toHaveLength(1);
  act(() => buttons('feedback.video.badge.collapsed')[0].props.onPress());
  expect(buttons('feedback.video.badge.expanded')).toHaveLength(1);
});

test('disabling expansion fixes the badge at the noninteractive logo', async () => {
  await act(async () => { renderer = create(<FeedbackVideoPlayer {...props} badge={badge} allowsExpansion={false} />); });
  expect(renderer.root.findAllByProps({ testID: 'feedback.video.badge.collapsed' }).length).toBeGreaterThan(0);
  expect(renderer.root.findAllByProps({ testID: 'feedback.video.badge.expanded' })).toHaveLength(0);
  expect(buttons('feedback.video.badge.collapsed')).toHaveLength(0);
  expect(renderer.root.findByProps({ testID: 'feedback.video.badge.collapsed' }).props.accessibilityRole).toBeUndefined();
});

test('playback has no scrim and ordinary chat has no badge', async () => {
  await act(async () => { renderer = create(<FeedbackVideoPlayer {...props} badge={badge} />); });
  expect(renderer.root.findAllByProps({ testID: 'feedback.video.badge.scrim' })).toHaveLength(0);
  await act(async () => { renderer.update(<FeedbackVideoPlayer {...props} badge={null} />); });
  for (const testID of ['feedback.video.badge.scrim', 'feedback.video.badge.expanded', 'feedback.video.badge.collapsed']) {
    expect(renderer.root.findAllByProps({ testID })).toHaveLength(0);
  }
});

test('a new playback session resets a collapsed badge to expanded', async () => {
  await act(async () => { renderer = create(<FeedbackVideoPlayer {...props} badge={badge} />); });
  act(() => buttons('feedback.video.badge.expanded')[0].props.onPress());
  await act(async () => { renderer.update(<FeedbackVideoPlayer {...props} videoId="next" badge={badge} />); });
  expect(buttons('feedback.video.badge.expanded')).toHaveLength(1);
});

test('annotation selection hides badge controls from touch and accessibility until closed', async () => {
  await act(async () => { renderer = create(<FeedbackVideoPlayer {...props} badge={badge}
    markers={[{ id: 'marker', timeMs: 0, note: 'Check depth', annotationURL: 'https://annotation' }]} />); });
  act(() => renderer.root.find(node => (node.type as unknown) === 'Video').props.onLoad({ duration: 10 }));
  const marker = buttons('feedback.video.marker.tick.marker')[0];
  act(() => marker.props.onPress());
  let controls = buttons('feedback.video.badge.expanded')[0].parent;
  while (controls && controls.props.importantForAccessibility !== 'no-hide-descendants') controls = controls.parent;
  expect(controls?.props.pointerEvents).toBe('none');
  expect(controls?.props.accessibilityElementsHidden).toBe(true);
  act(() => buttons('feedback.video.annotationOverlay')[0].props.onPress());
  expect(renderer.root.findAllByProps({ testID: 'feedback.video.annotationOverlay' })).toHaveLength(0);
  expect(buttons('feedback.video.badge.expanded')).toHaveLength(1);
});

test('nearby ticks select the closest timestamp, and the cue opens the same drawing', async () => {
  const onSeek = jest.fn();
  const markers = [
    { id: 'first', timeMs: 3000, note: 'First' },
    { id: 'second', timeMs: 3300, note: 'Next', annotationURL: 'https://drawing' },
  ];
  await act(async () => { renderer = create(<FeedbackVideoPlayer {...props} markers={markers} onSeek={onSeek} />); });
  act(() => renderer.root.find(node => (node.type as unknown) === 'Video').props.onLoad({ duration: 10 }));
  expect(renderer.root.findAllByType(FeedbackVideoMarkerPanel)).toHaveLength(0);
  expect(renderer.root.findAll(n => n.props.testID?.startsWith('feedback.video.marker.tick.') && typeof n.props.onPress === 'function', { deep: false })).toHaveLength(2);
  const track = renderer.root.findByProps({ testID: 'feedback.video.scrubber' });
  act(() => track.props.onLayout({ nativeEvent: { layout: { width: 200 } } }));
  const touch = { nativeEvent: { locationX: 65 } };
  act(() => { track.props.onResponderGrant(touch); track.props.onResponderRelease(touch); });
  expect(onSeek).toHaveBeenLastCalledWith(3300);
  expect(buttons('feedback.video.annotationOverlay')).toHaveLength(1);
  act(() => buttons('feedback.video.annotationOverlay')[0].props.onPress());
  act(() => buttons('feedback.video.marker.cue')[0].props.onPress());
  expect(buttons('feedback.video.annotationOverlay')).toHaveLength(1);
  expect(onSeek).toHaveBeenCalledTimes(2);
});

test('failed marker loading keeps a retry action until fresh markers arrive', async () => {
  const refresh = jest.fn<() => void>();
  await act(async () => { renderer = create(<FeedbackVideoPlayer {...props} markersFailed onMarkersRefresh={refresh} />); });
  act(() => buttons('feedback.video.marker.retry')[0].props.onPress());
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(buttons('feedback.video.marker.retry')).toHaveLength(1);
  await act(async () => { renderer.update(<FeedbackVideoPlayer {...props} markers={[]} onMarkersRefresh={refresh} />); });
  expect(buttons('feedback.video.marker.retry')).toHaveLength(0);
});

test('leaving a selected note restores its three-line preview on a later visit', async () => {
  const markers = [{ id: 'plain', timeMs: 0, note: 'A long note' }];
  await act(async () => { renderer = create(<FeedbackVideoPlayer {...props} markers={markers} />); });
  act(() => renderer.root.find(node => (node.type as unknown) === 'Video').props.onLoad({ duration: 10 }));
  const note = () => buttons('feedback.video.marker.cue')[0].findAllByType(Text).find(n => n.props.children === markers[0].note);
  expect(note()?.props.numberOfLines).toBe(3);
  act(() => buttons('feedback.video.marker.tick.plain')[0].props.onPress());
  expect(note()?.props.numberOfLines).toBeUndefined();
  const adjust = (actionName: string) => renderer.root.findByProps({ testID: 'feedback.video.scrubber' })
    .props.onAccessibilityAction({ nativeEvent: { actionName } });
  act(() => adjust('increment'));
  expect(buttons('feedback.video.marker.cue')).toHaveLength(0);
  act(() => adjust('decrement'));
  expect(note()?.props.numberOfLines).toBe(3);
});
