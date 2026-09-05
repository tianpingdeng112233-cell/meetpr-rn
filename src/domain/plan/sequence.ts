import type { PlanDay, PlanDetail, PlanSummary } from '@/api/domains/plans';
import { gymDayRange } from './workout-date-policy';

export function sequenceDays<
  T extends Pick<PlanDay, 'week_number' | 'day_of_week' | 'sort_order' | 'id'>,
>(days: readonly T[]): T[] {
  return [...days].sort(
    (a, b) =>
      a.week_number - b.week_number ||
      a.day_of_week - b.day_of_week ||
      a.sort_order - b.sort_order ||
      a.id.localeCompare(b.id),
  );
}
export function cursorDay(days: readonly PlanDay[]): PlanDay | null {
  return sequenceDays(days).find((day) => day.completed_at == null) ?? null;
}
export function dayAfter(
  days: readonly PlanDay[],
  dayId: string,
): PlanDay | null {
  const sorted = sequenceDays(days);
  const index = sorted.findIndex((day) => day.id === dayId);
  return index < 0 ? null : (sorted[index + 1] ?? null);
}
export function currentWeekDays(days: readonly PlanDay[]): PlanDay[] {
  const sorted = sequenceDays(days);
  const week = (cursorDay(sorted) ?? sorted[sorted.length - 1])?.week_number;
  return sorted.filter((day) => day.week_number === week);
}
export type ProgressState = 'done' | 'current' | 'upcoming';
export function progressSegments(
  days: readonly PlanDay[],
  currentId = cursorDay(days)?.id,
) {
  return currentWeekDays(days).map((day) => ({
    day,
    state: (day.completed_at != null
      ? 'done'
      : day.id === currentId
        ? 'current'
        : 'upcoming') as ProgressState,
  }));
}
export function completedToday(
  days: readonly PlanDay[],
  now = new Date(),
): PlanDay | null {
  const { start, end } = gymDayRange(now);
  return (
    sequenceDays(days)
      .filter((day) => {
        if (!day.completed_at) return false;
        const date = new Date(day.completed_at);
        return date >= start && date < end;
      })
      .pop() ?? null
  );
}
export function canUndoCompletion(
  days: readonly PlanDay[],
  dayId: string,
  now = new Date(),
): boolean {
  const latest = sequenceDays(days)
    .filter((day) => day.completed_at != null)
    .pop();
  return latest?.id === dayId && completedToday(days, now)?.id === dayId;
}
export function recommendedDate(
  plan: Pick<PlanSummary, 'start_date' | 'anchor_weekday'>,
  day: Pick<PlanDay, 'week_number' | 'day_of_week'>,
): string {
  const date = new Date(`${plan.start_date}T00:00:00Z`);
  const weekday = date.getUTCDay() || 7;
  const anchorOffset =
    plan.anchor_weekday == null ? 0 : (plan.anchor_weekday - weekday + 7) % 7;
  date.setUTCDate(
    date.getUTCDate() +
      anchorOffset +
      (day.week_number - 1) * 7 +
      day.day_of_week -
      1,
  );
  return date.toISOString().slice(0, 10);
}
export function selectCurrentPlan<T extends PlanSummary>(
  plans: readonly T[],
): T | null {
  const timestamp = (value: string | null | undefined) =>
    value ? new Date(value).getTime() : -Infinity;
  return (
    [...plans]
      .filter((plan) => plan.status === 'published')
      .sort(
        (a, b) =>
          timestamp(b.published_at) - timestamp(a.published_at) ||
          0 ||
          timestamp(b.created_at) - timestamp(a.created_at) ||
          b.id.localeCompare(a.id),
      )[0] ?? null
  );
}
export function planLogRange(plan: PlanDetail) {
  const dates = plan.days.map((day) => recommendedDate(plan, day)).sort();
  const pad = (date: string, offset: number) => {
    const value = new Date(`${date}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + offset);
    return value.toISOString().slice(0, 10);
  };
  return {
    from: pad(dates[0] ?? plan.start_date, -1),
    to: pad(dates[dates.length - 1] ?? plan.end_date, 1),
    scope: 'plan' as const,
  };
}
export function dayCode(day: PlanDay): string {
  return `W${day.week_number}D${day.day_of_week}`;
}
export type WorkoutDayState =
  | { kind: 'current' }
  | { kind: 'completed'; canUndo: boolean }
  | { kind: 'upcoming'; previousDay: PlanDay | null };
export function workoutDayState(
  days: readonly PlanDay[],
  selected: PlanDay,
  now = new Date(),
): WorkoutDayState {
  if (selected.completed_at != null)
    return {
      kind: 'completed',
      canUndo: canUndoCompletion(days, selected.id, now),
    };
  if (cursorDay(days)?.id === selected.id) return { kind: 'current' };
  const sorted = sequenceDays(days);
  return {
    kind: 'upcoming',
    previousDay:
      sorted[sorted.findIndex((day) => day.id === selected.id) - 1] ?? null,
  };
}
