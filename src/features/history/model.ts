import type {
  Exercise,
  FeedbackItem,
  PlanDetail,
  SetLog,
} from '@/api/domains';
import {
  displayPoint,
  E1RM_MATH,
  E1RM_POLICY,
  ninetyDayRecordTrajectory,
  type LiftFamily,
} from '@/domain/e1rm';
import {
  addUtcDays,
  chineseMonthDay,
  e1RMPeriodLabel,
  effectivePlanEnd,
  replayE1RMSeries,
  scheduledDate,
  utcDayDistance,
} from '@/features/dashboard/model';

import type {
  GrowthCurve,
  GrowthStats,
  HistoryDay,
  HistoryExercise,
  HistoryWeek,
  VolumeIntensitySeries,
} from './types';

export const LIFT_PRESENTATION: Record<
  LiftFamily,
  { name: '深蹲' | '卧推' | '硬拉'; initial: 'S' | 'B' | 'D' }
> = {
  squat: { name: '深蹲', initial: 'S' },
  bench: { name: '卧推', initial: 'B' },
  deadlift: { name: '硬拉', initial: 'D' },
};

export const LIFT_FAMILIES: readonly LiftFamily[] = [
  'squat',
  'bench',
  'deadlift',
];

export function completedHistoryLogs(logs: readonly SetLog[]): SetLog[] {
  return logs.filter((log) => log.completed && !log.assumed);
}

export function isoWeekStart(dateText: string): string {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return [
    date.getUTCFullYear().toString().padStart(4, '0'),
    (date.getUTCMonth() + 1).toString().padStart(2, '0'),
    date.getUTCDate().toString().padStart(2, '0'),
  ].join('-');
}

export function isoWeekKey(dateText: string): string {
  return isoWeekStart(dateText);
}

export function buildGrowthCurves(
  logs: readonly SetLog[],
  familyByExerciseId: ReadonlyMap<string, LiftFamily>,
  now: Date,
): Record<LiftFamily, GrowthCurve> {
  const build = (family: LiftFamily): GrowthCurve => {
    const series = replayE1RMSeries(logs, familyByExerciseId, family);
    let projectionIndex = 0;
    const trajectory = ninetyDayRecordTrajectory(
      series,
      now,
      () => `growth-${family}-trajectory-${projectionIndex++}`,
    );
    const cutoff =
      now.getTime() -
      E1RM_POLICY.chartWindowDays * E1RM_MATH.millisecondsPerDay;
    const lowConfidence = series.rawEligible.filter(
      (sample) =>
        sample.winnerConfidence === 'low' && sample.date.getTime() >= cutoff,
    );
    return {
      family,
      name: LIFT_PRESENTATION[family].name,
      series,
      point: displayPoint(series),
      periodLabel: e1RMPeriodLabel(series, now),
      trajectory,
      lowConfidence,
    };
  };
  return { squat: build('squat'), bench: build('bench'), deadlift: build('deadlift') };
}

export function buildGrowthStats(
  logs: readonly SetLog[],
  curves: Record<LiftFamily, GrowthCurve>,
): GrowthStats {
  const eligible = completedHistoryLogs(logs);
  const trainingDays = new Set(eligible.map((log) => log.logged_date)).size;
  const trainingWeeks = new Set(eligible.map((log) => isoWeekKey(log.logged_date))).size;
  const liftValues = LIFT_FAMILIES.map(
    (family) => curves[family].point?.valueKg ?? null,
  );
  const sbdTotalKg = liftValues.every((value): value is number => value !== null)
    ? liftValues.reduce((total, value) => total + value, 0)
    : null;
  return { trainingDays, trainingWeeks, sbdTotalKg };
}

export function historyWeekNumber(startDate: string, dateText: string): number {
  return Math.floor(utcDayDistance(startDate, dateText) / 7) + 1;
}

function notesForExercise(exercise: PlanDetail['days'][number]['exercises'][number]) {
  const values = [
    exercise.notes,
    ...exercise.sets.map((set) => set.coach_note),
  ].filter((value): value is string => Boolean(value?.trim()));
  return [...new Set(values)];
}

function exerciseName(
  exerciseId: string,
  exerciseIndex: ReadonlyMap<string, Exercise>,
): string {
  return exerciseIndex.get(exerciseId)?.name ?? '动作';
}

export function buildHistoryWeeks(
  plans: readonly PlanDetail[],
  logs: readonly SetLog[],
  exerciseIndex: ReadonlyMap<string, Exercise>,
  today: string,
): HistoryWeek[] {
  const weeks: HistoryWeek[] = [];
  for (const plan of plans) {
    if (plan.start_date > today) continue;
    const planExerciseIds = new Set(
      plan.days.flatMap((day) => day.exercises.map((exercise) => exercise.id)),
    );
    const planLogs = logs.filter(
      (log) =>
        log.plan_exercise_id !== null && planExerciseIds.has(log.plan_exercise_id),
    );
    const lastDate = [
      plan.start_date,
      effectivePlanEnd(plan) < today ? effectivePlanEnd(plan) : today,
      ...planLogs.map((log) => log.logged_date),
    ].sort().at(-1) ?? plan.start_date;
    const lastWeek = Math.max(1, historyWeekNumber(plan.start_date, lastDate));

    for (let weekNumber = 1; weekNumber <= lastWeek; weekNumber += 1) {
      const startDate = addUtcDays(plan.start_date, (weekNumber - 1) * 7);
      const days: HistoryDay[] = Array.from({ length: 7 }, (_, offset) => {
        const date = addUtcDays(startDate, offset);
        const planned = plan.days.filter(
          (day) => scheduledDate(plan, day) === date,
        );
        const dayExerciseMap = new Map<string, HistoryExercise>();
        for (const day of planned) {
          for (const exercise of [...day.exercises].sort(
            (left, right) => left.sort_order - right.sort_order,
          )) {
            dayExerciseMap.set(exercise.id, {
              planExercise: exercise,
              name: exerciseName(exercise.exercise_id, exerciseIndex),
              notes: notesForExercise(exercise),
              plannedSets: [...exercise.sets].sort(
                (left, right) => left.set_number - right.set_number,
              ),
              logs: [],
            });
          }
        }
        for (const log of planLogs.filter((candidate) => candidate.logged_date === date)) {
          if (log.plan_exercise_id === null) continue;
          const existing = dayExerciseMap.get(log.plan_exercise_id);
          if (existing) {
            existing.logs.push(log);
          }
        }
        const exercises = [...dayExerciseMap.values()].map((exercise) => ({
          ...exercise,
          logs: [...exercise.logs].sort((left, right) => left.set_index - right.set_index),
        }));
        const total = exercises.reduce(
          (sum, exercise) => sum + exercise.plannedSets.length,
          0,
        );
        const done = exercises.reduce(
          (sum, exercise) =>
            sum + completedHistoryLogs(exercise.logs).length,
          0,
        );
        return { date, done, total, exercises, isRest: exercises.length === 0 };
      }).filter((day) => day.date <= today);
      if (days.length > 0) {
        weeks.push({
          id: `${plan.id}:${weekNumber}`,
          plan,
          weekNumber,
          startDate,
          days,
        });
      }
    }
  }
  return weeks.sort(
    (left, right) =>
      right.startDate.localeCompare(left.startDate) ||
      right.weekNumber - left.weekNumber,
  );
}

export function buildVolumeIntensitySeries(
  logs: readonly SetLog[],
): VolumeIntensitySeries {
  const buckets = new Map<
    string,
    { startDate: string; volumeKg: number; rpes: number[] }
  >();
  for (const log of completedHistoryLogs(logs)) {
    const key = isoWeekKey(log.logged_date);
    const bucket = buckets.get(key) ?? { startDate: key, volumeKg: 0, rpes: [] };
    const weight = Number(log.weight_kg);
    if (Number.isFinite(weight)) {
      bucket.volumeKg += weight * log.reps;
    }
    if (log.rpe !== null) {
      const rpe = Number(log.rpe);
      if (Number.isFinite(rpe)) bucket.rpes.push(rpe);
    }
    buckets.set(key, bucket);
  }
  const basePoints = [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, bucket]) => ({
      key,
      startDate: bucket.startDate,
      volumeKg: bucket.volumeKg,
      averageRPE:
        bucket.rpes.length === 0
          ? null
          : bucket.rpes.reduce((sum, value) => sum + value, 0) / bucket.rpes.length,
    }));
  const maximumVolume = Math.max(0, ...basePoints.map((point) => point.volumeKg));
  const scale = Math.max(maximumVolume * 1.15, 100);
  return {
    scale,
    points: basePoints.map((point) => ({
      ...point,
      rpePlotValue:
        point.averageRPE === null ? null : (point.averageRPE / 10) * scale,
    })),
  };
}

export function feedbackTitle(
  item: FeedbackItem,
  plans: readonly PlanDetail[],
  familyByPlanExerciseId: ReadonlyMap<string, LiftFamily>,
): string {
  const plan = plans.find((candidate) =>
    candidate.days.some((day) =>
      day.exercises.some((exercise) => exercise.id === item.plan_exercise_id),
    ),
  );
  const datePlan = item.day_date
    ? plans.find(
        (candidate) =>
          item.day_date !== null &&
          item.day_date >= candidate.start_date &&
          item.day_date <= effectivePlanEnd(candidate),
      )
    : null;
  const owningPlan = plan ?? datePlan;
  const week =
    owningPlan && item.day_date
      ? Math.max(1, historyWeekNumber(owningPlan.start_date, item.day_date))
      : null;
  const family = item.plan_exercise_id
    ? familyByPlanExerciseId.get(item.plan_exercise_id)
    : null;
  const familyName = family ? LIFT_PRESENTATION[family].name : '训练';
  return `${week ? `第 ${week} 周` : '训练'} · ${familyName}`;
}

export function feedbackDate(item: FeedbackItem): string {
  const dateText = item.day_date ?? item.posted_at.slice(0, 10);
  return chineseMonthDay(dateText);
}
