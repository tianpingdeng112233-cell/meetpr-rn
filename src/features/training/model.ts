import type { PlanDay, PlanExercise, PlanSet } from '@/api/domains/plans';
import type { SetLog } from '@/api/domains/sets';

export type TrainingLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'noPlan' }
  | { kind: 'error'; error: unknown }
  | { kind: 'loaded'; planDay: PlanDay; drafts: WorkoutSetDraft[] }
  | {
      kind: 'recording';
      planDay: PlanDay;
      drafts: WorkoutSetDraft[];
      rowIndex: number;
    };

export type DraftStatus = 'pending' | 'complete' | 'failed';

export type WorkoutSetDraft = {
  stableSetId: string;
  exercise: PlanExercise;
  planSet: PlanSet;
  exerciseOrdinal: number;
  setIndex: number;
  status: DraftStatus;
  weightText: string;
  repsText: string;
  rpeText: string;
  sourceLog: SetLog | null;
};

export type WeightSuggestion = {
  weightKg: number;
  label: string;
  percentage?: import('@/domain/e1rm/pct-anchor').PctAnchorResolution;
} | null;

export type SessionReflection = {
  goal: string;
  achieved: string;
  improve: string;
};

export type SessionReview = {
  completedAt: string;
  reflection: SessionReflection;
};


export type ReadinessGateState = 'unknown' | 'needed' | 'done' | 'skippedToday';
