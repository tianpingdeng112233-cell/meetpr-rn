import { expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { Platform } from 'react-native';
import { reconcileTrainingReminders } from '../reminder-lifecycle';
import { writeReminderPreference } from '../storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { canScheduleExactReminders, openExactReminderSettings, defaultReminderSettings, reminderRequests, replaceReminders } from '../training-reminder';
import { useSessionStore } from '@/api/session';
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(), getAllScheduledNotificationsAsync: jest.fn(), cancelScheduledNotificationAsync: jest.fn(), scheduleNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(), setNotificationChannelAsync: jest.fn(), deleteNotificationChannelAsync: jest.fn(), AndroidImportance: { DEFAULT: 3, HIGH: 4 }, SchedulableTriggerInputTypes: { WEEKLY: 'weekly' },
}));
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-secure-store', () => ({ deleteItemAsync: jest.fn() }));
afterEach(() => { jest.restoreAllMocks(); });
const settings = { enabled: true, weekdays: [2, 4, 6], hour: 20, minute: 15 };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true } as Notifications.NotificationPermissionsStatus);
  jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([
    { identifier: 'training-reminder-2' }, { identifier: 'unrelated' }, { identifier: 'training-reminder-7' },
  ] as Notifications.NotificationRequest[]);
});
test('selected weekdays produce unique weekly identifiers and local wall times', () => {
  expect(reminderRequests({ ...settings, weekdays: [2, 4, 2] })).toEqual([
    { identifier: 'training-reminder-2', weekday: 2, hour: 20, minute: 15 },
    { identifier: 'training-reminder-4', weekday: 4, hour: 20, minute: 15 },
  ]);
  expect(reminderRequests({ ...settings, weekdays: [] })).toEqual([]);
  expect(reminderRequests({ ...settings, enabled: false })).toEqual([]);
});
test('initially off at 20:00, preselection uses onboarding wire tokens with Mon/Wed/Fri fallback', () => {
  expect(defaultReminderSettings(['sun', 'tue'])).toEqual({ enabled: false, weekdays: [1, 3], hour: 20, minute: 0 });
  expect(defaultReminderSettings(null).weekdays).toEqual([2, 4, 6]);
});
test('changes cancel all reminder identifiers before scheduling, preserving unrelated notifications', async () => {
  await replaceReminders(settings);
  const cancel = jest.mocked(Notifications.cancelScheduledNotificationAsync);
  const schedule = jest.mocked(Notifications.scheduleNotificationAsync);
  expect(cancel.mock.calls).toEqual([['training-reminder-2'], ['training-reminder-7']]);
  expect(schedule).toHaveBeenCalledTimes(3);
  expect(Math.max(...cancel.mock.invocationCallOrder)).toBeLessThan(Math.min(...schedule.mock.invocationCallOrder));
  expect(schedule.mock.calls[0][0]).toMatchObject({ identifier: 'training-reminder-2', trigger: { type: 'weekly', weekday: 2, hour: 20, minute: 15, channelId: 'training-reminder-v2' } });
});
test('logout clears the reminder prefix without scheduling replacements', async () => {
  await useSessionStore.getState().logout();
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('training-reminder-2');
  expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('unrelated');
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test('a scheduling failure rolls the reminder set back to empty', async () => {
  jest.mocked(Notifications.scheduleNotificationAsync).mockRejectedValueOnce(new Error('OS failed'));
  await expect(replaceReminders(settings)).rejects.toThrow('OS failed');
  expect(Notifications.getAllScheduledNotificationsAsync).toHaveBeenCalledTimes(2);
});
test('logout while a schedule is in flight clears after that schedule finishes', async () => {
  let finish!: (identifier: string) => void;
  jest.mocked(Notifications.scheduleNotificationAsync).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const scheduling = replaceReminders({ ...settings, weekdays: [2] });
  while (!finish) await Promise.resolve();
  const logout = useSessionStore.getState().logout();
  finish('training-reminder-2');
  await Promise.all([scheduling, logout]);
  expect(Notifications.getAllScheduledNotificationsAsync).toHaveBeenCalledTimes(2);
  const cancels = jest.mocked(Notifications.cancelScheduledNotificationAsync).mock.invocationCallOrder;
  expect(cancels[cancels.length - 1]).toBeGreaterThan(jest.mocked(Notifications.scheduleNotificationAsync).mock.invocationCallOrder[0]);
});

test('a fresh account neither persists defaults nor schedules notifications', async () => {
  await AsyncStorage.clear();
  jest.mocked(AsyncStorage.setItem).mockClear();
  await reconcileTrainingReminders('fresh-student', () => true);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});
test('signing back in restores that student’s saved weekdays', async () => {
  await writeReminderPreference('returning-student', settings);
  await reconcileTrainingReminders('returning-student', () => true);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
});
test('a stale account restore cannot schedule after logout', async () => {
  await writeReminderPreference('old-student', settings);
  await reconcileTrainingReminders('old-student', () => false);
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});


test('foreground training reminders show and sound without changing upload failure presentation', async () => {
  await replaceReminders(settings);
  const handler = jest.mocked(Notifications.setNotificationHandler).mock.calls.at(-1)![0]!;
  const notification = (identifier: string) => ({ request: { identifier, content: { data: {} } } }) as Notifications.Notification;
  await expect(handler.handleNotification(notification('training-reminder-2'))).resolves.toEqual({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
  });
  await expect(handler.handleNotification(notification('video-upload-failures'))).resolves.toEqual({
    shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
  });
});


test('migrates installed users to a new HIGH channel with sound before scheduling', async () => {
  await replaceReminders(settings);
  expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('training-reminder-v2', expect.objectContaining({ importance: 4, sound: 'default' }));
  expect(Notifications.deleteNotificationChannelAsync).toHaveBeenCalledWith('training-reminder');
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
    content: expect.objectContaining({ sound: 'default', data: { category: 'training-reminder' } }),
    trigger: expect.objectContaining({ channelId: 'training-reminder-v2' }),
  }));
});


test('exact reminder authorization reflects the native system permission', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const canScheduleExactAlarms = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
  jest.spyOn(jest.requireMock<typeof import('expo-modules-core')>('expo-modules-core'), 'requireOptionalNativeModule').mockReturnValue({ canScheduleExactAlarms });
  await expect(canScheduleExactReminders()).resolves.toBe(true);
});


test.each([false, true])('exact alarm permission %s never blocks weekly scheduling', async (granted) => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(jest.requireMock<typeof import('expo-modules-core')>('expo-modules-core'), 'requireOptionalNativeModule')
    .mockReturnValue({ canScheduleExactAlarms: async () => granted });
  await expect(canScheduleExactReminders()).resolves.toBe(granted);
  await replaceReminders(settings);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
});
test.each(['missing', 'query fails', 'load fails', 'non-android'])('exact alarm bridge safely degrades when %s', async (failure) => {
  jest.replaceProperty(Platform, 'OS', failure === 'non-android' ? 'ios' : 'android');
  const load = jest.spyOn(jest.requireMock<typeof import('expo-modules-core')>('expo-modules-core'), 'requireOptionalNativeModule');
  if (failure === 'load fails') load.mockImplementation(() => { throw new Error('unavailable'); });
  else load.mockReturnValue(failure === 'missing' ? null : {
    canScheduleExactAlarms: async () => { throw new Error('unavailable'); },
    openSettings: async () => { throw new Error('unavailable'); },
  });
  await expect(canScheduleExactReminders()).resolves.toBe(false);
  await expect(openExactReminderSettings()).resolves.toBe(false);
  await replaceReminders(settings);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
  if (failure === 'non-android') expect(load).not.toHaveBeenCalled();
});
