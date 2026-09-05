import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Switch, ToastAndroid, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { AppButton, useColors } from '@/design';
import { t } from '@/i18n';
import { NumberWheel } from '@/features/onboarding/controls';
import { useSessionStore } from '@/api/session';
import { ProfileModal, ProfileText, PreferenceChip } from '@/features/profile/components';
import { reminderWeekdays, replaceReminders, requestReminderPermission, type ReminderSettings } from './training-reminder';
import { preferenceKeys, writeReminderPreference } from './storage';
export function TrainingReminderSettingsScreen({ studentId, initial, onClose }: { studentId: string; initial: ReminderSettings; onClose: () => void }) {
  const [settings, setSettings] = useState(initial);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const changing = useRef(false);
  const client = useQueryClient();
  const colors = useColors();
  useEffect(() => {
    const check = () => { void Notifications.getPermissionsAsync().then((permission) => setDenied(!permission.granted && !permission.canAskAgain)).catch(() => undefined); };
    check(); const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') check(); });
    return () => subscription.remove();
  }, []);
  const change = async (next: ReminderSettings) => {
    if (changing.current) return;
    changing.current = true; setBusy(true); setError(false);
    try {
      if (next.enabled && !(await requestReminderPermission())) {
        if (useSessionStore.getState().user?.id !== studentId) return;
        const off = { ...settings, enabled: false };
        await replaceReminders(off);
        if (settings.enabled) await writeReminderPreference(studentId, off);
        setSettings(off); client.setQueryData(preferenceKeys.reminder(studentId), off); setDenied(true); return;
      }
      if (useSessionStore.getState().user?.id !== studentId) return;
      setDenied(false);
      await replaceReminders(next);
      await writeReminderPreference(studentId, next);
      setSettings(next); client.setQueryData(preferenceKeys.reminder(studentId), next);
    } catch {
      if (useSessionStore.getState().user?.id !== studentId) return;
      const off = { ...next, enabled: false };
      await replaceReminders(off).catch(() => undefined);
      await writeReminderPreference(studentId, off).catch(() => undefined);
      setSettings(off); client.setQueryData(preferenceKeys.reminder(studentId), off);
      setError(true); ToastAndroid.show(t('student.trainingReminderSettingsView.copy008'), ToastAndroid.LONG);
    } finally { changing.current = false; setBusy(false); }
  };
  return <ProfileModal title={t('student.trainingReminderSettingsView.copy001')} onClose={onClose} busy={busy}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><View style={{ flex: 1 }}><ProfileText>{t('student.trainingReminderSettingsView.copy002')}</ProfileText></View><Switch accessibilityLabel={t('student.trainingReminderSettingsView.copy002')} value={settings.enabled} disabled={busy} trackColor={{ true: colors.gold500 }} onValueChange={(enabled) => void change({ ...settings, enabled })} /></View>
    <ProfileText>{t('student.trainingReminderSettingsView.copy003')}</ProfileText>
    <ProfileText>{t('student.trainingReminderSettingsView.copy004')}</ProfileText>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{reminderWeekdays.map(({ weekday, key }) => <PreferenceChip key={weekday} label={t(key)} disabled={!settings.enabled || busy} selected={settings.weekdays.includes(weekday)} onPress={() => void change({ ...settings, weekdays: settings.weekdays.includes(weekday) ? settings.weekdays.filter((day) => day !== weekday) : [...settings.weekdays, weekday] })} />)}</View>
    <ProfileText>{t('student.trainingReminderSettingsView.copy005')} · {String(settings.hour).padStart(2, '0')}:{String(settings.minute).padStart(2, '0')}</ProfileText>
    <View pointerEvents={!settings.enabled || busy ? 'none' : 'auto'} accessibilityElementsHidden={!settings.enabled} importantForAccessibility={!settings.enabled ? 'no-hide-descendants' : 'auto'} style={{ flexDirection: 'row', gap: 12, opacity: settings.enabled ? 1 : 0.4 }}>
      <NumberWheel options={Array.from({ length: 24 }, (_, n) => n)} value={settings.hour} onChange={(hour) => void change({ ...settings, hour })} />
      <NumberWheel options={Array.from({ length: 60 }, (_, n) => n)} value={settings.minute} onChange={(minute) => void change({ ...settings, minute })} />
    </View>
    {denied ? <><ProfileText error>{t('student.trainingReminderSettingsView.copy006')}</ProfileText><AppButton variant="link" label={t('student.trainingReminderSettingsView.copy007')} onPress={() => void Linking.openSettings().catch(() => setError(true))} /></> : null}
    {error ? <ProfileText error>{t('student.trainingReminderSettingsView.copy008')}</ProfileText> : null}
  </ProfileModal>;
}
