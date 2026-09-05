import { View } from 'react-native';
import { Card, spacing, useColors } from '@/design';
import type { CoachApplication } from '@/api/domains/coach';
import { t } from '@/i18n';
import { oneRMTrio, waitingText } from '@/domain/coach/formatting';
import { useCoachNow } from '../CoachNowProvider';
import { Action, Copy, rowStyle } from '../ui';
import { basicInfo, trainingYearsText } from './onboarding-display';
export function CoachApplicationCard({ item, onAccept, onProfile, onReject, busy }: { item: CoachApplication; onAccept(): void; onProfile(): void; onReject(): void; busy: boolean }) {
  const now = useCoachNow();
  const colors = useColors();
  const profile = item.onboarding;
  const summary = profile ? [basicInfo(profile, now), profile.training_years == null ? null : trainingYearsText(profile.training_years)].filter(Boolean).join(' · ') : '';
  return <Card style={{ borderWidth: 1, borderColor: colors.coachRequestBorder, padding: spacing.space4 }}>
    <View style={[rowStyle, { justifyContent: 'space-between', gap: spacing.space2 }]}><Copy display size={18} lines={1} style={{ flex: 1 }}>{item.displayName}</Copy><Copy size={11} tone="textTertiary">{waitingText(item.submittedAt, now)}</Copy></View>
    {summary ? <Copy size={13} tone="textSecondary" style={{ marginTop: spacing.point5 }}>{summary}</Copy> : null}
    <View style={[rowStyle, { marginTop: spacing.point7, gap: spacing.space1, flexWrap: 'wrap' }]}><Copy mono size={14} weight="bold" style={{ letterSpacing: 0.28 }}>{oneRMTrio(profile?.squat_1rm_kg, profile?.bench_1rm_kg, profile?.deadlift_1rm_kg)}</Copy><Copy mono size={12}>(kg)</Copy></View>
    <View style={[rowStyle, { gap: spacing.space2, marginTop: spacing.point13 }]}><Action label={t('coach.roster.accept')} filled onPress={onAccept} disabled={busy} style={{ flex: 1 }} /><Action label={t('coach.roster.viewProfile')} onPress={onProfile} style={{ flex: 1 }} /><Action label={t('coach.roster.reject')} icon="close" onPress={onReject} disabled={busy} style={{ width: spacing.size46, paddingHorizontal: 0, borderColor: colors.borderDefault }} /></View>
  </Card>;
}
