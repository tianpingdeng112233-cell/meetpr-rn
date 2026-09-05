export const TRAINING_LIMITS = Object.freeze({
  gymDayCutoffHour: 4,
  historyWindowDays: 84,
  restMaximumSeconds: 900,
  restStepSeconds: 30,
  prReplayDelayMs: 1_500,
  transientBannerMs: 3_000,
  barWeightKg: 20,
  collarWeightPerSideKg: 2.5,
  weightStepKg: 2.5,
  repsStep: 1,
});

export const REST_DEFAULTS = Object.freeze({
  withoutRPE: 180,
  belowSeven: 120,
  belowNine: 180,
  nineOrAbove: 240,
});

export const RIR_KEYS = Object.freeze({
  5: 'student.setEntryRpe.copy001',
  5.5: 'student.setEntryRpe.copy002',
  6: 'student.setEntryRpe.copy003',
  6.5: 'student.setEntryRpe.copy004',
  7: 'student.setEntryRpe.copy005',
  7.5: 'student.setEntryRpe.copy006',
  8: 'student.setEntryRpe.copy007',
  8.5: 'student.setEntryRpe.copy008',
  9: 'student.setEntryRpe.copy009',
  9.5: 'student.setEntryRpe.copy010',
} as const);

export const READINESS_MUSCLES = Object.freeze([
  ['quad', 'student.readinessCheckinSheet.copy020'],
  ['hamstring', 'student.readinessCheckinSheet.copy021'],
  ['glute', 'student.readinessCheckinSheet.copy022'],
  ['back', 'student.readinessCheckinSheet.copy023'],
  ['chest', 'student.readinessCheckinSheet.copy024'],
  ['shoulder', 'student.readinessCheckinSheet.copy025'],
  ['triceps', 'student.readinessCheckinSheet.copy026'],
  ['core', 'student.readinessCheckinSheet.copy027'],
] as const);

export const STORAGE_KEYS = Object.freeze({
  collar: (studentId: string) => `setEntry.collarOn.${studentId}`,
  e1rm: 'training.e1rm.v1',
  readinessSkip: (studentId: string, date: string) =>
    `readiness.skipped.${studentId}.${date}`,
  restExplanation: (studentId: string) => `restTimer.explained.${studentId}`,
  restPreference: (studentId: string) => `restTimer.preference.${studentId}`,
  review: (studentId: string, date: string) => `sessionReview.${studentId}.${date}`,
});
