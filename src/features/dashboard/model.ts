import { exerciseDisplayName, getLocale, t } from '@/i18n';
import type {
  Exercise,
  FeedbackItem,
  OnboardingProfile,
  PlanDay,
  PlanDetail,
  SetLog,
  SetLogRange,
} from '@/api/domains';
import { cursorDay, progressSegments, recommendedDate, selectCurrentPlan } from '@/domain/plan/sequence';
import type { StudentVideo } from '@/api/domains/videos';
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
} from './types';

const DATE_TEXT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const FAMILY_INITIAL: Record<LiftFamily, DashboardLift['initial']> = {
  squat: 'S', bench: 'B', deadlift: 'D',
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

export const selectDashboardPlan = selectCurrentPlan;
export const selectLatestPublishedPlan = selectCurrentPlan;

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
    const exercise = exerciseIndex.get(exerciseId);
    const family = resolvedExerciseFamily(exercise, onboarding);
    result.set(
      exerciseId,
      family && exercise
        ? { exerciseId, family, initial: FAMILY_INITIAL[family], name: exerciseDisplayName(exercise) }
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

export function buildDashboardWeekDays(
  plan: PlanDetail, cycleLogs: readonly SetLog[], weekIndex: number,
  exerciseIndex: ReadonlyMap<string, Exercise>, onboarding: OnboardingProfile | null,
): DashboardWeekDay[] {
  const lifts = resolveDashboardLifts(plan, exerciseIndex, onboarding);
  return progressSegments(plan.days.filter(day => day.week_number === weekIndex), cursorDay(plan.days)?.id).map(({ day, state }) => ({
    date: recommendedDate(plan, day), day, lift: liftForDay(day, lifts), completion: state === 'done' ? 1 : 0, status: state,
  }));
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

export function e1RMPeriodLabel(series: E1RMSeries, now: Date): string {
  const point = displayPoint(series);
  if (!point) {
    return `90 ${t('student.dashboardProfileMetricsView.copy004')}`;
  }
  const cutoff = now.getTime() - E1RM_POLICY.rollingWindowDays * E1RM_MATH.millisecondsPerDay;
  return point.date.getTime() < cutoff ? t('student.dashboardE1RmtrendViewModel.copy003') : `90 ${t('student.dashboardProfileMetricsView.copy004')}`;
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

export function unreadFeedbackCount(items: readonly FeedbackItem[]): number {
  return items.filter((item) => item.read_at === null).length;
}

/** Dashboard-only video association; the feedback wire DTO stays unchanged. */
export type DashboardFeedbackItem = FeedbackItem & {
  video?: Pick<StudentVideo, 'exercise_name' | 'set_index'> | null;
};

export function feedbackLabel(item: Pick<DashboardFeedbackItem, 'video_id' | 'video'>): string {
  if (!item.video_id && !item.video) return t('student.dashboardFeedbackText.copy001');
  const name = item.video?.exercise_name?.trim();
  const exercise = name ? exerciseDisplayName({ name, name_en: null }) : t('student.dashboardFeedbackText.copy002');
  const setIndex = item.video?.set_index;
  return setIndex == null ? exercise : t('student.dashboardFeedbackText.copy003', [exercise, setIndex + 1]);
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
  return new Intl.DateTimeFormat(getLocale(), { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
}

export function chineseWeekday(dateText: string): string {
  return new Intl.DateTimeFormat(getLocale(), { weekday: 'short', timeZone: 'UTC' }).format(parseDateTextUTC(dateText));
}

export function relativeFeedbackTime(timestamp: string, now: Date): string {
  const elapsed = Math.max(0, now.getTime() - new Date(timestamp).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return t('chat.relative.justNow');
  if (minutes < 60) return t('coach.shared.relative.minutesAgo %lld', [minutes]);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('coach.shared.relative.hoursAgo %lld', [hours]);
  return chineseMonthDay(utcDateText(new Date(timestamp)));
}
