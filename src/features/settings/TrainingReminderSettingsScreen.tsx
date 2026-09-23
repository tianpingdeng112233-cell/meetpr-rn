import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Switch, Text, ToastAndroid, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { AppButton, font, useColors } from '@/design';
import { t } from '@/i18n';
import { NumberWheel } from '@/features/onboarding/controls';
import { useSessionStore } from '@/api/session';
import { ProfileText, MyProfileGroupCard, MyProfileDivider } from '@/features/profile/components';
import { reminderWeekdays, replaceReminders, requestReminderPermission, type ReminderSettings } from './training-reminder';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { SettingsPage, SettingsSectionTitle } from './SettingsPage';
import { preferenceKeys, writeReminderPreference } from './storage';
export function TrainingReminderSettingsScreen({ studentId, initial, onClose }: { studentId: string; initial: ReminderSettings; onClose: () => void }) {
  const [editingTime, setEditingTime] = useState(false);
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
  return <SettingsPage title={t('student.trainingReminderSettingsView.copy001')} onClose={onClose} busy={busy}>
    <MyProfileGroupCard><View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ flex: 1, ...font.body(16, 'semibold'), color: colors.textPrimary }}>{t('student.trainingReminderSettingsView.copy002')}</Text>
      <Switch accessibilityLabel={t('student.trainingReminderSettingsView.copy002')} value={settings.enabled} disabled={busy} trackColor={{ true: colors.gold500 }} onValueChange={(enabled) => { if (!enabled) setEditingTime(false); void change({ ...settings, enabled }); }} />
    </View></MyProfileGroupCard>
    <View style={{ gap: 8 }}><SettingsSectionTitle>{t('student.trainingReminderSettingsView.copy003')}</SettingsSectionTitle>
      <View style={{ opacity: settings.enabled ? 1 : 0.45 }}><MyProfileGroupCard><View style={{ padding: 16, gap: 16 }}>
        <Text style={{ ...font.body(14, 'semibold'), color: colors.textPrimary }}>{t('student.trainingReminderSettingsView.copy004')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{reminderWeekdays.map(({ weekday, key }) => {
          const selected = settings.weekdays.includes(weekday);
          return <Pressable key={weekday} accessibilityRole="button" accessibilityState={{ selected, disabled: !settings.enabled || busy }} disabled={!settings.enabled || busy}
            onPress={() => void change({ ...settings, weekdays: selected ? settings.weekdays.filter(day => day !== weekday) : [...settings.weekdays, weekday] })}
            style={{ flexGrow: 1, minWidth: 32, minHeight: 44, paddingHorizontal: 3, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: selected ? colors.gold500 : colors.borderSubtle, backgroundColor: selected ? colors.ctaFill : colors.surfaceRaised }}>
            <Text style={{ ...font.body(12, 'semibold'), color: selected ? colors.inkOnCTAFill : colors.textSecondary }}>{t(key)}</Text>
          </Pressable>;
        })}</View>
        <MyProfileDivider />
        <Pressable accessibilityRole="button" accessibilityLabel={t('student.trainingReminderSettingsView.copy005')} accessibilityState={{ expanded: editingTime, disabled: !settings.enabled || busy }} disabled={!settings.enabled || busy} onPress={() => setEditingTime(!editingTime)}
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ flex: 1, ...font.body(14, 'semibold'), color: colors.textPrimary }}>{t('student.trainingReminderSettingsView.copy005')}</Text>
          <Text style={{ ...font.body(14), color: colors.textSecondary }}>{String(settings.hour).padStart(2, '0')}:{String(settings.minute).padStart(2, '0')}</Text>
        </Pressable>
        {editingTime && settings.enabled ? <View pointerEvents={busy ? 'none' : 'auto'} style={{ flexDirection: 'row', gap: 12 }}>
          <NumberWheel options={Array.from({ length: 24 }, (_, n) => n)} value={settings.hour} onChange={(hour) => void change({ ...settings, hour })} />
          <NumberWheel options={Array.from({ length: 60 }, (_, n) => n)} value={settings.minute} onChange={(minute) => void change({ ...settings, minute })} />
        </View> : null}
      </View></MyProfileGroupCard></View>
    </View>
    {denied ? <><ProfileText error>{t('student.trainingReminderSettingsView.copy006')}</ProfileText><AppButton haptic="none" variant="link" label={t('student.trainingReminderSettingsView.copy007')} onPress={() => void Linking.openSettings().catch(() => setError(true))} /></> : null}
    {error ? <ProfileText error>{t('student.trainingReminderSettingsView.copy008')}</ProfileText> : null}
  </SettingsPage>;
}
