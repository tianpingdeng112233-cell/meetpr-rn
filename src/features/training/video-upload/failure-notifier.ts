import { SerialTaskQueue } from '../serial-task-queue';
import { configureNotificationHandler } from '@/notifications/handler';
import * as Notifications from 'expo-notifications';
import { t } from '@/i18n';
configureNotificationHandler();
const publications = new SerialTaskQueue();
let revision = 0;
let lastKind: 'failure' | 'complete' | 'timeout' = 'failure';
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
    if (!count() && lastKind === 'complete') return;
    const version = ++revision;
    void publications.enqueue(() => publish(count, studentId, version)).catch(() => undefined);
  }, 1000);
}
async function publish(getCount: () => number, studentId: string | undefined, version: number): Promise<void> {
  if (version !== revision) return;
  if (!getCount()) {
    if (lastKind === 'complete') return;
    await Notifications.cancelScheduledNotificationAsync('video-upload-failures');
    if (version !== revision) return;
    await Notifications.dismissNotificationAsync('video-upload-failures');
    return;
  }
  await configureVideoUploadChannel();
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain)
    permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;
  if (!getCount() || version !== revision) return;
  lastKind = 'failure';
  await Notifications.dismissNotificationAsync('video-upload-failures');
  const count = getCount();
  if (!count || version !== revision) return;
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
  if (version === revision && !getCount()) {
    await Notifications.cancelScheduledNotificationAsync('video-upload-failures');
    if (version === revision) await Notifications.dismissNotificationAsync('video-upload-failures');
  }
}

/** All video notices share one OS identifier, so success replaces failure. */
export async function notifyVideoCompletion(kind: 'complete' | 'timeout', count: number, studentId: string, dayId: string): Promise<void> {
  clearTimeout(timer);
  const version = ++revision;
  lastKind = kind;
  return publications.enqueue(async () => {
    if (version !== revision) return;
    await configureVideoUploadChannel();
    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted || version !== revision) return;
    lastKind = kind;
    const key = kind === 'complete' ? 'complete' : 'videoTimeout';
    await Notifications.cancelScheduledNotificationAsync('video-upload-failures');
    if (version !== revision) return;
    await Notifications.dismissNotificationAsync('video-upload-failures');
    if (version !== revision) return;
    await Notifications.scheduleNotificationAsync({ identifier: 'video-upload-failures', content: {
      title: 'MeetPR', body: t(`student.videoDelivery.${key}${count === 1 ? 'One' : ''}`, [count]),
      sound: 'default', data: { screen: 'training', category: 'video-upload', studentId, dayId, kind },
    }, trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: VIDEO_UPLOAD_CHANNEL } });
  });
}
