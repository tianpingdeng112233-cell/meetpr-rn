import { E1RM_POLICY } from './constants';
import type { E1RMHistoryPoint, LiftFamily } from './types';

export type E1RMAnomalyVerdict = 'normal' | 'lowConfidence' | 'suspectHard';

export interface E1RMEligibilityInput {
  readonly completed?: boolean;
  readonly failed?: boolean;
  readonly reps: number;
  readonly rpe: number | null;
  readonly family: LiftFamily | null;
}

export function isE1RMEligible({
  completed = true,
  failed = false,
  reps,
  rpe,
  family,
}: E1RMEligibilityInput): boolean {
  if (!completed || failed) {
    return false;
  }
  if (rpe !== null && rpe < E1RM_POLICY.minimumEligibleRPE) {
    return false;
  }
  if (reps > E1RM_POLICY.maximumEligibleReps) {
    return false;
  }
  if (family === 'deadlift' && reps > E1RM_POLICY.maximumEligibleDeadliftReps) {
    return false;
  }
  return true;
}

export function isE1RMPointEligible(
  point: E1RMHistoryPoint,
  family: LiftFamily | null,
): boolean {
  return isE1RMEligible({ reps: point.sourceReps, rpe: point.sourceRPE, family });
}

export function prNoiseBand(previousBestKg: number): number {
  return Math.max(
    E1RM_POLICY.minimumPRImprovementKg,
    previousBestKg * E1RM_POLICY.relativePRNoiseBand,
  );
}

export function classifyE1RMAnomaly(
  newE1RMKg: number,
  previousTrustedBestKg: number | null,
): E1RMAnomalyVerdict {
  if (previousTrustedBestKg === null || previousTrustedBestKg <= 0) {
    return 'normal';
  }
  if (newE1RMKg <= previousTrustedBestKg * (1 + E1RM_POLICY.softJump)) {
    return 'normal';
  }
  if (newE1RMKg <= previousTrustedBestKg * (1 + E1RM_POLICY.hardJump)) {
    return 'lowConfidence';
  }
  return 'suspectHard';
}
