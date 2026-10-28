import type { BindRequest } from '@/api/domains/bind';
import type { PlanDay, PlanDetail, PlanSummary } from '@/api/domains/plans';
import {
  canUndoCompletion,
  completedToday,
  cursorDay,
  currentWeekDays,
  dayAfter,
  progressSegments,
  selectCurrentPlan,
} from '@/domain/plan/sequence';
export type TodayAction =
  | { kind: 'waiting' }
  | { kind: 'current'; day: PlanDay }
  | {
      kind: 'completed';
      day: PlanDay;
      nextDay: PlanDay | null;
      canUndo: boolean;
    }
  | { kind: 'cycleCompleted' };
export function todayModel(
  plan: PlanDetail | null,
  now = new Date(),
  plans: readonly PlanSummary[] = [],
  firstRun?: { request: BindRequest | null; firstPlanDismissed: boolean | null },
) {
  const days = plan?.days ?? [];
  const cursor = cursorDay(days);
  const completed = completedToday(days, now);
  const action: TodayAction = !days.length
    ? { kind: 'waiting' }
    : !cursor
      ? { kind: 'cycleCompleted' }
      : completed
        ? {
            kind: 'completed',
            day: completed,
            nextDay: dayAfter(days, completed.id),
            canUndo: canUndoCompletion(days, completed.id, now),
          }
        : { kind: 'current', day: cursor };
  const latest = selectCurrentPlan(plans);
  const metadata = firstRun?.request?.status === 'accepted' ? firstRun.request.first_run : null;
  const first = metadata?.first_plan;
  const firstPlan = first && firstRun?.firstPlanDismissed === false &&
    !first.has_settled_day ? first : null;
  return {
    firstPlan,
    waitingForFirstPlan: action.kind === 'waiting' && metadata?.binding_plan_count === 0,
    cursor,
    completedToday: completed,
    action,
    stickyStartDay: !firstPlan && action.kind === 'current' ? cursor : null,
    segments: progressSegments(currentWeekDays(days), cursor?.id),
    isAwaitingNextPlan:
      (days.length > 0 && !cursor) ||
      Boolean(
        latest &&
        plan &&
        latest.id !== plan.id &&
        selectCurrentPlan([plan, latest])?.id === latest.id,
      ),
  };
}
