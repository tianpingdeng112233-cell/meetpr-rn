import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FeedbackPressable } from '@/design/FeedbackPressable';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useBodyWeights, useDeleteBodyWeight } from '@/api/domains/body-weights';
import { useOnboardingProfile } from '@/api/domains/onboarding';
import { useSessionStore } from '@/api/session';
import { AppButton, Card, Screen, font, spacing, useColors } from '@/design';
import { localDate } from '@/domain/coach/detail-week';
import { BodyWeightSheet } from './BodyWeightSheet';
import { getLocale, t } from '@/i18n';
import { BodyWeightChart } from './BodyWeightChart';
import { bodyWeightPresentation } from './body-weight-model';
import { GrowthRangeControl } from './GrowthRangeControl';
import { growthRangeLabel, type GrowthTimeRange } from './model';
import { ProgressLoadState } from './ProgressLoadState';
import { ProgressPageHeader } from './ProgressPageHeader';

export function BodyWeightScreen() {
  const colors = useColors();
  const router = useRouter();
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const weights = useBodyWeights(studentId);
  const profile = useOnboardingProfile(studentId);
  const remove = useDeleteBodyWeight(studentId);
  const [deleteError, setDeleteError] = useState(false);
  const deleteRecord = (date: string) => Alert.alert(t('student.bodyWeight.confirmDelete'), undefined, [
    { text: t('student.accountSecuritySheets.copy013'), style: 'cancel' },
    { text: t('student.bodyWeight.deleteAction'), style: 'destructive', onPress: async () => {
      setDeleteError(false);
      try { await remove.mutateAsync(date); } catch { setDeleteError(true); }
    } },
  ]);
  const [range, setRange] = useState<GrowthTimeRange>('30');
  const [editing, setEditing] = useState(false);
  const view = bodyWeightPresentation(weights.data?.records ?? [], range);
  return <Screen edges={['top', 'left', 'right']}>
    <ProgressPageHeader titleSize={22} title={t('student.dashboardProfileMetricsView.copy001')} onBack={() => router.back()} />
    <ScrollView contentContainerStyle={{ padding: spacing.pageHorizontal, paddingBottom: spacing.xxl, gap: spacing.space4 }}>
      {weights.isPending || weights.isError ? <ProgressLoadState failed={weights.isError} onRetry={() => void weights.refetch()} /> : <Card style={{ padding: spacing.space4, gap: spacing.space2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ ...font.mono(12), color: colors.textSecondary }}>{t('student.bodyWeight.latest')}</Text>
          <GrowthRangeControl name={t('student.dashboardProfileMetricsView.copy001')} range={range} onChange={setRange} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: spacing.space1 }}>
          <Text style={{ ...font.mono(32, 'bold'), color: colors.textPrimary }}>{view.current}</Text>
          <Text style={{ ...font.mono(15), color: colors.textMuted }}>kg</Text>
        </View>
        {view.delta ? <Text style={{ ...font.mono(13), color: colors.textSecondary }}>{`${growthRangeLabel(range)} ${view.delta} kg`}</Text> : null}
        {view.points.length ? <BodyWeightChart records={view.points} /> : null}
        {view.state !== 'chart' ? <Text style={{ ...font.body(13), color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.space3 }}>{view.state === 'range-empty'
          ? t('student.growthScreenPresentation.copy004').replace('{window}', growthRangeLabel(range))
          : t(view.state === 'empty' ? 'student.bodyWeight.empty' : 'student.bodyWeight.single')}</Text> : null}
      </Card>}
      <AppButton label={t(view.hasToday ? 'student.bodyWeight.update' : 'student.bodyWeight.log')} disabled={profile.isPending || profile.isError || remove.isPending} onPress={() => setEditing(true)} />
      {profile.isError ? <ProgressLoadState failed onRetry={() => void profile.refetch()} /> : null}
      <Text style={{ ...font.mono(12), color: colors.textSecondary }}>{t('student.bodyWeight.records')}</Text>
      {deleteError ? <Text accessibilityRole="alert" style={{ ...font.body(14), color: colors.danger }}>{t('student.myProfileViewModel.copy002')}</Text> : null}
      {view.records.length ? <Card style={{ paddingHorizontal: spacing.space4 }}>
        {view.records.map((record, index) => <View key={record.recorded_on} style={{ minHeight: 52, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.space2, borderBottomWidth: index < view.records.length - 1 ? 1 : 0, borderBottomColor: colors.borderSubtle }}>
          <Text style={{ flex: 1, ...font.body(14), color: colors.textPrimary }}>{new Intl.DateTimeFormat(getLocale(), { month: 'short', day: 'numeric', weekday: 'short' }).format(localDate(record.recorded_on))}</Text>
          <Text style={{ ...font.mono(14, 'semibold'), color: colors.textPrimary }}>{record.weight_kg} kg</Text>
          <FeedbackPressable accessibilityRole="button" accessibilityLabel={t('student.bodyWeight.delete', [new Intl.DateTimeFormat(getLocale(), { month: 'short', day: 'numeric', weekday: 'short' }).format(localDate(record.recorded_on))])} disabled={remove.isPending} onPress={() => deleteRecord(record.recorded_on)} style={{ minWidth: spacing.minimumHitTarget, minHeight: spacing.minimumHitTarget, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.textMuted} />
          </FeedbackPressable>
        </View>)}
      </Card> : null}
    </ScrollView>
    {editing ? <BodyWeightSheet studentId={studentId} onClose={() => setEditing(false)} /> : null}
  </Screen>;
}
