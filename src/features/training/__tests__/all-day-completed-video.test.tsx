import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Path } from 'react-native-svg';
import { SetVideoCamera } from '../video-upload/SetVideoCamera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Video from 'react-native-video';
import { StyleSheet, View } from 'react-native';
import { videosRepository, type StudentVideo } from '@/api/domains/videos';
import { uploadsRepository } from '@/api/domains/uploads';
import { feedbackRepository } from '@/api/domains/feedback';
import { FeedbackPressable } from '@/design/FeedbackPressable';
import { resolveColors } from '@/design';
import { ColorSchemeProvider } from '@/design/theme';
import { day, set } from '@/domain/plan/test-fixtures';
import type { SetLog } from '@/api/domains/sets';
import { setLocaleOverride, t } from '@/i18n';
import { AllDayBody, useAllDayEditor } from '../AllDayBody';
import { buildAllDaySheet } from '../all-day-sheet';
import { EMPTY_VIDEO_UPLOAD } from '../video-upload/model';
import { flushVideoUploads, resetVideoUploadStoreForTests, useVideoUploadStore } from '../video-upload/store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-community/netinfo', () =>
  jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock'));
jest.mock('expo-media-library', () => ({}));
jest.mock('react-native-compressor', () => ({}));
jest.mock('react-native-video', () => 'Video');
jest.mock('expo-file-system', () => ({ File: class { exists = true; } }));
jest.mock('react-native-safe-area-context', () =>
  jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default);
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const exercise = { id: 'exercise', plan_day_id: 'day', exercise_id: 'squat', sort_order: 0, is_main_lift: true, notes: null,
  sets: [set({ id: 'one', target_value: '100' })] };
const log: SetLog = { id: 'log', student_id: 'student', plan_exercise_id: 'exercise', exercise_id: 'squat', set_index: 0,
  weight_kg: '100', reps: 5, rpe: '8', completed: true, failed: false, assumed: false, adhoc: false,
  plan_day_id: 'day', logged_date: '2026-11-15', logged_at: '2026-11-15T12:00:00Z' };
const sheet = buildAllDaySheet(day('day', { exercises: [exercise], completed_at: log.logged_at }), [log], [], { expandedExerciseId: exercise.id });
const colors = resolveColors('light');
const noop = () => {};
function Screen({ editable = false, trainingSheet = sheet }: { editable?: boolean; trainingSheet?: typeof sheet }) {
  const editor = useAllDayEditor(noop, () => 'Squat', noop, 'day');
  return <ColorSchemeProvider scheme="light"><AllDayBody sheet={trainingSheet} editable={editable} studentId="student" title="Today"
    exerciseName={() => 'Squat'} allowsRIR={() => false} editor={editor} onSave={noop} onToggle={noop} onExpand={noop}
    onAddSet={noop} onRemoveSet={noop} onAddExercise={noop} onRemoveExercise={noop} ensureSetLog={async () => 'log'} /></ColorSchemeProvider>;
}
function remote(id = 'delivered', created_at = '2026-11-15T12:00:00Z'): StudentVideo {
  return { id, created_at, set_log_id: 'log', plan_exercise_id: 'exercise', exercise_name: 'Squat', set_index: 0,
    weight_kg: '100', reps: 5, content_type: 'video/mp4', size_bytes: 100, filename: null, logged_at: log.logged_at };
}
let renderer: ReactTestRenderer;
const cameras = () => renderer.root.findAllByType(SetVideoCamera);
const buttons = () => renderer.root.findAllByType(FeedbackPressable);
const press = async (label: string) => {
  const button = buttons().find(node => node.props.accessibilityLabel === label);
  expect(button).toBeDefined();
  await act(async () => { button!.props.onPress(); });
};
const mount = async (editable = false) => { await act(async () => { renderer = create(<Screen editable={editable} />); }); };
beforeEach(() => {
  setLocaleOverride('en');
  jest.spyOn(videosRepository, 'list').mockResolvedValue({ videos: [remote()] });
  jest.spyOn(uploadsRepository, 'url').mockResolvedValue({ url: 'https://video.test/delivered.mp4', expires_in: 900 });
  jest.spyOn(feedbackRepository, 'list').mockResolvedValue({ items: [] });
});
afterEach(async () => {
  act(() => renderer?.unmount());
  await flushVideoUploads();
  resetVideoUploadStoreForTests();
  await AsyncStorage.clear();
  setLocaleOverride(null);
  jest.restoreAllMocks();
  mockPush.mockClear();
});

test('completed AllDayBody keeps a green video entry and opens the existing read-only replay', async () => {
  await mount();
  expect(cameras()).toHaveLength(1);
  expect(cameras()[0].findAllByType(Path)[0].props.stroke).toBe(colors.success);
  expect(cameras()[0].findByType(Path).props.fill).toBe(colors.success);
  await press(t('chat.playVideo'));
  expect(renderer.root.findByType(Video).props.source.uri).toBe('https://video.test/delivered.mp4');
  for (const key of ['student.videoAttachmentV3Controls.copy001', 'student.videoAttachmentV3Controls.copy004', 'student.videoAttachmentV3Controls.copy005'] as const) {
    expect(buttons().map(node => node.props.accessibilityLabel)).not.toContain(t(key));
  }
});

test.each(['delivered', 'uploading', 'failed'] as const)('completed blocks reserve 40pt on every row only in the block with a %s video', async status => {
  const threeSetExercise = { ...exercise, sets: ['one', 'two', 'three'].map((id, index) => set({ id, set_number: index + 1, target_value: '100' })) };
  const emptyExercise = { ...exercise, id: 'empty-exercise', sort_order: 1,
    sets: ['empty-one', 'empty-two', 'empty-three'].map((id, index) => set({ id, set_number: index + 1, target_value: '100' })) };
  const trainingSheet = buildAllDaySheet(day('day', { exercises: [threeSetExercise, emptyExercise], completed_at: log.logged_at }), [log], []);
  trainingSheet.exercises.forEach(block => { block.collapsed = false; });
  if (status !== 'delivered') {
    jest.mocked(videosRepository.list).mockResolvedValue({ videos: [] });
    useVideoUploadStore.setState({ records: { 'student:one': { ...EMPTY_VIDEO_UPLOAD, status, setLogId: 'log' } } });
  }
  await act(async () => { renderer = create(<Screen trainingSheet={trainingSheet} />); });
  const row = (id: string) => renderer.root.findAllByType(View).find(node => node.props.testID === `all-day-row-${id}`)!;
  const placeholders = (id: string) => row(id).findAllByType(View).filter(node => node.props.testID === 'completed-video-placeholder');
  expect(cameras()).toHaveLength(1);
  const videoButton = row('one').findAllByType(FeedbackPressable).find(node =>
    node.props.accessibilityLabel === t(status === 'delivered' ? 'chat.playVideo' : status === 'failed' ? 'student.videoDelivery.notUploaded' : 'student.videoUpload.sending'))!;
  expect(StyleSheet.flatten(videoButton.props.style).width).toBe(40);
  expect(placeholders('one')).toHaveLength(0);
  for (const id of ['two', 'three']) {
    expect(placeholders(id)).toHaveLength(1);
    expect(StyleSheet.flatten(placeholders(id)[0].props.style)).toEqual({ width: 40 });
  }
  for (const id of ['empty-one', 'empty-two', 'empty-three']) {
    expect(placeholders(id)).toHaveLength(0);
    expect(row(id).findAllByType(SetVideoCamera)).toHaveLength(0);
  }
});

test('completion preserves yellow upload status and upload events turn it green without reopening the day', async () => {
  jest.mocked(videosRepository.list).mockResolvedValue({ videos: [] });
  const dispatch = useVideoUploadStore.getState().dispatch;
  dispatch('student', 'one', { type: 'failed', message: 'Previous attempt failed' });
  dispatch('student', 'one', { type: 'uploadStarted', attachmentId: 'delivered' });
  dispatch('student', 'one', { type: 'setLogReady', setLogId: 'log' });
  await mount(true);
  expect(cameras()[0].findAllByType(Path)[0].props.stroke).toBe(colors.gold500);
  await act(async () => { renderer.update(<Screen />); });
  expect(cameras()).toHaveLength(1);
  expect(cameras()[0].findAllByType(Path)[0].props.stroke).toBe(colors.gold500);
  await act(async () => { dispatch('student', 'one', { type: 'progress', progress: 0.5 }); });
  expect(cameras()[0].props.fraction).toBe(0.5);
  expect(buttons().filter(node => node.props.accessibilityLabel === t('chat.playVideo'))).toHaveLength(0);
  await act(async () => { dispatch('student', 'one', { type: 'succeeded', attachmentId: 'delivered' }); });
  expect(cameras()[0].findAllByType(Path)[0].props.stroke).toBe(colors.success);
  await press(t('chat.playVideo'));
  expect(renderer.root.findByType(Video).props.source.uri).toBe('https://video.test/delivered.mp4');
});


test.each(['failed', 'waiting'] as const)('completed sets retain red %s status without capture or replay', async status => {
  useVideoUploadStore.setState({ records: { 'student:one': {
    ...EMPTY_VIDEO_UPLOAD, status, setLogId: 'log', localUri: 'file:///pending.mp4', attachmentId: 'old',
  } } });
  await mount();
  expect(cameras()).toHaveLength(1);
  expect(cameras()[0].findAllByType(Path)[0].props.stroke).toBe(colors.danger);
  expect(buttons().filter(node => node.props.accessibilityLabel === t('chat.playVideo'))).toHaveLength(0);
  expect(buttons().filter(node => node.props.accessibilityLabel === t('student.videoAttachmentV3Controls.copy001'))).toHaveLength(0);
});

test.each([false, true])('an uploaded file without a set binding never turns green (older remote exists: %s)', async olderRemote => {
  jest.mocked(videosRepository.list).mockResolvedValue({ videos: olderRemote ? [remote('old', '2026-11-14T12:00:00Z')] : [] });
  useVideoUploadStore.setState({ records: { 'student:one': {
    ...EMPTY_VIDEO_UPLOAD, status: 'uploaded', attachmentId: 'unbound', localUri: 'file:///unbound.mp4',
    createdAt: Date.parse('2026-11-15T12:00:00Z'),
  } } });
  await mount();
  expect(cameras()).toHaveLength(1);
  expect(cameras()[0].findAllByType(Path)[0].props.stroke).toBe(colors.gold500);
  expect(buttons().filter(node => node.props.accessibilityLabel === t('chat.playVideo'))).toHaveLength(0);
});

test('a completed set without video has neither video icon nor capture entry; editable sets keep capture', async () => {
  jest.mocked(videosRepository.list).mockResolvedValue({ videos: [] });
  await mount();
  expect(cameras()).toHaveLength(0);
  expect(buttons().filter(node => node.props.accessibilityLabel === t('student.videoAttachmentV3Controls.copy001'))).toHaveLength(0);
  await act(async () => { renderer.update(<Screen editable />); });
  expect(cameras()).toHaveLength(1);
  expect(cameras()[0].findAllByType(Path)[0].props.stroke).toBe(colors.textMuted);
  expect(buttons().filter(node => node.props.accessibilityLabel === t('student.videoAttachmentV3Controls.copy001'))).toHaveLength(1);
});

test('newest remote clip wins over an older retained local clip and renews its signed playback URL', async () => {
  jest.mocked(videosRepository.list).mockResolvedValue({ videos: [remote('old', '2026-11-14T12:00:00Z'), remote('new')] });
  useVideoUploadStore.setState({ records: { 'student:one': {
    ...EMPTY_VIDEO_UPLOAD, status: 'uploaded', attachmentId: 'old', setLogId: 'log', localUri: 'file:///old.mp4',
    createdAt: Date.parse('2026-11-14T12:00:00Z'),
  } } });
  jest.mocked(uploadsRepository.url).mockResolvedValueOnce({ url: 'https://video.test/new.mp4', expires_in: 900 })
    .mockResolvedValueOnce({ url: 'https://video.test/renewed.mp4', expires_in: 900 });
  await mount();
  await press(t('chat.playVideo'));
  expect(uploadsRepository.url).toHaveBeenCalledWith('new');
  expect(renderer.root.findByType(Video).props.source.uri).toBe('https://video.test/new.mp4');
  await act(async () => { renderer.root.findByType(Video).props.onError({ error: { errorString: 'expired' } }); });
  expect(renderer.root.findByType(Video).props.source.uri).toBe('https://video.test/renewed.mp4');
  expect(uploadsRepository.url).toHaveBeenLastCalledWith('new');
});

test('read-only replay retains the coach-reviewed badge and opens the matching feedback', async () => {
  jest.mocked(feedbackRepository.list).mockResolvedValue({ items: [{ id: 'feedback', coach_id: 'coach', student_id: 'student',
    day_date: '2026-11-15', plan_exercise_id: 'exercise', video_id: 'delivered', text: 'Reviewed',
    posted_at: '2026-11-15T13:00:00Z', read_at: null }] });
  await mount();
  await press(t('chat.playVideo'));
  await press(t('training.coachReviewed'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/(student)/feedback/[feedbackId]', params: { feedbackId: 'feedback' } });
  expect(renderer.root.findAllByType(Video)).toHaveLength(0);
});

test('editable delivered video still opens its existing controls with capture and delete', async () => {
  useVideoUploadStore.setState({ records: { 'student:one': {
    ...EMPTY_VIDEO_UPLOAD, status: 'uploaded', attachmentId: 'delivered', setLogId: 'log', localUri: 'file:///local.mp4',
  } } });
  await mount(true);
  await press(t('student.videoAttachmentV3Controls.copy006'));
  for (const key of ['student.videoAttachmentV3Controls.copy001', 'student.videoAttachmentV3Controls.copy005'] as const) {
    const button = buttons().find(node => node.props.accessibilityLabel === t(key));
    expect(button).toBeDefined();
    expect(button!.props.disabled).toBe(false);
  }
});
