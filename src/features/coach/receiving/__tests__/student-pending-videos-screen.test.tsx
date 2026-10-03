import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { isValidElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ActivityIndicator, Text } from 'react-native';
import { router } from 'expo-router';
import { setLocaleOverride, t } from '@/i18n';
import type { PendingVideo } from '@/domain/coach/pending-videos';
import { StudentPendingVideosScreen } from '../StudentPendingVideosScreen';
import { receivingKeys } from '../use-coach-receiving';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-community/netinfo', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-community/netinfo/jest/netinfo-mock'));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), navigate: jest.fn(), push: jest.fn() },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));

let renderer: ReactTestRenderer;
let client: QueryClient;
const video: PendingVideo = { id: 'video', studentID: 'student', studentName: 'Sam', planExerciseID: 'squat', setLogID: null, exerciseName: 'Squat', dayDate: '2026-09-05', uploadedAt: '2026-09-05T09:03:00', sizeBytes: 2621440 };
function textContent(value: ReactNode): string {
  if (Array.isArray(value)) return value.map(textContent).join('');
  if (isValidElement<{ children: ReactNode }>(value)) return textContent(value.props.children);
  return value == null ? '' : String(value);
}
const copy = () => renderer.root.findAllByType(Text).map(node => textContent(node.props.children));
async function renderScreen(items: PendingVideo[] | null = [video]) {
  if (items) client.setQueryData(receivingKeys.videos(''), items);
  client.setQueryData(receivingKeys.chats(''), { conversations: [] });
  await act(async () => { renderer = create(<QueryClientProvider client={client}><StudentPendingVideosScreen studentId="student" studentName="Sam" /></QueryClientProvider>); });
}
beforeEach(() => {
  jest.clearAllMocks(); setLocaleOverride('en');
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
});

afterEach(() => { act(() => renderer?.unmount()); client.clear(); setLocaleOverride(null); });

test('video rows show the exercise or training-video fallback and time with formatted size', async () => {
  await renderScreen([video, { ...video, id: 'unnamed', exerciseName: null, sizeBytes: 12582912 }]);
  expect(copy()).toEqual(expect.arrayContaining(['Squat', t('coach.videoFeedback.trainingVideo'), '09:03 · 2.5 MB', '09:03 · 12 MB']));
  const meta = renderer.root.findAllByType(Text).find(node => textContent(node.props.children) === '09:03 · 2.5 MB');
  expect(meta?.props.style).toMatchObject({ fontSize: 11 });
  const row = renderer.root.find(node => node.props.testID === 'coach.video.row.video' && typeof node.props.onPress === 'function');
  act(() => row.props.onPress());
  expect(router.push).toHaveBeenCalledWith({ pathname: '/(coach)/video-feedback/[videoId]', params: { videoId: 'video', studentId: 'student' } });
});


test('student name appears in the inline header with an accessible back control and no Back pill text', async () => {
  await renderScreen();
  expect(copy()).toContain('Sam');
  expect(copy()).not.toContain(t('coach.videoFeedback.back'));
  const back = renderer.root.find(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === t('coach.videoFeedback.back'));
  act(() => back.props.onPress());
  expect(router.back).toHaveBeenCalledTimes(1);
});

test('loading shows an accessible spinner without empty-state copy', async () => {
  await renderScreen(null);
  expect(renderer.root.findByType(ActivityIndicator).props.accessibilityLabel).toBe(t('coach.inbox.loading'));
  expect(copy()).not.toContain(t('coach.videoFeedback.noPendingVideos'));
  expect(router.back).not.toHaveBeenCalled();
});

test('failed initial load shows failure copy without dismissing the list', async () => {
  await client.prefetchQuery({ queryKey: receivingKeys.videos(''), queryFn: async () => { throw new Error('offline'); } });
  await renderScreen(null);
  expect(copy()).toContain(t('coach.inbox.loadFailed'));
  expect(copy()).not.toContain(t('coach.videoFeedback.noPendingVideos'));
  expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(0);
  expect(router.back).not.toHaveBeenCalled();
});

test('empty list shows the no-pending title and description and returns to the inbox', async () => {
  await renderScreen([]);
  expect(copy()).toEqual(expect.arrayContaining([t('coach.videoFeedback.noPendingVideos'), t('coach.videoFeedback.noPendingVideosSubtitle')]));
  const title = renderer.root.findAllByType(Text).find(node => node.props.children === t('coach.videoFeedback.noPendingVideos'));
  const subtitle = renderer.root.findAllByType(Text).find(node => node.props.children === t('coach.videoFeedback.noPendingVideosSubtitle'));
  expect(title?.props.style).toMatchObject({ fontSize: 20 });
  expect(subtitle?.props.style).toMatchObject({ fontSize: 15 });
  expect(router.back).toHaveBeenCalledTimes(1);
});
