import { beforeEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { videosRepository, type StudentVideo } from '@/api/domains/videos';
import type { VideoUploadStatus } from '../model';
import {
  flushVideoUploads,
  hydrateRemoteVideoAttachments,
  resetVideoUploadStoreForTests,
  selectVideoUpload,
  useVideoUploadStore,
} from '../store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'en-US' }] }));
jest.mock('@/api/domains/videos', () => ({ videosRepository: { list: jest.fn() } }));

const video: StudentVideo = {
  id: 'remote-video', set_log_id: 'log-2', plan_exercise_id: null,
  exercise_name: null, set_index: 1, weight_kg: null, reps: null,
  content_type: 'video/mp4', size_bytes: 350912, filename: null,
  created_at: '2026-09-05T10:00:00Z', logged_at: null,
};
const sets = [{ stableSetId: 'set-2', setLogId: 'log-2' }];
const read = () => selectVideoUpload('student', 'set-2')(useVideoUploadStore.getState());
function seedLocal(status: VideoUploadStatus, attachmentId = 'remote-video') {
  const dispatch = useVideoUploadStore.getState().dispatch;
  dispatch('student', 'set-2', { type: 'prepared', localUri: 'file:///local.mp4', sizeBytes: 200000 });
  dispatch('student', 'set-2', { type: 'setLogReady', setLogId: 'log-2' });
  dispatch('student', 'set-2', { type: 'uploadStarted', attachmentId });
  if (status === 'uploaded') dispatch('student', 'set-2', { type: 'succeeded', attachmentId });
  if (status === 'failed') dispatch('student', 'set-2', { type: 'failed', message: 'Upload failed' });
  return read();
}

beforeEach(async () => {
  await flushVideoUploads();
  await AsyncStorage.clear();
  resetVideoUploadStoreForTests();
  jest.mocked(videosRepository.list).mockReset().mockResolvedValue({ videos: [video] });
});

test('a cleared device recovers the set video and persists it for the next launch', async () => {
  await hydrateRemoteVideoAttachments('student', sets);
  expect(read()).toMatchObject({
    status: 'uploaded', attachmentId: 'remote-video', setLogId: 'log-2',
    localUri: null, source: null, sizeBytes: 350912,
  });
  await flushVideoUploads();
  resetVideoUploadStoreForTests();
  await useVideoUploadStore.getState().hydrate();
  expect(read()).toMatchObject({ status: 'uploaded', attachmentId: 'remote-video' });
});

test.each(['uploading', 'failed', 'uploaded'] as const)('keeps an existing %s record, including its local file', async (status) => {
  const local = seedLocal(status);
  await flushVideoUploads();
  resetVideoUploadStoreForTests();
  await hydrateRemoteVideoAttachments('student', sets);
  expect(read()).toEqual(local);
});

test('a remotely deleted uploaded attachment returns to empty and stays empty after restart', async () => {
  seedLocal('uploaded');
  jest.mocked(videosRepository.list).mockResolvedValue({ videos: [] });
  await hydrateRemoteVideoAttachments('student', sets);
  expect(read().status).toBe('none');
  await flushVideoUploads();
  resetVideoUploadStoreForTests();
  await useVideoUploadStore.getState().hydrate();
  expect(read().status).toBe('none');
});

test('a failed fetch is silent, preserves local state, and can be retried on refresh', async () => {
  const local = seedLocal('uploaded');
  jest.mocked(videosRepository.list).mockRejectedValueOnce(new Error('Offline'));
  await expect(hydrateRemoteVideoAttachments('student', sets)).resolves.toBeUndefined();
  expect(read()).toEqual(local);
  jest.mocked(videosRepository.list).mockResolvedValue({ videos: [] });
  await hydrateRemoteVideoAttachments('student', sets);
  expect(read().status).toBe('none');
});

test('fetches once for all day logs, ignoring unlinked videos, other days and other students', async () => {
  seedLocal('uploaded');
  jest.mocked(videosRepository.list).mockResolvedValue({ videos: [
    { ...video, id: 'unlinked', set_log_id: null },
    { ...video, id: 'another-day', set_log_id: 'other-log' },
    { ...video, id: 'third-video', set_log_id: 'log-3' },
  ] });
  await hydrateRemoteVideoAttachments('student', [...sets, { stableSetId: 'set-3', setLogId: 'log-3' }]);
  expect(videosRepository.list).toHaveBeenCalledTimes(1);
  expect(videosRepository.list).toHaveBeenCalledWith('student');
  expect(read().status).toBe('none');
  expect(selectVideoUpload('student', 'set-3')(useVideoUploadStore.getState()).attachmentId).toBe('third-video');
  expect(selectVideoUpload('student', 'other-log')(useVideoUploadStore.getState()).status).toBe('none');
  expect(selectVideoUpload('other-student', 'set-3')(useVideoUploadStore.getState()).status).toBe('none');
});

test.each(['uploading', 'failed'] as const)('keeps %s local work when the server list is empty', async (status) => {
  const local = seedLocal(status);
  jest.mocked(videosRepository.list).mockResolvedValue({ videos: [] });
  await hydrateRemoteVideoAttachments('student', sets);
  expect(read()).toEqual(local);
});

test('does not request videos without existing set logs', async () => {
  await hydrateRemoteVideoAttachments('student', []);
  expect(videosRepository.list).not.toHaveBeenCalled();
});

test('a stale empty response cannot erase an upload that completed while fetching', async () => {
  seedLocal('uploading');
  let resolve!: (value: { videos: StudentVideo[] }) => void;
  jest.mocked(videosRepository.list).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const hydration = hydrateRemoteVideoAttachments('student', sets);
  // Wait until the request has actually started, after AsyncStorage hydration.
  await new Promise((done) => setTimeout(done, 0));
  useVideoUploadStore.getState().dispatch('student', 'set-2', { type: 'succeeded', attachmentId: 'new-video' });
  resolve({ videos: [] });
  await hydration;
  expect(read()).toMatchObject({ status: 'uploaded', attachmentId: 'new-video' });
});

test('an in-flight response cannot resurrect a video deleted locally', async () => {
  await hydrateRemoteVideoAttachments('student', sets);
  let resolve!: (value: { videos: StudentVideo[] }) => void;
  jest.mocked(videosRepository.list).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const hydration = hydrateRemoteVideoAttachments('student', sets);
  await new Promise((done) => setTimeout(done, 0));
  useVideoUploadStore.getState().dispatch('student', 'set-2', { type: 'remove' });
  resolve({ videos: [video] });
  await hydration;
  expect(read().status).toBe('none');
});

test('the newer refresh wins when responses arrive out of order', async () => {
  let resolve!: (value: { videos: StudentVideo[] }) => void;
  jest.mocked(videosRepository.list).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const first = hydrateRemoteVideoAttachments('student', sets);
  await new Promise((done) => setTimeout(done, 0));
  jest.mocked(videosRepository.list).mockResolvedValueOnce({ videos: [] });
  await hydrateRemoteVideoAttachments('student', sets);
  resolve({ videos: [video] });
  await first;
  expect(read().status).toBe('none');
});
