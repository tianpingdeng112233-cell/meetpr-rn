/**
 * All e1RM formula boundaries and product thresholds live here. Values are
 * mirrored from iOS release/1.0 @ 3799f67 and must not be duplicated in UI.
 */
export const E1RM_POLICY = Object.freeze({
  minimumEligibleRPE: 7,
  maximumEligibleReps: 10,
  maximumEligibleDeadliftReps: 5,
  rollingWindowDays: 28,
  chartWindowDays: 90,
  minimumPRImprovementKg: 0.5,
  relativePRNoiseBand: 0.03,
  softJump: 0.1,
  hardJump: 0.18,
});

export const E1RM_MATH = Object.freeze({
  minimumReps: 1,
  rtsMaximumReps: 12,
  epleyMaximumReps: 20,
  epleyRepDivisor: 30,
  rtsMinimumRPE: 6,
  suggestionMinimumRPE: 5,
  maximumRPE: 10,
  rpeStep: 0.5,
  minimumUsableIntensity: 0.5,
  suggestionIncrementKg: 2.5,
  floorCorrection: 1e-6,
  millisecondsPerDay: 86_400_000,
});

/** Rows are reps 1–12; columns are RPE 6.0–10.0 in 0.5 steps. */
export const RTS_INTENSITY_TABLE: readonly (readonly number[])[] = Object.freeze([
  Object.freeze([0.84, 0.86, 0.88, 0.9, 0.92, 0.94, 0.96, 0.98, 1]),
  Object.freeze([0.8, 0.82, 0.84, 0.86, 0.88, 0.9, 0.92, 0.94, 0.96]),
  Object.freeze([0.76, 0.78, 0.8, 0.82, 0.84, 0.86, 0.88, 0.9, 0.92]),
  Object.freeze([0.72, 0.74, 0.76, 0.78, 0.8, 0.82, 0.84, 0.86, 0.88]),
  Object.freeze([0.7, 0.72, 0.74, 0.76, 0.78, 0.8, 0.82, 0.84, 0.86]),
  Object.freeze([0.68, 0.7, 0.72, 0.74, 0.76, 0.78, 0.8, 0.82, 0.84]),
  Object.freeze([0.66, 0.68, 0.7, 0.72, 0.74, 0.76, 0.78, 0.8, 0.82]),
  Object.freeze([0.64, 0.66, 0.68, 0.7, 0.72, 0.74, 0.76, 0.78, 0.8]),
  Object.freeze([0.62, 0.64, 0.66, 0.68, 0.7, 0.72, 0.74, 0.76, 0.78]),
  Object.freeze([0.6, 0.62, 0.64, 0.66, 0.68, 0.7, 0.72, 0.74, 0.76]),
  Object.freeze([0.58, 0.6, 0.62, 0.64, 0.66, 0.68, 0.7, 0.72, 0.74]),
  Object.freeze([0.56, 0.58, 0.6, 0.62, 0.64, 0.66, 0.68, 0.7, 0.72]),
]);
