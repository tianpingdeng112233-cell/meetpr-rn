import type { PlanDay } from '@/api/domains/plans';
import type { SetLog } from '@/api/domains/sets';

import type { WorkoutSetDraft } from './model';
import { formatWeight, planSetPrescription } from './policy';

export function synthesizeDrafts(
  planDay: PlanDay,
  logs: readonly SetLog[],
): WorkoutSetDraft[] {
  return [...planDay.exercises]
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((exercise, exerciseOrdinal) =>
      [...exercise.sets]
        .sort((a, b) => a.set_number - b.set_number)
        .map((planSet, setIndex) => {
          const log = logs.filter(
            (candidate) =>
              candidate.plan_exercise_id === exercise.id &&
              candidate.set_index === setIndex,
          ).sort((a, b) => Number(a.assumed) - Number(b.assumed) || new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())[0];
          const prescription = planSetPrescription(planSet);
          return {
            stableSetId: planSet.id,
            exercise,
            planSet,
            exerciseOrdinal,
            setIndex,
            status: log?.failed
              ? 'failed'
              : log?.completed
                ? 'complete'
                : 'pending',
            // Server decimals arrive as strings ("100.00", "8.0"); show them the way iOS does (0–2 fraction digits).
            weightText:
              log?.weight_kg != null
                ? formatWeight(Number(log.weight_kg))
                : prescription.weightKg === null
                  ? ''
                  : formatWeight(prescription.weightKg),
            repsText: String(log?.reps ?? prescription.reps),
            rpeText:
              log?.rpe != null
                ? formatWeight(Number(log.rpe))
                : prescription.rpe === null
                  ? ''
                  : formatWeight(prescription.rpe),
            sourceLog: log ?? null,
          } satisfies WorkoutSetDraft;
        }),
    );
}

export function mergeLiveDrafts(
  synthesized: readonly WorkoutSetDraft[],
  live: readonly WorkoutSetDraft[],
): WorkoutSetDraft[] {
  const existing = new Map(live.map((draft) => [draft.stableSetId, draft]));
  return synthesized.map((draft) => existing.get(draft.stableSetId) ?? draft);
}

export function isDraftTerminal(draft: WorkoutSetDraft): boolean {
  return draft.status === 'complete' || draft.status === 'failed';
}
