import { useEffect } from 'react';
import { ToastAndroid } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/api/session';
import { t } from '@/i18n';
import { reconcileTrainingReminders } from './reminder-lifecycle';
import { preferenceKeys } from './storage';
export function TrainingReminderSession() {
  const studentId = useSessionStore((state) => state.status === 'authenticated' && state.user?.role !== 'coach' ? state.user?.id : undefined);
  return studentId ? <StudentReminderSync key={studentId} studentId={studentId} /> : null;
}
function StudentReminderSync({ studentId }: { studentId: string }) {
  const client = useQueryClient();
  useEffect(() => {
    let active = true;
    const current = () => active && useSessionStore.getState().user?.id === studentId;
    void reconcileTrainingReminders(studentId, current).then((settings) => {
      if (current() && settings) client.setQueryData(preferenceKeys.reminder(studentId), settings);
    }).catch(() => {
      if (current()) { void client.invalidateQueries({ queryKey: preferenceKeys.reminder(studentId) }); ToastAndroid.show(t('student.trainingReminderSettingsView.copy008'), ToastAndroid.LONG); }
    });
    return () => { active = false; };
  }, [studentId, client]);
  return null;
}
