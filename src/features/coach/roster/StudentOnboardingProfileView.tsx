import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card, Screen, spacing, useColors } from '@/design';
import { onboardingRepository, type OnboardingProfile } from '@/api/domains/onboarding';
import type { CoachApplication } from '@/api/domains/coach';
import { t, type TranslationKey } from '@/i18n';
import { oneRMTrio, waitingText } from '@/domain/coach/formatting';
import { useCoachNow } from '../CoachNowProvider';
import { useCoachData } from '../CoachDataProvider';
import { Action, Copy, rowStyle } from '../ui';
import { basicInfo, trainingYearsText, vocabulary } from './onboarding-display';
import { useApplicationActions } from './use-application-actions';
import { CoachNavHeader } from '../CoachNavHeader';
import { AcceptBindRequestSheet } from './AcceptBindRequestSheet';
export function StudentOnboardingProfileView() {
  const params = useLocalSearchParams<{ requestId: string; studentId?: string; displayName?: string; submittedAt?: string }>();
  const data = useCoachData();
  const now = useCoachNow();
  const colors = useColors();
  const router = useRouter();
  // Retain the route's application identity even when a 4xx refresh removes the item.
  const [retained] = useState(() => data.applications.find(item => item.id === params.requestId));
  const item: CoachApplication = retained ?? data.applications.find(item => item.id === params.requestId) ?? { id: params.requestId, studentId: params.studentId ?? '', displayName: params.displayName ?? t('coach.applicationProfile.notProvided'), submittedAt: params.submittedAt ? new Date(params.submittedAt) : now, expiredAt: now, onboarding: null };
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const actions = useApplicationActions(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(coach)/(tabs)/students');
  });
  useEffect(() => {
    let active = true;
    void onboardingRepository.get(item.studentId).then(value => { if (active) setProfile(value); }, () => { if (active) setProfile(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [item.studentId]);
  const join = (values: (string | null | undefined)[]) => values.filter(Boolean).join(' · ');
  const sections: { key: TranslationKey; value: string; mono?: boolean }[] = profile ? [
    { key: 'coach.applicationProfile.basicInfo', value: basicInfo(profile, now, true) },
    { key: 'coach.applicationProfile.selfReportedOneRM', value: `${oneRMTrio(profile.squat_1rm_kg, profile.bench_1rm_kg, profile.deadlift_1rm_kg)} (kg)`, mono: true },
    { key: 'coach.applicationProfile.trainingHistory', value: join([profile.training_years == null ? null : trainingYearsText(profile.training_years), profile.training_days?.length ? t('coach.applicationProfile.weeklyFrequency %lld', [profile.training_days.length]) : null]) },
    { key: 'coach.applicationProfile.trainingEnvironment', value: join([profile.gym_tier ? vocabulary('gym', profile.gym_tier) : null, ...(profile.equipment_overrides ?? []).map(value => vocabulary('equipment', value))]) },
    { key: 'coach.applicationProfile.targetMeet', value: profile.is_competing ? join([profile.competition_date, profile.target_weight_class]) : '' },
    { key: 'coach.applicationProfile.focus', value: [...new Set(profile.muscle_groups_to_strengthen ?? [])].map(value => vocabulary('muscle', value)).join(' · ') },
    { key: 'coach.applicationProfile.injuryHistory', value: join([...(profile.injury_areas ?? []).map(value => vocabulary('injury', value)), profile.injury_notes]) },
    { key: profile.gender === 'male' ? 'coach.applicationProfile.heSaid' : profile.gender === 'female' ? 'coach.applicationProfile.sheSaid' : 'coach.applicationProfile.theySaid', value: profile.note_to_coach ? `「${profile.note_to_coach}」` : '' },
  ] : [];
  const actionRow = <View style={[rowStyle, { gap: spacing.point9 }]}><Action testID="coach.applicationProfile.accept" label={t('coach.applicationProfile.accept')} haptic="light" filled onPress={() => actions.openAccept(item)} disabled={actions.busy} style={{ flex: 1 }} /><Action testID="coach.applicationProfile.ignore" haptic="warning" label={t('coach.applicationProfile.ignore')} onPress={() => actions.reject(item)} disabled={actions.busy} /></View>;
  return <Screen><CoachNavHeader title={t('coach.applicationProfile.title', [item.displayName])} subtitle={waitingText(item.submittedAt, now)} onBack={() => router.back()} />
    {loading ? <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.gold500} /></View> : profile ? <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.point18, paddingTop: spacing.space4, paddingBottom: spacing.point26, gap: spacing.space3 }}><Card style={{ padding: 0 }}>{sections.map(section => <View key={section.key} style={{ paddingHorizontal: spacing.space4, paddingVertical: spacing.point13, gap: spacing.space1, borderTopWidth: 1, borderColor: colors.borderHairline }}><Copy size={11} tone="textTertiary">{t(section.key)}</Copy><Copy size={15} weight={section.mono ? 'bold' : 'semibold'} mono={section.mono} style={{ lineHeight: 22 }}>{section.value || t('coach.applicationProfile.notProvided')}</Copy></View>)}</Card>{actionRow}</ScrollView> : <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing.point18, gap: spacing.point10 }}><Copy size={15} weight="semibold" style={{ textAlign: 'center' }}>{t('coach.applicationProfile.unavailable')}</Copy><Copy size={12} tone="textDisabled" style={{ textAlign: 'center' }}>{t('coach.applicationProfile.unavailableSubtitle')}</Copy>{actionRow}</View>}
    <AcceptBindRequestSheet item={actions.acceptTarget} busy={actions.busy} onClose={actions.closeAccept} onConfirm={() => void actions.confirmAccept()} />
  </Screen>;
}
