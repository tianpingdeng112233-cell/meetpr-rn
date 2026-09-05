import type { PlanExercise, PlanSet } from '@/api/domains/plans';
import type { SetLog } from '@/api/domains/sets';
import type { LiftFamily } from '@/domain/e1rm';
import {
  resolvePctAnchor,
  type PctAnchorReason,
  type PctAnchorResolution,
} from '@/domain/e1rm/pct-anchor';
import { decodePrescription } from '@/domain/plan/prescription';
import { t } from '@/i18n';
import type { WeightSuggestion, WorkoutSetDraft } from './model';
import { formatWeight, selectWeightSuggestion } from './policy';
export type SuggestionOutcome = {
  suggestion: WeightSuggestion;
  reason: string | null;
  percentage?: PctAnchorResolution;
};
export type SuggestionInput = {
  planSet: PlanSet;
  exercise: PlanExercise;
  priorDrafts: readonly WorkoutSetDraft[];
  sameDayLogs: readonly SetLog[];
  historyLogs: readonly SetLog[];
  e1RMKg: number | null;
  registeredOneRMKg: number | null;
  family: LiftFamily | null;
};
export function weightSuggestionOutcome(
  input: SuggestionInput,
): SuggestionOutcome {
  const p = decodePrescription(input.planSet);
  const empty = { suggestion: null, reason: null };
  if (p.weightKg !== undefined) return empty;
  if (p.intensity?.kind === 'pct') {
    const percentage = resolvePctAnchor({
      percentage: p.intensity.value,
      anchor: p.percentageAnchor ?? 'registered_1rm',
      family: input.family,
      registeredOneRMKg: input.registeredOneRMKg,
      currentE1RMKg: input.e1RMKg,
      exerciseId: input.exercise.exercise_id,
      sortOrder: input.exercise.sort_order,
      sameDaySets: input.priorDrafts
        .filter((d) => !d.sourceLog?.assumed)
        .map((d) => ({
          exerciseId: d.exercise.exercise_id,
          sortOrder: d.exercise.sort_order,
          weightKg: d.weightText.trim() ? Number(d.weightText) : null,
          reps: Number(d.repsText),
          completed: d.status === 'complete',
          failed: d.status === 'failed',
        })),
    });
    const reasons: Record<PctAnchorReason, string> = {
      unsupportedExercise: t('student.todayWorkoutTypes.copy008'),
      missingRegisteredOneRM: t('student.todayWorkoutTypes.copy009'),
      topSetNotCompleted: t('student.todayWorkoutTypes.copy010'),
    };
    return {
      percentage,
      reason: percentage.reason ? reasons[percentage.reason] : null,
      suggestion:
        percentage.resolvedKg == null
          ? null
          : {
              weightKg: percentage.resolvedKg,
              label: t(
                percentage.source === 'e1rm'
                  ? 'student.todayWorkoutTypes.copy012'
                  : percentage.source === 'top_set'
                    ? 'student.todayWorkoutTypes.copy013'
                    : 'student.todayWorkoutTypes.copy011',
                [percentage.anchorKg ?? ''],
              ),
              percentage,
            },
    };
  }
  if (p.intensity && p.intensity.kind !== 'rpe') return empty;
  if (p.loadMode && p.loadMode !== 'rpe') return empty;
  if (input.exercise.is_main_lift) {
    if (p.intensity?.kind !== 'rpe')
      return { ...empty, reason: t('student.todayWorkoutTypes.copy002') };
    if (!p.reps)
      return { ...empty, reason: t('student.todayWorkoutTypes.copy003') };
    if (p.reps < 1 || p.reps > 12)
      return { ...empty, reason: t('student.todayWorkoutTypes.copy004') };
    if (p.intensity.value < 6)
      return { ...empty, reason: t('student.todayWorkoutTypes.copy005') };
    if (p.intensity.value > 10)
      return { ...empty, reason: t('student.todayWorkoutTypes.copy006') };
  }
  const suggestion = selectWeightSuggestion(input);
  return {
    suggestion,
    reason: suggestion
      ? null
      : t(
          input.exercise.is_main_lift
            ? 'student.todayWorkoutTypes.copy001'
            : 'student.todayWorkoutTypes.copy007',
        ),
  };
}

/** Only pct may auto-fill a new intensity-only prescription. Existing input wins. */
export function entryPrefill(
  set: PlanSet,
  actualWeight: string | null,
  suggestion: WeightSuggestion,
  isMainLift = false,
): string {
  const p = decodePrescription(set);
  if (!p.loadMode) {
    const floor = isMainLift ? 20 : 0;
    const actual = actualWeight?.trim() ? Number(actualWeight) : undefined;
    return formatWeight(
      Math.max(floor, actual ?? p.weightKg ?? suggestion?.weightKg ?? floor),
    );
  }
  if (actualWeight !== null && actualWeight !== '') return actualWeight;
  if (p.weightKg !== undefined) return formatWeight(p.weightKg);
  return p.intensity?.kind === 'pct' && suggestion
    ? formatWeight(suggestion.weightKg)
    : '';
}
