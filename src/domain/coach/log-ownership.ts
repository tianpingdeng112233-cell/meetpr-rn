import { sameDay } from './calendar';

export type LogOwnership = {
  plan_exercise_id?: string | null;
  plan_day_id?: string | null;
  adhoc?: boolean;
};
export type DayOwnership = { id?: string; date: Date; planExerciseIds?: readonly string[]; week_number?: number };

export function logOwnerDayId(log: LogOwnership, days: readonly DayOwnership[]): string | undefined {
  if (log.plan_exercise_id) return days.find(day => day.planExerciseIds?.includes(log.plan_exercise_id!))?.id;
  return log.adhoc && log.plan_day_id ? log.plan_day_id : undefined;
}

export function logBelongsToDay(
  log: LogOwnership & { logged_at: string },
  day: DayOwnership,
  days: readonly DayOwnership[],
): boolean {
  const ownerId = logOwnerDayId(log, days);
  const owner = ownerId ? days.find(candidate => candidate.id === ownerId) : undefined;
  // Day switching only changes attribution within the same plan week.
  if (owner?.week_number != null && owner.week_number === day.week_number) return owner.id === day.id;
  return sameDay(new Date(log.logged_at), day.date);
}

export function hasCompletedDayLog(
  day: DayOwnership,
  days: readonly DayOwnership[],
  logs: readonly (LogOwnership & { completed: boolean; logged_at: string })[],
): boolean {
  return logs.some(log => log.completed && logBelongsToDay(log, day, days));
}
