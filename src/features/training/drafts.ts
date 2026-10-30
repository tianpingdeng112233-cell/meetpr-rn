import type { PlanDay, PlanExercise, PlanSet } from '@/api/domains/plans';
import type { SetLog, SetLogUpsertRequest } from '@/api/domains/sets';

import type { WorkoutSetDraft } from './model';
import { accessoryLogRequest, type AccessoryRow } from './accessory-quick-log';
import type { SetLogInput } from './set-log-input';
import { formatWeight, planSetPrescription } from './policy';

export function synthesizeDrafts(
  planDay: PlanDay,
  logs: readonly SetLog[],
): WorkoutSetDraft[] {
  const prescribed: WorkoutSetDraft[] = [...planDay.exercises]
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
            effortKind: log?.actual_rir != null ? 'rir' : 'rpe',
            rpeText:
              log?.actual_rir != null ? String(log.actual_rir) : log?.rpe != null
                ? formatWeight(Number(log.rpe))
                : log || prescription.rpe === null
                  ? ''
                  : formatWeight(prescription.rpe),
            sourceLog: log ?? null,
          } satisfies WorkoutSetDraft;
        }),
    );
  return prescribed.concat(planDay.exercises.flatMap((exercise, exerciseOrdinal) => {
    const indices = [...new Set(logs.filter(log => log.plan_exercise_id === exercise.id && log.set_index >= exercise.sets.length).map(log => log.set_index))].sort((a, b) => a - b);
    return indices.map(index => {
      const source = logs.filter(log => log.plan_exercise_id === exercise.id && log.set_index === index)
        .sort((a, b) => Number(a.assumed) - Number(b.assumed) || Date.parse(b.logged_at) - Date.parse(a.logged_at))[0];
      return unprescribedDraft(exercise, index, 'extra', exerciseOrdinal, source);
    });
  }));
}

/** Synthetic set metadata only adapts the existing editor; it is never sent as a prescription. */
function unprescribedDraft(exercise: PlanExercise, setIndex: number, kind: 'extra' | 'added', exerciseOrdinal: number, sourceLog: SetLog | null = null): WorkoutSetDraft {
  const stableSetId = `${kind}:${exercise.id}:${setIndex}`;
  const planSet: PlanSet = { id: stableSetId, plan_exercise_id: exercise.id, set_number: setIndex + 1,
    target_reps: 0, target_reps_max: null, intensity_mode: 'weight', target_value: '0',
    set_type: 'working', rest_seconds: null, coach_note: null, created_at: '' };
  return { stableSetId, kind, exercise, planSet, exerciseOrdinal, setIndex, sourceLog,
    status: sourceLog?.failed ? 'failed' : sourceLog?.completed ? 'complete' : 'pending',
    weightText: sourceLog ? formatWeight(Number(sourceLog.weight_kg)) : '',
    repsText: sourceLog ? String(sourceLog.reps) : '', effortKind: sourceLog?.actual_rir != null ? 'rir' : 'rpe', rpeText: sourceLog?.actual_rir != null ? String(sourceLog.actual_rir) : sourceLog?.rpe == null ? '' : formatWeight(Number(sourceLog.rpe)) };
}

export function addExtraDraft(exercise: PlanExercise, drafts: readonly WorkoutSetDraft[]): WorkoutSetDraft | null {
  const rows = drafts.filter(row => row.exercise.id === exercise.id);
  if (rows.filter(row => row.kind === 'extra').length >= 10) return null;
  const index = Math.max(exercise.sets.length - 1, ...rows.map(row => row.setIndex)) + 1;
  const lastLog = rows.filter(row => row.sourceLog && !row.sourceLog.assumed && isDraftTerminal(row))
    .sort((a, b) => Date.parse(b.sourceLog!.logged_at) - Date.parse(a.sourceLog!.logged_at) || b.setIndex - a.setIndex)[0];
  const lastPrescription = rows.filter(row => !row.kind).sort((a, b) => b.setIndex - a.setIndex)[0];
  const previous = lastLog ?? lastPrescription;
  return { ...unprescribedDraft(exercise, index, 'extra', rows[0]?.exerciseOrdinal ?? exercise.sort_order),
    weightText: previous?.weightText ?? '', repsText: previous?.repsText ?? '' };
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

export function studentAddedDrafts(dayId: string, logs: readonly SetLog[]): WorkoutSetDraft[] {
  const relevant = logs.filter(log => log.adhoc && log.plan_day_id === dayId);
  return [...new Set(relevant.map(log => log.exercise_id))].flatMap((exerciseId, ordinal) => {
    const exercise = studentExercise(dayId, exerciseId, ordinal);
    const rows = relevant.filter(log => log.exercise_id === exerciseId).sort((a, b) => Date.parse(a.logged_at) - Date.parse(b.logged_at));
    const date = rows[0].logged_date;
    return [...new Set(rows.map(log => log.set_index))].sort((a, b) => a - b).map(index => ({
      ...unprescribedDraft(exercise, index, 'added', ordinal, rows.filter(log => log.set_index === index).at(-1)), loggedDate: date,
    }));
  });
}

function studentExercise(dayId: string, exerciseId: string, ordinal: number): PlanExercise {
  return { id: `added:${dayId}:${exerciseId}`, plan_day_id: dayId, exercise_id: exerciseId, is_main_lift: false, sort_order: ordinal, notes: null, sets: [] };
}

export function addStudentExercise(day: PlanDay, exerciseId: string, drafts: readonly WorkoutSetDraft[]): WorkoutSetDraft | null {
  const added = drafts.filter(draft => draft.kind === 'added' && draft.exercise.plan_day_id === day.id);
  const ids = new Set(added.map(draft => draft.exercise.exercise_id));
  if (ids.size >= 10 || ids.has(exerciseId) || day.exercises.some(exercise => exercise.exercise_id === exerciseId)) return null;
  return unprescribedDraft(studentExercise(day.id, exerciseId, ids.size), 0, 'added', ids.size);
}

export function addStudentSet(exercise: PlanExercise, drafts: readonly WorkoutSetDraft[]): WorkoutSetDraft | null {
  const rows = drafts.filter(draft => draft.kind === 'added' && draft.exercise.id === exercise.id);
  if (rows.length >= 10) return null;
  return { ...unprescribedDraft(exercise, Math.max(-1, ...rows.map(row => row.setIndex)) + 1, 'added', exercise.sort_order),
    loggedDate: rows.find(row => row.loggedDate)?.loggedDate };
}


export function studentAddedLogRequest(draft: WorkoutSetDraft, row: AccessoryRow, input: SetLogInput, action: 'complete' | 'cancel', today: string): SetLogUpsertRequest {
  const { plan_exercise_id: _planExerciseId, ...fields } = accessoryLogRequest(row, input, { planExerciseId: draft.exercise.id, action }) as Extract<SetLogUpsertRequest, { plan_exercise_id: string }>;
  return { ...fields, exercise_id: draft.exercise.exercise_id, plan_day_id: draft.exercise.plan_day_id, logged_date: draft.loggedDate ?? today };
}
