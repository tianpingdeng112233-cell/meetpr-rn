import { afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { FeedbackVideoPlayer } from '@/features/video-player/FeedbackVideoPlayer';
import { VideoWorkbenchPlayer } from '../VideoWorkbenchPlayer';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-video', () => ({ __esModule: true, default: 'Video' }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: jest.requireActual<typeof import('react-native')>('react-native').View }));

let renderer: ReactTestRenderer;
afterEach(() => { act(() => renderer?.unmount()); });
const props = { videoId: 'video', url: 'https://video', failed: false, onProgress: () => {}, onRetry: async () => {}, refreshURL: async () => 'https://renewed', onAddMarker: () => {} };

test('the coach wrapper withholds Add marker for an unavailable endpoint and enables it for an empty list', async () => {
  await act(async () => { renderer = create(<VideoWorkbenchPlayer {...props} markers={null} />); });
  expect(renderer.root.findByType(FeedbackVideoPlayer).props.onAddMarker).toBeUndefined();
  expect(renderer.root.findAllByProps({ testID: 'feedback.video.addMarker' })).toHaveLength(0);
  await act(async () => { renderer.update(<VideoWorkbenchPlayer {...props} markers={[]} />); });
  expect(renderer.root.findByType(FeedbackVideoPlayer).props.onAddMarker).toBe(props.onAddMarker);
  expect(renderer.root.findAllByProps({ testID: 'feedback.video.addMarker' }).length).toBeGreaterThan(0);
});
