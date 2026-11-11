import type { PlanDetail } from '@/api/domains/plans';
import { cursorDay } from '@/domain/plan/sequence';

export function studentEmptyState(plan: PlanDetail | null | undefined) {
  if (!plan?.days.length) return { kind: 'first' as const };
  if (cursorDay(plan.days)) return null;
  const lastWeek = Math.max(...plan.days.map(day => day.week_number));
  if (lastWeek < plan.plan_weeks) return { kind: 'next' as const, week: lastWeek + 1, previousWeek: lastWeek, sessions: plan.days.filter(day => day.week_number === lastWeek).length };
  return { kind: 'completed' as const, weeks: plan.plan_weeks };
}
