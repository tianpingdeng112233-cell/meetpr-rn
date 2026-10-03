import { readReminderPreference, writeReminderPreference } from './storage';
import { clearTrainingReminders, reminderRevision, replaceReminders } from './training-reminder';

/** Rebuild pending requests after sign-in; never materialize unsaved onboarding defaults. */
export async function reconcileTrainingReminders(studentId: string, isCurrent: () => boolean) {
  const revision = reminderRevision();
  const saved = await readReminderPreference(studentId);
  if (!isCurrent() || revision !== reminderRevision() || !saved) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const notifications: typeof import('expo-notifications') = require('expo-notifications');
  const permission = await notifications.getPermissionsAsync();
  if (!isCurrent() || revision !== reminderRevision()) return null;
  const next = permission.granted ? saved : { ...saved, enabled: false };
  try {
    await replaceReminders(next);
    if (!permission.granted && saved.enabled) await writeReminderPreference(studentId, next);
    return next;
  } catch (error) {
    // A newer change or account owns the queue now; do not clear its requests.
    if (isCurrent() && reminderRevision() === revision + 1) {
      await clearTrainingReminders();
      await writeReminderPreference(studentId, { ...saved, enabled: false });
    }
    throw error;
  }
}
