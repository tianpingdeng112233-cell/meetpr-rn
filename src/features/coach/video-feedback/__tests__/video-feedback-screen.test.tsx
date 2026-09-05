import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Image } from 'react-native';
import { useSessionStore } from '@/api/session';
import { receivingKeys } from '../../receiving/use-coach-receiving';
import { FeedbackVideoPlayer } from '@/features/video-player/FeedbackVideoPlayer';
import { VideoFeedbackScreen } from '../VideoFeedbackScreen';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-secure-store', () => ({ getItemAsync: async () => 'test-token' }));
jest.mock('expo-router', () => ({ router: { back: jest.fn() }, useFocusEffect: (effect: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]) }));
jest.mock('react-native-video', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return { __esModule: true, default: React.forwardRef(function MockVideo(props, ref) {
    React.useImperativeHandle(ref, () => ({ seek: mockSeek, getCurrentPosition: async () => 12.3456 }));
    return React.createElement('Video', props);
  }) };
});
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: jest.requireActual<typeof import('react-native')>('react-native').View }));
const mockSeek = jest.fn();
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const item = { id: id(1), studentID: id(2), studentName: 'Student', planExerciseID: id(3), setLogID: id(4), exerciseName: 'Squat', dayDate: '2026-09-05', uploadedAt: '2026-09-05T10:00:00Z', sizeBytes: 100 };
const plain = { id: id(5), video_id: id(1), coach_id: id(9), time_ms: 5000, level: 'info', note: 'Plain marker', created_at: item.uploadedAt };
const annotated = { ...plain, id: id(6), time_ms: 7000, note: 'Annotated marker', annotation_url: 'https://annotation/old' };
let markers: (typeof plain & { annotation_url?: string })[] = [plain, annotated];
let renderer: ReactTestRenderer;
let client: QueryClient;
let requests: { url: string; method: string; body?: string }[];
const originalFetch = global.fetch;
const video = () => renderer.root.find(node => (node.type as unknown) === 'Video');
const button = (testID: string) => renderer.root.findAll(node => node.props.testID === testID && typeof node.props.onPress === 'function')[0];

beforeEach(() => {
  requests = [];
  mockSeek.mockClear();
  markers = [plain, annotated];
  useSessionStore.setState({ user: { id: id(9), name: 'Coach Lee', role: 'coach', phone: '', created_at: item.uploadedAt } });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  client.setQueryData(receivingKeys.videos(id(9)), [item]);
  client.setQueryData(receivingKeys.chats(id(9)), { conversations: [] });
  global.fetch = jest.fn(async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, method: init?.method ?? 'GET', body: init?.body as string | undefined });
    let data: unknown;
    if (url.endsWith('/url')) data = { url: 'https://video', expires_in: 900 };
    else if (url.includes('/sets?')) data = { logs: [{ id: id(4), student_id: id(2), plan_exercise_id: id(3), exercise_id: id(8), set_index: 1, weight_kg: '100.00', reps: 5, rpe: '8.0', completed: true, failed: false, assumed: false, adhoc: false, logged_date: item.dayDate, logged_at: item.uploadedAt }] };
    else if (url.endsWith('/markers') && init?.method === 'POST') data = { ...plain, id: id(7), ...JSON.parse(init.body as string) };
    else if (init?.method === 'DELETE') data = null;
    else if (url.endsWith('/markers')) data = { markers };
    else throw new Error(`Unexpected request: ${url}`);
    return { ok: true, status: data === null ? 204 : 200, text: async () => data === null ? '' : JSON.stringify(data) } as Response;
  }) as typeof fetch;
});
afterEach(() => { act(() => renderer?.unmount()); client.clear(); global.fetch = originalFetch; });
async function renderWorkbench() {
  await act(async () => { renderer = create(<QueryClientProvider client={client}><VideoFeedbackScreen videoId={item.id} /></QueryClientProvider>); });
  act(() => video().props.onLoad({ duration: 30 }));
}

test('only annotated coach rows are buttons and open a paused frame inside the stage', async () => {
  await renderWorkbench();
  const plainButtons = renderer.root.findAll(node => typeof node.props.onPress === 'function' && node.findAll(n => n.props.children === plain.note).length > 0);
  expect(plainButtons).toHaveLength(0);
  const row = button('coach.video.marker.annotation');
  expect(row.props.accessibilityRole).toBe('button');
  act(() => button('feedback.video.playbackToggle').props.onPress());
  act(() => row.props.onPress());
  expect(video().props.paused).toBe(true);
  expect(mockSeek).toHaveBeenLastCalledWith(7, 0.05);
  expect(button('feedback.video.annotationOverlay')).toBeDefined();
  act(() => button('feedback.video.annotationOverlay').props.onPress());
  expect(button('feedback.video.annotationOverlay')).toBeUndefined();
  expect(video().props.paused).toBe(true);
});

test('badge uses set metadata and coach identity; Add marker captures rounded playback milliseconds', async () => {
  jest.useFakeTimers();
  try {
    await renderWorkbench();
    expect(renderer.root.findByType(FeedbackVideoPlayer).props.badge).toEqual({ exerciseName: 'Squat', weightKg: 100, reps: 5, rpe: 8, setOrdinal: 2, coachName: 'Coach Lee' });
    await act(async () => { jest.advanceTimersByTime(250); });
    act(() => button('feedback.video.addMarker').props.onPress());
    const save = renderer.root.find(node => node.props.accessibilityLabel === 'Save' && typeof node.props.onPress === 'function');
    await act(async () => { save.props.onPress(); });
    const posted = requests.find(request => request.method === 'POST' && request.url.endsWith('/markers'));
    expect(JSON.parse(posted!.body!)).toEqual({ time_ms: 12346, level: 'info', note: '' });
  } finally { jest.useRealTimers(); }
});

test('refresh rebinds an open annotation by id without seeking again; stale errors cannot close the new image', async () => {
  await renderWorkbench();
  act(() => button('coach.video.marker.annotation').props.onPress());
  const oldError = renderer.root.findByType(Image).props.onError;
  const seeks = mockSeek.mock.calls.length;
  markers = [plain, { ...annotated, annotation_url: 'https://annotation/renewed' }];
  await act(async () => { await renderer.root.findByType(FeedbackVideoPlayer).props.onMarkersRefresh(); });
  expect(renderer.root.findByType(Image).props.source.uri).toBe('https://annotation/renewed');
  expect(mockSeek.mock.calls).toHaveLength(seeks);
  await act(async () => { oldError(); });
  expect(button('feedback.video.annotationOverlay')).toBeDefined();
  const currentError = renderer.root.findByType(Image).props.onError;
  const reads = requests.filter(request => request.url.endsWith('/markers')).length;
  await act(async () => { currentError(); currentError(); });
  expect(button('feedback.video.annotationOverlay')).toBeUndefined();
  expect(requests.filter(request => request.url.endsWith('/markers'))).toHaveLength(reads + 1);
  expect(video().props.paused).toBe(true);
});

test('removing an open annotation clears selection even if that marker later returns', async () => {
  await renderWorkbench();
  act(() => button('coach.video.marker.annotation').props.onPress());
  markers = [plain];
  await act(async () => { await renderer.root.findByType(FeedbackVideoPlayer).props.onMarkersRefresh(); });
  expect(button('feedback.video.annotationOverlay')).toBeUndefined();
  markers = [plain, annotated];
  await act(async () => { await renderer.root.findByType(FeedbackVideoPlayer).props.onMarkersRefresh(); });
  expect(button('feedback.video.annotationOverlay')).toBeUndefined();
});

test('closing and reopening the same marker ignores an error from its previous image', async () => {
  await renderWorkbench();
  act(() => button('coach.video.marker.annotation').props.onPress());
  const oldError = renderer.root.findByType(Image).props.onError;
  act(() => button('feedback.video.annotationOverlay').props.onPress());
  act(() => button('coach.video.marker.annotation').props.onPress());
  await act(async () => { oldError(); });
  expect(button('feedback.video.annotationOverlay')).toBeDefined();
});
