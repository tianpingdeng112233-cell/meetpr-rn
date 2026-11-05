import { configureNotificationHandler } from '@/notifications/handler';
import * as Notifications from 'expo-notifications';
import { t } from '@/i18n';
configureNotificationHandler();
let timer: ReturnType<typeof setTimeout> | undefined;
export const VIDEO_UPLOAD_CHANNEL = 'video-upload-v2';
let channelMigration: Promise<void> | undefined;
/** Android channel importance is immutable. Preserve opt-out before retiring v1. */
export function configureVideoUploadChannel(): Promise<void> {
  channelMigration ??= (async () => {
    const legacy = await Notifications.getNotificationChannelAsync('video-upload');
    await Notifications.setNotificationChannelAsync(VIDEO_UPLOAD_CHANNEL, {
      name: t('student.uploadFailureNotifier.copy001'),
      importance: legacy?.importance === Notifications.AndroidImportance.NONE
        ? Notifications.AndroidImportance.NONE : Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
    if (legacy) await Notifications.deleteNotificationChannelAsync('video-upload');
  })().finally(() => { channelMigration = undefined; });
  return channelMigration;
}
export function notifyUploadFailures(count: () => number, studentId?: string): void {
  clearTimeout(timer);
  timer = setTimeout(() => {
    void publish(count, studentId).catch(() => undefined);
  }, 1000);
}
async function publish(getCount: () => number, studentId?: string): Promise<void> {
  if (!getCount()) {
    await Notifications.cancelScheduledNotificationAsync('video-upload-failures');
    await Notifications.dismissNotificationAsync('video-upload-failures');
    return;
  }
  await configureVideoUploadChannel();
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain)
    permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;
  const count = getCount();
  if (!count) return;
  await Notifications.scheduleNotificationAsync({
    identifier: 'video-upload-failures',
    content: {
      title: t('student.uploadFailureNotifier.copy001'),
      body: t(
        count === 1
          ? 'student.uploadFailureNotifier.copy002.one'
          : 'student.uploadFailureNotifier.copy002',
        [count],
      ),
      sound: 'default',
      data: { screen: 'training', category: 'video-upload', studentId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      channelId: VIDEO_UPLOAD_CHANNEL,
    },
  });
}
