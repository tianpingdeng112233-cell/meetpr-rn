import type { PlanDay, PlanDetail } from '@/api/domains/plans';
import type { SetLog } from '@/api/domains/sets';
import type { FeedbackItem } from '@/api/domains/feedback';
import { recommendedDate } from '@/domain/plan/sequence';
import { hasCompletedDayLog, logBelongsToDay } from './log-ownership';

export function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function localDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}
export function addDays(date: Date, count: number): Date {
  const result = localDate(localDay(date));
  result.setDate(result.getDate() + count);
  return result;
}
function elapsedDays(from: Date, to: Date): number {
  return Math.round((Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) - Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) / 86400000);
}
export function executionDate(plan: PlanDetail, day: PlanDay): Date {
  return localDate(day.shifted_to_date ?? recommendedDate(plan, day));
}
export function weekStart(plan: PlanDetail | null, now: Date): Date {
  if (!plan) return addDays(now, -6);
  const start = localDate(plan.start_date);
  const last = plan.days.reduce((latest, day) => Math.max(latest, executionDate(plan, day).getTime()), start.getTime());
  const span = Math.max(0, elapsedDays(start, new Date(last)));
  const offset = Math.min(Math.max(0, Math.trunc(elapsedDays(start, now) / 7)), Math.trunc(span / 7));
  return addDays(start, offset * 7);
}

export type ExecutionDay = { date: Date; planDay: PlanDay | null; logs: SetLog[]; hasCompletedLogs?: boolean };
export function isExecutionDayComplete(day: ExecutionDay): boolean {
  const owner = { id: day.planDay?.id, date: day.date, planExerciseIds: day.planDay?.exercises.map(exercise => exercise.id), week_number: day.planDay?.week_number };
  return day.planDay?.completed_at != null || (day.hasCompletedLogs ?? hasCompletedDayLog(owner, [owner], day.logs));
}
export function executionExercises(day: ExecutionDay) {
  const planned = (day.planDay?.exercises ?? []).map(exercise => {
    const logs = day.logs.filter(log => log.plan_exercise_id === exercise.id).sort((a, b) => a.set_index - b.set_index);
    return { exercise, prescribed: logs.filter(log => log.set_index < exercise.sets.length), extra: logs.filter(log => log.set_index >= exercise.sets.length) };
  });
  const added = new Map<string, SetLog[]>();
  for (const log of day.logs) {
    if (!log.adhoc || log.plan_exercise_id != null || !log.plan_day_id || log.plan_day_id !== day.planDay?.id) continue;
    const group = added.get(log.exercise_id) ?? [];
    group.push(log);
    added.set(log.exercise_id, group);
  }
  return { planned, added: [...added].map(([exerciseId, logs]) => ({ exerciseId, logs: logs.sort((a, b) => a.set_index - b.set_index) })) };
}
export function makeExecutionDays(plan: PlanDetail | null, logs: readonly SetLog[], now: Date): ExecutionDay[] {
  const start = weekStart(plan, now);
  const planned = new Map(plan?.days.map((day) => [localDay(executionDate(plan, day)), day]));
  const owners = plan?.days.map(day => ({ id: day.id, date: executionDate(plan, day), planExerciseIds: day.exercises.map(exercise => exercise.id), week_number: day.week_number })) ?? [];
  return Array.from({ length: 7 }, (_, offset) => {
    const date = addDays(start, offset);
    const planDay = planned.get(localDay(date)) ?? null;
    const ownership = { id: planDay?.id, date, week_number: planDay?.week_number };
    return {
      date,
      planDay,
      hasCompletedLogs: hasCompletedDayLog(ownership, owners, logs),
      logs: logs.filter(log => logBelongsToDay(log, ownership, owners)).sort((a, b) =>
        a.plan_exercise_id === b.plan_exercise_id ? a.set_index - b.set_index : new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()),
    };
  });
}
export function makeOverview(days: readonly ExecutionDay[], feedback: readonly FeedbackItem[], allLogs: readonly SetLog[] = days.flatMap(day => day.logs)) {
  const planned = days.filter((day) => day.planDay?.exercises.length);
  const logs = [...allLogs].sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());
  return {
    plannedTrainingDays: planned.length,
    completedTrainingDays: planned.filter(isExecutionDayComplete).length,
    latestActivityAt: logs[0]?.logged_at ?? null,
    latestFeedback: [...feedback].sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime())[0] ?? null,
  };
}
