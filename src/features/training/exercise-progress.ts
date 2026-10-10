import type { PlanExercise } from '@/api/domains/plans';
import { isDraftTerminal } from './drafts';
import type { WorkoutSetDraft } from './model';

export type ExerciseProgressGroup = { exercise: PlanExercise; drafts: readonly WorkoutSetDraft[] };

/** Shared by the hero, exercise partition and set segments, including assumed results. */
export function needsSetResult(draft: WorkoutSetDraft): boolean {
  return !isDraftTerminal(draft) || Boolean(draft.sourceLog?.assumed);
}

export function partitionExerciseProgress(groups: readonly ExerciseProgressGroup[]) {
  const ordered = [...groups].sort((a, b) => a.exercise.sort_order - b.exercise.sort_order);
  const completed = ordered.filter(group => group.drafts.length > 0 && !group.drafts.some(needsSetResult));
  const unfinished = ordered.filter(group => !completed.includes(group));
  const active = unfinished.find(group => group.drafts.some(needsSetResult)) ?? null;
  return { completed, active, remaining: unfinished.filter(group => group !== active) };
}

export type SetProgressSegment = 'complete' | 'failed' | 'current' | 'upcoming';
export function setProgressSegments(drafts: readonly WorkoutSetDraft[]): SetProgressSegment[] {
  const current = drafts.findIndex(needsSetResult);
  return drafts.map((draft, index) => needsSetResult(draft)
    ? index === current ? 'current' : 'upcoming'
    : draft.status === 'failed' ? 'failed' : 'complete');
}
