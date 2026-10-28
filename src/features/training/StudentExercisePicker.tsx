import { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { useExerciseCatalog } from '@/api/domains/exercises';
import { AppButton, Card, font, fontMetrics, radius, Screen, spacing, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { exerciseDisplayName, t } from '@/i18n';
import { exerciseTags, filterStudentExercises, studentExerciseTagRows, type StudentExerciseTag } from './exercise-picker';

export function StudentExercisePicker({ planned, added, onSelect, onClose }: {
  planned: readonly string[]; added: readonly string[]; onSelect: (exerciseId: string) => void; onClose: () => void;
}) {
  const colors = useColors();
  const catalog = useExerciseCatalog();
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState<StudentExerciseTag>('all');
  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={{ padding: spacing.md, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, ...font.display(fontMetrics.size22), color: colors.textPrimary }}>{t('student.added.addExercise')}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t('coach.planning.common.close')} onPress={onClose} style={{ minWidth: spacing.minimumHitTarget, minHeight: spacing.minimumHitTarget, alignItems: 'center', justifyContent: 'center' }}><Text style={{ ...font.body(fontMetrics.size22), color: colors.textPrimary }}>×</Text></Pressable>
        </View>
        <TextInput value={search} onChangeText={setSearch} placeholder={t('student.added.search')} accessibilityLabel={t('student.added.search')} placeholderTextColor={colors.textMuted}
          style={{ minHeight: spacing.minimumHitTarget, padding: spacing.sm, borderWidth: spacing.point1, borderColor: colors.borderStrong, borderRadius: radius.control, color: colors.textPrimary, ...font.body(fontMetrics.size15) }} />
        {studentExerciseTagRows.map((row, index) => <View key={index} testID={`exercise-tag-row-${index}`} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {row.map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: tag === value }} onPress={() => setTag(value)}
            style={{ minHeight: spacing.point40, paddingHorizontal: spacing.sm, justifyContent: 'center', borderRadius: radius.pill, borderWidth: spacing.point1, borderColor: colors.borderStrong, backgroundColor: tag === value ? colors.textPrimary : colors.surfaceCard }}>
            <Text style={{ ...font.body(fontMetrics.size13), color: tag === value ? colors.surfaceCard : colors.textPrimary }}>{t(`student.added.tag.${value}`)}</Text>
          </Pressable>)}
        </View>)}
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}>
        {catalog.isLoading ? <ActivityIndicator /> : null}
        {catalog.isError ? <AppButton label={t('student.bindGateView.copy003')} onPress={() => void catalog.refetch()} /> : null}
        {filterStudentExercises(catalog.data?.exercises ?? [], tag, search).map(exercise => {
          const disabled = planned.includes(exercise.id) || added.includes(exercise.id);
          const type = exercise.exercise_type === 'accessory' ? t('student.accessory.accessory') : t('student.accessory.mainLifts');
          return <Pressable key={exercise.id} accessibilityRole="button" accessibilityLabel={exerciseDisplayName(exercise)} disabled={disabled} accessibilityState={{ disabled }} onPress={() => onSelect(exercise.id)}>
            <Card style={{ gap: spacing.xs }}><Text style={{ ...font.body(fontMetrics.size15, 'bold'), color: disabled ? colors.textMuted : colors.textPrimary }}>{exerciseDisplayName(exercise)}</Text>
              <Text style={{ ...font.body(fontMetrics.size12), color: colors.textMuted }}>{planned.includes(exercise.id) ? t('student.added.inPlan') : added.includes(exercise.id) ? t('student.added.alreadyAdded') : [type, ...exerciseTags(exercise).filter(value => !['all', 'squat', 'bench', 'deadlift'].includes(value)).map(value => t(`student.added.tag.${value}`))].join(' · ')}</Text>
            </Card>
          </Pressable>;
        })}
      </ScrollView>
    </Screen>
  </Modal>;
}
