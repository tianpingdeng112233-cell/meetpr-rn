/**
 * All e1RM formula boundaries and product thresholds live here. Values are
 * mirrored from iOS release/1.0 @ 3799f67; eligibility follows 03021ff6.
 * Do not duplicate them in UI.
 */
export const E1RM_POLICY = Object.freeze({
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

/** Extended RPE table (JTS / Programming To Win); spec 106 extends rows 11–12.
 * Rows are reps 1–12; columns are RPE 6.0–10.0 in 0.5 steps. */
export const RTS_INTENSITY_TABLE: readonly (readonly number[])[] = Object.freeze([
  Object.freeze([0.863, 0.878, 0.892, 0.907, 0.922, 0.939, 0.955, 0.978, 1]),
  Object.freeze([0.837, 0.85, 0.863, 0.878, 0.892, 0.907, 0.922, 0.939, 0.955]),
  Object.freeze([0.811, 0.824, 0.837, 0.85, 0.863, 0.878, 0.892, 0.907, 0.922]),
  Object.freeze([0.786, 0.799, 0.811, 0.824, 0.837, 0.85, 0.863, 0.878, 0.892]),
  Object.freeze([0.762, 0.774, 0.786, 0.799, 0.811, 0.824, 0.837, 0.85, 0.863]),
  Object.freeze([0.739, 0.751, 0.762, 0.774, 0.786, 0.799, 0.811, 0.824, 0.837]),
  Object.freeze([0.707, 0.723, 0.739, 0.751, 0.762, 0.774, 0.786, 0.799, 0.811]),
  Object.freeze([0.68, 0.694, 0.707, 0.723, 0.739, 0.751, 0.762, 0.774, 0.786]),
  Object.freeze([0.653, 0.667, 0.68, 0.694, 0.707, 0.723, 0.739, 0.751, 0.762]),
  Object.freeze([0.626, 0.64, 0.653, 0.667, 0.68, 0.694, 0.707, 0.723, 0.739]),
  Object.freeze([0.599, 0.6125, 0.626, 0.64, 0.653, 0.667, 0.68, 0.694, 0.707]),
  Object.freeze([0.572, 0.5855, 0.599, 0.6125, 0.626, 0.64, 0.653, 0.667, 0.68]),
]);
