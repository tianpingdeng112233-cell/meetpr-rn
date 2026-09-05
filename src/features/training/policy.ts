import { decodePrescription } from '@/domain/plan/prescription';
import { gymDayToday, localDateText } from '@/domain/plan/workout-date-policy';
import { t } from '@/i18n';
import type { PlanExercise, PlanSet } from '@/api/domains/plans';
import type { SetLog } from '@/api/domains/sets';
import { suggestedWeightKg } from '@/domain/e1rm';

import { REST_DEFAULTS, RIR_KEYS, TRAINING_LIMITS } from './constants';
import type { WeightSuggestion, WorkoutSetDraft } from './model';

export { localDateText };

const DAY_MS = 86_400_000;

export const gymDayText = gymDayToday;

export function parseLocalDate(dateText: string): Date {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(dateText: string, amount: number): string {
  const date = parseLocalDate(dateText);
  date.setDate(date.getDate() + amount);
  return localDateText(date);
}

export function historyRangeStart(dateText: string): string {
  return addDays(dateText, -TRAINING_LIMITS.historyWindowDays);
}

export function daysBetween(start: string, end: string): number {
  const startDate = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  return Math.round((endDate.getTime() - startDate.getTime()) / DAY_MS);
}

export function restDefaultSeconds(rpe: number | null): number {
  if (rpe === null) return REST_DEFAULTS.withoutRPE;
  if (rpe < 7) return REST_DEFAULTS.belowSeven;
  if (rpe < 9) return REST_DEFAULTS.belowNine;
  return REST_DEFAULTS.nineOrAbove;
}

export function resolveRestSeconds({
  prescribed,
  preference,
  rpe,
}: {
  prescribed: number | null;
  preference: number | null;
  rpe: number | null;
}): number {
  return Math.max(
    0,
    Math.min(
      TRAINING_LIMITS.restMaximumSeconds,
      prescribed ?? preference ?? restDefaultSeconds(rpe),
    ),
  );
}

export function rirCopy(rpe: number): string {
  const snapped = Math.max(5, Math.min(10, Math.round(rpe * 2) / 2));
  if (snapped === 10) return t('student.setEntryRpe.copy011');
  return t(RIR_KEYS[snapped as keyof typeof RIR_KEYS]);
}

export function normalizeDecimalInput(value: string): string {
  return value.replace(',', '.').trim();
}

export function parseFiniteDecimal(value: string): number | null {
  if (!normalizeDecimalInput(value)) return null;
  const parsed = Number(normalizeDecimalInput(value));
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatWeight(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function plateLoadout(totalWeightKg: number, collarOn: boolean): {
  perSideKg: number;
  detail: string;
} {
  const collar = collarOn ? TRAINING_LIMITS.collarWeightPerSideKg : 0;
  const perSideKg = Math.max(
    0,
    (totalWeightKg - TRAINING_LIMITS.barWeightKg) / 2 - collar,
  );
  if (perSideKg === 0 && !collarOn) {
    return { perSideKg, detail: t('student.setEntryPlateLoadout.copy003') };
  }
  if (perSideKg === 0) {
    return { perSideKg, detail: t('student.setEntryPlateLoadout.copy001') };
  }
  const plates: string[] = [];
  let remainder = perSideKg;
  for (const size of [25, 20, 15, 10, 5, 2.5, 1.25]) {
    const count = Math.floor((remainder + 1e-6) / size);
    if (count > 0) {
      plates.push(`${formatWeight(size)}kg×${count}`);
      remainder -= count * size;
    }
  }
  const plateCopy = plates.join(' + ') || `${formatWeight(perSideKg)}kg`;
  return {
    perSideKg,
    detail: collarOn ? `${plateCopy}${t('student.setEntryPlateLoadout.copy002')}` : plateCopy,
  };
}

export function planSetPrescription(planSet: PlanSet): {
  weightKg: number | null;
  reps: number;
  rpe: number | null;
} {
  const prescription = decodePrescription(planSet);
  return { weightKg: prescription.weightKg ?? null, reps: prescription.reps, rpe: prescription.intensity?.kind === 'rpe' ? prescription.intensity.value : null };
}

function recentCompleted(
  logs: readonly SetLog[],
  exerciseId: string,
): SetLog | undefined {
  return [...logs]
    .filter(
      (log) =>
        log.exercise_id === exerciseId && log.completed && !log.failed && !log.assumed,
    )
    .sort((a, b) => b.logged_at.localeCompare(a.logged_at))[0];
}

export function selectWeightSuggestion({
  planSet,
  exercise,
  priorDrafts,
  sameDayLogs,
  historyLogs,
  e1RMKg,
}: {
  planSet: PlanSet;
  exercise: PlanExercise;
  priorDrafts: readonly WorkoutSetDraft[];
  sameDayLogs: readonly SetLog[];
  historyLogs: readonly SetLog[];
  e1RMKg: number | null;
}): WeightSuggestion {
  const prescription = planSetPrescription(planSet);
  if (
    prescription.weightKg !== null ||
    prescription.rpe === null ||
    !Number.isFinite(prescription.rpe)
  ) {
    return null;
  }

  if (exercise.is_main_lift) {
    const matchingPrior = [...priorDrafts]
      .reverse()
      .find((draft) => {
        const prior = planSetPrescription(draft.planSet);
        return (
          draft.exercise.id === exercise.id &&
          draft.status === 'complete' &&
          !draft.sourceLog?.assumed &&
          prior.reps === prescription.reps &&
          prior.rpe === prescription.rpe &&
          (parseFiniteDecimal(draft.weightText) ?? 0) > 0
        );
      });
    if (matchingPrior) {
      return {
        weightKg: parseFiniteDecimal(matchingPrior.weightText) as number,
        label: t('student.progression.suggestionPrevious'),
      };
    }
    if (e1RMKg !== null) {
      const weight = suggestedWeightKg(
        e1RMKg,
        prescription.reps,
        prescription.rpe,
      );
      if (weight !== null) {
        return {
          weightKg: weight,
          label: t('student.progression.suggestionE1RM', [formatWeight(e1RMKg)]),
        };
      }
    }
    return null;
  }

  const prior =
    recentCompleted(sameDayLogs, exercise.exercise_id) ??
    recentCompleted(historyLogs, exercise.exercise_id);
  return prior
    ? { weightKg: Number(prior.weight_kg), label: t('student.progression.suggestionLast') }
    : null;
}
