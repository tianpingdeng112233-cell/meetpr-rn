import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { t } from '@/i18n';
import type { PlanExercise } from '@/api/domains/plans';
import type { SetLog } from '@/api/domains/sets';
import { AppButton, Card, Eyebrow, font, useColors } from '@/design';
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
  suggestionForDraft,
  historyLogs,
  onRecord,
  onToggleComplete,
  resolveExerciseMetadata,
}: {
  exercises: readonly PlanExercise[];
  drafts: readonly WorkoutSetDraft[];
  editable: boolean;
  recording: boolean;
  startLoading: boolean;
  onStart: () => void;
  suggestionForDraft: (draft: WorkoutSetDraft) => SuggestionOutcome;
  historyLogs: readonly SetLog[];
  onRecord: (draft: WorkoutSetDraft) => void;
  onToggleComplete: (draft: WorkoutSetDraft) => void;
  resolveExerciseMetadata: ExerciseMetadataResolver;
}) {
  const colors = useColors();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
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
          borderRadius: 16,
          padding: 20,
          gap: 14,
          overflow: 'hidden',
        }}
      >
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 }}
        >
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="hero-stripe" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.gold300} />
                <Stop offset="1" stopColor={colors.gold500} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#hero-stripe)" />
          </Svg>
        </View>
        {!recording ? (
          <>
            <Eyebrow label={t('student.todayWorkoutScreen.copy017')} />
            <Text style={{ color: colors.textMuted, ...font.mono(12) }}>
              {t('student.todayWorkoutScreen.copy018', [groups.length])}
              {t('student.todayWorkoutScreen.copy019', [drafts.length])}
            </Text>
            {groups.map((group) => (
              <View key={group.exercise.id} style={{ gap: 6 }}>
                <Text
                  style={{
                    color: colors.textPrimary,
                    ...font.body(16, 'bold'),
                  }}
                >
                  {exerciseTitle(
                    resolveExerciseMetadata(group.exercise.exercise_id),
                  )}
                </Text>
                <Text style={{ color: colors.textMuted, ...font.mono(12) }}>
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
          </>
        ) : active && p ? (
          <>
            <Text style={{ color: colors.textPrimary, ...font.display(22) }}>
              {exerciseTitle(
                resolveExerciseMetadata(active.exercise.exercise_id),
              )}
            </Text>
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
                <Text style={{ color: colors.textMuted, ...font.mono(14) }}>
                  kg
                </Text>
              ) : null}
            </View>
            <Text style={{ color: colors.textMuted, ...font.body(12) }}>
              {p.intensity?.kind === 'pct'
                ? percentageAnchorText(p, outcome?.percentage)
                : t('student.todayWorkoutScreen.copy027')}
            </Text>
            <Text style={{ color: colors.textSecondary, ...font.mono(12) }}>
              {prescribed(p, outcome?.percentage)}
            </Text>
            <Text style={{ color: colors.textMuted, ...font.mono(12) }}>
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
              <Text style={{ color: colors.textMuted, ...font.body(12) }}>
                {reference(historyLogs, active.exercise.exercise_id)}
              </Text>
            ) : null}
            {(active.planSet.coach_note ?? active.exercise.notes) ? (
              <Text style={{ color: colors.textSecondary, ...font.body(13) }}>
                {t('student.todayWorkoutScreen.copy014')} ·{' '}
                {active.planSet.coach_note ?? active.exercise.notes}
              </Text>
            ) : null}
            {editable ? (
              <>
                <AppButton
                  label={t('student.todayWorkoutScreen.copy015')}
                  onPress={() => onRecord(active)}
                />
                <AppButton
                  disabled
                  variant="secondary"
                  label={t('student.todayWorkoutScreen.copy016')}
                />
              </>
            ) : null}
          </>
        ) : null}
      </Card>
      {recording
        ? groups.map(({ exercise, drafts: rows }) => (
            <Card key={exercise.id} style={{ padding: 16, gap: 10 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: !collapsed[exercise.id] }}
                onPress={() =>
                  setCollapsed((current) => ({
                    ...current,
                    [exercise.id]: !current[exercise.id],
                  }))
                }
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
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
              {exercise.notes ? (
                <Text style={{ color: colors.textMuted }}>
                  {t('student.todayWorkoutScreen.copy014')} · {exercise.notes}
                </Text>
              ) : null}
              {!collapsed[exercise.id] ? (
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
                          ...font.mono(11),
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
                              ...font.mono(12),
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
                          <Pressable
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
                          <MaterialCommunityIcons
                            name="video-outline"
                            size={15}
                            color={colors.textGhost}
                          />
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
              ) : null}
            </Card>
          ))
        : null}
    </>
  );
}
