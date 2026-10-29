import { LoadTypeSummary } from './LoadTypeSummary';
import { metricDisplay, POUNDS_PER_KG } from '@/domain/measurement';
import type { ComponentProps } from 'react';
import { AccessoryLogCard } from './AccessoryLogCard';
import { accessoryRows, isAccessoryExercise } from './accessory-quick-log';
import { useCameraAvailability } from './video-upload/use-camera-availability';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CompletedSetVideo, CompletedVideoGroup, CompletedVideoReplayProvider } from './video-upload/CompletedVideoReplay';
import { SetVideoUploadIndicator } from './video-upload/VideoStatusIcon';
import { useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, LayoutAnimation, Text, View, type LayoutRectangle } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { RollUpBody, RollUpCard } from '@/design/TrainingRewardMotion';
import { t } from '@/i18n';
import { training22 } from './build22-strings';
import { workoutCoachNotes } from './coach-notes';
import type { PlanExercise } from '@/api/domains/plans';
import type { SetLog } from '@/api/domains/sets';
import { AppButton, Card, GradientFill, font, fontMetrics, motion, radius, spacing, useTheme } from '@/design';
import {
  decodePrescription,
  effectiveLoadMode,
  withoutBodyweightMarker,
  intensityText,
  percentageAnchorText,
  prescribed,
  prescriptionSummary,
} from '@/domain/plan/prescription';
import { isDraftTerminal } from './drafts';
import { needsSetResult, partitionExerciseProgress, type ExerciseProgressGroup } from './exercise-progress';
import { useReducedMotion } from '@/design/useReducedMotion';
import { SetProgressBar } from './SetProgressBar';
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
  preview,
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
  unit = 'kg',
  onAccessorySave,
  onAccessoryInputFocus,
  onExerciseCompleted,
  onCompletedRowLayout,
  onAddSet, onRemoveSet, onAddExercise, onRemoveExercise, inlineEdits, completedDay,
}: {
  /** A settled day: the overview card shows what was logged instead of a hero for the next set. */
  completedDay?: { canUndo: boolean; undoing: boolean; onUndo: () => void };
  onAddSet?: (exercise: PlanExercise) => void;
  onRemoveSet?: (draft: WorkoutSetDraft) => void;
  onAddExercise?: () => void;
  onRemoveExercise?: (exercise: PlanExercise) => void;
  inlineEdits?: ComponentProps<typeof AccessoryLogCard>['inlineEdits'];
  onExerciseCompleted?: (exerciseId: string) => void;
  onCompletedRowLayout?: (exerciseId: string, layout: LayoutRectangle) => void;
  unit?: 'kg' | 'lb';
  onAccessorySave?: ComponentProps<typeof AccessoryLogCard>['onSave'];
  onAccessoryInputFocus?: ComponentProps<typeof AccessoryLogCard>['onInputFocus'];
  preview?: { recommendedDate?: string; title: string; unlockMessage?: string };
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
  const { colors, scheme } = useTheme();
  // The light success token is below 4.5:1 on successTint; retain a readable existing ink token.
  const completedLabelColor = scheme === 'light' ? colors.textPrimary : colors.successSoft;
  const [accentSize, setAccentSize] = useState({ width: 0, height: 0 });
  const [expandedSummary, setExpandedSummary] = useState<Record<string, boolean>>({});
  const hasCamera = useCameraAvailability();
  const progressFlow = recording && editable && !preview;
  const reducedMotion = useReducedMotion();
  const initiallyCompleted = exercises.filter(exercise => {
    const rows = drafts.filter(draft => !draft.kind && draft.exercise.id === exercise.id);
    return rows.length > 0 && rows.every(draft => progressFlow ? !needsSetResult(draft) : isDraftTerminal(draft));
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
  const groups = [...exercises]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((exercise) => ({
      exercise,
      drafts: drafts.filter((draft) => draft.exercise.id === exercise.id),
    }));
  const progress = partitionExerciseProgress(groups);
  const active = progressFlow
    ? progress.active?.drafts.find(needsSetResult)
    : drafts.find(needsSetResult) ?? drafts.filter(draft => !draft.kind).at(-1);
  const completedSectionY = useRef<number | null>(null);
  const completedRowLayouts = useRef(new Map<string, LayoutRectangle>());
  const reportCompletedRow = (exerciseId: string, layout: LayoutRectangle) => {
    if (completedSectionY.current !== null) {
      onCompletedRowLayout?.(exerciseId, { ...layout, y: completedSectionY.current + layout.y });
    }
  };
  const previousProgress = useRef(completedKey);
  useLayoutEffect(() => {
    const previous = new Set(previousProgress.current.split('|'));
    previousProgress.current = completedKey;
    const newlyCompleted = progress.completed.filter(group => !previous.has(group.exercise.id));
    if (!progressFlow || !newlyCompleted.length) return;
    newlyCompleted.forEach(group => completedRowLayouts.current.delete(group.exercise.id));
    if (!reducedMotion) LayoutAnimation.configureNext({
      duration: motion.base,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    onExerciseCompleted?.(newlyCompleted[newlyCompleted.length - 1].exercise.id);
  }, [completedKey, onExerciseCompleted, progress.completed, progressFlow, reducedMotion]);
  const loadTypeRows = active?.exercise.sets.some(set => ['free_weight', 'bodyweight'].includes(effectiveLoadMode(set) ?? ''));
  const accessory = recording && editable && !preview && active && (loadTypeRows || isAccessoryExercise(resolveExerciseMetadata(active.exercise.exercise_id)?.exerciseType));
  const accessoryDrafts = accessory ? drafts.filter(draft => draft.exercise.id === active.exercise.id) : [];
  const relevantHistory = accessory ? historyLogs.filter(log => log.exercise_id === active.exercise.exercise_id && log.plan_exercise_id !== active.exercise.id && log.completed && !log.failed && !log.assumed) : [];
  const lastHistory = [...relevantHistory].sort((a, b) => b.logged_at.localeCompare(a.logged_at))[0];
  const previousLogs = lastHistory ? relevantHistory.filter(log => log.logged_date === lastHistory.logged_date && log.plan_exercise_id === lastHistory.plan_exercise_id) : [];
  const p = active ? decodePrescription(active.planSet) : null;
  const coachNotes = workoutCoachNotes(active && effectiveLoadMode(active.planSet) === 'bodyweight' ? withoutBodyweightMarker(active?.planSet.coach_note) : active?.planSet.coach_note, active?.exercise.notes);
  const lowerNote = coachNotes.setNote ?? (editable ? null : coachNotes.exerciseNote);
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
  const previousFor = (exercise: PlanExercise) => {
    const relevant = historyLogs.filter(log => log.exercise_id === exercise.exercise_id && log.plan_exercise_id !== exercise.id && log.plan_day_id !== exercise.plan_day_id && log.completed && !log.failed && !log.assumed);
    const last = [...relevant].sort((a, b) => b.logged_at.localeCompare(a.logged_at))[0];
    return last ? relevant.filter(log => log.logged_date === last.logged_date && log.plan_exercise_id === last.plan_exercise_id) : [];
  };
  const inlineCard = (exercise: PlanExercise, rows: readonly WorkoutSetDraft[]) => <View style={{ gap: spacing.sm }}><LoadTypeSummary sets={exercise.sets} /><AccessoryLogCard drafts={rows} previousLogs={previousFor(exercise)} unit={unit} studentId={studentId} onRecord={onRecord} onSave={onAccessorySave} onInputFocus={onAccessoryInputFocus} inlineEdits={inlineEdits} readOnly={!editable}
    onAddSet={editable && onAddSet ? () => onAddSet(exercise) : undefined} onRemoveSet={onRemoveSet} /></View>;
  const extrasFor = (exercise: PlanExercise, rows: readonly WorkoutSetDraft[]) => <View style={{ gap: spacing.sm }}>
    {rows.filter(row => row.kind === 'extra').map(draft => <View key={draft.stableSetId} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderWidth: spacing.point1, borderColor: colors.borderStrong, borderRadius: radius.inset, backgroundColor: isDraftTerminal(draft) ? colors.successTint : colors.surfaceCard }}>
      <Text style={{ ...font.body(fontMetrics.size11), color: colors.textMuted }}>{t('student.added.extra')}</Text>
      <Text style={{ flex: 1, ...font.mono(fontMetrics.size13), color: colors.textPrimary }}>{draft.weightText ? unit === 'lb' ? metricDisplay(draft.weightText, POUNDS_PER_KG) : draft.weightText : '—'} {unit} × {draft.repsText || '—'}{draft.rpeText ? ` · RPE ${draft.rpeText}` : ''}</Text>
      {editable ? <>
        <AppButton variant="link" label={t('student.todayWorkoutScreen.copy015')} onPress={() => onRecord(draft)} />
        <Pressable accessibilityRole="button" accessibilityLabel={t('student.added.removeSet')} onPress={() => onRemoveSet?.(draft)} style={{ minHeight: spacing.minimumHitTarget, minWidth: spacing.minimumHitTarget, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.textMuted }}>×</Text></Pressable>
      </> : null}
      <SetVideoUploadIndicator studentId={studentId} stableSetId={draft.stableSetId} />
    </View>)}
    {editable && onAddSet ? <AppButton variant="link" label={t('student.added.addSet')} disabled={rows.filter(row => row.kind === 'extra').length >= 10} onPress={() => onAddSet(exercise)} /> : null}
    {editable || rows.some(row => row.kind === 'extra') ? <Text style={{ ...font.body(fontMetrics.size12), color: colors.textMuted }}>{t('student.added.extraHint')}</Text> : null}
  </View>;
  const addedGroups = [...new Set(drafts.filter(draft => draft.kind === 'added').map(draft => draft.exercise.id))].map(id => ({ exercise: drafts.find(draft => draft.exercise.id === id)!.exercise, rows: drafts.filter(draft => draft.exercise.id === id) }));
  const renderGroup = ({ exercise, drafts: rows }: ExerciseProgressGroup, completed: boolean) => (
    <RollUpCard key={exercise.id} collapsed={Boolean(collapsed[exercise.id])} completed={completed}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={completed ? t(rows.filter(row => !row.kind).length === 1 ? 'student.trainingFlow.completedAccessibilityOne' : 'student.trainingFlow.completedAccessibilityMany', [exerciseTitle(resolveExerciseMetadata(exercise.exercise_id)), rows.filter(row => !row.kind).length]) : undefined}
        accessibilityState={{ expanded: !collapsed[exercise.id] }}
        onPress={() =>
          setCollapsed((current) => ({
            ...current,
            [exercise.id]: !current[exercise.id],
          }))
        }
        style={({ pressed }) => ({ gap: completed ? spacing.point10 : undefined, minHeight: spacing.xxl, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
      >
        {completed ? <View style={{ width: spacing.point22, height: spacing.point22, borderRadius: radius.pill, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name="check" size={spacing.base} color={colors.inkOnCTAFill} /></View> : null}
        <Text
          style={{
            color: colors.textPrimary,
            ...font.body(completed ? fontMetrics.size15 : fontMetrics.size16, 'bold'),
            flex: 1,
          }}
        >
          {exerciseTitle(resolveExerciseMetadata(exercise.exercise_id))}
        </Text>
        {completed ? <Text style={{ color: completedLabelColor, ...font.mono(fontMetrics.size12, 'semibold') }}>{t(rows.filter(row => !row.kind).length === 1 ? 'student.trainingFlow.completedOne' : 'student.trainingFlow.completedMany', [rows.filter(row => !row.kind).length])}</Text> : null}
        <Text style={{ color: completed ? completedLabelColor : colors.textMuted }}>
          {collapsed[exercise.id] ? '›' : '⌄'}
        </Text>
      </Pressable>
      <RollUpBody collapsed={Boolean(collapsed[exercise.id])}>
      <View style={completed ? { padding: spacing.md, gap: spacing.point10, borderRadius: radius.control, backgroundColor: colors.surfaceCard } : { gap: spacing.point10 }}>
      {exercise.notes ? (
        <Text style={{ color: colors.textMuted }}>
          {t('student.todayWorkoutScreen.copy014')} · {exercise.notes}
        </Text>
      ) : null}
        {editable && !collapsed[exercise.id] && (isAccessoryExercise(resolveExerciseMetadata(exercise.exercise_id)?.exerciseType) || exercise.sets.some(set => ['free_weight', 'bodyweight'].includes(effectiveLoadMode(set) ?? ''))) && exercise.id !== active?.exercise.id ? inlineCard(exercise, rows) : <>
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
          {rows.filter(draft => !draft.kind).map((draft) => (
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
          {editable && isAccessoryExercise(resolveExerciseMetadata(exercise.exercise_id)?.exerciseType) && exercise.id === active?.exercise.id ? null : extrasFor(exercise, rows)}
        </>}
      </View>
      </RollUpBody>
    </RollUpCard>
  );
  return (
    <>
      {progressFlow && progress.completed.length ? <View
        testID="workout-completed-exercises"
        style={{ gap: spacing.point6 }}
        onLayout={event => {
          completedSectionY.current = event.nativeEvent.layout.y;
          completedRowLayouts.current.forEach((layout, id) => reportCompletedRow(id, layout));
        }}
      >{progress.completed.map(group => <View
        key={group.exercise.id}
        testID={`workout-completed-${group.exercise.id}`}
        onLayout={event => {
          const layout = event.nativeEvent.layout;
          completedRowLayouts.current.set(group.exercise.id, layout);
          reportCompletedRow(group.exercise.id, layout);
        }}
      >{renderGroup(group, true)}</View>)}</View> : null}
      {completedDay ? <CompletedVideoReplayProvider studentId={studentId}><Card testID="completed-day-card" style={{ backgroundColor: colors.bgInset, borderColor: colors.borderStrong, borderWidth: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderTopRightRadius: 16, borderBottomRightRadius: 16, padding: 16, paddingLeft: 19, gap: 14, overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: spacing.point3, backgroundColor: colors.success }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ color: colors.textPrimary, ...font.display(22), flex: 1 }}>{t('student.todayWorkoutScreen.copy017')}</Text>
          <View testID="training.completedDay" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 36, paddingHorizontal: 13, borderRadius: radius.pill, backgroundColor: colors.successTint }}>
            <MaterialCommunityIcons name="check" size={spacing.point14} color={completedLabelColor} />
            <Text style={{ ...font.body(13, 'bold'), color: completedLabelColor }}>{t('student.todayWorkoutScreen.copy009')}</Text>
          </View>
        </View>
        <Text style={{ color: colors.textTertiary, ...font.mono(12) }}>
          {t('student.todayWorkoutScreen.copy018', [groups.length])}
          {t('student.todayWorkoutScreen.copy019', [drafts.filter(draft => !draft.kind).length])}
        </Text>
        {[...groups.map(group => ({ exercise: group.exercise, rows: group.drafts, added: false })), ...addedGroups.map(group => ({ ...group, added: true }))].map(({ exercise, rows, added }, index) => {
          const prescribed = rows.filter(draft => !draft.kind);
          const logged = rows.filter(draft => isDraftTerminal(draft) && (added || !draft.kind)).length;
          const done = added || (prescribed.length > 0 && logged === prescribed.length);
          const open = Boolean(expandedSummary[exercise.id]);
          const recorded = rows.filter(draft => added || !draft.kind || isDraftTerminal(draft));
          const title = exerciseTitle(resolveExerciseMetadata(exercise.exercise_id));
          return <CompletedVideoGroup key={exercise.id} sets={recorded.map(draft => ({ setLogId: draft.sourceLog?.id ?? null, stableSetId: draft.stableSetId }))}>{() => <View style={{ borderRadius: 12, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.borderSubtle }}>
            <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }} onPress={() => setExpandedSummary(current => ({ ...current, [exercise.id]: !open }))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 11, minHeight: spacing.minimumHitTarget }}>
              {done ? <View style={{ width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.successTint }}>
                <MaterialCommunityIcons name="check" size={spacing.point14} color={completedLabelColor} />
              </View> : <Text style={{ ...font.mono(11, 'bold'), color: colors.goldText, backgroundColor: `${colors.goldRGB}1F`, borderRadius: 7, width: 22, height: 22, textAlign: 'center', textAlignVertical: 'center' }}>{index + 1}</Text>}
              <Text style={{ flex: 1, color: colors.textPrimary, ...font.body(14, 'bold') }}>{title}</Text>
              <Text style={{ color: colors.textTertiary, ...font.mono(12) }}>{added ? t('student.completedDay.addedSets %lld', [logged]) : t('student.completedDay.loggedSets %lld %lld', [logged, prescribed.length])}</Text>
              <Text style={{ color: colors.textMuted }}>{open ? '⌄' : '›'}</Text>
            </Pressable>
            {open ? <View style={{ paddingHorizontal: 13, paddingBottom: 11, gap: spacing.xs }}>
              {recorded.map(draft => {
                const terminal = isDraftTerminal(draft);
                const weight = draft.weightText ? unit === 'lb' ? metricDisplay(draft.weightText, POUNDS_PER_KG) : draft.weightText : '—';
                return <View key={draft.stableSetId} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text style={{ width: 36, color: colors.textMuted, ...font.mono(12) }}>{draft.kind === 'extra' ? t('student.added.extra') : draft.setIndex + 1}</Text>
                  <Text style={{ flex: 1, color: !terminal ? colors.textMuted : draft.status === 'failed' ? colors.danger : colors.textPrimary, ...font.mono(13) }}>
                    {terminal ? `${weight} ${unit} × ${draft.repsText || '—'}${draft.rpeText ? ` · RPE ${draft.rpeText}` : ''}` : '—'}
                  </Text>
                  <CompletedSetVideo setLogId={draft.sourceLog?.id ?? null} stableSetId={draft.stableSetId} badge={{ exerciseName: title, setOrdinal: draft.setIndex + 1, weightKg: draft.sourceLog ? Number(draft.sourceLog.weight_kg) : null, reps: draft.sourceLog?.reps ?? null, rpe: draft.sourceLog?.rpe != null ? Number(draft.sourceLog.rpe) : null }} />
                </View>;
              })}
            </View> : null}
          </View>}</CompletedVideoGroup>;
        })}
        {completedDay.canUndo ? <Pressable accessibilityRole="button" accessibilityLabel={t('student.todayWorkoutScreen.copy023')} accessibilityState={{ disabled: completedDay.undoing }} disabled={completedDay.undoing} onPress={completedDay.onUndo}
          style={{ alignSelf: 'flex-end', justifyContent: 'center', minHeight: spacing.minimumHitTarget }}>
          <Text style={{ color: colors.textMuted, ...font.body(12) }}>{t('student.todayWorkoutScreen.copy023')}</Text>
        </Pressable> : null}
      </Card></CompletedVideoReplayProvider> : null}
      {!completedDay && (!progressFlow || active) ? <Card
        testID="workout-hero"
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
          onLayout={({ nativeEvent: { layout } }) => setAccentSize(current =>
            current.width === layout.width && current.height === layout.height
              ? current : { width: layout.width, height: layout.height })}
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: spacing.point3 }}
        >
          <GradientFill size={accentSize} direction="vertical" stops={[{ color: colors.gold300, offset: 0 }, { color: colors.gold400, offset: 0.5 }, { color: colors.gold500, offset: 1 }]} />
        </View>
        {preview?.recommendedDate ? <Text style={{ color: colors.textMuted, ...font.body(12) }}>{t('student.dashboardPrimaryAction.copy009', [preview.recommendedDate])}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {accessory ? <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={{ color: colors.textPrimary, ...font.display(22) }}>{exerciseTitle(resolveExerciseMetadata(active.exercise.exercise_id))}</Text>
            {loadTypeRows ? <LoadTypeSummary sets={active.exercise.sets} /> : <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: colors.textMuted, ...font.mono(fontMetrics.size12) }}>{[
              t('student.accessory.accessory'),
              accessoryRows({ drafts: accessoryDrafts, previousLogs, unit }).every(row => row.isBodyweight) ? t('student.accessory.bodyweight') : null,
              prescriptionSummary(accessoryDrafts.filter(draft => !draft.kind).map(draft => ({ prescription: decodePrescription(draft.planSet), resolution: suggestionForDraft(draft).percentage }))),
              t('student.todayWorkoutPresentation.copy003', [active.exerciseOrdinal + 1, groups.length]),
            ].filter(Boolean).join(' · ')}</Text>}
          </View> : <Text style={{ color: colors.textPrimary, ...font.display(22), flex: 1 }}>{preview?.title ?? (recording && active ? exerciseTitle(resolveExerciseMetadata(active.exercise.exercise_id)) : t('student.todayWorkoutScreen.copy017'))}</Text>}
          {editable && active && onAskCoach ? <Pressable accessibilityRole="button" accessibilityLabel={t('student.askCoach')} disabled={preparingShare} onPress={() => onAskCoach(active)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <View style={{ minHeight: 36, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceCard }}>
              {preparingShare ? <ActivityIndicator size="small" color={colors.textTertiary} /> : <Text style={{ ...font.body(13, 'bold'), color: colors.textPrimary }}>{t('student.askCoach')}</Text>}
            </View>
          </Pressable> : null}
        </View>
        {progressFlow && active && !accessory ? <SetProgressBar key={active.exercise.id} drafts={progress.active!.drafts} /> : null}
        {!recording ? (
          <>
            <Text style={{ color: colors.textTertiary, ...font.mono(12) }}>
              {preview ? t('student.trainingWeekStrip.summary', [groups.length]) + t('student.todayWorkoutScreen.copy019', [drafts.filter(draft => !draft.kind).length]) : <>
                {t('student.todayWorkoutScreen.copy018', [groups.length])}
                {t('student.todayWorkoutScreen.copy019', [drafts.filter(draft => !draft.kind).length])}
              </>}
            </Text>
            {groups.map((group, index) => (
              <View key={group.exercise.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.borderSubtle }}>
                <Text style={{ ...font.mono(11, 'bold'), color: colors.goldText, backgroundColor: `${colors.goldRGB}1F`, borderRadius: 7, width: 22, height: 22, textAlign: 'center', textAlignVertical: 'center' }}>{index + 1}</Text>
                <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: spacing.sm, rowGap: spacing.xs }}>
                  <Text style={{ color: colors.textPrimary, ...font.body(14, 'bold'), flexShrink: 0, maxWidth: '100%' }}>
                    {exerciseTitle(
                      resolveExerciseMetadata(group.exercise.exercise_id),
                    )}
                  </Text>
                  <Text style={{ color: colors.textTertiary, ...font.mono(12), flexShrink: 0, maxWidth: '100%' }}>
                    {prescriptionSummary(
                      group.drafts.map((draft) => ({
                        prescription: decodePrescription(draft.planSet),
                        resolution: suggestionForDraft(draft).percentage,
                      })),
                    )}
                  </Text>
                </View>
              </View>
            ))}
            {preview?.unlockMessage ? <Text style={{ color: colors.textSecondary, ...font.body(13) }}>{preview.unlockMessage}</Text> : null}
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
            {editable && coachNotes.exerciseNote ? <View style={{ padding: spacing.md, gap: spacing.point3, borderRadius: radius.inset, backgroundColor: colors.goldSoft }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <MaterialCommunityIcons name="message-outline" size={spacing.point14} color={colors.goldText} />
                <Text style={{ flex: 1, color: colors.goldText, ...font.body(fontMetrics.size11, 'bold') }}>{t('student.todayWorkoutScreen.copy014')}</Text>
              </View>
              <Text style={{ color: colors.textPrimary, ...font.body(fontMetrics.size15, 'medium'), lineHeight: fontMetrics.size21 }}>{coachNotes.exerciseNote}</Text>
            </View> : null}
            {accessory ? <AccessoryLogCard key={active.exercise.id} drafts={accessoryDrafts} previousLogs={previousLogs} unit={unit} studentId={studentId} onRecord={onRecord} onSave={onAccessorySave} onInputFocus={onAccessoryInputFocus} inlineEdits={inlineEdits} onAddSet={onAddSet ? () => onAddSet(active.exercise) : undefined} onRemoveSet={onRemoveSet} /> : <>
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
            {lowerNote ? (
              <View style={{ paddingHorizontal: 12, paddingVertical: 10, gap: 3, borderRadius: 10, backgroundColor: colors.bgInset }}>
                <Text style={{ color: colors.textFaint, ...font.mono(11) }}>{t('student.todayWorkoutScreen.copy014')}</Text>
                <Text style={{ color: colors.coachNoteText, ...font.body(12), lineHeight: 18 }}>{lowerNote}</Text>
              </View>
            ) : null}
            {editable ? (
              <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: spacing.point9 }}>
                <AppButton
                  style={{ flex: 1 }}
                  label={t('student.todayWorkoutScreen.copy015')}
                  onPress={() => onRecord(active)}
                />
                {hasCamera ? <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('student.todayWorkoutScreen.copy016')}
                  onPress={() => onVideo(active)}
                  style={{ width: spacing.point52, minHeight: spacing.point52, aspectRatio: 1, borderRadius: radius.control, borderWidth: spacing.point1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceCard, alignItems: 'center', justifyContent: 'center' }}
                >
                  <MaterialCommunityIcons name="video-outline" size={spacing.point22} color={colors.textTertiary} />
                </Pressable> : null}
              </View>
            ) : null}
            </>}
          </>
        ) : null}
      </Card> : null}
      {recording && !completedDay ? (progressFlow
        ? groups.filter(group => !progress.completed.includes(group))
        : groups).map(group => renderGroup(group, false)) : null}
      {recording && !completedDay ? addedGroups.map(({ exercise, rows }) => <Card key={exercise.id} style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ flex: 1, ...font.body(fontMetrics.size16, 'bold'), color: colors.textPrimary }}>{exerciseTitle(resolveExerciseMetadata(exercise.exercise_id))}</Text>
          <Text style={{ ...font.body(fontMetrics.size11), color: colors.textMuted, backgroundColor: colors.bgInset, padding: spacing.xs, borderRadius: radius.inset }}>{t('student.added.added')}</Text>
          {editable && onRemoveExercise ? <AppButton variant="link" label={t('student.added.remove')} onPress={() => onRemoveExercise(exercise)} /> : null}
        </View>
        {inlineCard(exercise, rows)}
      </Card>) : null}
      {editable && recording && onAddExercise ? <>
        <Pressable accessibilityRole="button" accessibilityLabel={t('student.added.addExercise')} disabled={addedGroups.length >= 10} onPress={onAddExercise} style={{ minHeight: spacing.minimumHitTarget, borderWidth: spacing.point1, borderColor: colors.borderStrong, borderStyle: 'dashed', borderRadius: radius.control, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...font.body(fontMetrics.size15), color: colors.goldText }}>＋ {t('student.added.addExercise')}</Text>
        </Pressable>
        <Text style={{ ...font.body(fontMetrics.size12), color: colors.textMuted, textAlign: 'center' }}>{t('student.added.addedHint')}</Text>
      </> : null}
    </>
  );
}
