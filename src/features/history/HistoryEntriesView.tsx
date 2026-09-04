import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getLocale, t } from '@/i18n';
import { Card, useColors, radius, Screen, spacing, typography } from '@/design';
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
  const { colors, styles } = useStyles();
  const [query, setQuery] = useState('');
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
      { id: null, name: t('student.filter.allExercises') },
      ...[...exerciseNames].map(([id, name]) => ({ id, name })).sort((a, b) =>
        a.name.localeCompare(b.name, getLocale(), { numeric: true }),
      ),
    ];
  }, [weeks]);
  const filteredChoices = choices.filter(choice => !query.trim() || (choice.id !== null && choice.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
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
            accessibilityLabel={t('student.feedbackInboxView.copy005')}
            accessibilityRole="button"
            hitSlop={12}
            onPress={onClose}>
            <MaterialCommunityIcons color={colors.textPrimary} name="arrow-left" size={26} />
          </Pressable>
          <Text style={styles.title}>{t('student.trainingHistoryView.copy024')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.pickerLabel}>{t('student.filter.title')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('student.filter.accessibilityLabel %@', [selection.name])}
            onPress={() => { setQuery(''); setPickerOpen(true); }}
            style={({ pressed }) => [styles.picker, pressed && styles.pressed]}>
            <Text style={styles.pickerValue}>{selection.name}</Text>
            <MaterialCommunityIcons color={colors.textSecondary} name="chevron-down" size={22} />
          </Pressable>

          {weeks.map((week) => {
            const days = exerciseId
              ? week.days.filter(day => day.exercises.some(exercise => exercise.planExercise.exercise_id === exerciseId))
              : week.days;
            if (days.length === 0) return null;
            return (
              <View key={week.id} style={styles.week}>
                <Text style={styles.weekTitle}>{t('student.historyEntriesView.copy002', [week.weekNumber])}</Text>
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
              <Text style={styles.choiceTitle}>{t('student.filter.title')}</Text>
              <View style={styles.searchRow}>
                <TextInput autoFocus value={query} onChangeText={setQuery} placeholder={t('student.filter.searchPlaceholder')} accessibilityLabel={t('student.filter.searchPlaceholder')} placeholderTextColor={colors.textMuted} style={styles.searchInput} />
                {query ? <Pressable accessibilityRole="button" accessibilityLabel={t('student.filter.clearSearch')} onPress={() => setQuery('')}><MaterialCommunityIcons name="close-circle" size={24} color={colors.textMuted} /></Pressable> : null}
              </View>
              <ScrollView keyboardShouldPersistTaps="handled">
              {filteredChoices.length === 0 ? <Text style={styles.choiceText}>{t('student.filter.noMatch %@', [query])}</Text> : null}
              {filteredChoices.map((choice) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: choice.id === exerciseId }}
                  key={choice.id ?? 'all'}
                  onPress={() => {
                    setExerciseId(choice.id);
                    setPickerOpen(false);
                  }}
                  style={({ pressed }) => [styles.choiceRow, pressed && styles.pressed]}>
                  <Text style={styles.choiceText}>{choice.name}</Text>
                  {choice.id === exerciseId ? (
                    <MaterialCommunityIcons color={colors.gold500} name="check" size={22} />
                  ) : null}
                </Pressable>
              ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </Screen>
    </Modal>
  );
}

function HistoryDayCard({ day }: { day: HistoryDay }) {
  const { colors, styles } = useStyles();
  const complete = day.total > 0 && day.done === day.total;
  return (
    <Card style={styles.dayCard}>
      <View style={styles.dayHeader}>
        <View><Text style={styles.dayDate}>{chineseMonthDay(day.date)}</Text><Text style={styles.weekday}>{new Intl.DateTimeFormat(getLocale(), { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${day.date}T12:00:00Z`))}</Text></View>
        {!day.isRest ? (
          <Text style={[styles.dayProgress, { color: complete ? colors.success : colors.gold500 }]}>
            {t('student.historyEntriesView.copy004', [day.done, day.total])}</Text>
        ) : null}
      </View>
      {day.isRest ? (
        <Text style={styles.rest}>{t('student.historyEntriesView.copy003')}</Text>
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
  const { colors, styles } = useStyles();
  return (
    <View style={styles.exerciseBlock}>
      <Text style={styles.exerciseName}>{exercise.name}</Text>
      {exercise.notes.map((note) => (
        <View key={note} style={styles.notePill}>
          <MaterialCommunityIcons color={colors.gold500} name="message-text-outline" size={14} />
          <Text style={styles.noteText}>{t('student.todayWorkoutScreen.copy014')}{note}</Text>
        </View>
      ))}
      {exercise.plannedSets.map((set) => {
        const index = set.set_number - 1;
        const row = exercise.logs.find((log) => log.set_index === index);
        return (
          <View key={index} style={styles.setRow}>
            <Text style={styles.setLabel}>{t('student.historyEntriesView.copy001', [index + 1])}</Text>
            <Text style={[styles.setValue, { color: row?.completed ? colors.success : row ? colors.textSecondary : colors.textMuted }]}>
              {row
                ? `${formatKg(Number(row.weight_kg))} kg × ${row.reps}${row.rpe === null ? '' : ` @ RPE ${Number(row.rpe).toFixed(1)}`}`
                : `${set.intensity_mode === 'weight' ? `${formatKg(Number(set.target_value))} kg × ` : ''}${set.target_reps}${set.target_reps_max === null ? '' : `–${set.target_reps_max}`}${set.intensity_mode === 'rpe' ? ` @ RPE ${set.target_value}` : ''}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function useStyles() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return { colors, styles };
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchInput: { flex: 1, minHeight: 44, color: colors.textPrimary, ...typography.body },
  weekday: { color: colors.textSecondary, ...typography.caption },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  title: { color: colors.textPrimary, flex: 1, textAlign: 'center', ...typography.headline },
  headerSpacer: { width: 26 },
  content: { gap: spacing.base, padding: spacing.base, paddingBottom: spacing.xxl },
  pickerLabel: { color: colors.textSecondary, ...typography.footnote },
  picker: {
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderDefault,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.base,
  },
  pickerValue: { color: colors.textPrimary, ...typography.body },
  pressed: { opacity: 0.6 },
  week: { gap: spacing.md },
  weekTitle: { color: colors.textPrimary, marginTop: spacing.md, ...typography.headline },
  dayCard: { gap: spacing.md, padding: spacing.base },
  dayHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  dayDate: { color: colors.textPrimary, ...typography.bodyEmphasis },
  dayProgress: { ...typography.footnote, fontWeight: '600' },
  rest: { color: colors.textMuted, paddingVertical: spacing.sm, ...typography.body },
  exerciseBlock: { borderTopColor: colors.borderDefault, borderTopWidth: 1, gap: spacing.sm, paddingTop: spacing.md },
  exerciseName: { color: colors.textPrimary, ...typography.bodyEmphasis },
  notePill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.goldSoft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  noteText: { color: colors.textSecondary, flexShrink: 1, ...typography.caption },
  setRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 32 },
  setLabel: { color: colors.textSecondary, ...typography.footnote },
  setValue: { color: colors.textPrimary, fontVariant: ['tabular-nums'], ...typography.footnote },
  scrim: { backgroundColor: 'rgba(0,0,0,0.68)', flex: 1, justifyContent: 'flex-end' },
  choiceSheet: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '72%',
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.base,
  },
  choiceTitle: { color: colors.textPrimary, paddingVertical: spacing.base, ...typography.headline },
  choiceRow: {
    alignItems: 'center',
    borderTopColor: colors.borderDefault,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 50,
  },
  choiceText: { color: colors.textPrimary, ...typography.body },
});
