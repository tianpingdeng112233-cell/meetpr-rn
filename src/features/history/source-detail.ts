import type { SetLog } from '@/api/domains';
import { calculateE1RM, E1RM_MATH, rtsIntensity, type E1RMHistoryPoint } from '@/domain/e1rm';

export type GrowthSourceCalculation =
  | { kind: 'rts'; intensity: number; rpe: number }
  | { kind: 'epley' }
  | { kind: 'unavailable' };

/** Stored inputs explain a stored estimate; current logs supply identity only. */
export function growthSourceDetail(
  point: E1RMHistoryPoint,
  logs: readonly SetLog[],
  exerciseNames: ReadonlyMap<string, string>,
) {
  const log = logs.find(candidate => candidate.id === point.setLogId
    && candidate.student_id === point.studentId && candidate.exercise_id === point.exerciseId);
  const rpe = point.sourceCoachRPE ?? point.sourceRPE;
  const recalculated = calculateE1RM(point.sourceWeightKg, point.sourceReps, rpe);
  let calculation: GrowthSourceCalculation = { kind: 'unavailable' };
  if (recalculated !== null && Number.isFinite(point.e1RMKg) && Math.abs(recalculated - point.e1RMKg) < 0.051) {
    if (rpe === null || rpe < E1RM_MATH.rtsMinimumRPE) calculation = { kind: 'epley' };
    else {
      const intensity = rtsIntensity(Math.min(point.sourceReps, E1RM_MATH.rtsMaximumReps), rpe);
      if (intensity !== null) calculation = { kind: 'rts', intensity, rpe };
    }
  }
  return {
    point,
    exerciseName: exerciseNames.get(point.exerciseId) ?? null,
    setNumber: log && log.set_index >= 0 ? log.set_index + 1 : null,
    calculation,
  };
}

export type GrowthSourceDetail = ReturnType<typeof growthSourceDetail>;
