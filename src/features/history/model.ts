import { exerciseDisplayName, t } from '@/i18n';
import {
  displayPoint,
  E1RM_MATH,
  E1RM_POLICY,
  ninetyDayRecordTrajectory,
  type LiftFamily,
} from '@/domain/e1rm';
import { recommendedDate } from '@/domain/plan/sequence';
import {
  addUtcDays,
  chineseMonthDay,
  e1RMPeriodLabel,
  replayE1RMSeries,
  utcDayDistance,
} from '@/features/dashboard/model';

import type {
  Exercise,
  FeedbackItem,
  OnboardingProfile,
  PlanDetail,
  SetLog,
} from '@/api/domains';

// Progression model (spec 071): plan end is the coach's end_date; shift offsets are no longer applied.
const effectivePlanEnd = (plan: { end_date: string }): string => plan.end_date;
// Recommended date is the anchor_weekday-aware position projection (spec 072 §E3).
const scheduledDate = recommendedDate;

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
  { name: string; initial: 'S' | 'B' | 'D' }
> = {
  squat: { get name() { return t('student.growthCurveView.copy002'); }, initial: 'S' },
  bench: { get name() { return t('student.growthCurveView.copy003'); }, initial: 'B' },
  deadlift: { get name() { return t('student.growthCurveView.copy004'); }, initial: 'D' },
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

export const TREND_UNLOCK_THRESHOLD = 3;

function localLogDate(log: SetLog): string {
  const date = new Date(log.logged_at);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function historyStats(logs: readonly SetLog[]) {
  const completed = completedHistoryLogs(logs);
  const trainingSessionCount = new Set(completed.map(localLogDate)).size;
  return {
    trainingSessionCount,
    trainingWeekCount: new Set(completed.map(log => isoWeekKey(localLogDate(log)))).size,
    totalVolumeKg: completed.reduce((total, log) => total + Number(log.weight_kg) * log.reps, 0),
    unlocksTrends: trainingSessionCount >= TREND_UNLOCK_THRESHOLD,
  };
}

export function e1rmCardState({
  familyTotalDataPointCount,
  windowDataPointCount,
  windowMainLinePointCount,
  windowMainLineValueRangeKg,
}: {
  familyTotalDataPointCount: number;
  windowDataPointCount: number;
  windowMainLinePointCount: number;
  windowMainLineValueRangeKg: number | null;
}): 'zero' | 'formingProgress' | 'formingWindowSparse' | 'chart' {
  const total = Math.max(0, familyTotalDataPointCount);
  const window = Math.min(Math.max(0, windowDataPointCount), total);
  const mainLine = Math.min(Math.max(0, windowMainLinePointCount), window);
  if (total === 0) return 'zero';
  if (total < TREND_UNLOCK_THRESHOLD) return 'formingProgress';
  if (
    mainLine < TREND_UNLOCK_THRESHOLD ||
    windowMainLineValueRangeKg === null ||
    !(windowMainLineValueRangeKg > 0)
  ) return 'formingWindowSparse';
  return 'chart';
}

export function buildGrowthStats(
  logs: readonly SetLog[],
  curves: Record<LiftFamily, GrowthCurve>,
  profile: OnboardingProfile | null = null,
): GrowthStats {
  const sumComplete = (values: (number | null)[]) => values.every((value): value is number => value !== null)
    ? values.reduce((total, value) => total + value, 0) : null;
  return {
    ...historyStats(logs),
    sbdTotalKg: sumComplete(LIFT_FAMILIES.map(family => growthSnapshot(curves[family], 'all').currentKg)),
    trainingTotalKg: sumComplete(LIFT_FAMILIES.map(family => {
      const value = profile?.[`${family}_1rm_kg`];
      return value == null ? null : Number(value);
    })),
  };
}

export type GrowthTimeRange = '30' | '90' | 'all';
export function growthRangeLabel(range: GrowthTimeRange): string {
  return t(range === '30' ? 'student.growthScreenPresentation.copy001' : range === '90' ? 'student.growthScreenPresentation.copy002' : 'student.growthScreenPresentation.copy003');
}

/** Pinned iOS uses daily best eligible samples; low-confidence days stay scatter-only. */
export function growthSnapshot(curve: GrowthCurve, range: GrowthTimeRange, now = new Date()) {
  const daily = new Map<string, GrowthCurve['series']['rawEligible'][number]>();
  for (const point of curve.series.rawEligible) {
    const day = `${point.date.getFullYear()}-${point.date.getMonth()}-${point.date.getDate()}`;
    const previous = daily.get(day);
    const winsTie = previous && point.valueKg === previous.valueKg && (
      point.winnerConfidence !== previous.winnerConfidence
        ? point.winnerConfidence === 'normal'
        : point.date.getTime() > previous.date.getTime()
    );
    if (!previous || point.valueKg > previous.valueKg || winsTie) daily.set(day, point);
  }
  const all = [...daily.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
  // The iOS 30-day label maps to its four-week rolling window (28 days).
  const days = range === '30' ? E1RM_POLICY.rollingWindowDays : 90;
  const cutoff = range === 'all' ? -Infinity : now.getTime() - days * E1RM_MATH.millisecondsPerDay;
  const rawEligiblePoints = all.filter(point => point.date.getTime() >= cutoff);
  const samples = rawEligiblePoints.filter(point => point.winnerConfidence === 'normal');
  const values = samples.map(point => point.valueKg);
  const lastSmoothed = curve.series.smoothed.at(-1);
  const headline = curve.series.rawEligible.find(point => point.winnerPointId === lastSmoothed?.winnerPointId) ?? null;
  const state = e1rmCardState({
    familyTotalDataPointCount: all.length,
    windowDataPointCount: rawEligiblePoints.length,
    windowMainLinePointCount: samples.length,
    windowMainLineValueRangeKg: values.length ? Math.max(...values) - Math.min(...values) : null,
  });
  return {
    samples,
    rawEligiblePoints,
    windowDataPointCount: rawEligiblePoints.length,
    eligibleDataPointCount: all.length,
    currentKg: headline?.valueKg ?? null,
    deltaKg: samples.length > 1 ? samples[samples.length - 1].valueKg - samples[0].valueKg : null,
    latestRecordDate: headline?.date ?? rawEligiblePoints.at(-1)?.date ?? null,
    chartCurrentPoint: samples.at(-1) ?? null,
    state,
  };
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
  const exercise = exerciseIndex.get(exerciseId);
  return exercise ? exerciseDisplayName(exercise) : t('student.sessionSummaryView.copy006');
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
  maximumCount = Infinity,
): VolumeIntensitySeries {
  const buckets = new Map<
    string,
    { startDate: string; volumeKg: number; rpes: number[] }
  >();
  for (const log of completedHistoryLogs(logs)) {
    const key = isoWeekKey(localLogDate(log));
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
    .slice(-maximumCount)
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

export function chartBuckets(logs: readonly SetLog[]): VolumeIntensitySeries {
  return buildVolumeIntensitySeries(logs, 6);
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
  const familyName = family ? LIFT_PRESENTATION[family].name : t('student.studentRootView.copy002');
  return `${week ? t('student.historyEntriesView.copy002', [week]) : t('student.studentRootView.copy002')} · ${familyName}`;
}

export function feedbackDate(item: FeedbackItem): string {
  const dateText = item.day_date ?? item.posted_at.slice(0, 10);
  return chineseMonthDay(dateText);
}
