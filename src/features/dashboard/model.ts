import type {
  Exercise,
  FeedbackItem,
  OnboardingProfile,
  PlanDay,
  PlanDetail,
  PlanSummary,
  SetLog,
  SetLogRange,
} from '@/api/domains';
import { ApiError } from '@/api/client';
import {
  buildE1RMSeries,
  calculateE1RM,
  classifyE1RMAnomaly,
  displayPoint,
  E1RM_MATH,
  E1RM_POLICY,
  ninetyDayRecordTrajectory,
  resolveCompetitionLiftFamily,
  type E1RMHistoryPoint,
  type E1RMSeries,
  type LiftFamily,
  type OnboardingLiftProfile,
} from '@/domain/e1rm';

import type {
  DashboardLift,
  DashboardNotification,
  DashboardWeekDay,
  WorkoutDayStatus,
} from './types';

const DATE_TEXT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const FAMILY_PRESENTATION: Record<
  LiftFamily,
  Pick<DashboardLift, 'initial' | 'name'>
> = {
  squat: { initial: 'S', name: '深蹲' },
  bench: { initial: 'B', name: '卧推' },
  deadlift: { initial: 'D', name: '硬拉' },
};

export const DASHBOARD_E1RM_HISTORY_FROM = '1970-01-01';

export function dashboardE1RMRange(to: string): SetLogRange {
  // Parity ruling: iOS sends only from/to. Omitting scope deliberately keeps
  // the backend's plan-scoped default; `all` would admit ad-hoc DTOs iOS rejects.
  return { from: DASHBOARD_E1RM_HISTORY_FROM, to };
}

export function parseDateTextUTC(value: string): Date {
  const match = DATE_TEXT_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Invalid DATE text: ${value}`);
  }
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function utcDateText(date: Date): string {
  return [
    date.getUTCFullYear().toString().padStart(4, '0'),
    (date.getUTCMonth() + 1).toString().padStart(2, '0'),
    date.getUTCDate().toString().padStart(2, '0'),
  ].join('-');
}

export function addUtcDays(dateText: string, days: number): string {
  const date = parseDateTextUTC(dateText);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateText(date);
}

export function utcDayDistance(from: string, to: string): number {
  return Math.floor(
    (parseDateTextUTC(to).getTime() - parseDateTextUTC(from).getTime()) /
      E1RM_MATH.millisecondsPerDay,
  );
}

/** iOS Calendar weekday is Sunday=1 ... Saturday=7. */
export function mondayOffset(weekday: number): number {
  return (weekday + 5) % 7;
}

export function weekIndexForDate(
  plan: Pick<PlanSummary, 'start_date' | 'plan_weeks'>,
  dateText: string,
): number {
  const raw = Math.floor(utcDayDistance(plan.start_date, dateText) / 7) + 1;
  return Math.min(plan.plan_weeks, Math.max(1, raw));
}

export function weekWindow(
  plan: Pick<PlanSummary, 'start_date'>,
  weekIndex: number,
) {
  const start = addUtcDays(plan.start_date, (weekIndex - 1) * 7);
  return { start, endExclusive: addUtcDays(start, 7) };
}

export function effectivePlanEnd(
  plan: Pick<PlanSummary, 'end_date' | 'total_shift_days'>,
): string {
  return addUtcDays(plan.end_date, Math.max(0, plan.total_shift_days));
}

export function selectDashboardPlan(
  plans: readonly PlanSummary[],
  today: string,
): PlanSummary | null {
  const sorted = [...plans].sort((left, right) =>
    right.start_date.localeCompare(left.start_date),
  );
  return (
    sorted.find(
      (plan) =>
        plan.status === 'published' &&
        plan.start_date <= today &&
        effectivePlanEnd(plan) >= today,
    ) ??
    sorted.find((plan) => plan.status === 'published') ??
    null
  );
}

export function selectLatestPublishedPlan(
  plans: readonly PlanSummary[],
): PlanSummary | null {
  return (
    [...plans]
      .filter((plan) => plan.status === 'published')
      .sort(
        (left, right) =>
          right.created_at.localeCompare(left.created_at) ||
          right.id.localeCompare(left.id),
      )[0] ?? null
  );
}

export function scheduledDate(
  plan: Pick<PlanDetail, 'start_date'>,
  day: Pick<PlanDay, 'week_number' | 'day_of_week' | 'shifted_to_date'>,
): string {
  return (
    day.shifted_to_date ??
    addUtcDays(plan.start_date, (day.week_number - 1) * 7 + day.day_of_week - 1)
  );
}

function onboardingLiftProfile(
  profile: OnboardingProfile | null,
): OnboardingLiftProfile {
  const squatStance =
    profile?.squat_stance === 'low_bar' || profile?.squat_stance === 'high_bar'
      ? profile.squat_stance
      : null;
  const deadliftStyle =
    profile?.deadlift_style === 'conventional' ||
    profile?.deadlift_style === 'sumo' ||
    profile?.deadlift_style === 'both'
      ? profile.deadlift_style
      : null;
  return { squatStance, deadliftStyle };
}

export function resolvedExerciseFamily(
  exercise: Exercise | undefined,
  onboarding: OnboardingProfile | null,
): LiftFamily | null {
  if (!exercise) return null;
  if (
    exercise.competition_stance !== null &&
    exercise.competition_stance !== 'low_bar' &&
    exercise.competition_stance !== 'high_bar' &&
    exercise.competition_stance !== 'conventional' &&
    exercise.competition_stance !== 'sumo'
  ) {
    return null;
  }
  const competitionStance =
    exercise.competition_stance === 'low_bar' ||
    exercise.competition_stance === 'high_bar' ||
    exercise.competition_stance === 'conventional' ||
    exercise.competition_stance === 'sumo'
      ? exercise.competition_stance
      : null;
  return resolveCompetitionLiftFamily(
    {
      mainLiftFamily: exercise.main_lift_family,
      competitionStance,
      isCompetitionLift: exercise.is_competition_lift,
    },
    onboardingLiftProfile(onboarding),
  );
}

/** Catalog + onboarding is the only S/B/D authority; unresolved ids stay null. */
export function resolveDashboardLifts(
  plan: PlanDetail,
  exerciseIndex: ReadonlyMap<string, Exercise>,
  onboarding: OnboardingProfile | null,
): Map<string, DashboardLift | null> {
  const result = new Map<string, DashboardLift | null>();
  const exerciseIds = plan.days.flatMap((day) =>
    day.exercises.map((exercise) => exercise.exercise_id),
  );
  for (const exerciseId of exerciseIds) {
    if (result.has(exerciseId)) continue;
    const family = resolvedExerciseFamily(exerciseIndex.get(exerciseId), onboarding);
    result.set(
      exerciseId,
      family
        ? { exerciseId, family, ...FAMILY_PRESENTATION[family] }
        : null,
    );
  }
  return result;
}

/** All catalog exercises bucketed through the same per-student resolver. */
export function buildResolvedExerciseFamilies(
  exerciseIndex: ReadonlyMap<string, Exercise>,
  onboarding: OnboardingProfile | null,
): Map<string, LiftFamily> {
  const result = new Map<string, LiftFamily>();
  for (const [exerciseId, exercise] of exerciseIndex) {
    const family = resolvedExerciseFamily(exercise, onboarding);
    if (family) result.set(exerciseId, family);
  }
  return result;
}

export function liftForDay(
  day: PlanDay | null,
  lifts: ReadonlyMap<string, DashboardLift | null>,
): DashboardLift | null {
  const main = day?.exercises
    .filter((exercise) => exercise.is_main_lift)
    .sort((left, right) => left.sort_order - right.sort_order)[0];
  return main ? lifts.get(main.exercise_id) ?? null : null;
}

export function workoutDayProgress(day: PlanDay, logs: readonly SetLog[]) {
  const exercises = new Set(day.exercises.map((exercise) => exercise.id));
  const plannedSets = day.exercises.reduce(
    (total, exercise) => total + exercise.sets.length,
    0,
  );
  const completedSetKeys = new Set(
    logs
      .filter(
        (log) =>
          log.plan_exercise_id !== null &&
          exercises.has(log.plan_exercise_id) &&
          log.completed,
      )
      .map((log) => `${log.plan_exercise_id}:${log.set_index}`),
  );
  const dayLogs = logs.filter(
    (log) => log.plan_exercise_id !== null && exercises.has(log.plan_exercise_id),
  );
  const completion =
    plannedSets === 0 ? 0 : Math.min(1, completedSetKeys.size / plannedSets);
  const status: WorkoutDayStatus =
    completion >= 1 ? 'complete' : dayLogs.length > 0 ? 'partial' : 'notStarted';
  return { completion, status };
}

export function buildDashboardWeekDays(
  plan: PlanDetail,
  cycleLogs: readonly SetLog[],
  weekIndex: number,
  exerciseIndex: ReadonlyMap<string, Exercise>,
  onboarding: OnboardingProfile | null,
): DashboardWeekDay[] {
  const { start, endExclusive } = weekWindow(plan, weekIndex);
  const weekLogs = cycleLogs.filter(
    (log) => log.logged_date >= start && log.logged_date < endExclusive,
  );
  const lifts = resolveDashboardLifts(plan, exerciseIndex, onboarding);
  const daysByDate = new Map(
    plan.days
      .filter((day) => {
        const date = scheduledDate(plan, day);
        return date >= start && date < endExclusive;
      })
      .map((day) => [scheduledDate(plan, day), day] as const),
  );

  return Array.from({ length: 7 }, (_, index) => {
    const date = addUtcDays(start, index);
    const day = daysByDate.get(date) ?? null;
    if (!day) {
      return { date, day, lift: null, completion: 0, status: 'noPlan' };
    }
    const progress = workoutDayProgress(day, weekLogs);
    return { date, day, lift: liftForDay(day, lifts), ...progress };
  });
}

export function dashboardTitle(day: DashboardWeekDay | null): string {
  return day?.day ? `W${day.day.week_number}D${day.day.sort_order}` : '今日';
}

export function dashboardCTA(
  day: DashboardWeekDay | null,
): { interactive: boolean; label: string } {
  if (!day?.day) {
    return { interactive: false, label: '今日休息' };
  }
  const code = `W${day.day.week_number}D${day.day.sort_order}`;
  const lift = day.lift?.name ?? '锻炼';
  if (day.status === 'complete') {
    return { interactive: true, label: '今日已完成 · 查看' };
  }
  if (day.status === 'partial') {
    return { interactive: true, label: `继续 ${code} · ${lift}` };
  }
  return { interactive: true, label: `开始 ${code} · ${lift}` };
}

export function replayE1RMSeries(
  logs: readonly SetLog[],
  familyByExerciseId: ReadonlyMap<string, LiftFamily>,
  family: LiftFamily,
): E1RMSeries {
  const points: E1RMHistoryPoint[] = [];
  const sorted = logs
    .filter(
      (log) =>
        familyByExerciseId.get(log.exercise_id) === family &&
        log.completed &&
        !log.failed &&
        !log.assumed,
    )
    .sort((left, right) => left.logged_at.localeCompare(right.logged_at));

  for (const log of sorted) {
    const value = calculateE1RM(
      Number(log.weight_kg),
      log.reps,
      log.rpe === null ? null : Number(log.rpe),
    );
    if (value === null) {
      continue;
    }
    const trusted = buildE1RMSeries(points, family).records;
    const previousBest =
      trusted.length === 0 ? null : Math.max(...trusted.map((point) => point.valueKg));
    const confidence =
      classifyE1RMAnomaly(value, previousBest) === 'normal' ? 'normal' : 'low';
    points.push({
      id: `dashboard-${log.id}`,
      studentId: log.student_id,
      exerciseId: log.exercise_id,
      setLogId: log.id,
      computedAt: new Date(log.logged_at),
      e1RMKg: value,
      sourceWeightKg: Number(log.weight_kg),
      sourceReps: log.reps,
      sourceRPE: log.rpe === null ? null : Number(log.rpe),
      confidence,
      origin: 'logged',
    });
  }
  return buildE1RMSeries(points, family);
}

export function e1RMPeriodLabel(series: E1RMSeries, now: Date): '90 天' | '历史最佳' {
  const point = displayPoint(series);
  if (!point) {
    return '90 天';
  }
  const cutoff = now.getTime() - E1RM_POLICY.rollingWindowDays * E1RM_MATH.millisecondsPerDay;
  return point.date.getTime() < cutoff ? '历史最佳' : '90 天';
}

export function e1RMDelta(series: E1RMSeries, now: Date): number {
  let projectionIndex = 0;
  const trajectory = ninetyDayRecordTrajectory(
    series,
    now,
    () => `dashboard-projection-${projectionIndex++}`,
  );
  return trajectory.length < 2
    ? 0
    : trajectory[trajectory.length - 1].valueKg - trajectory[0].valueKg;
}

export function formatKg(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
}

export function formatDeltaKg(delta: number): string {
  if (delta === 0) {
    return '0 KG';
  }
  return `${delta > 0 ? '+' : '−'}${formatKg(Math.abs(delta))} KG`;
}

export function shouldOfferPlanShift(input: {
  role: string | null | undefined;
  plan: PlanSummary | null;
  todayDay: DashboardWeekDay | null;
  todayLogs: readonly SetLog[];
  now: Date;
}): boolean {
  const { role, plan, todayDay, todayLogs, now } = input;
  if (
    role !== 'coached_student' ||
    !plan ||
    plan.coach_id === null ||
    plan.status !== 'published' ||
    !todayDay?.day ||
    todayDay.status !== 'notStarted'
  ) {
    return false;
  }
  const today = utcDateText(now);
  return todayDay.date === today && todayLogs.length === 0;
}

export function canUndoPlanShift(
  plan: PlanSummary | null,
  now: Date,
): boolean {
  if (!plan || plan.total_shift_days < 1 || plan.latest_shift_created_at === null) {
    return false;
  }
  return utcDateText(new Date(plan.latest_shift_created_at)) === utcDateText(now);
}

export type ShiftAlertCopy = {
  title: '无法顺延' | '无法撤销';
  message: string;
};

const SHIFT_MESSAGES: Partial<Record<string, string>> = {
  PLAN_NOT_ACTIVE: '当前计划未生效,暂时不能顺延',
  SHIFT_ONLY_TODAY: '只能顺延今天的训练',
  ALREADY_STARTED: '今天的训练已经开始,不能顺延或撤销',
  NOT_PLAN_STUDENT: '只有计划所属学员可以顺延',
  NO_ACTIVE_SHIFT: '当前没有可撤销的顺延',
  UNDO_WINDOW_PASSED: '只能在顺延当天撤销,请联系教练调整计划',
};

export function planShiftErrorCopy(
  error: unknown,
  operation: 'shift' | 'undo',
): ShiftAlertCopy {
  const code = error instanceof ApiError ? error.code : undefined;
  const known = code ? SHIFT_MESSAGES[code] : undefined;
  const unsupported =
    error instanceof ApiError &&
    error.kind === 'backend' &&
    (error.status === 400 || error.status === 403);
  return {
    title: operation === 'shift' ? '无法顺延' : '无法撤销',
    message:
      known ??
      (unsupported ? '当前计划暂不支持顺延' : undefined) ??
      (operation === 'shift'
        ? '顺延失败,请检查网络后重试'
        : '撤销顺延失败,请检查网络后重试'),
  };
}

export function unsupportedPlanShiftCopy(): ShiftAlertCopy {
  return { title: '无法顺延', message: '当前计划暂不支持顺延' };
}

export function unreadFeedbackCount(items: readonly FeedbackItem[]): number {
  return items.filter((item) => item.read_at === null).length;
}

export function buildNotifications(input: {
  planId?: string | null;
  weekIndex?: number;
  unreadFeedback: number;
  evaluationUnread?: boolean;
}): DashboardNotification[] {
  const notifications: DashboardNotification[] = [];
  if (input.planId) {
    notifications.push({
      type: 'plan',
      id: `plan-${input.planId}`,
      weekIndex: input.weekIndex ?? 1,
    });
  }
  if (input.unreadFeedback > 0) {
    notifications.push({
      type: 'feedback',
      id: 'feedback-unread',
      count: input.unreadFeedback,
    });
  }
  if (input.evaluationUnread) {
    notifications.push({ type: 'evaluation', id: 'evaluation-complete' });
  }
  return notifications;
}

export function localCompetitionDays(dateText: string, now: Date): number {
  const [year, month, day] = dateText.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const localToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((target.getTime() - localToday.getTime()) / E1RM_MATH.millisecondsPerDay);
}

export function chineseMonthDay(dateText: string): string {
  const date = parseDateTextUTC(dateText);
  return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}

export function chineseWeekday(dateText: string): string {
  return ['日', '一', '二', '三', '四', '五', '六'][
    parseDateTextUTC(dateText).getUTCDay()
  ];
}

export function relativeFeedbackTime(timestamp: string, now: Date): string {
  const elapsed = Math.max(0, now.getTime() - new Date(timestamp).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return chineseMonthDay(utcDateText(new Date(timestamp)));
}
