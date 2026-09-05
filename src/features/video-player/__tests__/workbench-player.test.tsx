import { afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { FeedbackVideoPlayer } from '../FeedbackVideoPlayer';
import { FeedbackVideoMarkerPanel } from '../FeedbackVideoMarkerPanel';
import { t } from '@/i18n';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-video', () => ({ __esModule: true, default: 'Video' }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: jest.requireActual<typeof import('react-native')>('react-native').View }));

let renderer: ReactTestRenderer;
afterEach(() => { act(() => renderer?.unmount()); });
const props = { videoId: 'video', url: 'https://video', refreshURL: async () => 'https://renewed', onClose: () => {} };
const video = () => renderer.root.find(node => (node.type as unknown) === 'Video');
const button = (testID: string) => renderer.root.find(node => node.props.testID === testID && typeof node.props.onPress === 'function');

test('workbench waits for the coach to play, and the central button pauses again', async () => {
  await act(async () => { renderer = create(<FeedbackVideoPlayer {...props} layout="workbench" />); });
  expect(video().props.paused).toBe(true);
  act(() => button('feedback.video.playbackToggle').props.onPress());
  expect(video().props.paused).toBe(false);
  act(() => button('feedback.video.playbackToggle').props.onPress());
  expect(video().props.paused).toBe(true);
});

test('workbench offers four direct rates, optional Add marker and a fixed logo without full-screen chrome', async () => {
  const addMarker = jest.fn();
  const badge = { exerciseName: 'Squat', coachName: 'Coach Lee' };
  const markers = [{ id: 'marker', timeMs: 0, note: 'Check depth' }];
  await act(async () => { renderer = create(<FeedbackVideoPlayer {...props} layout="workbench" badge={badge} markers={markers} onAddMarker={addMarker} />); });
  for (const rate of ['0.5x', '1x', '1.5x', '2x']) expect(button(`feedback.video.speed.${rate}`)).toBeDefined();
  expect(renderer.root.findAllByProps({ accessibilityLabel: t('chat.closePlayback') })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ testID: 'feedback.video.badge.expanded' })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ testID: 'feedback.video.badge.collapsed' }).length).toBeGreaterThan(0);
  expect(renderer.root.findAllByType(FeedbackVideoMarkerPanel)).toHaveLength(0);
  expect(renderer.root.findAllByProps({ testID: 'feedback.video.export' })).toHaveLength(0);
  expect(video().props.controls).toBe(false);
  expect(video().props.pointerEvents).toBe('none');
  act(() => button('feedback.video.addMarker').props.onPress());
  expect(addMarker).toHaveBeenCalledTimes(1);
  act(() => button('feedback.video.speed.1.5x').props.onPress());
  expect(video().props.paused).toBe(true);
  expect(video().props.rate).toBe(1);
  act(() => button('feedback.video.playbackToggle').props.onPress());
  expect(video().props.rate).toBe(1.5);
  act(() => button('feedback.video.speed.2x').props.onPress());
  expect(video().props.rate).toBe(2);
  await act(async () => { renderer.update(<FeedbackVideoPlayer {...props} layout="workbench" badge={badge} />); });
  expect(renderer.root.findAllByProps({ testID: 'feedback.video.addMarker' })).toHaveLength(0);
});

test('workbench reports seek/end positions and retries with its selected rate', async () => {
  const onProgress = jest.fn();
  const refreshURL = jest.fn(async () => 'https://renewed');
  await act(async () => { renderer = create(<FeedbackVideoPlayer {...props} layout="workbench" onProgress={onProgress} refreshURL={refreshURL} />); });
  act(() => video().props.onLoad({ duration: 30 }));
  act(() => renderer.root.find(node => node.props.testID === 'feedback.video.scrubber' && typeof node.props.onAccessibilityAction === 'function').props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } }));
  expect(onProgress).toHaveBeenLastCalledWith(5);
  act(() => video().props.onEnd());
  expect(onProgress).toHaveBeenLastCalledWith(30);
  act(() => button('feedback.video.playbackToggle').props.onPress());
  expect(onProgress).toHaveBeenLastCalledWith(0);
  expect(video().props.paused).toBe(false);
  act(() => button('feedback.video.speed.0.5x').props.onPress());
  act(() => video().props.onError());
  const retry = () => renderer.root.find(node => node.props.accessibilityRole === 'button' && node.props.disabled === false && typeof node.props.onPress === 'function');
  await act(async () => { retry().props.onPress(); });
  expect(refreshURL).toHaveBeenCalledWith('video');
  expect(video().props.source.uri).toBe('https://renewed');
  expect(video().props.paused).toBe(false);
  expect(video().props.rate).toBe(0.5);
});

test('a rate chosen while URL renewal is pending is used when retry starts playback', async () => {
  let renew!: (url: string) => void;
  const refreshURL = () => new Promise<string>(resolve => { renew = resolve; });
  await act(async () => { renderer = create(<FeedbackVideoPlayer {...props} layout="workbench" refreshURL={refreshURL} />); });
  act(() => video().props.onError());
  act(() => renderer.root.find(node => node.props.accessibilityRole === 'button' && node.props.disabled === false && typeof node.props.onPress === 'function').props.onPress());
  act(() => button('feedback.video.speed.2x').props.onPress());
  await act(async () => { renew('https://renewed'); });
  expect(video().props.paused).toBe(false);
  expect(video().props.rate).toBe(2);
});
