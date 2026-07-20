import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SetLog } from '@/api/domains/sets';
import { AppButton, Card, colors, radius, spacing, typography } from '@/design';

import { isDraftTerminal } from './drafts';
import type { WorkoutSetDraft } from './model';
import {
  exerciseTitle,
  type ExerciseMetadataResolver,
} from './exercise-metadata';

type Props = {
  drafts: readonly WorkoutSetDraft[];
  editable: boolean;
  historyLogs: readonly SetLog[];
  onRecord: (draft: WorkoutSetDraft) => void;
  onToggleComplete: (draft: WorkoutSetDraft) => void;
  resolveExerciseMetadata: ExerciseMetadataResolver;
};

function statusMark(draft: WorkoutSetDraft): { mark: string; color: string } {
  if (draft.status === 'complete') return { mark: '✓', color: colors.green };
  if (draft.status === 'failed') return { mark: '✗', color: colors.amber };
  return { mark: '○', color: colors.fgTertiary };
}

function reference(logs: readonly SetLog[], exerciseId: string): string | null {
  const relevant = logs.filter((log) => log.exercise_id === exerciseId && log.completed && !log.failed);
  if (!relevant.length) return null;
  const last = [...relevant].sort((a, b) => b.logged_at.localeCompare(a.logged_at))[0];
  const best = [...relevant].sort((a, b) => Number(b.weight_kg) - Number(a.weight_kg))[0];
  return `上次 ${Number(last.weight_kg)}kg×${last.reps} · 最佳 ${Number(best.weight_kg)}kg×${best.reps}`;
}

export function WorkoutBody({
  drafts,
  editable,
  historyLogs,
  onRecord,
  onToggleComplete,
  resolveExerciseMetadata,
}: Props) {
  const active = drafts.find((draft) => !isDraftTerminal(draft));
  const groups = [...new Set(drafts.map((draft) => draft.exercise.id))].map((id) => ({
    exercise: drafts.find((draft) => draft.exercise.id === id)!.exercise,
    drafts: drafts.filter((draft) => draft.exercise.id === id),
  }));

  return (
    <>
      {active ? (
        <Card style={styles.hero}>
          <Text style={styles.eyebrow}>下一组 · {exerciseTitle(resolveExerciseMetadata(active.exercise.exercise_id))}</Text>
          <View style={styles.heroNumbers}>
            <View><Text style={styles.heroValue}>{active.weightText || '—'}</Text><Text style={styles.unit}>KG</Text></View>
            <Text style={styles.multiply}>×</Text>
            <View><Text style={styles.heroValue}>{active.repsText}</Text><Text style={styles.unit}>次</Text></View>
            <View style={styles.rpeBlock}><Text style={styles.rpeLabel}>RPE</Text><Text style={styles.rpeHero}>{active.rpeText || '—'}</Text></View>
          </View>
          {active.planSet.coach_note ?? active.exercise.notes ? <View style={styles.notePill}><Text style={styles.note}>教练备注 · {active.planSet.coach_note ?? active.exercise.notes}</Text></View> : null}
          <AppButton disabled={!editable} label="记录此组" onPress={() => onRecord(active)} />
        </Card>
      ) : null}
      {groups.map(({ drafts: exerciseDrafts, exercise }, groupIndex) => {
        const note = exercise.notes ?? exerciseDrafts.find((draft) => draft.planSet.coach_note)?.planSet.coach_note;
        return (
          <Card key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View><Text style={styles.exerciseTitle}>{exerciseTitle(resolveExerciseMetadata(exercise.exercise_id))}</Text><Text style={styles.exerciseMeta}>{exercise.is_main_lift ? '主项' : `动作 ${groupIndex + 1}`} · {exerciseDrafts.length} 组</Text></View>
              <MaterialCommunityIcons color={colors.fgTertiary} name="video-outline" size={20} />
            </View>
            {!active && note ? <View style={styles.notePill}><Text style={styles.note}>教练备注 · {note}</Text></View> : null}
            <View style={styles.tableHeader}><Text style={styles.numberColumn}>#</Text><Text style={styles.column}>重量</Text><Text style={styles.column}>次数</Text><Text style={styles.column}>RPE</Text><View style={styles.statusColumn} /></View>
            {exerciseDrafts.map((draft) => {
              const status = statusMark(draft);
              return (
                <Pressable disabled={!editable} key={draft.stableSetId} onPress={() => onRecord(draft)} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
                  <Text style={styles.numberColumn}>{draft.setIndex + 1}</Text><Text style={styles.column}>{draft.weightText || '—'}</Text><Text style={styles.column}>{draft.repsText || '—'}</Text><Text style={styles.column}>{draft.rpeText || '—'}</Text><View style={styles.statusColumn}><Pressable disabled={!editable} onPress={(event) => { event.stopPropagation(); onToggleComplete(draft); }}><Text style={[styles.status, { color: status.color }]}>{status.mark}</Text></Pressable><MaterialCommunityIcons color={colors.fgTertiary} name="video-outline" size={15} /></View>
                </Pressable>
              );
            })}
            {reference(historyLogs, exercise.exercise_id) ? <Text style={styles.reference}>{reference(historyLogs, exercise.exercise_id)}</Text> : null}
          </Card>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.base, padding: spacing.lg },
  eyebrow: { color: colors.fgSecondary, ...typography.monoLabel },
  heroNumbers: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.sm },
  heroValue: { color: colors.fgPrimary, ...typography.displayNumeral },
  unit: { color: colors.fgSecondary, textAlign: 'center', ...typography.displayUnit },
  multiply: { color: colors.fgTertiary, fontSize: 32, marginBottom: 24 },
  rpeBlock: { marginBottom: 5, marginLeft: 'auto' },
  rpeLabel: { color: colors.fgTertiary, ...typography.caption },
  rpeHero: { color: colors.fgPrimary, ...typography.title2 },
  notePill: { alignSelf: 'flex-start', backgroundColor: colors.surface3, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  note: { color: colors.fgSecondary, ...typography.footnote },
  exerciseCard: { gap: spacing.sm, overflow: 'hidden', paddingTop: spacing.base },
  exerciseHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.base },
  exerciseTitle: { color: colors.fgPrimary, ...typography.headline },
  exerciseMeta: { color: colors.fgTertiary, marginTop: spacing.xs, ...typography.caption },
  tableHeader: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  row: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 48, paddingHorizontal: spacing.base },
  rowPressed: { backgroundColor: colors.surface2 },
  numberColumn: { color: colors.fgSecondary, width: 28, ...typography.footnote },
  column: { color: colors.fgPrimary, flex: 1, textAlign: 'center', ...typography.footnote },
  statusColumn: { alignItems: 'center', flexDirection: 'row', gap: 3, justifyContent: 'flex-end', width: 43 },
  status: { fontSize: 18, fontWeight: '700' },
  reference: { color: colors.fgTertiary, paddingBottom: spacing.md, paddingHorizontal: spacing.base, ...typography.caption },
});
