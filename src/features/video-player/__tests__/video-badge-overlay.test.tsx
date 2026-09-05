import { afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { FeedbackVideoPlayer } from '../FeedbackVideoPlayer';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-video', () => ({ __esModule: true, default: 'Video' }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: jest.requireActual<typeof import('react-native')>('react-native').View }));

let renderer: ReactTestRenderer;
afterEach(() => { act(() => renderer?.unmount()); });
const props = { videoId: 'video', url: 'https://video', refreshURL: async () => 'https://video', onClose: () => {} };
const badge = { exerciseName: 'Squat', weightKg: 100, reps: 5, rpe: 8, setOrdinal: 2 };
const buttons = (id: string) => renderer.root.findAll(node => node.props.testID === id && typeof node.props.onPress === 'function');

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

test('only badged playback renders a scrim and overlay', async () => {
  await act(async () => { renderer = create(<FeedbackVideoPlayer {...props} badge={badge} />); });
  expect(renderer.root.findAllByProps({ testID: 'feedback.video.badge.scrim' }).length).toBeGreaterThan(0);
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
  const marker = renderer.root.find(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === '✏️ Jump to 0:00');
  act(() => marker.props.onPress());
  let controls = buttons('feedback.video.badge.expanded')[0].parent;
  while (controls && controls.props.importantForAccessibility !== 'no-hide-descendants') controls = controls.parent;
  expect(controls?.props.pointerEvents).toBe('none');
  expect(controls?.props.accessibilityElementsHidden).toBe(true);
  act(() => buttons('feedback.video.annotationOverlay')[0].props.onPress());
  expect(renderer.root.findAllByProps({ testID: 'feedback.video.annotationOverlay' })).toHaveLength(0);
  expect(buttons('feedback.video.badge.expanded')).toHaveLength(1);
});
