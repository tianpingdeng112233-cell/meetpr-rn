import { describe, expect, test } from '@jest/globals';

import {
  E1RM_POLICY,
  calculateE1RM,
  classifyE1RMAnomaly,
  isE1RMEligible,
  prNoiseBand,
  rtsIntensity,
  suggestedWeightKg,
} from '..';

const specRTSTable = [
  [0.863, 0.878, 0.892, 0.907, 0.922, 0.939, 0.955, 0.978, 1],
  [0.837, 0.85, 0.863, 0.878, 0.892, 0.907, 0.922, 0.939, 0.955],
  [0.811, 0.824, 0.837, 0.85, 0.863, 0.878, 0.892, 0.907, 0.922],
  [0.786, 0.799, 0.811, 0.824, 0.837, 0.85, 0.863, 0.878, 0.892],
  [0.762, 0.774, 0.786, 0.799, 0.811, 0.824, 0.837, 0.85, 0.863],
  [0.739, 0.751, 0.762, 0.774, 0.786, 0.799, 0.811, 0.824, 0.837],
  [0.707, 0.723, 0.739, 0.751, 0.762, 0.774, 0.786, 0.799, 0.811],
  [0.68, 0.694, 0.707, 0.723, 0.739, 0.751, 0.762, 0.774, 0.786],
  [0.653, 0.667, 0.68, 0.694, 0.707, 0.723, 0.739, 0.751, 0.762],
  [0.626, 0.64, 0.653, 0.667, 0.68, 0.694, 0.707, 0.723, 0.739],
  [0.599, 0.6125, 0.626, 0.64, 0.653, 0.667, 0.68, 0.694, 0.707],
  [0.572, 0.5855, 0.599, 0.6125, 0.626, 0.64, 0.653, 0.667, 0.68],
];

describe('RTS and e1RM calculation', () => {
  test('matches every RTS table cell and canonical sample', () => {
    specRTSTable.forEach((row, repsIndex) => {
      row.forEach((intensity, rpeIndex) => {
        const reps = repsIndex + 1;
        const rpe = 6 + rpeIndex * 0.5;
        expect(rtsIntensity(reps, rpe)).toBe(intensity);
        expect(calculateE1RM(100, reps, rpe)).toBeCloseTo(100 / intensity, 10);
      });
    });
    expect(calculateE1RM(100, 5, 8)).toBeCloseTo(123.304_562, 6);
  });

  test.each([[3, 9, 112.11], [1, 10, 100], [5, 7.75, 124.22], [11, 8, 153.14], [12, 8, 159.74]])('matches spec 106: 100 kg × %s @%s', (reps, rpe, expected) => {
    expect(calculateE1RM(100, reps, rpe)).toBeCloseTo(expected, 2);
  });

  test('interpolates only along RPE', () => {
    expect(rtsIntensity(5, 8.25)).toBeCloseTo(0.8175, 10);
    expect(calculateE1RM(100, 5, 7.25)).toBeCloseTo(100 / 0.7925, 10);
    expect(calculateE1RM(100, 5, 9.25)).toBeCloseTo(100 / 0.8435, 10);
  });

  test('uses Epley for missing or sub-6 RPE and enforces its boundary', () => {
    expect(calculateE1RM(100, 5, null)).toBeCloseTo(116.666_667, 6);
    expect(calculateE1RM(100, 5, 5.5)).toBeCloseTo(116.666_667, 6);
    expect(calculateE1RM(100, 20, null)).toBeCloseTo(166.666_667, 6);
    expect(calculateE1RM(100, 21, null)).toBeNull();
  });

  test('handles locked calculator boundaries', () => {
    expect(calculateE1RM(100, 0, 8)).toBeNull();
    expect(calculateE1RM(0, 5, 8)).toBeNull();
    expect(calculateE1RM(100, 5, 10.5)).toBeNull();
    expect(calculateE1RM(100, 13, 10)).toBe(calculateE1RM(100, 12, 10));
    expect(calculateE1RM(Number.POSITIVE_INFINITY, 5, 8)).toBeNull();
    expect(calculateE1RM(100, 1.5, 8)).toBeNull();
  });
});

describe('suggested weight reversal', () => {
  test('extrapolates RPE 5.0–5.5 and rounds down to 2.5 kg', () => {
    expect(rtsIntensity(5, 5.5)).toBeCloseTo(0.75, 10);
    expect(rtsIntensity(5, 5)).toBeCloseTo(0.738, 10);
    expect(suggestedWeightKg(100, 5, 10)).toBe(85);
    expect(suggestedWeightKg(100, 5, 5.5)).toBe(75);
    expect(suggestedWeightKg(100, 5, 5)).toBe(72.5);
  });

  test('applies the +1e-6 correction at a floating step boundary', () => {
    expect(suggestedWeightKg(99.999_999, 1, 10)).toBe(100);
    expect(suggestedWeightKg(102.499, 1, 10)).toBe(100);
  });

  test('uses the extended table for prescriptions and preserves an exact round trip', () => {
    expect(suggestedWeightKg(123.3, 2, 9)).toBe(112.5);
    expect(suggestedWeightKg(calculateE1RM(100, 5, 8)!, 5, 8)).toBe(100);
  });

  test('rejects inputs outside the reverse table', () => {
    expect(suggestedWeightKg(0, 5, 8)).toBeNull();
    expect(suggestedWeightKg(100, 0, 8)).toBeNull();
    expect(suggestedWeightKg(100, 13, 8)).toBeNull();
    expect(suggestedWeightKg(100, 5, 4.5)).toBeNull();
    expect(suggestedWeightKg(100, 5, 10.5)).toBeNull();
    expect(suggestedWeightKg(Number.POSITIVE_INFINITY, 5, 8)).toBeNull();
    expect(suggestedWeightKg(100, 5, Number.NaN)).toBeNull();
  });
});

describe('central policy and eligibility', () => {
  test('locks every requested policy constant', () => {
    expect(E1RM_POLICY).toEqual({
      maximumEligibleReps: 10,
      maximumEligibleDeadliftReps: 5,
      rollingWindowDays: 28,
      chartWindowDays: 90,
      minimumPRImprovementKg: 0.5,
      relativePRNoiseBand: 0.03,
      softJump: 0.1,
      hardJump: 0.18,
    });
    expect(prNoiseBand(10)).toBe(0.5);
    expect(prNoiseBand(200)).toBe(6);
  });

  test('covers every eligibility branch including nil RPE', () => {
    expect(isE1RMEligible({ completed: true, reps: 5, rpe: 7, family: 'squat' })).toBe(
      true,
    );
    expect(isE1RMEligible({ completed: true, reps: 5, rpe: null, family: 'squat' })).toBe(
      true,
    );
    expect(isE1RMEligible({ completed: false, reps: 5, rpe: 8, family: 'squat' })).toBe(
      false,
    );
    expect(
      isE1RMEligible({ completed: true, failed: true, reps: 5, rpe: 8, family: 'squat' }),
    ).toBe(false);
    expect(isE1RMEligible({ reps: 5, rpe: 6, family: 'squat' })).toBe(true);
    expect(isE1RMEligible({ reps: 5, rpe: 6.5, family: 'squat' })).toBe(true);
    expect(isE1RMEligible({ reps: 5, rpe: 5.5, family: 'squat' })).toBe(true);
    expect(isE1RMEligible({ reps: 5, rpe: 10.5, family: 'squat' })).toBe(false);
    expect(isE1RMEligible({ reps: 10, rpe: 9, family: 'squat' })).toBe(true);
    expect(isE1RMEligible({ reps: 11, rpe: 9, family: 'squat' })).toBe(false);
    expect(isE1RMEligible({ reps: 5, rpe: 9, family: 'deadlift' })).toBe(true);
    expect(isE1RMEligible({ reps: 6, rpe: 9, family: 'deadlift' })).toBe(false);
    expect(isE1RMEligible({ reps: 6, rpe: 9, family: 'bench' })).toBe(true);
  });

  test('classifies both anomaly bands against the trusted best', () => {
    expect(classifyE1RMAnomaly(999, null)).toBe('normal');
    expect(classifyE1RMAnomaly(220, 200)).toBe('normal');
    expect(classifyE1RMAnomaly(220.01, 200)).toBe('lowConfidence');
    expect(classifyE1RMAnomaly(236, 200)).toBe('lowConfidence');
    expect(classifyE1RMAnomaly(236.01, 200)).toBe('suspectHard');
  });
});
