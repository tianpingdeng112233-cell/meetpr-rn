import { addDays, sameDay, startOfDay } from './calendar';
import type { CoachPlan, CoachLog, CoachFeedback, TriageSignal } from './triage';
export type TrainingDay = { date: Date; completedLogDates: Date[] };
export type RosterRow = {
  student: { id: string; displayName: string; status: string; evaluationEndAt?: string | null };
  triageInput?: { plan: CoachPlan | null; logs: readonly CoachLog[]; feedback: readonly CoachFeedback[] };
  lastActiveAt: Date | null; triageSignals: TriageSignal[]; trainingDays: TrainingDay[];
};
export type WeekGroup = 'active' | 'idle' | 'attention';
export type WeekCell = { kind: 'rest' | 'completed' | 'upcoming' } | { kind: 'missed'; isAttention: boolean };
export function pairTrainingDays(plan: CoachPlan | null, logs: readonly CoachLog[]): TrainingDay[] {
  const completed = logs.filter(log => log.completed).map(log => new Date(log.logged_at));
  return (plan?.days ?? []).filter(day => day.exercises.length).map(day => ({ date: day.date, completedLogDates: completed.filter(log => Math.abs(log.getTime() - day.date.getTime()) <= 36 * 3600000) }));
}
export function makeSummary(rows: readonly RosterRow[], now: Date) {
  const today = startOfDay(now);
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  const weekRows = rows.map(row => {
    const plannedDays = row.trainingDays.filter(day => day.date >= monday && day.date < addDays(monday, 7));
    const completed = plannedDays.filter(day => day.completedLogDates.some(log => sameDay(log, day.date))).length;
    const group: WeekGroup = row.triageSignals.length ? 'attention' : completed ? 'active' : 'idle';
    const cells: WeekCell[] = days.map(date => {
      const planned = plannedDays.filter(day => sameDay(day.date, date));
      if (!planned.length) return { kind: 'rest' };
      if (planned.some(day => day.completedLogDates.some(log => sameDay(log, date)))) return { kind: 'completed' };
      return date < today ? { kind: 'missed', isAttention: group === 'attention' } : { kind: 'upcoming' };
    });
    return { ...row, group, cells, completed, planned: plannedDays.length };
  });
  const planned = weekRows.reduce((sum, row) => sum + row.planned, 0);
  const completed = weekRows.reduce((sum, row) => sum + row.completed, 0);
  const legend = (['active', 'idle', 'attention'] as const).map(group => ({ group, count: weekRows.filter(row => row.group === group).length })).filter(item => item.count > 0);
  const thursday = addDays(monday, 3);
  const ordinal = (Date.UTC(thursday.getFullYear(), thursday.getMonth(), thursday.getDate()) - Date.UTC(thursday.getFullYear(), 0, 1)) / 86400000;
  const isoWeek = Math.floor(ordinal / 7) + 1;
  return { isoWeek, days, rows: weekRows, planned, completed, completionRate: planned ? Math.round(completed / planned * 100) : 0, legend };
}
