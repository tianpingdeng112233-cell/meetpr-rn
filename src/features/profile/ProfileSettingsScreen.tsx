import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import * as Application from 'expo-application';
import { FeedbackPressable } from '@/design/FeedbackPressable';
import { useDailyWeight } from '@/features/settings/daily-weight';
import { PendingSetsSignOut } from '@/features/training/set-sync/PendingSetsSignOut';
import { useOnboardingProfile } from '@/api/domains/onboarding';
import { useSessionStore } from '@/api/session';
import { font, GradientFill, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { AccountSecuritySection } from '@/features/account/AccountSecuritySection';
import { TrainingReminderSettingsScreen } from '@/features/settings/TrainingReminderSettingsScreen';
import { useReminderPreference } from '@/features/settings/storage';
import { reminderSummary } from '@/features/settings/training-reminder';
import { MyProfileAppearanceRow } from './MyProfileAppearanceRow';
import { MyProfileDivider, MyProfileGroupCard } from './components';
import { ProfilePage, ProfilePageRow, ProfilePageStatus } from './ProfilePage';
function PreferenceRows({ studentId, trainingDays }: { studentId: string; trainingDays?: readonly string[] | null }) {
  const [page, setPage] = useState<'reminder' | null>(null);
  const weight = useDailyWeight(studentId);
  const colors = useColors();
  const reminder = useReminderPreference(studentId, trainingDays);
  return <>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
      <View style={{ flex: 1, gap: 4 }}><Text style={{ ...font.body(15), color: colors.textPrimary }}>{t('student.weightStrip.setting')}</Text><Text style={{ ...font.body(12), color: colors.textSecondary }}>{t('student.weightStrip.settingDetail')}</Text></View>
      <FeedbackPressable accessibilityRole="switch" accessibilityLabel={t('student.weightStrip.setting')} accessibilityState={{ checked: weight.data === true, disabled: weight.isPending || weight.save.isPending }} disabled={weight.isPending || weight.save.isPending} onPress={() => weight.save.mutate(weight.data !== true)} style={{ minWidth: 52, minHeight: 44, justifyContent: 'center' }}>
        <View style={{ width: 50, height: 30, borderRadius: 15, overflow: 'hidden', backgroundColor: colors.borderStrong, padding: 3, alignItems: weight.data ? 'flex-end' : 'flex-start' }}>
          {weight.data ? <GradientFill direction="horizontal" stops={[{ color: colors.gold400, offset: 0 }, { color: colors.gold500, offset: 1 }]} /> : null}
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.ctaTopHighlight }} />
        </View>
      </FeedbackPressable>
    </View>
    {weight.isError || weight.save.isError ? <Text accessibilityRole="alert" style={{ ...font.body(13), color: colors.danger }}>{t('student.myProfileViewModel.copy002')}</Text> : null}
    <MyProfileDivider inset />
    <MyProfileAppearanceRow /><MyProfileDivider inset />
    <ProfilePageRow singleLine title={t('student.trainingReminderPreferenceRow.copy001')} value={reminder.isError ? t('student.myProfileView.copy002') : reminderSummary(reminder.settings)} onPress={() => { if (reminder.isError) void reminder.refetch(); else if (!reminder.isPending) setPage('reminder'); }} />
    {page === 'reminder' ? <TrainingReminderSettingsScreen studentId={studentId} initial={reminder.settings} onClose={() => setPage(null)} /> : null}
  </>;
}
export function ProfileSettingsScreen() {
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const profile = useOnboardingProfile(studentId);
  const colors = useColors();
  const version = Platform.OS === 'android' && Application.nativeApplicationVersion && Application.nativeBuildVersion
    ? t('settings.version', [Application.nativeApplicationVersion, Application.nativeBuildVersion]) : null;
  const labelStyle = { ...font.body(13), color: colors.textMuted, marginLeft: spacing.xs, marginBottom: -spacing.sm };
  return <ProfilePage title={t('student.rn.profile.settings')}>
    <Text style={labelStyle}>{t('student.studentRootView.copy002')}</Text>
    <MyProfileGroupCard><PreferenceRows key={studentId} studentId={studentId} trainingDays={profile.data?.training_days} /></MyProfileGroupCard>
    <Text style={labelStyle}>{t('student.rn.profile.account')}</Text>
    <AccountSecuritySection studentId={studentId} />
    {profile.isError ? <ProfilePageStatus pending={false} failed retry={() => void profile.refetch()} /> : null}
    <PendingSetsSignOut />
    {version ? <Text style={{ ...font.body(12), color: colors.textMuted, textAlign: 'center' }}>{version}</Text> : null}
  </ProfilePage>;
}
