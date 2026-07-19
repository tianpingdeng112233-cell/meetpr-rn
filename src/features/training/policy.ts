import type { PlanDay, PlanExercise, PlanSet } from '@/api/domains/plans';
import type { SetLog } from '@/api/domains/sets';
import { suggestedWeightKg } from '@/domain/e1rm';

import { REST_DEFAULTS, RIR_COPY, TRAINING_LIMITS } from './constants';
import type { WeightSuggestion, WorkoutSetDraft } from './model';

const DAY_MS = 86_400_000;

export function localDateText(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function gymDayText(now = new Date()): string {
  const gymDate = new Date(now);
  gymDate.setHours(gymDate.getHours() - TRAINING_LIMITS.gymDayCutoffHour);
  return localDateText(gymDate);
}

export function isGymDayEditable(dateText: string, now = new Date()): boolean {
  return dateText === gymDayText(now);
}

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

export function scheduledDate(planStart: string, day: PlanDay): string {
  return (
    day.shifted_to_date ??
    addDays(planStart, (day.week_number - 1) * 7 + day.day_of_week - 1)
  );
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
  return RIR_COPY[snapped as keyof typeof RIR_COPY];
}

export function normalizeDecimalInput(value: string): string {
  return value.replace(',', '.').trim();
}

export function parseFiniteDecimal(value: string): number | null {
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
    return { perSideKg, detail: '空杠 20kg' };
  }
  if (perSideKg === 0) {
    return { perSideKg, detail: '仅 2.5kg 赛扣' };
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
  const plateCopy = plates.join(' + ') || `${formatWeight(perSideKg)}kg 片`;
  return {
    perSideKg,
    detail: collarOn ? `${plateCopy} + 2.5kg 赛扣` : plateCopy,
  };
}

export function planSetPrescription(planSet: PlanSet): {
  weightKg: number | null;
  reps: number;
  rpe: number | null;
} {
  return {
    weightKg:
      planSet.intensity_mode === 'weight' ? Number(planSet.target_value) : null,
    reps: planSet.target_reps,
    rpe: planSet.intensity_mode === 'rpe' ? Number(planSet.target_value) : null,
  };
}

function recentCompleted(
  logs: readonly SetLog[],
  exerciseId: string,
): SetLog | undefined {
  return [...logs]
    .filter(
      (log) =>
        log.exercise_id === exerciseId && log.completed && !log.failed,
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
          prior.reps === prescription.reps &&
          prior.rpe === prescription.rpe &&
          (parseFiniteDecimal(draft.weightText) ?? 0) > 0
        );
      });
    if (matchingPrior) {
      return {
        weightKg: parseFiniteDecimal(matchingPrior.weightText) as number,
        label: '建议 · 同上组',
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
          label: `建议 · 基于 e1RM ${formatWeight(e1RMKg)}`,
        };
      }
    }
    return null;
  }

  const prior =
    recentCompleted(sameDayLogs, exercise.exercise_id) ??
    recentCompleted(historyLogs, exercise.exercise_id);
  return prior
    ? { weightKg: Number(prior.weight_kg), label: '建议 · 上次重量' }
    : null;
}
