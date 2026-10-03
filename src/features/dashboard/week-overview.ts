import { useEffect, useMemo, useRef } from 'react';

import {
  useSetLogs,
  type Exercise,
  type OnboardingProfile,
  type PlanDetail,
} from '@/api/domains';

import { buildDashboardWeekDays } from './model';
import { planLogRange, recommendedDate } from '@/domain/plan/sequence';
import type { WeekOverviewState } from './types';

export type WeekOverviewViewModel = {
  state: WeekOverviewState;
  reload: () => Promise<unknown>;
};

export function useWeekOverviewViewModel(
  studentId: string,
  plan: PlanDetail | null,
  weekIndex: number,
  planRevision: number,
  exerciseIndex: ReadonlyMap<string, Exercise>,
  onboarding: OnboardingProfile | null,
): WeekOverviewViewModel {
  const range = plan ? planLogRange(plan) : { from: '1970-01-01', to: '1970-01-01', scope: 'plan' as const };
  const query = useSetLogs(studentId, range, Boolean(plan));
  const previousRevision = useRef(planRevision);

  useEffect(() => {
    if (previousRevision.current !== planRevision && plan) {
      previousRevision.current = planRevision;
      void query.refetch();
    }
  }, [plan, planRevision, query]);

  const state = useMemo<WeekOverviewState>(() => {
    if (!plan) {
      return { status: 'idle' };
    }
    if (query.isPending) {
      return { status: 'loading' };
    }
    if (query.isError || !query.data) {
      return { status: 'error', error: query.error };
    }
    const start = recommendedDate(plan, { week_number: weekIndex, day_of_week: 1 });
    const endExclusive = recommendedDate(plan, { week_number: weekIndex + 1, day_of_week: 1 });
    const logs = query.data.logs;
    return {
      status: 'loaded',
      plan,
      days: buildDashboardWeekDays(
        plan,
        query.data.logs,
        weekIndex,
        exerciseIndex,
        onboarding,
      ),
      logs,
      weekIndex,
      weekStart: start,
      weekEndExclusive: endExclusive,
    };
  }, [
    exerciseIndex,
    onboarding,
    plan,
    query.data,
    query.error,
    query.isError,
    query.isPending,
    weekIndex,
  ]);

  return {
    state,
    reload: plan ? query.refetch : async () => undefined,
  };
}
