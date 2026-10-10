import type { SetLog, SetLogUpsertRequest } from '@/api/domains/sets';
import { metricDisplay, metricStored, POUNDS_PER_KG } from '@/domain/measurement';
import { decodePrescription } from '@/domain/plan/prescription';
import type { DraftStatus, WorkoutSetDraft } from './model';
import { formatWeight } from './policy';
import { validateSetLogInput, type SetLogInput, type SetLogValidation } from './set-log-input';

/** Use the catalog type, never the plan's is_main_lift flag. */
export function isAccessoryExercise(exerciseType: string | null | undefined): boolean {
  return exerciseType === 'accessory';
}

export type AccessoryRow = {
  stableSetId: string;
  setIndex: number;
  status: DraftStatus;
  hasVideo: boolean;
  unit: 'kg' | 'lb';
  weightText: string;
  weightPlaceholder: string;
  repsText: string;
  rpeText: string;
  rpePlaceholder: string | { kind: 'rir'; value: number };
  isBodyweight: boolean;
  previous: { weightText: string; reps: number } | null;
  extraNote: string | null;
  recorded: Pick<SetLog, 'weight_kg' | 'reps' | 'rpe'> | null;
};

/** previousLogs is already scoped to this exercise in its previous session. */
export function accessoryRows({ drafts, previousLogs, unit, videoById = {} }: {
  drafts: readonly WorkoutSetDraft[];
  previousLogs: readonly SetLog[];
  unit: 'kg' | 'lb';
  videoById?: Readonly<Record<string, boolean>>;
}): AccessoryRow[] {
  const weightText = (kg: number) => unit === 'lb' && kg !== 0
    ? metricDisplay(String(kg), POUNDS_PER_KG) : formatWeight(kg);
  return drafts.map(draft => {
    const prescription = decodePrescription(draft.planSet);
    const prior = previousLogs.find(log => log.set_index === draft.setIndex);
    const previous = prior ? { weightText: weightText(Number(prior.weight_kg)), reps: prior.reps } : null;
    const intensity = prescription.intensity;
    const source = draft.sourceLog;
    const note = draft.planSet.coach_note;
    const isBodyweight = /自重|bodyweight/i.test(note ?? '');
    return {
      stableSetId: draft.stableSetId,
      setIndex: draft.setIndex,
      status: draft.status,
      hasVideo: videoById[draft.stableSetId] ?? false,
      unit,
      weightText: isBodyweight ? 'BW' : source ? weightText(Number(source.weight_kg))
        : prescription.weightKg == null ? '' : weightText(prescription.weightKg),
      weightPlaceholder: previous?.weightText ?? '',
      repsText: String(source?.reps ?? prescription.reps),
      rpeText: source?.rpe == null ? '' : formatWeight(Number(source.rpe)),
      rpePlaceholder: intensity?.kind === 'rir' ? { kind: 'rir' as const, value: intensity.value }
        : intensity?.kind === 'rpe' ? formatWeight(intensity.value) : '',
      isBodyweight,
      previous,
      extraNote: !isBodyweight && note?.trim() ? note : null,
      recorded: source ? { weight_kg: source.weight_kg, reps: source.reps, rpe: source.rpe } : null,
    };
  });
}

export function accessoryRowWritable(row: AccessoryRow, edited: SetLogInput): SetLogValidation {
  return validateSetLogInput(row.isBodyweight ? { ...edited, weightText: '0' } : edited);
}

export type AccessoryLogOptions = { planExerciseId: string; loggedDate?: string; action?: 'complete' | 'cancel' };

/** Defaults to save/overwrite; callers explicitly request cancellation of an unchanged completed row. */
export function accessoryLogRequest(row: AccessoryRow, edited: SetLogInput, options: AccessoryLogOptions): SetLogUpsertRequest {
  const cancel = options.action === 'cancel';
  if (cancel && (row.status !== 'complete' || row.hasVideo || !row.recorded)) {
    throw new Error('Cannot cancel this set');
  }
  if (!cancel && !accessoryRowWritable(row, edited).writable) throw new Error('Invalid set input');
  const recorded = cancel ? row.recorded : null;
  const weight = row.isBodyweight ? 0 : Number(edited.weightText);
  const weightKg = row.unit === 'lb' && weight !== 0
    ? metricStored(weight, POUNDS_PER_KG) : String(weight);
  return {
    plan_exercise_id: options.planExerciseId,
    ...(options.loggedDate ? { logged_date: options.loggedDate } : {}),
    set_index: row.setIndex,
    weight_kg: recorded?.weight_kg ?? weightKg,
    reps: recorded?.reps ?? Number(edited.repsText),
    rpe: recorded ? recorded.rpe : edited.rpeText === '' ? null : String(Number(edited.rpeText)),
    completed: !cancel,
    failed: false,
  };
}

/** Selection only: callers submit the returned rows serially with the same edits. */
export function rowsToCompleteAll(rows: readonly AccessoryRow[], editedById: Readonly<Record<string, SetLogInput>>): {
  toWrite: AccessoryRow[];
  skipped: AccessoryRow[];
} {
  const toWrite: AccessoryRow[] = [];
  const skipped: AccessoryRow[] = [];
  for (const row of [...rows].sort((a, b) => a.setIndex - b.setIndex)) {
    if (row.status !== 'pending') continue;
    (accessoryRowWritable(row, editedById[row.stableSetId] ?? row).writable ? toWrite : skipped).push(row);
  }
  return { toWrite, skipped };
}
