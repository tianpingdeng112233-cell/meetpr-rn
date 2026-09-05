import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useOnboardingProfile, type OnboardingProfile } from '@/api/domains/onboarding';
import { useReadiness } from '@/api/domains/readiness';
import { useSessionStore } from '@/api/session';
import { AppButton, Card, Screen, useColors } from '@/design';
import { t } from '@/i18n';
import { ReadinessSheet } from '@/features/training/ReadinessSheet';
import { gymDayText } from '@/features/training/policy';
import { AccountSecuritySection } from '@/features/account/AccountSecuritySection';
import { MyProfileAppearanceRow } from './MyProfileAppearanceRow';
import { MyProfileHeader } from './MyProfileHeader';
import { MyProfileOneRMCard, MyProfileRecoveryRow } from './MyProfileCards';
import { RestTimerSettingsScreen } from '@/features/settings/RestTimerSettingsScreen';
import { TrainingReminderSettingsScreen } from '@/features/settings/TrainingReminderSettingsScreen';
import { useRestPreference, useReminderPreference } from '@/features/settings/storage';
import { restSummary } from '@/features/settings/rest-timer';
import { reminderSummary } from '@/features/settings/training-reminder';
import { MyProfileDivider, MyProfileGroupCard, MyProfileSectionLabel, MyProfileValueRow, ProfileText } from './components';
import { injuryChips, profileRowValues, readinessSummary, recoverySummary, type ProfileSection } from './model';
import { ProfileEditor, profileTitles } from './ProfileEditor';
function PreferenceRows({ studentId, trainingDays }: { studentId: string; trainingDays?: readonly string[] | null }) {
  const [page, setPage] = useState<'rest' | 'reminder' | null>(null);
  const rest = useRestPreference(studentId);
  const reminder = useReminderPreference(studentId, trainingDays);
  return <>
    <MyProfileAppearanceRow /><MyProfileDivider />
    <MyProfileValueRow title={t('student.restTimerPreferenceRow.copy001')} value={rest.isError ? t('student.myProfileView.copy002') : restSummary(rest.data ?? { mode: 'automatic' })} onPress={() => { if (rest.isError) void rest.refetch(); else if (!rest.isPending) setPage('rest'); }} /><MyProfileDivider />
    <MyProfileValueRow title={t('student.trainingReminderPreferenceRow.copy001')} value={reminder.isError ? t('student.myProfileView.copy002') : reminderSummary(reminder.settings)} onPress={() => { if (reminder.isError) void reminder.refetch(); else if (!reminder.isPending) setPage('reminder'); }} />
    {page === 'rest' ? <RestTimerSettingsScreen studentId={studentId} initial={rest.data ?? { mode: 'automatic' }} onClose={() => setPage(null)} /> : null}
    {page === 'reminder' ? <TrainingReminderSettingsScreen studentId={studentId} initial={reminder.settings} onClose={() => setPage(null)} /> : null}
  </>;
}
function SignOut() {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  return <AppButton variant="danger" icon="logout" label={t('student.myProfileView.copy013')} disabled={busy} onPress={() => {
    setBusy(true); client.clear(); void useSessionStore.getState().logout().catch(() => undefined).finally(() => setBusy(false));
  }} />;
}
export function MyProfileFallbackRows({ studentId }: { studentId: string }) {
  return <><MyProfileSectionLabel>{t('student.myProfileView.copy006')}</MyProfileSectionLabel><MyProfileGroupCard><PreferenceRows studentId={studentId} /></MyProfileGroupCard><AccountSecuritySection studentId={studentId} /><SignOut /></>;
}
function LoadedProfile({ studentId, profile }: { studentId: string; profile: OnboardingProfile }) {
  const [edit, setEdit] = useState<ProfileSection | null>(null);
  const [showsReadiness, setShowsReadiness] = useState(false);
  const date = gymDayText();
  const readiness = useReadiness(studentId, date);
  const values = profileRowValues(profile);
  const row = (section: ProfileSection) => <MyProfileValueRow title={t(profileTitles[section])} value={values[section]} onPress={() => setEdit(section)} />;
  return <>
    <MyProfileOneRMCard profile={profile} />
    <MyProfileSectionLabel>{t('student.myProfileView.copy003')}</MyProfileSectionLabel>
    {/* iOS: one recovery card (today's readiness, falling back to the onboarding answers) opening the readiness sheet, then a separate injuries card. */}
    <MyProfileGroupCard><MyProfileRecoveryRow title={t('student.myProfileView.copy004')} chips={readiness.data?.checkin ? readinessSummary(readiness.data.checkin) : recoverySummary(profile)} onPress={() => setShowsReadiness(true)} /></MyProfileGroupCard>
    <MyProfileGroupCard><MyProfileRecoveryRow title={t(profileTitles.injuries)} chips={injuryChips(profile.injury_areas)} injury={!!profile.injury_areas?.length} onPress={() => setEdit('injuries')} /></MyProfileGroupCard>
    <MyProfileSectionLabel>{t('student.myProfileView.copy006')}</MyProfileSectionLabel><MyProfileGroupCard>{row('muscles')}<MyProfileDivider /><PreferenceRows studentId={studentId} trainingDays={profile.training_days} /><MyProfileDivider />{row('competition')}<MyProfileDivider />{row('basics')}</MyProfileGroupCard>
    <MyProfileSectionLabel>{t('student.myProfileView.copy010')}</MyProfileSectionLabel><MyProfileGroupCard>{row('background')}<MyProfileDivider />{row('environment')}</MyProfileGroupCard>
    <AccountSecuritySection studentId={studentId} /><SignOut />
    {edit ? <ProfileEditor section={edit} profile={profile} onClose={() => setEdit(null)} /> : null}
    {showsReadiness ? <ReadinessSheet studentId={studentId} date={date} onComplete={() => setShowsReadiness(false)} onSkip={() => setShowsReadiness(false)} /> : null}
  </>;
}
export function MyProfileScreen() {
  const studentId = useSessionStore((state) => state.user?.id ?? '');
  const profile = useOnboardingProfile(studentId);
  const colors = useColors();
  return <Screen edges={['top']}><ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 32 }} refreshControl={<RefreshControl tintColor={colors.gold500} refreshing={profile.isRefetching} onRefresh={() => void profile.refetch()} />}>
    <MyProfileHeader />
    {profile.data ? <LoadedProfile key={studentId} studentId={studentId} profile={profile.data} /> : <>
      {profile.isPending ? <View accessibilityLabel={t('student.myProfileView.copy024')} accessibilityState={{ busy: true }} style={{ gap: 14 }}><ActivityIndicator color={colors.gold500} />{[150, 90, 130].map((height, index) => <Card key={index} style={{ height, backgroundColor: colors.surfaceRaised }} />)}</View> : <Pressable accessibilityRole={profile.isError ? 'button' : undefined} onPress={profile.isError ? () => void profile.refetch() : undefined}><Card><ProfileText>{t(profile.isError ? 'student.myProfileView.copy002' : 'student.myProfileView.copy001')}</ProfileText></Card></Pressable>}
      <MyProfileFallbackRows key={studentId} studentId={studentId} />
    </>}
  </ScrollView></Screen>;
}
