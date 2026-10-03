import type { LiftFamily } from './types';
export type PercentageAnchor = 'registered_1rm' | 'e1rm' | 'top_set';
export type PctAnchorReason =
  | 'unsupportedExercise'
  | 'missingRegisteredOneRM'
  | 'topSetNotCompleted';
export type PctAnchorResolution = {
  resolvedKg: number | null;
  source: PercentageAnchor | 'fallbackToRegisteredOneRM' | 'unresolved';
  anchorKg?: number;
  reason?: PctAnchorReason;
};
export type PctAnchorInput = {
  percentage: number;
  anchor: PercentageAnchor;
  family: LiftFamily | null;
  registeredOneRMKg: number | null;
  currentE1RMKg: number | null;
  exerciseId: string;
  sortOrder: number;
  sameDaySets: readonly {
    exerciseId: string;
    sortOrder: number;
    weightKg: number | null;
    reps: number;
    completed: boolean;
    failed: boolean;
  }[];
};
export function resolvePctAnchor(input: PctAnchorInput): PctAnchorResolution {
  const unresolved = (reason: PctAnchorReason): PctAnchorResolution => ({
    resolvedKg: null,
    source: 'unresolved',
    reason,
  });
  if (!input.family) return unresolved('unsupportedExercise');
  let anchorKg: number | null = null;
  let source: PctAnchorResolution['source'] = input.anchor;
  if (input.anchor === 'top_set') {
    const weights = input.sameDaySets
      .filter(
        (set) =>
          set.exerciseId === input.exerciseId &&
          set.sortOrder < input.sortOrder &&
          set.completed &&
          !set.failed &&
          set.reps >= 1 &&
          (set.weightKg ?? 0) > 0,
      )
      .map((set) => set.weightKg!);
    if (!weights.length) return unresolved('topSetNotCompleted');
    anchorKg = Math.max(...weights);
  } else if (input.anchor === 'e1rm' && (input.currentE1RMKg ?? 0) > 0) {
    anchorKg = input.currentE1RMKg;
  } else {
    if ((input.registeredOneRMKg ?? 0) <= 0)
      return unresolved('missingRegisteredOneRM');
    anchorKg = input.registeredOneRMKg;
    if (input.anchor === 'e1rm') source = 'fallbackToRegisteredOneRM';
  }
  const rounded =
    Math.floor((anchorKg! * input.percentage) / 100 / 2.5 + 1e-6) * 2.5;
  return {
    resolvedKg: Number.isFinite(rounded) && rounded > 0 ? rounded : null,
    source,
    anchorKg: anchorKg!,
  };
}
