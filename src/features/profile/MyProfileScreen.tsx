import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useOnboardingProfile, type OnboardingProfile } from '@/api/domains/onboarding';
import { useReadiness } from '@/api/domains/readiness';
import { useSessionStore } from '@/api/session';
import { AppButton, Card, font, IconButton, LargeTitleBar, Screen, useColors } from '@/design';
import { t } from '@/i18n';
import { ReadinessSheet } from '@/features/training/ReadinessSheet';
import { gymDayText } from '@/features/training/policy';
import { AccountSecuritySection } from '@/features/account/AccountSecuritySection';
import { AppearancePreferenceRow } from '@/features/settings/AppearancePreferenceRow';
import { RestTimerSettingsScreen } from '@/features/settings/RestTimerSettingsScreen';
import { TrainingReminderSettingsScreen } from '@/features/settings/TrainingReminderSettingsScreen';
import { useRestPreference, useReminderPreference } from '@/features/settings/storage';
import { restSummary } from '@/features/settings/rest-timer';
import { reminderSummary } from '@/features/settings/training-reminder';
import { MyProfileDivider, MyProfileGroupCard, MyProfileSectionLabel, MyProfileValueRow, ProfileText } from './components';
import { oneRMValues, profileRowValues, readinessSummary, recoverySummary, rowValue, type ProfileSection } from './model';
import { ProfileEditor, profileTitles } from './ProfileEditor';
function PreferenceRows({ studentId, trainingDays }: { studentId: string; trainingDays?: readonly string[] | null }) {
  const [page, setPage] = useState<'rest' | 'reminder' | null>(null);
  const rest = useRestPreference(studentId);
  const reminder = useReminderPreference(studentId, trainingDays);
  return <>
    <AppearancePreferenceRow /><MyProfileDivider />
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
function MyProfileOneRMCard({ profile }: { profile: OnboardingProfile }) {
  const colors = useColors(); const values = oneRMValues(profile);
  return <Card style={{ gap: 14 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><MaterialCommunityIcons name="lock-outline" size={18} color={colors.gold500} /><Text style={{ flex: 1, ...font.body(16, 'semibold'), color: colors.textPrimary }}>{t('student.myProfileView.copy018')}</Text><IconButton accessibilityLabel={t('student.myProfileView.copy019')} icon={(props) => <MaterialCommunityIcons {...props} name="information-outline" />} onPress={() => Alert.alert(t('student.myProfileView.copy019'), t('student.myProfileView.copy020'))} /></View>
    <View style={{ flexDirection: 'row', gap: 8 }}>{(['coach.planning.lift.squat', 'coach.planning.lift.benchPress', 'coach.planning.lift.deadlift'] as const).map((key, index) => <View key={key} style={{ flex: 1, gap: 6 }}><Text style={{ ...font.body(11), color: colors.textMuted }}>{t(key)}</Text><Text adjustsFontSizeToFit numberOfLines={1} style={{ ...font.mono(30, 'bold'), color: colors.textPrimary }}>{values.lifts[index]}</Text></View>)}</View>
    <MyProfileDivider /><ProfileText>{t('student.myProfileView.copy021')} · {values.total}{values.total === '—' ? '' : ' kg'}</ProfileText>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><MaterialCommunityIcons name="lock-outline" size={14} color={colors.textMuted} /><View style={{ flex: 1 }}><ProfileText>{t('student.myProfileView.copy022')}</ProfileText></View></View>
  </Card>;
}
function LoadedProfile({ studentId, profile }: { studentId: string; profile: OnboardingProfile }) {
  const [edit, setEdit] = useState<ProfileSection | null>(null);
  const [showsReadiness, setShowsReadiness] = useState(false);
  const date = gymDayText();
  const readiness = useReadiness(studentId, date);
  const colors = useColors();
  const values = profileRowValues(profile);
  const row = (section: ProfileSection) => <MyProfileValueRow title={t(profileTitles[section])} value={values[section]} onPress={() => setEdit(section)} />;
  return <>
    <MyProfileOneRMCard profile={profile} />
    <Pressable accessibilityRole="button" accessibilityLabel={t('student.myProfileView.copy004')} onPress={() => setShowsReadiness(true)}><Card style={{ gap: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><MaterialCommunityIcons name="heart-pulse" color={colors.success} size={22} /><View style={{ flex: 1 }}><ProfileText>{t('student.myProfileView.copy004')}</ProfileText></View><Text style={{ ...font.body(11, 'semibold'), color: colors.goldText, backgroundColor: colors.goldSoft, borderRadius: 10, padding: 8 }}>{t('student.myProfileView.copy023')}</Text></View><ProfileText>{rowValue(readiness.data?.checkin ? readinessSummary(readiness.data.checkin) : recoverySummary(profile))}</ProfileText></Card></Pressable>
    <MyProfileSectionLabel>{t('student.myProfileView.copy003')}</MyProfileSectionLabel><MyProfileGroupCard>{row('recovery')}<MyProfileDivider />{row('injuries')}</MyProfileGroupCard>
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
    <View style={{ flexDirection: 'row', alignItems: 'center' }}><LargeTitleBar style={{ flex: 1, paddingHorizontal: 0 }} title={t('student.myProfileView.copy016')} eyebrow={t('student.myProfileView.copy017')} /><IconButton accessibilityLabel={t('student.myProfileView.copy015')} disabled icon={(props) => <MaterialCommunityIcons {...props} name="chat-outline" />} /></View>
    {profile.data ? <LoadedProfile key={studentId} studentId={studentId} profile={profile.data} /> : <>
      {profile.isPending ? <View accessibilityLabel={t('student.myProfileView.copy024')} accessibilityState={{ busy: true }} style={{ gap: 14 }}><ActivityIndicator color={colors.gold500} />{[150, 90, 130].map((height, index) => <Card key={index} style={{ height, backgroundColor: colors.surfaceRaised }} />)}</View> : <Pressable accessibilityRole={profile.isError ? 'button' : undefined} onPress={profile.isError ? () => void profile.refetch() : undefined}><Card><ProfileText>{t(profile.isError ? 'student.myProfileView.copy002' : 'student.myProfileView.copy001')}</ProfileText></Card></Pressable>}
      <MyProfileFallbackRows key={studentId} studentId={studentId} />
    </>}
  </ScrollView></Screen>;
}
