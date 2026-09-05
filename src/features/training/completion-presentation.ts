import type { PlanDay } from '@/api/domains/plans';
import { decodePrescription } from '@/domain/plan/prescription';
import { chineseWeekday } from '@/features/dashboard/model';
import { getLocale, t } from '@/i18n';
import { isDraftTerminal } from './drafts';
import type { WorkoutSetDraft } from './model';
import { parseFiniteDecimal, parseLocalDate } from './policy';

export type CompletionReference = { weightKg: number; reps: number };
type Input = {
  planDay: PlanDay;
  drafts: readonly WorkoutSetDraft[];
  weekCode: string;
  coachName: string | null;
  references: ReadonlyMap<string, CompletionReference>;
  previousVolumeChangePercent: number | null;
  // RN's normalized PlanDay has neither scheduledDate nor catalog names.
  date: string;
  exerciseNames: ReadonlyMap<string, string>;
};

function resolved(draft: WorkoutSetDraft) {
  const prescribed = decodePrescription(draft.planSet);
  // synthesizeDrafts formats text to one decimal; retain the saved precision.
  const actual = draft.sourceLog;
  return {
    weight: parseFiniteDecimal(actual?.weight_kg ?? draft.weightText) ?? prescribed.weightKg ?? 0,
    reps: actual?.reps ?? parseFiniteDecimal(draft.repsText) ?? prescribed.reps ?? prescribed.repsMax ?? 0,
    rpe: parseFiniteDecimal(actual ? actual.rpe ?? '' : draft.rpeText) ?? (prescribed.intensity?.kind === 'rpe' ? prescribed.intensity.value : null),
  };
}
function average(values: (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  return present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : null;
}
const oneDecimal = (value: number) => (Math.round((value + Number.EPSILON) * 10) / 10).toFixed(1);

export function workoutCompletionPresentation({ planDay, drafts, references, exerciseNames, weekCode, coachName, date, previousVolumeChangePercent }: Input) {
  const completed = drafts.filter(isDraftTerminal);
  const failedCount = completed.filter(draft => draft.status === 'failed').length;
  const mainId = planDay.exercises[0]?.id;
  const mainRPE = average(completed.filter(draft => draft.exercise.id === mainId).map(draft => resolved(draft).rpe));
  const mainDraft = drafts.find(draft => draft.exercise.id === mainId);
  const prescribed = mainDraft ? decodePrescription(mainDraft.planSet) : null;
  const plannedRPE = prescribed?.intensity?.kind === 'rpe' ? prescribed.intensity.value : null;
  const averageRPE = average(completed.map(draft => resolved(draft).rpe));
  const totalReps = completed.reduce((sum, draft) => sum + resolved(draft).reps, 0);
  const mainRPEText = mainRPE === null ? '—' : Number.isInteger(mainRPE) ? String(mainRPE) : oneDecimal(mainRPE);
  const planComparisonText = t(mainRPE === null || plannedRPE === null
    ? 'student.workoutCompletionPresentation.copy009'
    : Math.abs(mainRPE - plannedRPE) <= 0.5
      ? 'student.workoutCompletionPresentation.copy010'
      : mainRPE > plannedRPE ? 'student.workoutCompletionPresentation.copy011' : 'student.workoutCompletionPresentation.copy012');
  const compact = (value: number) => new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }).format(value);
  const exercises = planDay.exercises.map(exercise => {
    const sets = completed.filter(draft => draft.exercise.id === exercise.id);
    const best = sets.map(resolved).reduce<ReturnType<typeof resolved> | null>((best, value) =>
      !best || value.weight > best.weight || (value.weight === best.weight && value.reps > best.reps) ? value : best, null);
    const baseline = references.get(exercise.exercise_id);
    const failedSetCount = sets.filter(draft => draft.status === 'failed').length;
    return {
      id: exercise.id,
      name: exerciseNames.get(exercise.exercise_id) ?? t('student.todayWorkoutView.copy011'),
      bestSetText: best ? `${compact(best.weight)}kg × ${best.reps} @${best.rpe === null ? '—' : compact(best.rpe)}` : '—',
      isPersonalRecord: Boolean(best && baseline && (best.weight > baseline.weightKg || (best.weight === baseline.weightKg && best.reps > baseline.reps))),
      completedSetCount: sets.length, failedSetCount,
      statusText: failedSetCount ? t('student.workoutCompletionPresentation.copy001', [sets.length, failedSetCount]) : t('student.workoutCompletionPresentation.copy002', [sets.length]),
    };
  });
  const recordNames = exercises.filter(exercise => exercise.isPersonalRecord).map(exercise => exercise.name);
  const dayToken = /D(\d+)$/.exec(weekCode)?.[1];
  const coach = coachName?.trim();
  const scheduledDate = parseLocalDate(date);
  return {
    weekCode,
    weekDayLabel: dayToken ? t('student.workoutCompletionPresentation.copy014', [Number(dayToken)]) : t('student.workoutCompletionPresentation.copy013'),
    coachReceiptText: coach ? t('student.workoutCompletionPresentation.copy016', [coach]) : t('student.workoutCompletionPresentation.copy015'),
    dateSubtitle: `${scheduledDate.getMonth() + 1}/${scheduledDate.getDate()} · ${chineseWeekday(date)} · ${weekCode}`,
    volumeComparisonText: previousVolumeChangePercent === null ? t('student.workoutCompletionPresentation.copy008') : t('student.workoutCompletionPresentation.copy007', [previousVolumeChangePercent >= 0 ? '+' : '', previousVolumeChangePercent]),
    metaText: t('student.workoutCompletionPresentation.copy003', [totalReps, mainRPEText, planComparisonText]),
    exercises,
    hasPersonalRecord: recordNames.length > 0,
    personalRecordText: recordNames.length ? t('student.workoutCompletionPresentation.copy004', [recordNames.join(getLocale() === 'zh' ? '、' : ', ')]) : '',
    completedSuccessfulSets: completed.length - failedCount,
    totalPlannedSets: drafts.length,
    setCompletionLabel: failedCount ? t('student.workoutCompletionPresentation.copy005', [failedCount]) : t('student.workoutCompletionPresentation.copy006'),
    totalReps, mainRPEText, planComparisonText,
    totalVolumeText: new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(completed.reduce((sum, draft) => { const value = resolved(draft); return sum + value.weight * value.reps; }, 0)),
    exerciseCount: planDay.exercises.length,
    completedSetCount: completed.length,
    averageRPEText: averageRPE === null ? '—' : oneDecimal(averageRPE),
  };
}

export type WorkoutCompletionPresentation = ReturnType<typeof workoutCompletionPresentation>;
