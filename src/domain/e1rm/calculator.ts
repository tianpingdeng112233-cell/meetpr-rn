import { E1RM_MATH, RTS_INTENSITY_TABLE } from './constants';

function isWholeNumber(value: number): boolean {
  return Number.isInteger(value);
}

/**
 * Returns RTS intensity for whole reps and RPE 5.0–10.0. RPE is interpolated
 * linearly; 5.0–5.5 extrapolates the first half-step slope.
 */
export function rtsIntensity(reps: number, rpe: number): number | null {
  if (
    !isWholeNumber(reps) ||
    reps < E1RM_MATH.minimumReps ||
    reps > E1RM_MATH.rtsMaximumReps ||
    !Number.isFinite(rpe) ||
    rpe < E1RM_MATH.suggestionMinimumRPE ||
    rpe > E1RM_MATH.maximumRPE
  ) {
    return null;
  }

  const row = RTS_INTENSITY_TABLE[reps - E1RM_MATH.minimumReps];
  if (!row) {
    return null;
  }

  if (rpe < E1RM_MATH.rtsMinimumRPE) {
    const halfStepSlope = row[1] - row[0];
    return (
      row[0] +
      ((rpe - E1RM_MATH.rtsMinimumRPE) / E1RM_MATH.rpeStep) * halfStepSlope
    );
  }

  const position =
    (rpe - E1RM_MATH.rtsMinimumRPE) / E1RM_MATH.rpeStep;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.min(lowerIndex + 1, row.length - 1);
  const fraction = position - lowerIndex;
  return row[lowerIndex] * (1 - fraction) + row[upperIndex] * fraction;
}

/**
 * Calculates an unrounded e1RM in kg. Inputs follow the decimal-to-number
 * contract in `types.ts`; null means the set is outside the formula boundary.
 */
export function calculateE1RM(
  weightKg: number,
  reps: number,
  rpe: number | null,
): number | null {
  if (
    !Number.isFinite(weightKg) ||
    weightKg <= 0 ||
    !isWholeNumber(reps) ||
    reps < E1RM_MATH.minimumReps
  ) {
    return null;
  }

  if (rpe !== null) {
    if (!Number.isFinite(rpe) || rpe > E1RM_MATH.maximumRPE) {
      return null;
    }
    if (rpe >= E1RM_MATH.rtsMinimumRPE) {
      const safeReps = Math.min(reps, E1RM_MATH.rtsMaximumReps);
      const intensity = rtsIntensity(safeReps, rpe);
      if (intensity === null || intensity <= E1RM_MATH.minimumUsableIntensity) {
        return null;
      }
      return weightKg / intensity;
    }
  }

  if (reps > E1RM_MATH.epleyMaximumReps) {
    return null;
  }
  return weightKg * (1 + reps / E1RM_MATH.epleyRepDivisor);
}

/**
 * Reverses RTS intensity and intentionally rounds down to a 2.5 kg loading
 * increment. The epsilon prevents a binary-float underflow at exact steps.
 */
export function suggestedWeightKg(
  e1RMKg: number,
  reps: number,
  rpe: number,
): number | null {
  if (!Number.isFinite(e1RMKg) || e1RMKg <= 0) {
    return null;
  }
  const intensity = rtsIntensity(reps, rpe);
  if (intensity === null) {
    return null;
  }

  const rawWeight = e1RMKg * intensity;
  if (!Number.isFinite(rawWeight) || rawWeight <= 0) {
    return null;
  }
  const steps = Math.floor(
    rawWeight / E1RM_MATH.suggestionIncrementKg + E1RM_MATH.floorCorrection,
  );
  return steps * E1RM_MATH.suggestionIncrementKg;
}
