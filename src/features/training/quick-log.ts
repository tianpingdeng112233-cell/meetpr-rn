import type { PlanDay, PlanDetail } from '@/api/domains/plans';
import type { SetLog } from '@/api/domains/sets';
import { sequenceDays } from '@/domain/plan/sequence';
import { localDateText } from '@/domain/plan/workout-date-policy';
import type { WorkoutSetDraft } from './model';

export type QuickLogRow = { draft: WorkoutSetDraft; included: boolean; automaticWeight: boolean };
export type QuickLogPlan = { dayId: string; selectedDate: string; minimumDate: string; maximumDate: string; rows: QuickLogRow[] };
export function localNoon(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}
export function makeQuickLogPlan({ plan, day, drafts, logs, now = new Date(), suggestedWeight }: {
  plan: PlanDetail; day: PlanDay; drafts: readonly WorkoutSetDraft[]; logs: readonly SetLog[]; now?: Date;
  suggestedWeight?: (draft: WorkoutSetDraft) => number | null;
}): QuickLogPlan {
  const today = localDateText(now);
  const ordered = sequenceDays(plan.days);
  const previous = ordered.slice(0, ordered.findIndex(value => value.id === day.id)).reverse().find(value => value.completed_at != null);
  const ids = new Set(previous?.exercises.map(value => value.id));
  const previousDates = logs.filter(log => ids.has(log.plan_exercise_id ?? '')).map(log => log.logged_date).sort();
  const lower = previousDates[0] ?? (plan.published_at ? localDateText(new Date(plan.published_at)) : plan.start_date);
  return { dayId: day.id, selectedDate: today, minimumDate: lower > today ? today : lower, maximumDate: today,
    rows: day.exercises.flatMap(exercise => drafts.filter(draft => draft.exercise.id === exercise.id)).map(draft => {
      const weight = draft.weightText === '' ? suggestedWeight?.(draft) : null;
      return { draft: { ...draft, weightText: weight == null ? draft.weightText : String(weight) }, included: true, automaticWeight: weight != null };
    }) };
}
export type QuickLogOutcome = { kind: 'completed' } | { kind: 'empty' } | { kind: 'busy' } | { kind: 'invalid' } | { kind: 'partialFailure'; written: number; remaining: number } | { kind: 'completionFailed' };
export class QuickLogAttempt {
  private written = new Set<string>();
  private inFlight = false;
  private completed = false;
  private snapshot: QuickLogPlan | null = null;
  constructor(private readonly dependencies: { persist: (row: QuickLogRow, date: string) => Promise<void>; complete: (dayId: string) => Promise<void> }) {}
  get locked(): boolean { return this.written.size > 0; }
  async submit(input: QuickLogPlan): Promise<QuickLogOutcome> {
    if (this.completed) return { kind: 'completed' };
    if (this.inFlight) return { kind: 'busy' };
    const plan = this.snapshot ?? input;
    const rows = plan.rows.filter(row => row.included);
    if (!rows.length) return { kind: 'empty' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(plan.selectedDate) || localDateText(localNoon(plan.selectedDate)) !== plan.selectedDate || plan.selectedDate < plan.minimumDate || plan.selectedDate > plan.maximumDate) return { kind: 'invalid' };
    if (rows.some(({ draft }) => !draft.weightText.trim() || !Number.isFinite(Number(draft.weightText)) || Number(draft.weightText) < 0 || !Number.isInteger(Number(draft.repsText)) || Number(draft.repsText) < 1 || Number(draft.repsText) > 99 || (draft.rpeText !== '' && (!Number.isFinite(Number(draft.rpeText)) || Number(draft.rpeText) < 0 || Number(draft.rpeText) > 10)))) return { kind: 'invalid' };
    this.inFlight = true;
    try {
      for (const row of rows) {
        if (this.written.has(row.draft.stableSetId)) continue;
        try {
          await this.dependencies.persist(row, plan.selectedDate);
          this.written.add(row.draft.stableSetId);
          this.snapshot = plan;
        } catch { return { kind: 'partialFailure', written: this.written.size, remaining: rows.length - this.written.size }; }
      }
      try { await this.dependencies.complete(plan.dayId); this.completed = true; return { kind: 'completed' }; }
      catch { return { kind: 'completionFailed' }; }
    } finally { this.inFlight = false; }
  }
}
