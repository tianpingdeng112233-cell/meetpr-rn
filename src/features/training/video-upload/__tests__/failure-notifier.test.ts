import { afterEach, expect, jest, test } from '@jest/globals';
import * as Notifications from 'expo-notifications';
import { notifyUploadFailures, notifyVideoCompletion } from '../failure-notifier';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3, LOW: 2, NONE: 0 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
  setNotificationHandler: jest.fn(),
  getNotificationChannelAsync: jest.fn(async () => null),
  deleteNotificationChannelAsync: jest.fn(async () => {}),
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: jest.fn(async () => 'video-upload-failures'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  dismissNotificationAsync: jest.fn(async () => {}),
}));
afterEach(() => { jest.useRealTimers(); jest.clearAllMocks(); jest.mocked(Notifications.getNotificationChannelAsync).mockReset().mockResolvedValue(null); });
test('failure notification requests normal permission and publishes one DEFAULT aggregate with retry copy', async () => {
  jest.useFakeTimers();
  notifyUploadFailures(() => 1);
  notifyUploadFailures(() => 2);
  await jest.advanceTimersByTimeAsync(1000);
  expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('video-upload-v2', expect.objectContaining({ importance: 3 }));
  expect(Notifications.requestPermissionsAsync).toHaveBeenCalledWith();
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
    identifier: 'video-upload-failures', content: expect.objectContaining({ body: "2 videos didn't upload. Tap to retry.", sound: 'default' }),
  }));
});


test.each([[2, 3], [0, 0]])('migrates legacy importance %s to v2 importance %s without reopening a disabled channel', async (legacyImportance, expectedImportance) => {
  jest.useFakeTimers();
  jest.mocked(Notifications.getNotificationChannelAsync).mockResolvedValueOnce({ id: 'video-upload', importance: legacyImportance } as Notifications.NotificationChannel);
  notifyUploadFailures(() => 1);
  await jest.advanceTimersByTimeAsync(1000);
  expect(Notifications.getNotificationChannelAsync).toHaveBeenCalledWith('video-upload');
  expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('video-upload-v2', expect.objectContaining({ importance: expectedImportance }));
  expect(Notifications.deleteNotificationChannelAsync).toHaveBeenCalledWith('video-upload');
  expect(jest.mocked(Notifications.setNotificationChannelAsync).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(Notifications.deleteNotificationChannelAsync).mock.invocationCallOrder[0]);
});

test('denied notification permission stays denied and does not publish', async () => {
  jest.useFakeTimers();
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false, canAskAgain: false } as Notifications.NotificationPermissionsStatus);
  notifyUploadFailures(() => 2);
  await jest.advanceTimersByTimeAsync(1000);
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test('delivery clears the single outstanding aggregate', async () => {
  jest.useFakeTimers();
  notifyUploadFailures(() => 0);
  await jest.advanceTimersByTimeAsync(1000);
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('video-upload-failures');
  expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith('video-upload-failures');
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test('completion and timeout reuse the failure aggregate identifier and route to the waiting day', async () => {
  await notifyVideoCompletion('timeout', 2, 'alice', 'day');
  expect(Notifications.scheduleNotificationAsync).toHaveBeenLastCalledWith(expect.objectContaining({
    identifier: 'video-upload-failures', content: expect.objectContaining({ title: 'MeetPR', body: "2 videos didn't upload. Tap to retry.", data: expect.objectContaining({ studentId: 'alice', dayId: 'day' }) }),
  }));
  await notifyVideoCompletion('complete', 1, 'alice', 'day');
  expect(Notifications.scheduleNotificationAsync).toHaveBeenLastCalledWith(expect.objectContaining({
    identifier: 'video-upload-failures', content: expect.objectContaining({ title: 'MeetPR', body: 'Workout complete. 1 video delivered.' }),
  }));
});

test.each(['dismiss', 'schedule'])('a newer completion remains the aggregate when an older failure is suspended in %s', async boundary => {
  jest.useFakeTimers();
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  let count = 2;
  const published: string[] = [];
  const schedule = jest.mocked(Notifications.scheduleNotificationAsync);
  schedule.mockImplementation(async request => { published.push(String(request.content.body)); return 'video-upload-failures'; });
  if (boundary === 'dismiss') jest.mocked(Notifications.dismissNotificationAsync).mockImplementationOnce(() => blocked);
  else schedule.mockImplementationOnce(async request => { await blocked; published.push(String(request.content.body)); return 'video-upload-failures'; });
  notifyUploadFailures(() => count, 'alice');
  await jest.advanceTimersByTimeAsync(1000);
  count = 0;
  const completion = notifyVideoCompletion('complete', 2, 'alice', 'day');
  for (let i = 0; i < 30; i++) await Promise.resolve();
  release(); await completion;
  for (let i = 0; i < 30; i++) await Promise.resolve();
  expect(published.at(-1)).toBe('Workout complete. 2 videos delivered.');
});
