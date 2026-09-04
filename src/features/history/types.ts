import type {
  FeedbackItem,
  PlanDetail,
  PlanExercise,
  PlanSet,
  SetLog,
} from '@/api/domains';
import type { E1RMSample, E1RMSeries, LiftFamily, PRBreakthroughEvent } from '@/domain/e1rm';

export type GrowthCurve = {
  family: LiftFamily;
  name: '深蹲' | '卧推' | '硬拉';
  series: E1RMSeries;
  point: E1RMSample | null;
  periodLabel: '90 天' | '历史最佳';
  trajectory: readonly E1RMSample[];
  lowConfidence: readonly E1RMSample[];
};

export type GrowthStats = {
  trainingDays: number;
  trainingWeeks: number;
  sbdTotalKg: number | null;
};

export type HistoryExercise = {
  planExercise: PlanExercise;
  name: string;
  notes: string[];
  plannedSets: PlanSet[];
  logs: SetLog[];
};

export type HistoryDay = {
  date: string;
  done: number;
  total: number;
  exercises: HistoryExercise[];
  isRest: boolean;
};

export type HistoryWeek = {
  id: string;
  plan: PlanDetail;
  weekNumber: number;
  startDate: string;
  days: HistoryDay[];
};

export type VolumeIntensityPoint = {
  key: string;
  startDate: string;
  volumeKg: number;
  averageRPE: number | null;
  rpePlotValue: number | null;
};

export type VolumeIntensitySeries = {
  scale: number;
  points: VolumeIntensityPoint[];
};

export type GrowthLoaded = {
  plans: PlanDetail[];
  weeks: HistoryWeek[];
  logs: SetLog[];
  feedback: FeedbackItem[];
  curves: Record<LiftFamily, GrowthCurve>;
  stats: GrowthStats;
  volumeIntensity: VolumeIntensitySeries;
  familyByExerciseId: ReadonlyMap<string, LiftFamily>;
  familyByPlanExerciseId: ReadonlyMap<string, LiftFamily>;
  exerciseNames: ReadonlyMap<string, string>;
  prEvents: PRBreakthroughEvent[];
};

export type GrowthState =
  | { status: 'idle' }
  | { status: 'loading' }
  | ({ status: 'loaded' } & GrowthLoaded)
  | { status: 'error'; error: unknown };
