import * as Notifications from 'expo-notifications';
import { t } from '@/i18n';
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});
let timer: ReturnType<typeof setTimeout> | undefined;
export function notifyUploadFailures(count: () => number): void {
  clearTimeout(timer);
  timer = setTimeout(() => {
    void publish(count).catch(() => undefined);
  }, 1000);
}
async function publish(getCount: () => number): Promise<void> {
  if (!getCount()) return;
  await Notifications.setNotificationChannelAsync('video-upload', {
    name: t('student.uploadFailureNotifier.copy001'),
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
    enableVibrate: false,
  });
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
      sound: false,
      data: { screen: 'training' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      channelId: 'video-upload',
    },
  });
}
