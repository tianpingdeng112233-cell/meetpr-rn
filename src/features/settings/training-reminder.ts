import { t, type TranslationKey } from '@/i18n';
import { TRAINING_DAYS } from '@/features/onboarding/catalog';
export type ReminderSettings = { enabled: boolean; weekdays: number[]; hour: number; minute: number };
export const REMINDER_PREFIX = 'training-reminder-';
export const REMINDER_CHANNEL = 'training-reminder';
export const reminderWeekdays: readonly { weekday: number; key: TranslationKey }[] = [
  { weekday: 2, key: 'student.trainingReminderWeekday.copy001' }, { weekday: 3, key: 'student.trainingReminderWeekday.copy002' },
  { weekday: 4, key: 'student.trainingReminderWeekday.copy003' }, { weekday: 5, key: 'student.trainingReminderWeekday.copy004' },
  { weekday: 6, key: 'student.trainingReminderWeekday.copy005' }, { weekday: 7, key: 'student.trainingReminderWeekday.copy006' },
  { weekday: 1, key: 'student.trainingReminderWeekday.copy007' },
];
export function defaultReminderSettings(trainingDays?: readonly string[] | null): ReminderSettings {
  const weekdays = (trainingDays ?? []).flatMap((day) => { const index = TRAINING_DAYS.findIndex((token) => token === day); return index < 0 ? [] : [(index + 1) % 7 + 1]; });
  return { enabled: false, weekdays: weekdays.length ? [...new Set(weekdays)] : [2, 4, 6], hour: 20, minute: 0 };
}
export function reminderRequests(settings: ReminderSettings) {
  if (!settings.enabled) return [];
  return [...new Set(settings.weekdays)].filter((weekday) => Number.isInteger(weekday) && weekday >= 1 && weekday <= 7).sort((a, b) => a - b)
    .map((weekday) => ({ identifier: `${REMINDER_PREFIX}${weekday}`, weekday, hour: settings.hour, minute: settings.minute }));
}
export function reminderSummary(settings: ReminderSettings): string {
  if (!settings.enabled) return t('student.trainingReminderCopy.copy001');
  if (!settings.weekdays.length) return t('student.trainingReminderCopy.copy002');
  return `${reminderWeekdays.filter(({ weekday }) => settings.weekdays.includes(weekday)).map(({ key }) => t(key)).join('·')} ${String(settings.hour).padStart(2, '0')}:${String(settings.minute).padStart(2, '0')}`;
}
// Native loading stays lazy: pure scheduling/model consumers need no native module.
function notificationCenter(): typeof import('expo-notifications') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications');
}
let revision = 0;
export const reminderRevision = () => revision;
let queue: Promise<void> = Promise.resolve();
function serial(operation: () => Promise<void>): Promise<void> {
  const next = queue.then(operation, operation);
  queue = next.catch(() => undefined);
  return next;
}
async function cancelPrefix() {
  const notifications = notificationCenter();
  for (const request of await notifications.getAllScheduledNotificationsAsync()) {
    if (request.identifier.startsWith(REMINDER_PREFIX)) await notifications.cancelScheduledNotificationAsync(request.identifier);
  }
}
export function clearTrainingReminders(): Promise<void> {
  revision += 1;
  return serial(cancelPrefix);
}
export function replaceReminders(settings: ReminderSettings): Promise<void> {
  revision += 1;
  return serial(async () => {
    await cancelPrefix();
    const requests = reminderRequests(settings);
    if (!requests.length) return;
    const notifications = notificationCenter();
    notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }) });
    await notifications.setNotificationChannelAsync(REMINDER_CHANNEL, { name: t('student.trainingReminderPreferenceRow.copy001'), importance: notifications.AndroidImportance.DEFAULT });
    try {
      for (const { identifier, weekday, hour, minute } of requests) {
        await notifications.scheduleNotificationAsync({ identifier,
          content: { title: t('student.trainingReminderCopy.copy003'), body: t('student.trainingReminderCopy.copy004') },
          trigger: { type: notifications.SchedulableTriggerInputTypes.WEEKLY, weekday, hour, minute, channelId: REMINDER_CHANNEL },
        });
      }
    } catch (error) {
      await cancelPrefix();
      throw error;
    }
  });
}
export async function requestReminderPermission(): Promise<boolean> {
  const notifications = notificationCenter();
  await notifications.setNotificationChannelAsync(REMINDER_CHANNEL, { name: t('student.trainingReminderPreferenceRow.copy001'), importance: notifications.AndroidImportance.DEFAULT });
  const existing = await notifications.getPermissionsAsync();
  return existing.granted || (await notifications.requestPermissionsAsync()).granted;
}
