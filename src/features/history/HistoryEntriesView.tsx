import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Card, colors, radius, Screen, spacing, typography } from '@/design';
import { chineseMonthDay, formatKg } from '@/features/dashboard/model';

import type { HistoryDay, HistoryExercise, HistoryWeek } from './types';

type ExerciseChoice = { id: string | null; name: string };

export function HistoryEntriesView({
  visible,
  weeks,
  onClose,
}: {
  visible: boolean;
  weeks: HistoryWeek[];
  onClose: () => void;
}) {
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const choices = useMemo<ExerciseChoice[]>(() => {
    const exerciseNames = new Map<string, string>();
    for (const week of weeks) {
      for (const day of week.days) {
        for (const exercise of day.exercises) {
          exerciseNames.set(exercise.planExercise.exercise_id, exercise.name);
        }
      }
    }
    return [
      { id: null, name: '全部动作' },
      ...[...exerciseNames].map(([id, name]) => ({ id, name })).sort((a, b) =>
        a.name.localeCompare(b.name, 'zh-CN'),
      ),
    ];
  }, [weeks]);
  const selection = choices.find((choice) => choice.id === exerciseId) ?? choices[0];

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={visible}>
      <Screen edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="返回"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onClose}>
            <MaterialCommunityIcons color={colors.fgPrimary} name="arrow-left" size={26} />
          </Pressable>
          <Text style={styles.title}>训练历史</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.pickerLabel}>按动作筛选</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [styles.picker, pressed && styles.pressed]}>
            <Text style={styles.pickerValue}>{selection.name}</Text>
            <MaterialCommunityIcons color={colors.fgSecondary} name="chevron-down" size={22} />
          </Pressable>

          {weeks.map((week) => {
            const days = exerciseId
              ? week.days
                  .map((day) => filterDay(day, exerciseId))
                  .filter((day) => day.exercises.length > 0)
              : week.days;
            if (days.length === 0) return null;
            return (
              <View key={week.id} style={styles.week}>
                <Text style={styles.weekTitle}>第 {week.weekNumber} 周</Text>
                {days.map((day) => (
                  <HistoryDayCard day={day} key={`${week.id}:${day.date}`} />
                ))}
              </View>
            );
          })}
        </ScrollView>

        <Modal
          animationType="fade"
          onRequestClose={() => setPickerOpen(false)}
          transparent
          visible={pickerOpen}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPickerOpen(false)}
            style={styles.scrim}>
            <Pressable onPress={(event) => event.stopPropagation()} style={styles.choiceSheet}>
              <Text style={styles.choiceTitle}>按动作筛选</Text>
              {choices.map((choice) => (
                <Pressable
                  accessibilityRole="button"
                  key={choice.id ?? 'all'}
                  onPress={() => {
                    setExerciseId(choice.id);
                    setPickerOpen(false);
                  }}
                  style={({ pressed }) => [styles.choiceRow, pressed && styles.pressed]}>
                  <Text style={styles.choiceText}>{choice.name}</Text>
                  {choice.id === exerciseId ? (
                    <MaterialCommunityIcons color={colors.brandRed} name="check" size={22} />
                  ) : null}
                </Pressable>
              ))}
            </Pressable>
          </Pressable>
        </Modal>
      </Screen>
    </Modal>
  );
}

function filterDay(day: HistoryDay, exerciseId: string): HistoryDay {
  const exercises = day.exercises.filter(
    (exercise) => exercise.planExercise.exercise_id === exerciseId,
  );
  return {
    ...day,
    exercises,
    isRest: exercises.length === 0,
    total: exercises.reduce((sum, exercise) => sum + exercise.plannedSets.length, 0),
    done: exercises.reduce(
      (sum, exercise) =>
        sum + exercise.logs.filter((log) => log.completed && !log.assumed).length,
      0,
    ),
  };
}

function HistoryDayCard({ day }: { day: HistoryDay }) {
  const complete = day.total > 0 && day.done >= day.total;
  return (
    <Card style={styles.dayCard}>
      <View style={styles.dayHeader}>
        <Text style={styles.dayDate}>{chineseMonthDay(day.date)}</Text>
        {!day.isRest ? (
          <Text style={[styles.dayProgress, { color: complete ? colors.green : colors.amber }]}>
            {day.done}/{day.total} 组
          </Text>
        ) : null}
      </View>
      {day.isRest ? (
        <Text style={styles.rest}>休息日</Text>
      ) : (
        day.exercises.map((exercise) => (
          <HistoryExerciseBlock
            exercise={exercise}
            key={exercise.planExercise.id}
          />
        ))
      )}
    </Card>
  );
}

function HistoryExerciseBlock({ exercise }: { exercise: HistoryExercise }) {
  const count = Math.max(exercise.plannedSets.length, exercise.logs.length);
  return (
    <View style={styles.exerciseBlock}>
      <Text style={styles.exerciseName}>{exercise.name}</Text>
      {exercise.notes.map((note) => (
        <View key={note} style={styles.notePill}>
          <MaterialCommunityIcons color={colors.brandRed} name="message-text-outline" size={14} />
          <Text style={styles.noteText}>教练备注 · {note}</Text>
        </View>
      ))}
      {Array.from({ length: count }, (_, index) => {
        const row = exercise.logs.find((log) => log.set_index === index);
        return (
          <View key={index} style={styles.setRow}>
            <Text style={styles.setLabel}>第 {index + 1} 组</Text>
            <Text style={styles.setValue}>
              {row
                ? `${formatKg(Number(row.weight_kg))} kg × ${row.reps}${row.rpe === null ? '' : ` · RPE ${Number(row.rpe).toFixed(1)}`}`
                : '未记录'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  title: { color: colors.fgPrimary, flex: 1, textAlign: 'center', ...typography.headline },
  headerSpacer: { width: 26 },
  content: { gap: spacing.base, padding: spacing.base, paddingBottom: spacing.xxl },
  pickerLabel: { color: colors.fgSecondary, ...typography.footnote },
  picker: {
    alignItems: 'center',
    backgroundColor: colors.surface1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.base,
  },
  pickerValue: { color: colors.fgPrimary, ...typography.body },
  pressed: { opacity: 0.6 },
  week: { gap: spacing.md },
  weekTitle: { color: colors.fgPrimary, marginTop: spacing.md, ...typography.headline },
  dayCard: { gap: spacing.md, padding: spacing.base },
  dayHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  dayDate: { color: colors.fgPrimary, ...typography.bodyEmphasis },
  dayProgress: { ...typography.footnote, fontWeight: '600' },
  rest: { color: colors.fgTertiary, paddingVertical: spacing.sm, ...typography.body },
  exerciseBlock: { borderTopColor: colors.border, borderTopWidth: 1, gap: spacing.sm, paddingTop: spacing.md },
  exerciseName: { color: colors.fgPrimary, ...typography.bodyEmphasis },
  notePill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.brandRedSoft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  noteText: { color: colors.fgSecondary, flexShrink: 1, ...typography.caption },
  setRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 32 },
  setLabel: { color: colors.fgSecondary, ...typography.footnote },
  setValue: { color: colors.fgPrimary, fontVariant: ['tabular-nums'], ...typography.footnote },
  scrim: { backgroundColor: 'rgba(0,0,0,0.68)', flex: 1, justifyContent: 'flex-end' },
  choiceSheet: {
    backgroundColor: colors.surface1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '72%',
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.base,
  },
  choiceTitle: { color: colors.fgPrimary, paddingVertical: spacing.base, ...typography.headline },
  choiceRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 50,
  },
  choiceText: { color: colors.fgPrimary, ...typography.body },
});
