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
  [0.84, 0.86, 0.88, 0.9, 0.92, 0.94, 0.96, 0.98, 1],
  [0.8, 0.82, 0.84, 0.86, 0.88, 0.9, 0.92, 0.94, 0.96],
  [0.76, 0.78, 0.8, 0.82, 0.84, 0.86, 0.88, 0.9, 0.92],
  [0.72, 0.74, 0.76, 0.78, 0.8, 0.82, 0.84, 0.86, 0.88],
  [0.7, 0.72, 0.74, 0.76, 0.78, 0.8, 0.82, 0.84, 0.86],
  [0.68, 0.7, 0.72, 0.74, 0.76, 0.78, 0.8, 0.82, 0.84],
  [0.66, 0.68, 0.7, 0.72, 0.74, 0.76, 0.78, 0.8, 0.82],
  [0.64, 0.66, 0.68, 0.7, 0.72, 0.74, 0.76, 0.78, 0.8],
  [0.62, 0.64, 0.66, 0.68, 0.7, 0.72, 0.74, 0.76, 0.78],
  [0.6, 0.62, 0.64, 0.66, 0.68, 0.7, 0.72, 0.74, 0.76],
  [0.58, 0.6, 0.62, 0.64, 0.66, 0.68, 0.7, 0.72, 0.74],
  [0.56, 0.58, 0.6, 0.62, 0.64, 0.66, 0.68, 0.7, 0.72],
];

describe('RTS and e1RM calculation', () => {
  test('matches every RTS table cell and canonical sample', () => {
    specRTSTable.forEach((row, repsIndex) => {
      row.forEach((intensity, rpeIndex) => {
        const reps = repsIndex + 1;
        const rpe = 6 + rpeIndex * 0.5;
        expect(rtsIntensity(reps, rpe)).toBeCloseTo(intensity, 10);
        expect(calculateE1RM(100, reps, rpe)).toBeCloseTo(100 / intensity, 10);
      });
    });
    expect(calculateE1RM(100, 5, 8)).toBeCloseTo(128.205_128, 6);
  });

  test('interpolates only along RPE', () => {
    expect(rtsIntensity(5, 8.25)).toBeCloseTo(0.79, 10);
    expect(calculateE1RM(100, 5, 7.25)).toBeCloseTo(100 / 0.75, 10);
    expect(calculateE1RM(100, 5, 9.25)).toBeCloseTo(100 / 0.83, 10);
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
    expect(rtsIntensity(5, 5.5)).toBeCloseTo(0.68, 10);
    expect(rtsIntensity(5, 5)).toBeCloseTo(0.66, 10);
    expect(suggestedWeightKg(100, 5, 10)).toBe(85);
    expect(suggestedWeightKg(100, 5, 5.5)).toBe(67.5);
    expect(suggestedWeightKg(100, 5, 5)).toBe(65);
  });

  test('applies the +1e-6 correction at a floating step boundary', () => {
    expect(suggestedWeightKg(99.999_999, 1, 10)).toBe(100);
    expect(suggestedWeightKg(102.499, 1, 10)).toBe(100);
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
    expect(isE1RMEligible({ reps: 5, rpe: 6.5, family: 'squat' })).toBe(false);
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
