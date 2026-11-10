import type { PlanDay, PlanExercise } from '@/api/domains/plans';
import { effortFields } from './actual-effort';
import type { SetLog, SetLogUpsertRequest } from '@/api/domains/sets';
import { decodePrescription } from '@/domain/plan/prescription';
import { synthesizeDrafts, studentAddedDrafts } from './drafts';
import type { WorkoutSetDraft } from './model';

export type AllDayWeightSuggestion = {
  plan_set_id: string; weight_kg: string; source_set_log_id: string; source_logged_date: string;
};
export type AllDayExercise = {
  exercise: PlanExercise; rows: WorkoutSetDraft[]; collapsed: boolean; repeatName: boolean;
  node: 'complete' | 'current' | 'pending'; lastSet: WorkoutSetDraft | null;
};
export type AllDaySheet = { exercises: AllDayExercise[] };

export function buildAllDaySheet(planDay: PlanDay, logs: readonly SetLog[], suggestions: readonly AllDayWeightSuggestion[],
  options: { drafts?: readonly WorkoutSetDraft[]; completedExercises?: ReadonlySet<string>; expandedExerciseId?: string | null } = {}): AllDaySheet {
  const rows = (options.drafts ?? [...synthesizeDrafts(planDay, logs), ...studentAddedDrafts(planDay.id, logs)]).map(row => {
    if (row.sourceLog || row.kind) return row;
    const prescription = decodePrescription(row.planSet);
    const effort = prescription.intensity;
    const suggestion = prescription.weightKg == null && (effort?.kind === 'rpe' || effort?.kind === 'rpeRange')
      ? suggestions.find(item => item.plan_set_id === row.planSet.id) : undefined;
    return { ...row,
      weightText: row.weightText || (prescription.intensity?.kind === 'weightRange' ? String(prescription.intensity.low) : suggestion ? String(Number(suggestion.weight_kg)) : ''),
      effortKind: effort?.kind === 'rir' ? 'rir' as const : row.effortKind,
      rpeText: row.rpeText || (effort?.kind === 'rir' ? String(effort.value) : effort?.kind === 'rpeRange' ? String(effort.low) : ''),
    };
  });
  let hasCurrent = false;
  const exercises = [...planDay.exercises].sort((a, b) => a.sort_order - b.sort_order);
  rows.forEach(row => { if (!exercises.some(exercise => exercise.id === row.exercise.id)) exercises.push(row.exercise); });
  const expandedId = options.expandedExerciseId === undefined
    ? exercises.find(exercise => !planDay.completed_at && !options.completedExercises?.has(exercise.id))?.id : options.expandedExerciseId;
  return { exercises: exercises.map((exercise, index) => {
    const exerciseRows = rows.filter(row => row.exercise.id === exercise.id).sort((a, b) => a.setIndex - b.setIndex);
    const complete = Boolean(planDay.completed_at) || (options.completedExercises?.has(exercise.id) ?? false);
    const node = complete ? 'complete' : hasCurrent ? 'pending' : 'current';
    if (!complete) hasCurrent = true;
    return { exercise, rows: exerciseRows, collapsed: exercise.id !== expandedId,
      repeatName: index > 0 && exercises[index - 1].exercise_id === exercise.exercise_id, node, lastSet: exerciseRows.at(-1) ?? null };
  }) };
}


export function allDayLogRequest(row: WorkoutSetDraft): SetLogUpsertRequest {
  const fields = { set_index: row.setIndex, weight_kg: row.weightText.trim() ? String(Number(row.weightText)) : null,
    reps: Number(row.repsText), ...effortFields(row.effortKind ?? 'rpe', row.rpeText), completed: true, failed: false };
  return row.kind === 'added'
    ? { ...fields, exercise_id: row.exercise.exercise_id, plan_day_id: row.exercise.plan_day_id, logged_date: row.loggedDate ?? row.sourceLog?.logged_date ?? '' }
    : { ...fields, plan_exercise_id: row.exercise.id };
}

/** Whole-day completion leaves existing actuals intact; checking an exercise saves its displayed values. */
export function completionWrites(sheet: AllDaySheet, exerciseId?: string) {
  return sheet.exercises.filter(block => !exerciseId || block.exercise.id === exerciseId).flatMap(block =>
    block.rows.filter(row => !(row.kind && !row.sourceLog && !row.weightText.trim() && !row.repsText.trim() && !row.rpeText.trim()))
      .filter(row => exerciseId || !row.sourceLog || row.sourceLog.assumed)
      .map(row => ({ row, request: allDayLogRequest(row) })));
}
