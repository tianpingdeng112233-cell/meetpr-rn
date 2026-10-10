import { useState } from 'react';
import { Text } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useOnboardingProfile } from '@/api/domains/onboarding';
import { useSessionStore } from '@/api/session';
import { AppButton, font, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { AccountSecuritySection } from '@/features/account/AccountSecuritySection';
import { RestTimerSettingsScreen } from '@/features/settings/RestTimerSettingsScreen';
import { TrainingReminderSettingsScreen } from '@/features/settings/TrainingReminderSettingsScreen';
import { useRestPreference, useReminderPreference } from '@/features/settings/storage';
import { restSummary } from '@/features/settings/rest-timer';
import { reminderSummary } from '@/features/settings/training-reminder';
import { MyProfileAppearanceRow } from './MyProfileAppearanceRow';
import { MyProfileDivider, MyProfileGroupCard } from './components';
import { ProfilePage, ProfilePageRow, ProfilePageStatus } from './ProfilePage';
function PreferenceRows({ studentId, trainingDays }: { studentId: string; trainingDays?: readonly string[] | null }) {
  const [page, setPage] = useState<'rest' | 'reminder' | null>(null);
  const rest = useRestPreference(studentId);
  const reminder = useReminderPreference(studentId, trainingDays);
  return <>
    <MyProfileAppearanceRow /><MyProfileDivider inset />
    <ProfilePageRow singleLine title={t('student.restTimerPreferenceRow.copy001')} value={rest.isError ? t('student.myProfileView.copy002') : restSummary(rest.data ?? { mode: 'automatic' })} onPress={() => { if (rest.isError) void rest.refetch(); else if (!rest.isPending) setPage('rest'); }} /><MyProfileDivider inset />
    <ProfilePageRow singleLine title={t('student.trainingReminderPreferenceRow.copy001')} value={reminder.isError ? t('student.myProfileView.copy002') : reminderSummary(reminder.settings)} onPress={() => { if (reminder.isError) void reminder.refetch(); else if (!reminder.isPending) setPage('reminder'); }} />
    {page === 'rest' ? <RestTimerSettingsScreen studentId={studentId} initial={rest.data ?? { mode: 'automatic' }} onClose={() => setPage(null)} /> : null}
    {page === 'reminder' ? <TrainingReminderSettingsScreen studentId={studentId} initial={reminder.settings} onClose={() => setPage(null)} /> : null}
  </>;
}
function SignOut() {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  return <AppButton variant="secondary" icon="logout" label={t('student.myProfileView.copy013')} disabled={busy} onPress={() => {
    setBusy(true); client.clear(); void useSessionStore.getState().logout().catch(() => undefined).finally(() => setBusy(false));
  }} />;
}
export function ProfileSettingsScreen() {
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const profile = useOnboardingProfile(studentId);
  const colors = useColors();
  const labelStyle = { ...font.body(13), color: colors.textMuted, marginLeft: spacing.xs, marginBottom: -spacing.sm };
  return <ProfilePage title={t('student.rn.profile.settings')}>
    <Text style={labelStyle}>{t('student.rn.profile.preferences')}</Text>
    <MyProfileGroupCard><PreferenceRows key={studentId} studentId={studentId} trainingDays={profile.data?.training_days} /></MyProfileGroupCard>
    <Text style={labelStyle}>{t('student.rn.profile.account')}</Text>
    <AccountSecuritySection studentId={studentId} />
    {profile.isError ? <ProfilePageStatus pending={false} failed retry={() => void profile.refetch()} /> : null}
    <SignOut />
  </ProfilePage>;
}
