import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSessionStore } from '@/api/session';
import { useExerciseCatalog } from '@/api/domains/exercises';
import { useOnboardingProfile } from '@/api/domains/onboarding';
import { currentPlanSummary, usePlan, usePlanHandoff } from '@/api/domains/plans';
import { AppButton, Screen, font, radius, spacing, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import type { LiftFamily } from '@/domain/e1rm';
import { RPE_TABLE_COLUMNS, rpeTable } from '@/domain/e1rm/rpe-table';
import { metricDisplay, POUNDS_PER_KG } from '@/domain/measurement';
import { OUTLOOK_FAMILIES } from '@/domain/plan/cycle-outlook';
import { createExerciseMetadataResolver } from '@/features/training/exercise-metadata';
import { useCurrentE1RM } from '@/features/training/use-current-e1rm';
import { t } from '@/i18n';
import { ProgressPageHeader } from './ProgressPageHeader';

const CELL_WIDTH = 56;
const ROW_HEIGHT = 34;
export function RPETableScreen() {
  const colors = useColors();
  const router = useRouter();
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const catalog = useExerciseCatalog(Boolean(studentId));
  const profile = useOnboardingProfile(studentId);
  const handoff = usePlanHandoff(studentId);
  const summary = currentPlanSummary(handoff.data);
  const plan = usePlan(summary?.id ?? '');
  const resolve = useMemo(() => createExerciseMetadataResolver(catalog.data?.exercises, profile.data), [catalog.data, profile.data]);
  const ids = (catalog.data?.exercises ?? []).filter(exercise => resolve(exercise.id)?.competitionFamily).map(exercise => exercise.id);
  const estimates = useCurrentE1RM(studentId, ids, resolve);
  const [selection, setSelection] = useState<LiftFamily | '%' | null>(null);
  const counts = { squat: 0, bench: 0, deadlift: 0 };
  plan.data?.days.forEach(day => day.exercises.forEach(exercise => {
    const family = resolve(exercise.exercise_id)?.competitionFamily;
    if (family && exercise.sets.some(set => set.set_type !== 'warmup')) counts[family] += 1;
  }));
  const defaultFamily = OUTLOOK_FAMILIES.reduce((best, family) => counts[family] > counts[best] ? family : best, 'squat');
  const selected = selection ?? defaultFamily;
  const unit = profile.data?.unit_preference === 'lb' ? 'lb' : 'kg';
  const e1rm = selected === '%' ? null : estimates.data?.byFamily[selected] ?? null;
  const table = rpeTable(e1rm, unit);
  const headline = e1rm == null ? '100%' : unit === 'lb' ? metricDisplay(String(e1rm), POUNDS_PER_KG) : String(Math.round(e1rm * 10) / 10);
  const failed = catalog.isError || profile.isError || handoff.isError || Boolean(summary && plan.isError) || estimates.isError;
  const loading = catalog.isPending || profile.isPending || handoff.isPending || Boolean(summary && plan.isPending) || estimates.isPending;
  const retry = () => { void Promise.all([catalog.refetch(), profile.refetch(), handoff.refetch(), ...(summary ? [plan.refetch()] : []), estimates.refetch()]); };
  return <Screen edges={['top', 'left', 'right']}>
    <ProgressPageHeader title={t('rpeTable.title')} onBack={() => router.back()} />
    {failed ? <AppButton label={t('student.bindGateView.copy003')} onPress={retry} /> : loading ? <ActivityIndicator color={colors.gold500} /> :
      <ScrollView contentContainerStyle={{ padding: spacing.pageHorizontal, paddingBottom: spacing.xxl }}>
        <View style={{ flexDirection: 'row', backgroundColor: colors.bgStack, borderRadius: radius.control, padding: spacing.point2, marginBottom: spacing.sm }}>
          {([...OUTLOOK_FAMILIES, '%'] as const).map(family => <Pressable key={family} accessibilityRole="button" accessibilityState={{ selected: selected === family }} accessibilityLabel={family === '%' ? '%' : t(`rpeTable.${family}`)}
            onPress={() => setSelection(family)} style={{ flex: 1, minHeight: spacing.minimumHitTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radius.control, backgroundColor: selected === family ? colors.borderDefault : undefined }}>
            <Text style={{ ...font.body(13, selected === family ? 'semibold' : 'regular'), color: selected === family ? colors.textPrimary : colors.textMuted }}>{family === '%' ? '%' : t(`rpeTable.${family}`)}</Text>
          </Pressable>)}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: spacing.sm }}>
          <Text style={{ ...font.display(28), color: colors.textPrimary }}>{headline}</Text>
          <Text style={{ ...font.mono(12, 'semibold'), color: colors.textMuted }}>{e1rm == null ? '1RM' : `e1RM · ${unit}`}</Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <View testID="rpe-table-reps" style={{ width: 44 }}>
            {[t('rpeTable.reps'), ...table.map((_, index) => String(index + 1))].map((value, index) => <View key={index} style={{ height: ROW_HEIGHT, justifyContent: 'center', backgroundColor: index > 0 && index % 2 === 1 ? colors.bgStack : colors.bgBase }}><Text style={{ ...font.mono(12, 'semibold'), color: colors.textMuted }}>{value}</Text></View>)}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={{ flexDirection: 'row', height: ROW_HEIGHT }}>{RPE_TABLE_COLUMNS.map(rpe => <Text key={rpe} style={{ width: CELL_WIDTH, ...font.mono(12, 'semibold'), color: colors.textMuted, textAlign: 'center', textAlignVertical: 'center' }}>@{rpe}</Text>)}</View>
              {table.map((row, index) => <View key={index} style={{ flexDirection: 'row', height: ROW_HEIGHT, backgroundColor: index % 2 === 0 ? colors.bgStack : colors.bgBase }}>
                {row.map((value, column) => <Text key={column} style={{ width: CELL_WIDTH, ...font.mono(12), color: colors.textSecondary, textAlign: 'center', textAlignVertical: 'center' }}>{value}</Text>)}
              </View>)}
            </View>
          </ScrollView>
        </View>
      </ScrollView>}
  </Screen>;
}
