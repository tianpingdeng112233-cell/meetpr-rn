export const TRAINING_LIMITS = Object.freeze({
  gymDayCutoffHour: 4,
  historyWindowDays: 84,
  restMaximumSeconds: 900,
  restStepSeconds: 30,
  prReplayDelayMs: 1_500,
  transientBannerMs: 3_000,
  slideCompletionThreshold: 0.85,
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

export const RIR_COPY = Object.freeze({
  5: '还能多做 5 次',
  5.5: '还能多做 4-5 次',
  6: '还能多做 4 次',
  6.5: '还能多做 3-4 次',
  7: '还能多做 3 次',
  7.5: '还能多做 2-3 次',
  8: '还能多做 2 次',
  8.5: '还能多做 1-2 次',
  9: '还能多做 1 次',
  9.5: '或许还能多做 1 次',
  10: '力竭,无保留',
} satisfies Record<number, string>);

export const READINESS_MUSCLES = Object.freeze([
  ['quads', '股四'],
  ['hamstrings', '腘绳'],
  ['glutes', '臀'],
  ['back', '背'],
  ['chest', '胸'],
  ['shoulders', '肩'],
  ['triceps', '肱三头'],
  ['core_lower_back', '核心·下背'],
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
