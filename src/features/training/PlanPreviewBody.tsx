import { Text, View } from 'react-native';
import type { PlanDay } from '@/api/domains/plans';
import { font, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { summarizeExercise } from './exercise-summary';

/** Prescription-only surface: no editor, draft, camera or record callbacks. */
export function PlanPreviewBody({ day, title, exerciseName, unit }: {
  day: PlanDay; title: string; exerciseName: (id: string) => string; unit: 'kg' | 'lb';
}) {
  const colors = useColors();
  return <View style={{ gap: spacing.base }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
      <Text style={{ ...font.body(15, 'semibold'), color: colors.textPrimary, flexShrink: 1 }}>{t('training.allDay.summary', [title, day.exercises.length])}</Text>
      <Text style={{ ...font.body(12), color: colors.textMuted }}>{t('training.handoff.preview')}</Text>
    </View>
    {day.exercises.map(exercise => <View key={exercise.id} style={{ gap: spacing.sm, paddingVertical: spacing.sm }}>
      <Text style={{ ...font.body(15, 'bold'), color: colors.textPrimary }}>{exerciseName(exercise.exercise_id)}</Text>
      {summarizeExercise(exercise.sets, [], [], { unit, labels: { bodyweight: t('loadTypes.bodyweight'), freeWeight: t('training.allDay.freeWeight'), topSet: t('training.allDay.topSet'), unrecorded: t('training.allDay.unrecorded') } }).map((segment, index) =>
        <View key={index} style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Text style={{ ...font.body(13), color: colors.textSecondary, flex: 1 }}>{segment.setsReps}</Text>
          <Text style={{ ...font.body(13), color: colors.textSecondary, flex: 2 }}>{segment.loadParts.map(part => part.text).join('')}</Text>
          <Text style={{ ...font.body(13), color: colors.textSecondary, flex: 1 }}>{segment.effort}</Text>
        </View>)}
    </View>)}
  </View>;
}
