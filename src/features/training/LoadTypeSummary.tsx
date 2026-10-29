import { Text, View } from 'react-native';
import type { PlanSet } from '@/api/domains/plans';
import { decodePrescription, intensityText, prescribed } from '@/domain/plan/prescription';
import { font, fontMetrics, radius, spacing, useColors } from '@/design';
import { t } from '@/i18n';

/** Keep mixed prescriptions separate; a badge never describes unrelated rows. */
export function LoadTypeSummary({ sets }: { sets: readonly PlanSet[] }) {
  const colors = useColors();
  if (!sets.some(set => ['free_weight', 'bodyweight'].includes(decodePrescription(set).loadMode ?? ''))) return null;
  const groups = new Map<string, { set: PlanSet; count: number }>();
  for (const set of sets) {
    const p = decodePrescription(set);
    const key = JSON.stringify([p, set.set_type]);
    const group = groups.get(key);
    if (group) group.count++;
    else groups.set(key, { set, count: 1 });
  }
  return <>{[...groups].map(([key, { set, count }]) => {
    const p = decodePrescription(set);
    if (p.loadMode !== 'free_weight' && p.loadMode !== 'bodyweight')
      return <Text key={key} style={{ ...font.body(fontMetrics.size13), color: colors.textSecondary }}>{`${prescribed(p)} · ${t('student.todayWorkoutScreen.copy019', [count])}`}</Text>;
    const bodyweight = p.loadMode === 'bodyweight';
    const reps = p.reps === 0 || set.set_type === 'amrap' ? t('loadTypes.failure') : p.repsMax == null ? p.reps : `${p.reps}–${p.repsMax}`;
    return <View key={key} style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs }}>
        <Text style={{ ...font.body(fontMetrics.size13), color: colors.textSecondary }}>{`${count} × ${reps}${p.intensity ? ` · ${t('loadTypes.target', [intensityText(p.intensity)])}` : ''}`}</Text>
        <Text style={{ ...font.body(fontMetrics.size12, 'semibold'), paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.inset, backgroundColor: bodyweight ? colors.surfaceRaised : colors.goldSoft, color: bodyweight ? colors.textSecondary : colors.goldText }}>{t(bodyweight ? 'loadTypes.bodyweight' : 'loadTypes.freeWeight')}</Text>
      </View>
      <Text style={{ ...font.body(fontMetrics.size13), color: colors.textSecondary }}>{t(bodyweight ? 'loadTypes.bodyweightHelp' : 'loadTypes.freeWeightHelp')}</Text>
    </View>;
  })}</>;
}
