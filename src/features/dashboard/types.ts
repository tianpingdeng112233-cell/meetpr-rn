import type { PlanDay, PlanDetail } from '@/api/domains';
import type { LiftFamily } from '@/domain/e1rm';

export type WorkoutDayStatus = 'notStarted' | 'partial' | 'complete' | 'noPlan';

export type DashboardLift = {
  exerciseId: string;
  family: LiftFamily;
  initial: 'S' | 'B' | 'D';
  name: '深蹲' | '卧推' | '硬拉';
};

export type DashboardWeekDay = {
  date: string;
  day: PlanDay | null;
  lift: DashboardLift | null;
  completion: number;
  status: WorkoutDayStatus;
};

export type WeekOverviewLoaded = {
  plan: PlanDetail;
  days: DashboardWeekDay[];
  logs: import('@/api/domains').SetLog[];
  weekIndex: number;
  weekStart: string;
  weekEndExclusive: string;
};

export type WeekOverviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | ({ status: 'loaded' } & WeekOverviewLoaded)
  | { status: 'error'; error: unknown };

export type DashboardNotification =
  | { type: 'plan'; id: string; weekIndex: number }
  | { type: 'feedback'; id: string; count: number }
  | { type: 'evaluation'; id: string };
