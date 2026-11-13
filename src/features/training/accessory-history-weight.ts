import type { SetLog } from '@/api/domains/sets';
import { decodePrescription, type Prescription } from '@/domain/plan/prescription';
import type { WorkoutSetDraft } from './model';

export type AccessoryWeightHistory = {
  logs: readonly SetLog[];
  studentId: string;
  throughDate: string;
  isAccessory: (exerciseId: string) => boolean;
};

/** Pick the session before looking up a set: never borrow a missing set from an older session. */
export function previousAccessoryWeight(row: WorkoutSetDraft, history: AccessoryWeightHistory, currentExerciseIds: ReadonlySet<string>): number | null {
  const eligible = history.logs.filter(log => log.student_id === history.studentId &&
    log.exercise_id === row.exercise.exercise_id && !currentExerciseIds.has(log.plan_exercise_id ?? '') &&
    log.plan_day_id !== row.exercise.plan_day_id && log.logged_date <= history.throughDate &&
    log.completed && !log.failed && !log.assumed);
  const latest = [...eligible].sort((a, b) => b.logged_date.localeCompare(a.logged_date) || b.logged_at.localeCompare(a.logged_at))[0];
  if (!latest) return null;
  const previous = eligible.filter(log => log.logged_date === latest.logged_date &&
    log.plan_exercise_id === latest.plan_exercise_id && log.plan_day_id === latest.plan_day_id && log.set_index === row.setIndex)
    .sort((a, b) => b.logged_at.localeCompare(a.logged_at))[0];
  if (previous?.weight_kg == null) return null;
  const weight = Number(previous.weight_kg);
  return Number.isFinite(weight) && weight >= 0 ? weight : null;
}

export function allowsHistoricalWeight(prescription: Prescription): boolean {
  return prescription.weightKg == null && prescription.loadMode !== 'bodyweight' &&
    prescription.intensity?.kind !== 'pct' && prescription.intensity?.kind !== 'weightRange';
}

export function withAccessoryWeightHistory(row: WorkoutSetDraft, history: AccessoryWeightHistory | undefined, currentExerciseIds: ReadonlySet<string>): WorkoutSetDraft {
  if (!history || row.kind || !history.isAccessory(row.exercise.exercise_id)) return row;
  const prescription = decodePrescription(row.planSet);
  if (prescription.loadMode === 'bodyweight' || prescription.intensity?.kind === 'pct' ||
    prescription.intensity?.kind === 'weightRange') return row;
  const previousWeightKg = previousAccessoryWeight(row, history, currentExerciseIds);
  const mayFill = !row.sourceLog && !row.weightEdited && allowsHistoricalWeight(prescription) &&
    (!row.weightText || row.weightPrefilledFromHistory);
  const prefilled = Boolean(mayFill && previousWeightKg != null);
  return { ...row, previousWeightKg, weightPrefilledFromHistory: prefilled,
    weightText: prefilled ? String(previousWeightKg) : row.weightText };
}
