import { useCameraAvailability } from './video-upload/use-camera-availability';
import { SetVideoUploadIndicator } from './video-upload/VideoStatusIcon';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { RollUpBody, RollUpCard } from '@/design/TrainingRewardMotion';
import { t } from '@/i18n';
import { training22 } from './build22-strings';
import type { PlanExercise } from '@/api/domains/plans';
import type { SetLog } from '@/api/domains/sets';
import { AppButton, Card, GradientFill, font, useColors } from '@/design';
import {
  decodePrescription,
  intensityText,
  percentageAnchorText,
  prescribed,
  prescriptionSummary,
} from '@/domain/plan/prescription';
import { isDraftTerminal } from './drafts';
import type { WorkoutSetDraft } from './model';
import type { SuggestionOutcome } from './suggestion-gating';
import {
  exerciseTitle,
  type ExerciseMetadataResolver,
} from './exercise-metadata';

function reference(logs: readonly SetLog[], exerciseId: string): string | null {
  const relevant = logs.filter(
    (log) =>
      log.exercise_id === exerciseId &&
      log.completed &&
      !log.failed &&
      !log.assumed,
  );
  if (!relevant.length) return null;
  const last = [...relevant].sort((a, b) =>
    b.logged_at.localeCompare(a.logged_at),
  )[0];
  const best = [...relevant].sort(
    (a, b) => Number(b.weight_kg) - Number(a.weight_kg),
  )[0];
  return `${t('student.todayWorkoutPresentation.copy004', [Number(last.weight_kg), last.reps])} · ${t('student.todayWorkoutPresentation.copy005', [Number(best.weight_kg), best.reps])}`;
}
export function WorkoutBody({
  exercises,
  drafts,
  editable,
  recording,
  startLoading,
  onStart,
  onQuickLog,
  suggestionForDraft,
  historyLogs,
  onRecord,
  onVideo,
  studentId,
  onToggleComplete,
  resolveExerciseMetadata,
  onAskCoach,
  preparingShare = false,
}: {
  onAskCoach?: (draft: WorkoutSetDraft) => void;
  preparingShare?: boolean;
  exercises: readonly PlanExercise[];
  drafts: readonly WorkoutSetDraft[];
  editable: boolean;
  recording: boolean;
  startLoading: boolean;
  onStart: () => void;
  onQuickLog?: () => void;
  suggestionForDraft: (draft: WorkoutSetDraft) => SuggestionOutcome;
  historyLogs: readonly SetLog[];
  studentId: string;
  onVideo: (draft: WorkoutSetDraft) => void;
  onRecord: (draft: WorkoutSetDraft) => void;
  onToggleComplete: (draft: WorkoutSetDraft) => void;
  resolveExerciseMetadata: ExerciseMetadataResolver;
}) {
  const colors = useColors();
  const hasCamera = useCameraAvailability();
  const initiallyCompleted = exercises.filter(exercise => {
    const rows = drafts.filter(draft => draft.exercise.id === exercise.id);
    return rows.length > 0 && rows.every(isDraftTerminal);
  }).map(exercise => exercise.id);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => Object.fromEntries(initiallyCompleted.map(id => [id, true])));
  const [previousCompleted, setPreviousCompleted] = useState(initiallyCompleted.join('|'));
  const completedKey = initiallyCompleted.join('|');
  if (previousCompleted !== completedKey) {
    const previous = new Set(previousCompleted.split('|'));
    const newlyCompleted = initiallyCompleted.filter(id => !previous.has(id));
    setPreviousCompleted(completedKey);
    if (newlyCompleted.length) setCollapsed(current => ({ ...current, ...Object.fromEntries(newlyCompleted.map(id => [id, true])) }));
  }
  const active =
    drafts.find(
      (draft) => !isDraftTerminal(draft) || draft.sourceLog?.assumed,
    ) ?? drafts[drafts.length - 1];
  const groups = [...exercises]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((exercise) => ({
      exercise,
      drafts: drafts.filter((draft) => draft.exercise.id === exercise.id),
    }));
  const p = active ? decodePrescription(active.planSet) : null;
  const outcome = active ? suggestionForDraft(active) : null;
  const actualWeight =
    active?.sourceLog && !active.sourceLog.assumed
      ? Number(active.sourceLog.weight_kg)
      : undefined;
  const targetWeight =
    actualWeight ?? p?.weightKg ?? outcome?.percentage?.resolvedKg ?? undefined;
  const number =
    targetWeight !== undefined
      ? actualWeight == null &&
        p?.weightKg == null &&
        outcome?.percentage?.resolvedKg != null
        ? t('student.todayWorkoutTypes.copy019', [targetWeight])
        : String(targetWeight)
      : intensityText(p?.intensity) || '—';
  return (
    <>
      <Card
        style={{
          backgroundColor: colors.bgInset,
          borderColor: colors.borderStrong,
          borderWidth: 1,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          borderTopRightRadius: 16,
          borderBottomRightRadius: 16,
          padding: 16,
          paddingLeft: 19,
          gap: 14,
          overflow: 'hidden',
        }}
      >
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 }}
        >
          <GradientFill direction="vertical" stops={[{ color: colors.gold300, offset: 0 }, { color: colors.gold400, offset: 0.5 }, { color: colors.gold500, offset: 1 }]} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: colors.textPrimary, ...font.display(22), flex: 1 }}>{recording && active ? exerciseTitle(resolveExerciseMetadata(active.exercise.exercise_id)) : t('student.todayWorkoutScreen.copy017')}</Text>
          {editable && active && onAskCoach ? <Pressable accessibilityRole="button" accessibilityLabel={t('student.askCoach')} disabled={preparingShare} onPress={() => onAskCoach(active)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <View style={{ minHeight: 36, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceCard }}>
              {preparingShare ? <ActivityIndicator size="small" color={colors.textTertiary} /> : <Text style={{ ...font.body(13, 'bold'), color: colors.textPrimary }}>{t('student.askCoach')}</Text>}
            </View>
          </Pressable> : null}
        </View>
        {!recording ? (
          <>
            <Text style={{ color: colors.textTertiary, ...font.mono(12) }}>
              {t('student.todayWorkoutScreen.copy018', [groups.length])}
              {t('student.todayWorkoutScreen.copy019', [drafts.length])}
            </Text>
            {groups.map((group, index) => (
              <View key={group.exercise.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.borderSubtle }}>
                <Text style={{ ...font.mono(11, 'bold'), color: colors.goldText, backgroundColor: `${colors.goldRGB}1F`, borderRadius: 7, width: 22, height: 22, textAlign: 'center', textAlignVertical: 'center' }}>{index + 1}</Text>
                <Text
                  style={{
                    color: colors.textPrimary,
                    ...font.body(14, 'bold'),
                    flex: 1,
                  }}
                >
                  {exerciseTitle(
                    resolveExerciseMetadata(group.exercise.exercise_id),
                  )}
                </Text>
                <Text style={{ color: colors.textTertiary, ...font.mono(12), flexShrink: 1 }}>
                  {prescriptionSummary(
                    group.drafts.map((draft) => ({
                      prescription: decodePrescription(draft.planSet),
                      resolution: suggestionForDraft(draft).percentage,
                    })),
                  )}
                </Text>
              </View>
            ))}
            {editable && active ? (
              <AppButton
                disabled={startLoading}
                label={t('student.todayWorkoutScreen.copy008')}
                onPress={onStart}
              />
            ) : null}
            {onQuickLog ? <AppButton variant="link" label={training22.entry} onPress={onQuickLog} disabled={startLoading} /> : null}
          </>
        ) : active && p ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <Text
                style={{
                  color:
                    targetWeight === undefined
                      ? colors.textMuted
                      : colors.textPrimary,
                  ...font.display(targetWeight === undefined ? 32 : 54),
                }}
              >
                {number}
              </Text>
              {targetWeight !== undefined ? (
                <Text style={{ color: colors.textMuted, ...font.mono(16, 'bold') }}>
                  KG
                </Text>
              ) : null}
            </View>
            <Text style={{ color: colors.textFaint, ...font.mono(11, 'semibold'), letterSpacing: 0.55 }}>
              {p.intensity?.kind === 'pct'
                ? percentageAnchorText(p, outcome?.percentage)
                : t('student.todayWorkoutScreen.copy027')}
            </Text>
            <Text style={{ color: colors.textSecondary, ...font.mono(12) }}>
              {prescribed(p, outcome?.percentage)}
            </Text>
            <Text style={{ color: colors.textMuted, ...font.body(12) }}>
              {t('student.todayWorkoutPresentation.copy002', [
                active.setIndex + 1,
                active.exercise.sets.length,
              ])}
              {t('student.todayWorkoutPresentation.copy003', [
                active.exerciseOrdinal + 1,
                groups.length,
              ])}
            </Text>
            {reference(historyLogs, active.exercise.exercise_id) ? (
              <Text style={{ color: colors.textTertiary, ...font.mono(12) }}>
                {reference(historyLogs, active.exercise.exercise_id)}
              </Text>
            ) : null}
            {(active.planSet.coach_note ?? active.exercise.notes) ? (
              <View style={{ paddingHorizontal: 12, paddingVertical: 10, gap: 3, borderRadius: 10, backgroundColor: colors.bgInset }}>
                <Text style={{ color: colors.textFaint, ...font.mono(11) }}>{t('student.todayWorkoutScreen.copy014')}</Text>
                <Text style={{ color: colors.coachNoteText, ...font.body(12), lineHeight: 18 }}>{active.planSet.coach_note ?? active.exercise.notes}</Text>
              </View>
            ) : null}
            {editable ? (
              <>
                <AppButton
                  label={t('student.todayWorkoutScreen.copy015')}
                  onPress={() => onRecord(active)}
                />
                {hasCamera ? <AppButton
                  onPress={() => onVideo(active)}
                  variant="secondary"
                  label={t('student.todayWorkoutScreen.copy016')}
                /> : null}
              </>
            ) : null}
          </>
        ) : null}
      </Card>
      {recording
        ? groups.map(({ exercise, drafts: rows }) => (
            <RollUpCard key={exercise.id} collapsed={Boolean(collapsed[exercise.id])}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: !collapsed[exercise.id] }}
                onPress={() =>
                  setCollapsed((current) => ({
                    ...current,
                    [exercise.id]: !current[exercise.id],
                  }))
                }
                style={({ pressed }) => ({ minHeight: 48, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
              >
                <Text
                  style={{
                    color: colors.textPrimary,
                    ...font.body(16, 'bold'),
                    flex: 1,
                  }}
                >
                  {exerciseTitle(resolveExerciseMetadata(exercise.exercise_id))}
                </Text>
                <Text style={{ color: colors.textMuted }}>
                  {collapsed[exercise.id] ? '›' : '⌄'}
                </Text>
              </Pressable>
              <RollUpBody collapsed={Boolean(collapsed[exercise.id])}>
              {exercise.notes ? (
                <Text style={{ color: colors.textMuted }}>
                  {t('student.todayWorkoutScreen.copy014')} · {exercise.notes}
                </Text>
              ) : null}
                <>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      '#',
                      t('student.setEntrySheet.copy001'),
                      t('student.setEntrySheet.copy003'),
                      'RPE',
                      '',
                    ].map((label, i) => (
                      <Text
                        key={i}
                        style={{
                          flex: i === 0 ? 0.5 : 1,
                          color: colors.textMuted,
                          ...font.mono(10),
                          textAlign: 'center',
                        }}
                      >
                        {label}
                      </Text>
                    ))}
                  </View>
                  {rows.map((draft) => (
                    <View
                      key={draft.stableSetId}
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: colors.borderSubtle,
                      }}
                    >
                      <Pressable
                        disabled={!editable}
                        onPress={() => onRecord(draft)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          minHeight: 48,
                          gap: 8,
                        }}
                      >
                        <Text
                          style={{
                            flex: 0.5,
                            ...font.mono(13, 'bold'),
                            color: colors.textMuted,
                            textAlign: 'center',
                          }}
                        >
                          {draft.setIndex + 1}
                        </Text>
                        {[
                          draft.weightText || '—',
                          draft.repsText || '—',
                          draft.rpeText || '—',
                        ].map((value, i) => (
                          <Text
                            key={i}
                            style={{
                              flex: 1,
                              textAlign: 'center',
                              color: colors.textPrimary,
                              ...font.mono(i === 0 ? 15 : 14, i === 0 ? 'bold' : 'regular'),
                            }}
                          >
                            {value}
                          </Text>
                        ))}
                        <View
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Pressable feedback="none"
                            disabled={!editable}
                            accessibilityRole="button"
                            accessibilityLabel={t(
                              'student.todayWorkoutScreen.copy015',
                            )}
                            onPress={(event) => {
                              event.stopPropagation();
                              if (!draft.weightText.trim()) onRecord(draft);
                              else onToggleComplete(draft);
                            }}
                          >
                            <Text
                              style={{
                                color:
                                  draft.status === 'complete'
                                    ? colors.success
                                    : draft.status === 'failed'
                                      ? colors.gold500
                                      : colors.textGhost,
                              }}
                            >
                              {draft.status === 'complete'
                                ? '✓'
                                : draft.status === 'failed'
                                  ? '✗'
                                  : '○'}
                            </Text>
                          </Pressable>
                          <SetVideoUploadIndicator studentId={studentId} stableSetId={draft.stableSetId} />
                        </View>
                      </Pressable>
                      <Text
                        style={{
                          color: colors.textMuted,
                          ...font.mono(10),
                          paddingBottom: 8,
                        }}
                      >
                        {prescribed(
                          decodePrescription(draft.planSet),
                          suggestionForDraft(draft).percentage,
                        )}
                      </Text>
                    </View>
                  ))}
                  {reference(historyLogs, exercise.exercise_id) ? (
                    <Text style={{ color: colors.textMuted, ...font.body(12) }}>
                      {reference(historyLogs, exercise.exercise_id)}
                    </Text>
                  ) : null}
                </>
              </RollUpBody>
            </RollUpCard>
          ))
        : null}
    </>
  );
}
